/**
 * firebase/functions/index.js — Cloud Function de entrega de leads a
 * EspoCRM/Octadesk (projeto Firebase "imediato-seguros-site-novo",
 * dedicado ao site novo — NÃO é o projeto do site legado
 * "leads-imediato-seguros", usado por segurosimediato.com.br).
 *
 * Reescrita em 2026-07-13 — arquitetura "Firebase-only" (ver
 * docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md e
 * docs/ANALISE_ESPOCRM_OCTADESK_FIREBASE_CLOUDRUN.md): antes desta
 * mudança, esta função só entrava em ação como rede de segurança
 * ("retryLeadDelivery"), quando a entrega direta feita pelo site
 * (Vercel) falhava. Agora ela é a **única** via de entrega a
 * EspoCRM/Octadesk — o site (`app/api/lead/route.ts`) nunca mais chama
 * os proxies Cloud Run direto, só grava em `leads_backup/{leadId}` e
 * responde ao usuário imediatamente. Réplica fiel do modo
 * "Firebase-Only" que já é a configuração **ativa** confirmada no site
 * legado (`window.MODAL_FIREBASE_ONLY = true`).
 *
 * Motivo da mudança (achados reais em produção, 2026-07-13):
 * - A entrega direta em paralelo (`stage: "initial"` + `stage:
 *   "complete"`, cada uma chamando EspoCRM **e** Octadesk) fazia o
 *   Octadesk notificar o cliente 2 vezes por conversão — corrigido
 *   aqui: Octadesk só é chamado no estágio `"initial"`.
 * - O fallback de `NOME`/`Email` "falsos" só valia no estágio
 *   `"initial"` — no `"complete"`, se o valor real continuasse vazio
 *   (sempre o caso do `ContactLeadModal`, que não coleta "Nome"), o
 *   EspoCRM rejeitava a atualização. Corrigido: o fallback vale sempre
 *   que o valor estiver vazio, em qualquer estágio.
 *
 * O que este arquivo faz:
 * 1. Observa toda gravação em `leads_backup/{leadId}` (Realtime Database).
 * 2. Se `autoSync !== true`, não faz nada (registro já processado ou
 *    não é candidato a entrega — ex.: gravação feita pela própria
 *    função, com `autoSync:false` no final).
 * 3. `stage === "initial"`: envia a EspoCRM (cria) e Octadesk (mensagem
 *    inicial) o que ainda não tiver sido enviado (`*_sent !== true`).
 *    Grava `espocrmLeadId`/`espocrmOpportunityId` de volta no registro.
 * 4. `stage === "complete"` (e demais estágios de evento — ver abaixo):
 *    sempre tenta atualizar o EspoCRM (usa `espocrmLeadId`/
 *    `espocrmOpportunityId` já salvos no registro, se existirem, para
 *    atualizar em vez de duplicar) — nunca reenvia a mensagem inicial
 *    ao Octadesk.
 * 5. Atualiza o registro com o resultado. Se algo ainda falhar, o
 *    próprio `update()` dispara uma nova execução (gatilho
 *    "onValueWritten") — limitado a `MAX_CF_ATTEMPTS_TOTAL` rodadas por
 *    lead, depois do que marca `status: "failed_permanently"`.
 *
 * Projeto "leads EspoCRM/Octadesk por momento" (2026-07-20):
 * - Novos estágios de evento vindos do site: `"progress"` (prospect
 *   concluiu os passos 2/3 do formulário), `"rpa_result"` (cálculo
 *   automático terminou, com resumo em `data.rpaResultado`) e
 *   `"consultant_requested"` (prefere receber o cálculo completo
 *   depois). Todos atualizam o EspoCRM via proxy, como o "complete".
 * - Enriquecimento da ficha via API REST do EspoCRM (secret
 *   `ESPOCRM_API_CONFIG`): Note no Stream por momento (escolha do
 *   passo 4, resultado do cálculo com valores) + resumo do cálculo na
 *   `description`. Best-effort, com dedupe por estágio.
 * - Mensagens Octadesk pós-iniciais via API direta (secret
 *   `OCTADESK_API_CONFIG`, com kill-switch `enabled`): "cálculo pronto",
 *   "cálculo manual" e "cálculo completo depois" — templates aprovados
 *   pela Meta (ver docs/GUIA_OCTADESK_TEMPLATES.md).
 */
