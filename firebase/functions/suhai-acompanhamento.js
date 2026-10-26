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
 *    `cStatusProposta`/`cDataStatusProposta` e e-mail admin);
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
 * consultadas (liga homologação antes de produção).
 */

const crypto = require("node:crypto");

const suhai = require("./suhai");
const espo = require("./espocrm");
const emailNotif = require("./email-notification");

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

/**
 * Processa uma entrada. Devolve o desfecho ("pulado", "sem_mudanca",
 * "mudou", "erro", "expirado", "lead_apagado") para o resumo da rodada.
 */
async function processarItem({ leadId, item, rootRef, config, espoAll, emailUrls, obterToken, fetchImpl, agora, logger }) {
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

module.exports = {
  acompanharPropostas,
  processarItem,
  chamarGateway,
  tokenOidcMetadata,
  espoBloco,
};
