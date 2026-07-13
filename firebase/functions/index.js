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
 * 4. `stage === "complete"`: sempre tenta atualizar o EspoCRM (usa
 *    `espocrmLeadId`/`espocrmOpportunityId` já salvos no registro, se
 *    existirem, para atualizar em vez de duplicar) — nunca reenvia ao
 *    Octadesk.
 * 5. Atualiza o registro com o resultado. Se algo ainda falhar, o
 *    próprio `update()` dispara uma nova execução (gatilho
 *    "onValueWritten") — limitado a `MAX_CF_ATTEMPTS_TOTAL` rodadas por
 *    lead, depois do que marca `status: "failed_permanently"`.
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
    secrets: [ESPOCRM_DEV_URL, ESPOCRM_PROD_URL, OCTADESK_URL],
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
    const stage = leadData.stage === "initial" ? "initial" : "complete";
    const updates = { cf_retry_count: cfAttempts };

    // EspoCRM: no "initial" só envia se ainda não tiver sido enviado;
    // no "complete" tenta SEMPRE (é uma atualização com dados novos,
    // não uma reentrega do que já foi feito).
    const needsEspocrm = stage === "complete" || record.espocrm_sent !== true;
    // Octadesk: só no "initial" — nunca no "complete", para não
    // duplicar a notificação ao cliente (achado 2026-07-13).
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

    const espocrmOk = needsEspocrm ? updates.espocrm_sent : true;
    const octadeskOk = needsOctadesk ? updates.octadesk_sent : record.octadesk_sent === true || stage === "complete";
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