const { onValueWritten } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");

const DATABASE_URL = "https://imediato-seguros-site-novo-default-rtdb.firebaseio.com";

initializeApp({ databaseURL: DATABASE_URL });

// Configurados via `firebase functions:secrets:set <NOME>` (ver firebase/README.md).
// Mesmas URLs Cloud Run que o site novo usava antes de 2026-07-13 (ver
// histórico de lib/env.ts / .env.example) — agora só usadas aqui.
const ESPOCRM_DEV_URL = defineSecret("ESPOCRM_DEV_URL");
const ESPOCRM_PROD_URL = defineSecret("ESPOCRM_PROD_URL");
const OCTADESK_URL = defineSecret("OCTADESK_URL");

/**
 * Integração direta com a API REST do EspoCRM (projeto "leads EspoCRM/
 * Octadesk por momento", 2026-07-20) — usada para enriquecer a ficha do
 * lead com o que o proxy legado não carrega: escolha do passo 4, resumo
 * do cálculo RPA (Note no Stream + description). JSON:
 *   {"baseUrl":"https://crm.exemplo.com.br","apiKey":"..."}
 * Enquanto o JSON estiver vazio/incompleto (`{}`), o enriquecimento é
 * silenciosamente pulado — a entrega via proxy continua intacta.
 */
const ESPOCRM_API_CONFIG = defineSecret("ESPOCRM_API_CONFIG");

/**
 * Envio direto de templates WhatsApp pela API do Octadesk (mesmo projeto,
 * 2026-07-20) — usado nos momentos "cálculo pronto"/"cálculo manual"/
 * "cálculo completo depois" (a mensagem inicial continua no proxy legado).
 * JSON:
 *   {"enabled":true,"baseUrl":"https://SUBDOMINIO.apiprd.octadesk.services",
 *    "apiKey":"...","fromNumber":"+5511...",
 *    "templates":{"calculo_pronto":"<id>","calculo_manual":"<id>","calculo_completo_depois":"<id>"}}
 * Kill-switch: `enabled:false` (ou JSON vazio) desliga tudo — permite
 * subir os estágios EspoCRM antes de os templates serem aprovados pela
 * Meta (ver docs/GUIA_OCTADESK_TEMPLATES.md).
 */
const OCTADESK_API_CONFIG = defineSecret("OCTADESK_API_CONFIG");

const RETRY_DELAYS_MS = [1000, 4000, 9000];
/** Limite de rodadas (invocações desta função para o mesmo lead) antes de desistir — evita martelar o destino indefinidamente. */
const MAX_CF_ATTEMPTS_TOTAL = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mesma estrutura `{data, d, name}` — contrato fixo dos proxies Cloud
 * Run legados (EspoCRM/Octadesk), não controlado por nós.
 *
 * Fallback de `NOME`/`Email`: o EspoCRM exige os dois campos não-vazios
 * (rejeita com `HTTP 200` + erro no corpo, um "falso sucesso"). Usa
 * valores "falsos" derivados do telefone sempre que o valor real
 * estiver vazio — em **qualquer** estágio (correção 2026-07-13; antes
 * só valia no "initial", o que quebrava a atualização final de leads
 * do `ContactLeadModal`, que nunca coleta "Nome").
 */
function buildLegacyProxyPayload(leadData, name) {
  const phoneE164 = leadData.phoneE164 || "";
  const ddd = phoneE164.slice(3, 5);
  const celular = phoneE164.slice(5);
  const utm = leadData.utm || {};
  const email = leadData.email || `${ddd}${celular}@imediatoseguros.com.br`;
  const nome = leadData.nome || `${ddd}-${celular}-NOVO CLIENTE WHATSAPP`;

  return {
    data: {
      "DDD-CELULAR": ddd,
      CELULAR: celular,
      GCLID_FLD: utm.gclid || "",
      NOME: nome,
      CPF: leadData.cpf || "",
      CEP: leadData.cep || "",
      PLACA: leadData.placa || "",
      Email: email,
      ANO: leadData.veiculoAno || "",
      VEICULO: leadData.veiculoMarcaModelo || "",
      SEXO: "",
      "DATA-DE-NASCIMENTO": "",
      "ESTADO-CIVIL": "",
      produto: leadData.ramo || "",
      utm_source: utm.utm_source || "",
      utm_campaign: utm.utm_campaign || "",
      ...(leadData.espocrmLeadId ? { lead_id: leadData.espocrmLeadId, contact_id: leadData.espocrmLeadId } : {}),
      ...(leadData.espocrmOpportunityId ? { opportunity_id: leadData.espocrmOpportunityId } : {}),
    },
    d: new Date().toISOString(),
    name,
  };
}

