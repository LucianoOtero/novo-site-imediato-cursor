/**
 * firebase/functions/suhai-acompanhamento.js — rotina agendada que acompanha
 * as propostas Suhai transmitidas pelo site (2026-10-25).
 *
 * A `deliverLead` registra cada proposta transmitida em
 * `suhai_acompanhamento/{leadId}`. A cada rodada, para cada entrada ainda
 * não final, esta rotina:
 * 1. consulta o status e as pendências pelo `suhai-gateway` do ambiente da
 *    proposta (tag `homologacao` ou `producao`, com token OIDC);
 * 2. aplica as regras de `suhai.planoAcompanhamento` (Note, Tasks, campos
 *    `cStatusProposta`/`cDataStatusProposta`, e-mail admin e o WhatsApp
 *    `suhai_pendencia` com o link da vistoria ou do rastreador);
 * 3. grava o resultado na entrada e `suhai_status_proposta` no registro do
 *    lead em `leads_backup/{leadId}` (fora de `data`, então a `deliverLead`
 *    ignora a escrita).
 *
 * Cada efeito tem chave em `efeitos/` — nada se repete. Se a Note ou uma
 * Task falhar, o status novo não é gravado e a próxima rodada tenta de novo.
 *
 * Secret `SUHAI_ACOMP_CONFIG`:
 *   {"enabled":true,"maxDias":45,"intervaloMinutos":50,
 *    "ambientes":{"homologacao":{"url":"https://homologacao---suhai-gateway-…","audience":"https://suhai-gateway-…"},
 *                 "producao":{"url":"https://producao---suhai-gateway-…","audience":"https://suhai-gateway-…"}}}
 * Ambiente ausente em `ambientes` = propostas daquele ambiente não são
 * consultadas (liga homologação antes de produção). Opcional:
 * `alertaSemRodadaHoras` (padrão 3) para a `vigiarRotina`.
 *
 * Cada rodada grava o batimento em `suhai_acomp_rotina`; 3 rodadas
 * seguidas falhando por inteiro, ou nenhuma rodada no prazo da vigia,
 * viram e-mail admin.
 *
 * O WhatsApp da pendência só sai com `suhai_pendencia` em
 * `OCTADESK_API_CONFIG.templates`; sem o ID, fica só a Task.
 */

const crypto = require("node:crypto");

const suhai = require("./suhai");
const espo = require("./espocrm");
const emailNotif = require("./email-notification");
const octa = require("./octadesk");

const MAX_DIAS_PADRAO = 45;
const INTERVALO_MINUTOS_PADRAO = 50;
const ERROS_PARA_ALERTA = 6;
const TIMEOUT_GATEWAY_MS = 60000;

/** Mesmo critério da `deliverLead`: `production` usa o bloco `prod`, o resto usa `dev`. */
function espoBloco(espoAll, environment) {
  if (!espoAll) return null;
  const bloco =
    espoAll.dev || espoAll.prod ? (environment === "production" ? espoAll.prod : espoAll.dev) || null : espoAll;
  return bloco && bloco.baseUrl && bloco.apiKey ? bloco : null;
}

/** Token OIDC da conta de serviço da função, pelo servidor de metadados. */
async function tokenOidcMetadata(audience) {
  const url =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity" +
    `?audience=${encodeURIComponent(audience)}&format=full`;
  const resposta = await fetch(url, { headers: { "Metadata-Flavor": "Google" } });
  if (!resposta.ok) throw new Error(`metadata identity HTTP ${resposta.status}`);
  return (await resposta.text()).trim();
}

