/**
 * firebase/functions/index.js — Cloud Function de reentrega assíncrona
 * de leads (projeto 2026-07-12, paridade com o comportamento do site
 * legado — ver docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md e
 * docs/ANALISE_ESPOCRM_OCTADESK_FIREBASE_CLOUDRUN.md).
 *
 * Este é um projeto Node.js SEPARADO do Next.js/Vercel — não faz parte
 * do build do site, é implantado só via Firebase CLI
 * (`firebase deploy --only functions`, dentro de firebase/). Por isso
 * duplica deliberadamente a pequena função `buildLegacyProxyPayload`
 * (ver lib/leads/legacy-proxy-payload.ts no site) em vez de importá-la —
 * são dois deploys/runtimes independentes.
 *
 * O que este arquivo faz:
 * 1. Observa gravações em `leads_backup/{leadId}` (Realtime Database).
 * 2. Se o registro tiver `autoSync: true` (a entrega direta feita pelo
 *    site, com retry, falhou em EspoCRM e/ou Octadesk), tenta reentregar
 *    a partir do servidor — mesma URL Cloud Run que o site usa, com o
 *    mesmo retry exponencial (1s/4s/9s).
 * 3. Atualiza o registro com o resultado. Se ainda falhar, o próprio
 *    `update()` dispara uma nova execução desta função (o gatilho é
 *    "onValueWritten", não só "onCreate") — por isso há um limite de
 *    rodadas (`MAX_CF_ATTEMPTS_TOTAL`) para não martelar o destino
 *    indefinidamente se ele estiver realmente fora do ar por muito tempo.
 *    Passado o limite, marca `status: "failed_permanently"` e desliga
 *    `autoSync` — a partir daí, exige investigação manual (consultar o
 *    Realtime Database Console do projeto `imediato-seguros-site-novo`).
 */
const { onValueWritten } = require("firebase-functions/v2/database");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");

const DATABASE_URL = "https://imediato-seguros-site-novo-default-rtdb.firebaseio.com";

initializeApp({ databaseURL: DATABASE_URL });

// Configurados via `firebase functions:secrets:set <NOME>` (ver firebase/README.md).
// Mesmas URLs Cloud Run que o site novo usa (lib/env.ts / .env.example).
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
 * Mesma estrutura `{data, d, name}` de `lib/leads/legacy-proxy-payload.ts`
 * — contrato fixo dos proxies Cloud Run legados (EspoCRM/Octadesk), não
 * controlado por nós. `leadData` é o objeto salvo em
 * `leads_backup/{leadId}/data` por `lib/leads/firebase-backup.ts`.
 *
 * Correção 2026-07-12 (mesmo achado documentado em
 * `lib/leads/legacy-proxy-payload.ts`): `DDD-CELULAR` carrega só o DDD,
 * não "DDD-CELULAR" concatenado — validado com chamada real isolada ao
 * proxy Octadesk.
 */
function buildLegacyProxyPayload(leadData, name) {
  const phoneE164 = leadData.phoneE164 || "";
  const ddd = phoneE164.slice(3, 5);
  const celular = phoneE164.slice(5);
  const utm = leadData.utm || {};

  return {
    data: {
      "DDD-CELULAR": ddd,
      CELULAR: celular,
      GCLID_FLD: utm.gclid || "",
      NOME: leadData.nome || "",
      CPF: leadData.cpf || "",
      CEP: leadData.cep || "",
      PLACA: leadData.placa || "",
      Email: leadData.email || "",
      ANO: leadData.veiculoAno || "",
      VEICULO: leadData.veiculoMarcaModelo || "",
      SEXO: "",
      "DATA-DE-NASCIMENTO": "",
      "ESTADO-CIVIL": "",
      produto: leadData.ramo || "",
      utm_source: utm.utm_source || "",
      utm_campaign: utm.utm_campaign || "",
    },
    d: new Date().toISOString(),
    name,
  };
}