/**
 * Extrai `leadIdFlyingDonkeys`/`opportunityIdFlyingDonkeys` do corpo de
 * resposta do EspoCRM — mesmo contrato confirmado em
 * `lib/leads/webhook.ts` (histórico do site, antes de 2026-07-13).
 */
function extractEspoCrmIds(responseData) {
  if (!responseData || typeof responseData !== "object") return {};
  const data = responseData.data || responseData;
  const leadId = data.leadIdFlyingDonkeys || data.lead_id || data.contact_id;
  const opportunityId = data.opportunityIdFlyingDonkeys || data.opportunity_id;
  return {
    leadId: typeof leadId === "string" ? leadId : undefined,
    opportunityId: typeof opportunityId === "string" ? opportunityId : undefined,
  };
}

/** Extrai só o JSON entre a 1ª `{` e a última `}` — o proxy PHP às vezes emite avisos HTML antes/depois do JSON de resposta. */
function parseJsonTolerant(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/** Config JSON de um secret opcional (`ESPOCRM_API_CONFIG`/`OCTADESK_API_CONFIG`) — `null` quando vazio/inválido/incompleto. */
function parseJsonConfig(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Primeiro nome "humano" do lead — evita usar o NOME "falso" (`11-999...-NOVO CLIENTE WHATSAPP`) em mensagens/notas. */
function firstName(nome) {
  if (!nome || /NOVO CLIENTE WHATSAPP/i.test(nome)) return "";
  return nome.trim().split(/\s+/)[0];
}

/**
 * Texto da Note (post no Stream do lead no EspoCRM) por momento do funil
 * (projeto 2026-07-20) — a linha do tempo que o vendedor vê ao abrir a
 * ficha. Retorna `null` quando o momento não tem nada a contar.
 */
function buildMomentNote(stage, leadData) {
  const resultado = leadData.rpaResultado || {};
  if (stage === "consultant_requested") {
    return "📞 Prospect prefere RECEBER O CÁLCULO COMPLETO DEPOIS — preparar a cotação nas 18 seguradoras e retornar com os valores.";
  }
  if (stage === "complete" && leadData.rpaChoice === "aguardar") {
    return "⚡ Prospect escolheu ACOMPANHAR O CÁLCULO AUTOMÁTICO agora (RPA) — resultado será registrado nesta ficha ao concluir.";
  }
  if (stage === "rpa_result") {
    if (resultado.status === "sucesso") {
      const linhas = ["✅ CÁLCULO AUTOMÁTICO CONCLUÍDO — valores apresentados ao prospect:"];
      if (resultado.valorRecomendado) {
        linhas.push(
          `• Recomendado: ${resultado.valorRecomendado}` +
            (resultado.formaPagamentoRecomendado ? ` (${resultado.formaPagamentoRecomendado})` : "") +
            (resultado.franquiaRecomendado ? ` — franquia ${resultado.franquiaRecomendado}` : "")
        );
      }
      if (resultado.valorAlternativo) {
        linhas.push(
          `• Alternativo: ${resultado.valorAlternativo}` +
            (resultado.formaPagamentoAlternativo ? ` (${resultado.formaPagamentoAlternativo})` : "") +
            (resultado.franquiaAlternativo ? ` — franquia ${resultado.franquiaAlternativo}` : "")
        );
      }
      linhas.push("Ligar para revisar os detalhes e fechar — o prospect JÁ VIU esses valores na tela.");
      return linhas.join("\n");
    }
    return "⚠️ Cálculo automático NÃO concluído — fazer a cotação manual e retornar ao prospect (ele foi avisado de que um especialista assumiu).";
  }
  return null;
}

/**
 * POST {baseUrl}/api/v1/Note — post no Stream do lead no EspoCRM (API
 * REST nativa, autenticada por X-Api-Key). Best-effort: 1 tentativa,
 * falha só é logada/registrada — nunca segura a entrega principal.
 */
async function postEspoNote(config, espoLeadId, text, leadId) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/v1/Note`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": config.apiKey },
    body: JSON.stringify({ type: "Post", parentType: "Lead", parentId: espoLeadId, post: text }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Note HTTP ${response.status} (lead ${leadId}): ${body.slice(0, 300)}`);
  }
}