async function chamarGateway({ ambienteCfg, rota, corpo, obterToken, fetchImpl = fetch }) {
  const base = ambienteCfg.url.replace(/\/$/, "");
  const token = await obterToken(ambienteCfg.audience || base);
  const resposta = await fetchImpl(`${base}${rota}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(TIMEOUT_GATEWAY_MS),
  });
  const texto = await resposta.text();
  let json = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  if (!resposta.ok) {
    const erro = new Error((json && json.mensagem) || `gateway HTTP ${resposta.status}`);
    erro.status = resposta.status;
    erro.codigoSuhai = (json && json.codigoSuhai) || null;
    throw erro;
  }
  return json;
}

function hashCurto(texto) {
  return crypto.createHash("sha1").update(texto).digest("hex").slice(0, 10);
}

/** Mesmo critério do `octaReady` da `deliverLead`. */
function octaPronto(octaConfig) {
  return Boolean(
    octaConfig && octaConfig.enabled === true && octaConfig.baseUrl && octaConfig.apiKey && octaConfig.fromNumber
  );
}

/**
 * Processa uma entrada. Devolve o desfecho ("pulado", "sem_mudanca",
 * "mudou", "erro", "expirado", "lead_apagado") para o resumo da rodada.
 */
async function processarItem({ leadId, item, rootRef, config, espoAll, emailUrls, octaConfig, obterToken, fetchImpl, agora, logger }) {
  const ambienteCfg = config.ambientes && config.ambientes[item.ambiente];
  if (!ambienteCfg || !ambienteCfg.url) return "pulado";

  const intervaloMs = (Number(config.intervaloMinutos) || INTERVALO_MINUTOS_PADRAO) * 60 * 1000;
  const ultima = Date.parse(item.ultimaConsulta || "");
  if (Number.isFinite(ultima) && agora - ultima < intervaloMs) return "pulado";

  const agoraIso = new Date(agora).toISOString();
  const itemRef = rootRef.child(`suhai_acompanhamento/${leadId}`);
  const leadRef = rootRef.child(`leads_backup/${leadId}`);
  const efeitos = item.efeitos || {};

  const registro = (await leadRef.once("value")).val();
  if (!registro) {
    await itemRef.update({ final: true, finalizadoEm: agoraIso, motivoFinal: "lead_apagado" });
    return "lead_apagado";
  }
  const leadData = registro.data || {};
  const espoLeadId = registro.espocrmLeadId || leadData.espocrmLeadId || null;
  const espoOppId = registro.espocrmOpportunityId || leadData.espocrmOpportunityId || null;
  const espoConfig = espoBloco(espoAll, item.environment);
  const emailUrl = item.environment === "production" ? emailUrls.prod : emailUrls.dev;

  const criarTarefa = async (tarefa, novosEfeitos) => {
    if (efeitos[tarefa.chave]) return true;
    if (!espoConfig || !espoLeadId) return false;
    try {
      await espo.createTask(espoConfig, espoLeadId, tarefa, leadId);
      novosEfeitos[`efeitos/${tarefa.chave}`] = agoraIso;
      return true;
    } catch (error) {
      logger.warn(`[suhai-acomp] Lead ${leadId}: Task ${tarefa.chave} falhou.`, error);
      return false;
    }
  };

  // A Task da mesma pendência é a reserva: falha no envio não bloqueia a rodada.
  const enviarWhatsapp = async ({ chave, key, pendencia, link }, novosEfeitos) => {
    if (efeitos[chave] || !octaPronto(octaConfig) || !(octaConfig.templates || {})[key] || !leadData.phoneE164) return;
    const variaveis = [octa.firstName(leadData.nome) || "cliente", String(item.proposta), pendencia, link];
    try {
      await octa.sendTemplate(octaConfig, key, leadData, variaveis, leadId);
      novosEfeitos[`efeitos/${chave}`] = agoraIso;
    } catch (error) {
      logger.warn(`[suhai-acomp] Lead ${leadId}: WhatsApp ${chave} falhou.`, error);
    }
  };

  const enviarEmail = async ({ chave, momento, detalhe, erro }, novosEfeitos) => {
    if (efeitos[chave] || !emailUrl) return;
    const payload = emailNotif.buildEmailPayload(leadData, { momento, detalhe, erro: erro || null });
    if (!payload) return;
    const resultado = await emailNotif.sendAdminEmail(emailUrl, payload, leadId);
    if (resultado.success) novosEfeitos[`efeitos/${chave}`] = agoraIso;
  };

  const maxDias = Number(config.maxDias) || MAX_DIAS_PADRAO;
  if (suhai.acompanhamentoExpirado(item, agora, maxDias)) {
    const novosEfeitos = {};
    const ok = await criarTarefa(suhai.tarefaExpirada(item, maxDias), novosEfeitos);
    await itemRef.update({
      ...novosEfeitos,
      ultimaConsulta: agoraIso,
      ...(ok ? { final: true, finalizadoEm: agoraIso, motivoFinal: "expirado" } : {}),
    });
    return "expirado";
  }

  const identificacao = { proposta: item.proposta };
  let status;
  try {
    status = await chamarGateway({ ambienteCfg, rota: "/proposta/status", corpo: identificacao, obterToken, fetchImpl });
  } catch (error) {
    const erros = (item.errosSeguidos || 0) + 1;
    const novosEfeitos = {};
    logger.warn(`[suhai-acomp] Lead ${leadId}: status da proposta ${item.proposta} falhou (${erros}x): ${error.message}`);
    if (erros === ERROS_PARA_ALERTA) {
      await enviarEmail(
        {
          chave: `email_erro_${agoraIso.slice(0, 10)}`,
          momento: "suhai_acomp_erro",
          detalhe: `Proposta Suhai nº ${item.proposta}: ${erros} consultas seguidas sem resposta`,
          erro: { message: error.message, status: error.status || null, code: error.codigoSuhai || null, response_data: null },
        },
        novosEfeitos
      );
    }
    await itemRef.update({ ...novosEfeitos, ultimaConsulta: agoraIso, errosSeguidos: erros, ultimoErro: error.message.slice(0, 300) });
    return "erro";
  }

  let pendencias = [];
  if (!(suhai.STATUS_PROPOSTA[status.status] || {}).final) {
    try {
      const resposta = await chamarGateway({ ambienteCfg, rota: "/proposta/pendencias", corpo: identificacao, obterToken, fetchImpl });
      const daProposta = (resposta.propostas || []).find((p) => String(p.proposta) === String(item.proposta));
      pendencias = (daProposta && daProposta.pendencias) || [];
    } catch (error) {
      // O status segue sem as pendências; a assinatura anterior é mantida.
      logger.warn(`[suhai-acomp] Lead ${leadId}: pendências da proposta ${item.proposta} falharam: ${error.message}`);
      pendencias = null;
    }
  }

  let posVenda = null;
  const infoStatus = suhai.STATUS_PROPOSTA[status.status] || {};
  if (infoStatus.tipo === "emitida" && item.status !== status.status) {
    const placa = String(leadData.placa || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const transmitida = Date.parse(item.transmitidaEm || "");
    try {
      posVenda = await chamarGateway({
        ambienteCfg,
        rota: "/posvenda/apolice-da-proposta",
        corpo: {
          proposta: item.proposta,
          ...(/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa) ? { placa } : {}),
          ...(Number.isFinite(transmitida) ? { emissaoDesde: new Date(transmitida - 86400000).toISOString().slice(0, 10) } : {}),
        },
        obterToken,
        fetchImpl,
      });
    } catch (error) {
      // Sem os links, a Task da emissão manda buscar o boleto no Portal do Cotador.
      logger.warn(`[suhai-acomp] Lead ${leadId}: pós-venda da proposta ${item.proposta} falhou: ${error.message}`);
    }
  }

  const plano = suhai.planoAcompanhamento(item, status, pendencias || [], agoraIso, { posVenda });
  if (pendencias === null) plano.atualizacao.assinaturaPendencias = item.assinaturaPendencias || "";

  const novosEfeitos = {};
  let bloqueado = false;

  if (plano.nota) {
    const chaveNota = `nota_${status.status}_${hashCurto(plano.nota)}`;
    if (!efeitos[chaveNota]) {
      if (espoConfig && espoLeadId) {
        try {
          await espo.postNote(espoConfig, espoLeadId, plano.nota, leadId);
          novosEfeitos[`efeitos/${chaveNota}`] = agoraIso;
        } catch (error) {
          logger.warn(`[suhai-acomp] Lead ${leadId}: Note falhou.`, error);
          bloqueado = true;
        }
      } else {
        bloqueado = true;
      }
    }
  }

  for (const tarefa of plano.tarefas) {
    if (!(await criarTarefa(tarefa, novosEfeitos))) bloqueado = true;
  }

  for (const mensagem of plano.whatsapps || []) await enviarWhatsapp(mensagem, novosEfeitos);

  // Campos podem ainda não existir no Entity Manager: best-effort, não bloqueia.
  if (plano.campos && espoConfig && espoLeadId) {
    try {
      await espo.putFields(espoConfig, "Lead", espoLeadId, plano.campos, leadId);
      if (espoOppId) await espo.putFields(espoConfig, "Opportunity", espoOppId, plano.campos, leadId);
    } catch (error) {
      logger.warn(`[suhai-acomp] Lead ${leadId}: campos de status falharam (podem não existir ainda).`, error);
    }
  }

  if (plano.email && !bloqueado) await enviarEmail(plano.email, novosEfeitos);

  const atualizacao = bloqueado
    ? { ultimaConsulta: agoraIso, ultimoErro: "efeito no Espo pendente (Note/Task)" }
    : plano.atualizacao;
  await itemRef.update({ ...atualizacao, ...novosEfeitos });
  if (!bloqueado) {
    await leadRef.child("suhai_status_proposta").set({
      proposta: item.proposta,
      status: status.status,
      texto: plano.atualizacao.statusTexto,
      dataAtualizacao: status.dataAtualizacao || null,
      consultadoEm: agoraIso,
    });
  }

  if (bloqueado) return "erro";
  return plano.nota ? "mudou" : "sem_mudanca";
}

/** Uma rodada: percorre `suhai_acompanhamento` e devolve o resumo. */
async function acompanharPropostas({
  rootRef,
  config,
  espoAll,
  emailUrls = {},
  octaConfig = null,
  obterToken = tokenOidcMetadata,
  fetchImpl = fetch,
  agora = Date.now(),
  logger,
}) {
  const todos = (await rootRef.child("suhai_acompanhamento").once("value")).val() || {};
  const resumo = { total: 0, pulado: 0, sem_mudanca: 0, mudou: 0, erro: 0, expirado: 0, lead_apagado: 0 };

  for (const [leadId, item] of Object.entries(todos)) {
    if (!item || item.final) continue;
    resumo.total += 1;
    try {
      const desfecho = await processarItem({
        leadId,
        item,
        rootRef,
        config,
        espoAll,
        emailUrls,
        octaConfig,
        obterToken,
        fetchImpl,
        agora,
        logger,
      });
      resumo[desfecho] = (resumo[desfecho] || 0) + 1;
    } catch (error) {
      resumo.erro += 1;
      logger.error(`[suhai-acomp] Lead ${leadId}: falha inesperada.`, error);
    }
  }

  return resumo;
}

/** Estado da própria rotina (batimento e alertas), lido pela `vigiarRotina`. */
const ROTINA_PATH = "suhai_acomp_rotina";
const RODADAS_FALHAS_PARA_ALERTA = 3;
const HORAS_SEM_RODADA_PADRAO = 3;

function diaBrasilia(agora) {
  return new Date(agora - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Grava o batimento da rodada. Falha inteira = exceção, ou todas as
 * propostas consultadas com erro. Na 3ª seguida manda um e-mail (no
 * máximo um por dia).
 */
async function registrarRodada({ rootRef, resumo = null, erro = null, emailUrl, agora = Date.now(), logger }) {
  const ref = rootRef.child(ROTINA_PATH);
  const anterior = (await ref.once("value")).val() || {};
  const falhou = Boolean(erro) || Boolean(resumo && resumo.total > 0 && resumo.erro === resumo.total);
  const seguidas = falhou ? (anterior.rodadasFalhasSeguidas || 0) + 1 : 0;
  const hoje = diaBrasilia(agora);
  const atualizacao = {
    ultimaRodada: new Date(agora).toISOString(),
    ultimoResumo: resumo,
    ultimoErro: erro ? String(erro.message || erro).slice(0, 300) : null,
    rodadasFalhasSeguidas: seguidas,
  };

  if (seguidas >= RODADAS_FALHAS_PARA_ALERTA && anterior.alertaFalhaEm !== hoje) {
    const detalhe = erro
      ? `${seguidas} rodadas seguidas terminaram em erro: ${atualizacao.ultimoErro}`
      : `${seguidas} rodadas seguidas sem conseguir consultar nenhuma das ${resumo.total} propostas`;
    const payload = emailNotif.buildAlertaSistemaPayload({
      momento: "suhai_acomp_rotina_falhou",
      detalhe,
      erro: erro ? emailNotif.errorPayload(erro) : null,
    });
    const resultado = await emailNotif.sendAdminEmail(emailUrl, payload, "rotina-suhai");
    if (resultado.success) atualizacao.alertaFalhaEm = hoje;
    else logger.warn("[suhai-acomp] alerta de rotina falhando não foi enviado; tenta de novo na próxima rodada.");
  }

  await ref.update(atualizacao);
  return { falhou, seguidas };
}

/**
 * Roda em outro agendamento: com a rotina ligada e sem batimento há mais
 * de `alertaSemRodadaHoras` (padrão 3), manda um e-mail (no máximo um
 * por dia). Sem batimento nenhum, conta a partir da primeira vigia.
 */
async function vigiarRotina({ rootRef, config, emailUrl, agora = Date.now(), logger }) {
  if (!config || config.enabled !== true) return "desligada";
  const ref = rootRef.child(ROTINA_PATH);
  const estado = (await ref.once("value")).val() || {};
  const desde = Date.parse(estado.ultimaRodada || estado.vigiaDesde || "");
  if (!Number.isFinite(desde)) {
    await ref.update({ vigiaDesde: new Date(agora).toISOString() });
    return "iniciada";
  }
  const limiteMs = (Number(config.alertaSemRodadaHoras) || HORAS_SEM_RODADA_PADRAO) * 3600 * 1000;
  if (agora - desde <= limiteMs) return "ok";

  const hoje = diaBrasilia(agora);
  if (estado.alertaParadaEm === hoje) return "parada";
  const horas = Math.floor((agora - desde) / 3600000);
  const payload = emailNotif.buildAlertaSistemaPayload({
    momento: "suhai_acomp_rotina_parada",
    detalhe: estado.ultimaRodada
      ? `a rotina de acompanhamento não roda há ${horas} h (última rodada ${estado.ultimaRodada})`
      : `a rotina de acompanhamento está ligada mas não rodou nenhuma vez em ${horas} h`,
  });
  const resultado = await emailNotif.sendAdminEmail(emailUrl, payload, "rotina-suhai");
  if (resultado.success) await ref.update({ alertaParadaEm: hoje });
  else logger.warn("[suhai-acomp] alerta de rotina parada não foi enviado; tenta de novo na próxima vigia.");
  return "parada";
}

module.exports = {
  acompanharPropostas,
  registrarRodada,
  vigiarRotina,
  ROTINA_PATH,
  processarItem,
  chamarGateway,
  tokenOidcMetadata,
  espoBloco,
};