async function sendWithRetry(url, payload, label, leadId) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) return { delivered: true, attempts: attempt + 1 };
      logger.warn(`[retryLeadDelivery/${label}] Lead ${leadId}: resposta não-OK (status ${response.status}) na tentativa ${attempt + 1}.`);
    } catch (error) {
      logger.error(`[retryLeadDelivery/${label}] Lead ${leadId}: tentativa ${attempt + 1} falhou.`, error);
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  return { delivered: false, attempts: RETRY_DELAYS_MS.length + 1 };
}

exports.retryLeadDelivery = onValueWritten(
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

    // Registro apagado, ou não é (mais) candidato a reentrega — não faz nada.
    if (!record || record.autoSync !== true) return;

    const cfAttempts = (record.cf_retry_count || 0) + 1;
    if (cfAttempts > MAX_CF_ATTEMPTS_TOTAL) {
      logger.error(
        `[retryLeadDelivery] Lead ${leadId} excedeu ${MAX_CF_ATTEMPTS_TOTAL} rodadas de reentrega — desistindo (falha permanente, requer investigação manual).`
      );
      await snapshot.ref.update({ autoSync: false, status: "failed_permanently", cf_retry_count: cfAttempts });
      return;
    }

    const needsEspocrm = record.espocrm_sent !== true;
    const needsOctadesk = record.octadesk_sent !== true;

    if (!needsEspocrm && !needsOctadesk) {
      // Nada pendente (outra rodada já resolveu) — só desliga a flag.
      await snapshot.ref.update({ autoSync: false });
      return;
    }

    const leadData = record.data || {};
    const updates = { cf_retry_count: cfAttempts };

    if (needsEspocrm) {
      const espocrmUrl = record.environment === "production" ? ESPOCRM_PROD_URL.value() : ESPOCRM_DEV_URL.value();
      const result = await sendWithRetry(
        espocrmUrl,
        buildLegacyProxyPayload(leadData, "Cloud Function — Reentrega EspoCRM"),
        "espocrm",
        leadId
      );
      updates.espocrm_sent = result.delivered;
      updates.espocrm_attempts = (record.espocrm_attempts || 0) + result.attempts;
      updates.espocrm_last_error = result.delivered ? null : `Falha na reentrega (Cloud Function) após ${result.attempts} tentativa(s) — rodada ${cfAttempts}`;
    }

    if (needsOctadesk) {
      const result = await sendWithRetry(
        OCTADESK_URL.value(),
        buildLegacyProxyPayload(leadData, "Cloud Function — Reentrega Octadesk"),
        "octadesk",
        leadId
      );
      updates.octadesk_sent = result.delivered;
      updates.octadesk_attempts = (record.octadesk_attempts || 0) + result.attempts;
      updates.octadesk_last_error = result.delivered ? null : `Falha na reentrega (Cloud Function) após ${result.attempts} tentativa(s) — rodada ${cfAttempts}`;
    }

    const espocrmOk = needsEspocrm ? updates.espocrm_sent : true;
    const octadeskOk = needsOctadesk ? updates.octadesk_sent : true;
    const stillFailing = !espocrmOk || !octadeskOk;

    // Se ainda falhar, mantém autoSync:true — o próprio update() abaixo
    // dispara uma nova rodada desta função (até MAX_CF_ATTEMPTS_TOTAL).
    updates.autoSync = stillFailing;
    if (!stillFailing) {
      updates.status = "synced";
      updates.synced = true;
    }

    await snapshot.ref.update(updates);

    logger.info(`[retryLeadDelivery] Lead ${leadId}, rodada ${cfAttempts}: espocrm_sent=${updates.espocrm_sent ?? record.espocrm_sent}, octadesk_sent=${updates.octadesk_sent ?? record.octadesk_sent}, autoSync=${updates.autoSync}.`);
  }
);