/**
 * Acrescenta o resumo do cálculo à `description` do Lead no EspoCRM
 * (GET + PUT — a API não tem append nativo). A description é o campo
 * sempre visível no topo da ficha; o Stream conta a história completa.
 */
async function appendEspoDescription(config, espoLeadId, text, leadId) {
  const base = config.baseUrl.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", "X-Api-Key": config.apiKey };

  const current = await fetch(`${base}/api/v1/Lead/${espoLeadId}`, { headers });
  if (!current.ok) throw new Error(`GET Lead HTTP ${current.status} (lead ${leadId})`);
  const lead = await current.json();
  const existing = typeof lead.description === "string" && lead.description.trim() ? `${lead.description.trim()}\n\n` : "";

  const update = await fetch(`${base}/api/v1/Lead/${espoLeadId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ description: `${existing}${text}` }),
  });
  if (!update.ok) {
    const body = await update.text().catch(() => "");
    throw new Error(`PUT Lead HTTP ${update.status} (lead ${leadId}): ${body.slice(0, 300)}`);
  }
}

/**
 * Envio direto de template WhatsApp pela API do Octadesk
 * (POST {baseUrl}/chat/send-template, autenticado por X-API-KEY) —
 * usado nos momentos pós-inicial (a mensagem inicial continua no proxy
 * legado). `templateKey` indexa `config.templates`; `variables` é uma
 * lista de valores na ordem das variáveis do template ({{1}}, {{2}}…).
 */
async function sendOctadeskTemplate(config, templateKey, leadData, variables, leadId) {
  const templateId = config.templates && config.templates[templateKey];
  if (!templateId) throw new Error(`Template "${templateKey}" sem ID configurado em OCTADESK_API_CONFIG`);

  const payload = {
    target: {
      contact: {
        phoneContact: { number: leadData.phoneE164 },
        ...(firstName(leadData.nome) ? { name: leadData.nome } : {}),
      },
    },
    content: {
      templateMessage: {
        id: templateId,
        variables: variables.map((value, index) => ({ key: `var-${index + 1}`, value: value || "" })),
      },
    },
    origin: { from: { number: config.fromNumber } },
    options: { automaticAssign: false },
  };

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/send-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json", "X-API-KEY": config.apiKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`send-template "${templateKey}" HTTP ${response.status} (lead ${leadId}): ${body.slice(0, 300)}`);
  }
}

/**
 * Retorna `{delivered, attempts, responseData}` — `responseData` (JSON
 * já parseado) é usado para extrair os IDs do EspoCRM e para detectar
 * falhas que vêm com `HTTP 200` (o EspoCRM responde 200 mesmo rejeitando
 * o lead no corpo, ex.: `{"status":"error","message":"Campo NOME é
 * obrigatório"}` — `response.ok` sozinho não detecta isso).
 */
async function sendWithRetry(url, payload, label, leadId) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text().catch(() => "");

      if (!response.ok) {
        logger.warn(`[deliverLead/${label}] Lead ${leadId}: resposta não-OK (status ${response.status}) na tentativa ${attempt + 1}: ${text}`);
      } else {
        const responseData = parseJsonTolerant(text);
        const body = responseData;
        if (body && (body.status === "error" || body.success === false)) {
          logger.warn(`[deliverLead/${label}] Lead ${leadId}: HTTP 200 mas corpo indica falha na tentativa ${attempt + 1}: ${body.message || text}`);
        } else {
          return { delivered: true, attempts: attempt + 1, responseData };
        }
      }
    } catch (error) {
      logger.error(`[deliverLead/${label}] Lead ${leadId}: tentativa ${attempt + 1} falhou.`, error);
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  return { delivered: false, attempts: RETRY_DELAYS_MS.length + 1 };
}

exports.deliverLead = onValueWritten(
  {
    ref: "/leads_backup/{leadId}",
    instance: "imediato-seguros-site-novo-default-rtdb",
    region: "us-central1",
    secrets: [ESPOCRM_DEV_URL, ESPOCRM_PROD_URL, OCTADESK_URL, ESPOCRM_API_CONFIG, OCTADESK_API_CONFIG],
  },
  async (event) => {
    const leadId = event.params.leadId;
    const snapshot = event.data.after;
    const record = snapshot && snapshot.val();

    // Registro apagado, ou já processado (autoSync desligado pela própria função) — não faz nada.
    if (!record || record.autoSync !== true) return;

    const cfAttempts = (record.cf_retry_count || 0) + 1;
    if (cfAttempts > MAX_CF_ATTEMPTS_TOTAL) {
      logger.error(`[deliverLead] Lead ${leadId} excedeu ${MAX_CF_ATTEMPTS_TOTAL} rodadas — desistindo (falha permanente, requer investigação manual).`);
      await snapshot.ref.update({ autoSync: false, status: "failed_permanently", cf_retry_count: cfAttempts });
      return;
    }

    const leadData = record.data || {};
    // Estágios de evento (projeto 2026-07-20): "progress" (passos 2/3),
    // "rpa_result" (cálculo terminou) e "consultant_requested" (prefere
    // o cálculo completo depois) — todos atualizam o EspoCRM como o
    // "complete"; nenhum reenvia a mensagem inicial do Octadesk.
    const KNOWN_STAGES = ["initial", "progress", "complete", "rpa_result", "consultant_requested"];
    const stage = KNOWN_STAGES.includes(leadData.stage) ? leadData.stage : "complete";
    const updates = { cf_retry_count: cfAttempts };

    // EspoCRM via proxy: no "initial" só envia se ainda não tiver sido
    // enviado; "progress"/"complete" tentam SEMPRE (atualização com dados
    // novos). "rpa_result"/"consultant_requested" NÃO passam pelo proxy
    // (achado na validação de 2026-07-20: não carregam nenhum campo novo
    // do payload legado, e uma atualização sem `espocrmLeadId` faz o
    // proxy devolver erro de ambiguidade) — o valor deles está no
    // enriquecimento via API direta (Note/description) abaixo.
    const needsEspocrm =
      stage === "initial" ? record.espocrm_sent !== true : stage === "progress" || stage === "complete";
    // Octadesk (mensagem inicial via proxy legado): só no "initial" —
    // nunca depois, para não duplicar a notificação (achado 2026-07-13).
    // As mensagens dos momentos pós-inicial saem pela API direta abaixo.
    const needsOctadesk = stage === "initial" && record.octadesk_sent !== true;

    if (needsEspocrm) {
      const espocrmUrl = record.environment === "production" ? ESPOCRM_PROD_URL.value() : ESPOCRM_DEV_URL.value();
      const payloadData = {
        ...leadData,
        espocrmLeadId: leadData.espocrmLeadId || record.espocrmLeadId,
        espocrmOpportunityId: leadData.espocrmOpportunityId || record.espocrmOpportunityId,
      };
      const result = await sendWithRetry(
        espocrmUrl,
        buildLegacyProxyPayload(payloadData, stage === "initial" ? "Cloud Function — Lead Inicial EspoCRM" : "Cloud Function — Atualização EspoCRM"),
        "espocrm",
        leadId
      );
      updates.espocrm_sent = result.delivered;
      updates.espocrm_attempts = (record.espocrm_attempts || 0) + result.attempts;
      updates.espocrm_last_error = result.delivered ? null : `Falha após ${result.attempts} tentativa(s) — rodada ${cfAttempts}`;

      const ids = extractEspoCrmIds(result.responseData);
      if (ids.leadId) updates.espocrmLeadId = ids.leadId;
      if (ids.opportunityId) updates.espocrmOpportunityId = ids.opportunityId;
    }

    if (needsOctadesk) {
      const result = await sendWithRetry(
        OCTADESK_URL.value(),
        buildLegacyProxyPayload(leadData, "Cloud Function — Mensagem Inicial Octadesk"),
        "octadesk",
        leadId
      );
      updates.octadesk_sent = result.delivered;
      updates.octadesk_attempts = (record.octadesk_attempts || 0) + result.attempts;
      updates.octadesk_last_error = result.delivered ? null : `Falha após ${result.attempts} tentativa(s) — rodada ${cfAttempts}`;
    }

    // ——— Enriquecimento da ficha no EspoCRM por momento (2026-07-20) ———
    // Note no Stream (linha do tempo que o vendedor vê) + description com
    // o resumo do cálculo. Best-effort com dedupe por estágio
    // (`espo_note_{stage}_sent`): falha aqui nunca segura a entrega
    // principal nem dispara retry — só é logada.
    const espoApiConfig = parseJsonConfig(ESPOCRM_API_CONFIG.value());
    const espoLeadIdForApi = updates.espocrmLeadId || record.espocrmLeadId || leadData.espocrmLeadId;
    const noteText = buildMomentNote(stage, leadData);
    const noteFlag = `espo_note_${stage}_sent`;
    if (
      espoApiConfig &&
      espoApiConfig.baseUrl &&
      espoApiConfig.apiKey &&
      espoLeadIdForApi &&
      noteText &&
      record[noteFlag] !== true
    ) {
      try {
        await postEspoNote(espoApiConfig, espoLeadIdForApi, noteText, leadId);
        // O resumo do cálculo também vai para a description — o campo
        // sempre visível no topo da ficha, sem precisar rolar o Stream.
        if (stage === "rpa_result") {
          await appendEspoDescription(espoApiConfig, espoLeadIdForApi, noteText, leadId);
        }
        updates[noteFlag] = true;
      } catch (error) {
        logger.warn(`[deliverLead/espo-api] Lead ${leadId}: enriquecimento (${stage}) falhou (best-effort).`, error);
      }
    }

    // ——— Mensagens Octadesk por momento, via API direta (2026-07-20) ———
    // "calculo_pronto"/"calculo_manual" (fim do RPA) e
    // "calculo_completo_depois" (escolheu especialista). Atrás do
    // kill-switch `enabled` em OCTADESK_API_CONFIG — só liga depois de os
    // templates serem aprovados pela Meta (docs/GUIA_OCTADESK_TEMPLATES.md).
    const octaConfig = parseJsonConfig(OCTADESK_API_CONFIG.value());
    if (octaConfig && octaConfig.enabled === true && octaConfig.baseUrl && octaConfig.apiKey && octaConfig.fromNumber) {
      const nome = firstName(leadData.nome) || "cliente";
      let templateKey = null;
      let variables = [];

      if (stage === "consultant_requested") {
        templateKey = "calculo_completo_depois";
        variables = [nome];
      } else if (stage === "rpa_result") {
        const resultado = leadData.rpaResultado || {};
        if (resultado.status === "sucesso" && resultado.valorRecomendado) {
          templateKey = "calculo_pronto";
          variables = [nome, resultado.valorRecomendado, leadData.veiculoMarcaModelo || "veículo"];
        } else {
          templateKey = "calculo_manual";
          variables = [nome];
        }
      }

      const octaFlag = templateKey ? `octa_${templateKey}_sent` : null;
      if (templateKey && record[octaFlag] !== true) {
        try {
          await sendOctadeskTemplate(octaConfig, templateKey, leadData, variables, leadId);
          updates[octaFlag] = true;
        } catch (error) {
          logger.warn(`[deliverLead/octa-api] Lead ${leadId}: template "${templateKey}" falhou (best-effort).`, error);
        }
      }
    }

    const espocrmOk = needsEspocrm ? updates.espocrm_sent : true;
    const octadeskOk = needsOctadesk ? updates.octadesk_sent : record.octadesk_sent === true || stage !== "initial";
    const stillFailing = !espocrmOk || !octadeskOk;

    // Se ainda falhar, mantém autoSync:true — o próprio update() abaixo
    // dispara uma nova rodada desta função (até MAX_CF_ATTEMPTS_TOTAL).
    updates.autoSync = stillFailing;
    if (!stillFailing) {
      updates.status = "synced";
      updates.synced = true;
    }

    await snapshot.ref.update(updates);

    logger.info(
      `[deliverLead] Lead ${leadId} (stage=${stage}), rodada ${cfAttempts}: espocrm_sent=${updates.espocrm_sent ?? record.espocrm_sent}, octadesk_sent=${updates.octadesk_sent ?? record.octadesk_sent}, autoSync=${updates.autoSync}.`
    );
  }
);
