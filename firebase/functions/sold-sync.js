/**
 * firebase/functions/sold-sync.js — sync Opportunity Vendido ↔ Firebase.
 *
 * Contrato: docs/ESPO_VENDIDO_FIREBASE_SYNC.md
 * - action=set  → grava sold* (exige amount + cDataVenda)
 * - action=clear → remove sold*
 * Lookup: espocrmOpportunityId → espocrmLeadId → gclid
 * Dual RTDB: site novo (default app) + legado (app nomeado).
 * Nunca seta autoSync (não rearmar deliverLead).
 */
const { initializeApp, getApps, applicationDefault } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { logger } = require("firebase-functions");
const nodemailer = require("nodemailer");
const crypto = require("node:crypto");
const adsOffline = require("./ads-offline-conversion");

const SITE_NOVO_PROJECT = "imediato-seguros-site-novo";
const LEGACY_PROJECT = "leads-imediato-seguros";
const LEGACY_DATABASE_URL =
  "https://leads-imediato-seguros-default-rtdb.firebaseio.com";
const LEGACY_APP_NAME = "leads-imediato-seguros";
/** Best-effort legado; Espo webhookTimeout default=10s — manter curto. */
const LEGACY_TIMEOUT_MS = 8000;

/** Destinatários de alerta (validation_error, database_error, actionable no_firebase_match, …). */
const ERROR_EMAIL_TO = [
  "lrotero@gmail.com",
  "alexkaminski70@gmail.com",
  "alex.kaminski@imediatoseguros.com.br",
].join(", ");

const SOLD_FIELDS = [
  "soldStatus",
  "sold",
  "soldCommissionAmount",
  "soldStatusChangedAt",
  "soldDate",
  "soldEspoOpportunityId",
  "soldSyncedAt",
  "soldSyncSource",
];

function normalizePayload(raw) {
  const body = raw && typeof raw === "object" ? raw : {};
  let action = String(body.action || "")
    .trim()
    .toLowerCase();
  const opportunityId = String(
    body.opportunityId || body.id || body.entityId || ""
  ).trim();
  const stage = body.stage != null ? String(body.stage).trim() : "";
  const previousStage =
    body.previousStage != null ? String(body.previousStage).trim() : "";
  const cLeadId = String(body.cLeadId || body.leadId || "").trim() || null;
  const cGclid = String(body.cGclid || body.gclid || "").trim() || null;
  const cGbraid = String(body.cGbraid || body.gbraid || "").trim() || null;
  const cWbraid = String(body.cWbraid || body.wbraid || "").trim() || null;
  const modifiedAt =
    body.modifiedAt != null ? String(body.modifiedAt).trim() : null;
  const cWebpage =
    body.cWebpage != null ? String(body.cWebpage).trim() || null : null;
  const leadSource =
    body.leadSource != null ? String(body.leadSource).trim() || null : null;

  const amount = parseAmount(body.amount);

  let cDataVenda = body.cDataVenda ?? body.c_data_venda ?? null;
  if (cDataVenda != null) {
    cDataVenda = String(cDataVenda).trim() || null;
    if (cDataVenda && /^\d{4}-\d{2}-\d{2}/.test(cDataVenda)) {
      cDataVenda = cDataVenda.slice(0, 10);
    }
  }

  // Espo Webhook Opportunity.update: só atributos alterados — inferir action
  if (!action && opportunityId) {
    if (stage === "Vendido") action = "set";
    else if (stage) action = "clear";
  }

  return {
    action,
    opportunityId,
    stage,
    previousStage,
    amount,
    cDataVenda,
    cLeadId,
    cGclid,
    cGbraid,
    cWbraid,
    modifiedAt,
    cWebpage,
    leadSource,
  };
}

/** "1.234,56" e "439,50" → número. Sem vírgula, ponto é decimal. */
function parseAmount(amount) {
  if (amount === "" || amount === undefined || amount === null) return null;
  if (typeof amount === "number") return Number.isFinite(amount) ? amount : null;
  let s = String(amount).trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Espo envia sempre um array (batch). Aceita também objeto único / nosso smoke.
 * @returns {object[]}
 */
function expandRequestItems(body) {
  if (Array.isArray(body)) return body.filter((x) => x && typeof x === "object");
  if (body && typeof body === "object") {
    if (Array.isArray(body.entities)) return body.entities;
    if (body.entity && typeof body.entity === "object") return [body.entity];
    return [body];
  }
  return [];
}

function resolveEspoDevConfig(espoApiConfigRaw) {
  if (!espoApiConfigRaw) return null;
  try {
    const j = JSON.parse(espoApiConfigRaw);
    const block = j.dev || j;
    if (!block?.baseUrl || !block?.apiKey) return null;
    return {
      baseUrl: String(block.baseUrl).replace(/\/$/, ""),
      apiKey: String(block.apiKey),
    };
  } catch {
    return null;
  }
}

async function fetchOpportunityFromEspo(espoCfg, opportunityId) {
  if (!espoCfg || !opportunityId) return null;
  const url = `${espoCfg.baseUrl}/api/v1/Opportunity/${encodeURIComponent(opportunityId)}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": espoCfg.apiKey,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Espo GET Opportunity ${opportunityId} HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return text ? JSON.parse(text) : null;
}

/**
 * Completa amount/cDataVenda/cLeadId/cGclid/stage (e cWebpage/leadSource para
 * classificação) a partir do Espo quando o webhook manda só campos alterados.
 * Clear também completa cLeadId/clickIds — sem isso o match falha se OppId no
 * RTDB estiver stale (verificação 2026-09-25).
 */
async function enrichPayloadFromEspo(payload, espoApiConfigRaw) {
  if (!payload.opportunityId) return payload;
  const hasClickId = Boolean(payload.cGclid || payload.cGbraid || payload.cWbraid);
  const needsAlternates = !payload.cGbraid && !payload.cWbraid;
  const needsIdentity = !payload.cLeadId || !hasClickId;
  const needsSetCommercial =
    payload.action === "set" &&
    (payload.amount == null || !payload.cDataVenda || needsAlternates);
  const needsClassifyMeta = !payload.cWebpage || !payload.leadSource;
  const needsStage = !payload.stage;
  const needsFetch =
    needsIdentity || needsSetCommercial || needsClassifyMeta || needsStage;
  if (!needsFetch) return payload;

  const espoCfg = resolveEspoDevConfig(espoApiConfigRaw);
  // Preferir bloco conforme ambiente: se stage set e amount missing, tentar
  // ambos os blocos (dev primeiro; prod se baseUrl diferente).
  const configs = [];
  if (espoApiConfigRaw) {
    try {
      const j = JSON.parse(espoApiConfigRaw);
      if (j.dev?.baseUrl && j.dev?.apiKey) configs.push(j.dev);
      if (j.prod?.baseUrl && j.prod?.apiKey) configs.push(j.prod);
      if (!j.dev && !j.prod && j.baseUrl) configs.push(j);
    } catch {
      /* ignore */
    }
  }
  if (espoCfg && !configs.length) configs.push(espoCfg);

  let opp = null;
  let lastErr = null;
  for (const cfg of configs) {
    try {
      opp = await fetchOpportunityFromEspo(
        {
          baseUrl: String(cfg.baseUrl).replace(/\/$/, ""),
          apiKey: String(cfg.apiKey),
        },
        payload.opportunityId
      );
      if (opp) break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!opp) {
    if (lastErr) throw lastErr;
    return payload;
  }

  return normalizePayload({
    ...payload,
    action: payload.action,
    opportunityId: payload.opportunityId,
    stage: payload.stage || opp.stage,
    amount:
      payload.action === "set"
        ? payload.amount != null
          ? payload.amount
          : opp.amount
        : payload.amount,
    cDataVenda:
      payload.action === "set"
        ? payload.cDataVenda || opp.cDataVenda
        : payload.cDataVenda,
    cLeadId: payload.cLeadId || opp.cLeadId,
    cGclid: payload.cGclid || opp.cGclid,
    cGbraid: payload.cGbraid || opp.cGbraid,
    cWbraid: payload.cWbraid || opp.cWbraid,
    modifiedAt: payload.modifiedAt || opp.modifiedAt,
    cWebpage: payload.cWebpage || opp.cWebpage,
    leadSource: payload.leadSource || opp.leadSource,
  });
}

/**
 * Classifica no_firebase_match para decidir e-mail vs só RTDB.
 * @returns {{ missClass: string, skipEmail: boolean }}
 */
function classifyNoFirebaseMatch(payload) {
  const hasLead = Boolean(payload?.cLeadId);
  const hasClick = hasOpportunityClick(payload);
  const webpage = String(payload?.cWebpage || "").toLowerCase();
  const leadSource = String(payload?.leadSource || "").toLowerCase();
  const isSiteNovo =
    webpage.includes("novo.segurosimediato") ||
    webpage.includes("comparaseguroonline");
  const isLegacyWebpage =
    webpage.includes("mdmidia") ||
    (webpage.length > 0 && !isSiteNovo && !webpage.includes("segurosimediato"));
  const isPhoneSource =
    leadSource.includes("telefone") || leadSource.includes("phone");

  if (!hasLead && !hasClick) {
    return { missClass: "expected_no_attribution", skipEmail: true };
  }
  if (isSiteNovo || (hasLead && isSiteNovo)) {
    return { missClass: "actionable_site_novo_gap", skipEmail: false };
  }
  if (isLegacyWebpage || isPhoneSource) {
    return { missClass: "expected_legacy_or_unlinked", skipEmail: true };
  }
  if (hasLead && !hasClick && !webpage) {
    // Lead Espo sem click e sem webpage — tipicamente manual / telefone
    return { missClass: "expected_no_attribution", skipEmail: true };
  }
  if (hasClick || hasLead) {
    return { missClass: "actionable_unknown", skipEmail: false };
  }
  return { missClass: "expected_no_attribution", skipEmail: true };
}

function buildEspoSignatureV9(webhookId, rawBody, secretKey) {
  const hmacHex = crypto
    .createHmac("sha256", secretKey)
    .update(rawBody, "utf8")
    .digest("hex");
  return Buffer.from(`${webhookId}:${hmacHex}`).toString("base64");
}

/** Pré-v9: X-Signature com HMAC binário (Sender::buildSignatureLegacy). */
function buildEspoSignatureLegacy(webhookId, rawBody, secretKey) {
  const hmacBin = crypto
    .createHmac("sha256", secretKey)
    .update(rawBody, "utf8")
    .digest();
  return Buffer.concat([Buffer.from(`${webhookId}:`, "utf8"), hmacBin]).toString(
    "base64"
  );
}

function verifyEspoSignature({
  rawBody,
  signatureHeader,
  webhookId,
  webhookSecretKey,
  legacy = false,
}) {
  if (!signatureHeader || !webhookId || !webhookSecretKey || rawBody == null) {
    return false;
  }
  const expected = legacy
    ? buildEspoSignatureLegacy(webhookId, rawBody, webhookSecretKey)
    : buildEspoSignatureV9(webhookId, rawBody, webhookSecretKey);
  return timingSafeEqualString(signatureHeader, expected);
}

function authorizeRequest({
  req,
  rawBody,
  sharedSecret,
  espoWebhookId,
  espoWebhookSecretKey,
  espoWebhookAuths,
}) {
  const providedShared =
    req.get("X-Espo-Webhook-Secret") ||
    (req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (
    sharedSecret &&
    providedShared &&
    timingSafeEqualString(providedShared, sharedSecret)
  ) {
    return { ok: true, via: "shared_secret" };
  }

  // Espo 9+ envia Signature (hex) e X-Signature (legado binário). Proxies
  // às vezes dropam só "Signature" — aceitar ambos os algoritmos em ambos.
  const sigV9 = req.get("Signature");
  const sigLegacy = req.get("X-Signature");
  const authList = [];
  if (Array.isArray(espoWebhookAuths)) {
    for (const a of espoWebhookAuths) {
      if (a?.id && a?.secretKey) authList.push(a);
    }
  }
  if (espoWebhookId && espoWebhookSecretKey) {
    authList.push({ id: espoWebhookId, secretKey: espoWebhookSecretKey });
  }

  const body = rawBody || "";
  for (const a of authList) {
    if (
      sigV9 &&
      verifyEspoSignature({
        rawBody: body,
        signatureHeader: sigV9,
        webhookId: a.id,
        webhookSecretKey: a.secretKey,
        legacy: false,
      })
    ) {
      return {
        ok: true,
        via: "espo_signature",
        webhookId: a.id,
        environment: a.environment || null,
      };
    }
    if (
      sigLegacy &&
      verifyEspoSignature({
        rawBody: body,
        signatureHeader: sigLegacy,
        webhookId: a.id,
        webhookSecretKey: a.secretKey,
        legacy: true,
      })
    ) {
      return {
        ok: true,
        via: "espo_signature_legacy",
        webhookId: a.id,
        environment: a.environment || null,
      };
    }
  }

  return { ok: false };
}

/** Aceita {id,secretKey} | {dev,prod} | {webhooks:[{id,secretKey}]} */
function parseEspoWebhookAuth(raw) {
  if (!raw) return { auths: [] };
  try {
    const j = JSON.parse(raw);
    const auths = [];
    const pushAuth = (id, secretKey, environment) => {
      if (!id || !secretKey) return;
      auths.push({
        id: String(id),
        secretKey: String(secretKey),
        environment: environment || null,
      });
    };
    if (j.id && j.secretKey) {
      pushAuth(j.id, j.secretKey, j.environment || null);
    }
    if (Array.isArray(j.webhooks)) {
      for (const w of j.webhooks) {
        pushAuth(w?.id, w?.secretKey, w?.environment || null);
      }
    }
    for (const key of ["prod", "dev", "PROD", "DEV"]) {
      const block = j[key];
      const environment = key.toLowerCase() === "prod" ? "prod" : "dev";
      pushAuth(block?.id, block?.secretKey, environment);
    }
    const seen = new Set();
    const unique = [];
    for (const a of auths) {
      if (seen.has(a.id)) {
        const prev = unique.find((x) => x.id === a.id);
        if (prev && !prev.environment && a.environment) prev.environment = a.environment;
        continue;
      }
      seen.add(a.id);
      unique.push(a);
    }
    return { auths: unique };
  } catch {
    return { auths: [] };
  }
}

function validateSetPayload(p) {
  if (p.action !== "set") return "action must be set";
  if (!p.opportunityId) return "opportunityId required";
  if (p.stage && p.stage !== "Vendido") {
    return 'stage must be "Vendido" for action=set';
  }
  if (p.amount == null || p.amount === "") {
    return "amount required for action=set";
  }
  if (!p.cDataVenda) return "cDataVenda required for action=set";
  return null;
}

function validateClearPayload(p) {
  if (p.action !== "clear") return "action must be clear";
  if (!p.opportunityId) return "opportunityId required";
  return null;
}

function buildSetPatch(p, nowIso) {
  return {
    soldStatus: "vendido",
    sold: true,
    soldCommissionAmount: p.amount,
    soldStatusChangedAt: nowIso,
    soldDate: p.cDataVenda,
    soldEspoOpportunityId: p.opportunityId,
    soldSyncedAt: nowIso,
    soldSyncSource: "espo_webhook",
  };
}

function buildClearPatch() {
  const patch = {};
  for (const key of SOLD_FIELDS) patch[key] = null;
  return patch;
}

function isSetNoop(existing, patch) {
  if (!existing || existing.sold !== true) return false;
  return (
    Number(existing.soldCommissionAmount) === Number(patch.soldCommissionAmount) &&
    String(existing.soldDate || "") === String(patch.soldDate || "") &&
    String(existing.soldEspoOpportunityId || "") ===
      String(patch.soldEspoOpportunityId || "")
  );
}

function adsLeadMeta(existing) {
  if (!existing || typeof existing !== "object") {
    return {
      adsStatus: null,
      adsOrderId: null,
      adsRequestId: null,
      previousAmount: null,
    };
  }
  return {
    adsStatus: existing.adsOfflineConversionStatus || null,
    adsOrderId: existing.adsOfflineOrderId || null,
    adsRequestId: existing.adsOfflineRequestId || null,
    previousAmount:
      existing.soldCommissionAmount != null ? existing.soldCommissionAmount : null,
  };
}

function hasOpportunityClick(payload) {
  return Boolean(payload?.cGclid || payload?.cGbraid || payload?.cWbraid);
}

function leadAdsUnconfirmed(entry, orderId) {
  if (!entry) return true;
  return !(
    entry.adsStatus === "uploaded" &&
    String(entry.adsOrderId || "") === String(orderId || "")
  );
}

function isClearNoop(existing) {
  if (!existing) return true;
  return SOLD_FIELDS.every(
    (k) => existing[k] === undefined || existing[k] === null
  );
}

function extractGclid(rec) {
  if (!rec || typeof rec !== "object") return null;
  const data = rec.data && typeof rec.data === "object" ? rec.data : {};
  const utm = data.utm && typeof data.utm === "object" ? data.utm : {};
  return (
    utm.gclid ||
    data.GCLID_FLD ||
    data.gclid ||
    rec.gclid ||
    null
  );
}

function recordMatches(rec, { opportunityId, cLeadId, cGclid }) {
  if (!rec || typeof rec !== "object") return false;
  if (
    opportunityId &&
    String(rec.espocrmOpportunityId || "") === String(opportunityId)
  ) {
    return "espocrmOpportunityId";
  }
  if (cLeadId && String(rec.espocrmLeadId || "") === String(cLeadId)) {
    return "espocrmLeadId";
  }
  if (cGclid) {
    const g = extractGclid(rec);
    if (g && String(g) === String(cGclid)) return "gclid";
  }
  return null;
}

/**
 * Preferência: query indexada por OppId, depois LeadId; gclid via scan
 * (volume baixo — ver docs).
 */
async function findMatchingLeadIds(db, keys) {
  const { opportunityId, cLeadId, cGclid } = keys;
  const found = new Map(); // leadId -> method

  async function byChild(field, value, method) {
    if (!value) return;
    try {
      const snap = await db
        .ref("leads_backup")
        .orderByChild(field)
        .equalTo(value)
        .get();
      if (!snap.exists()) return;
      snap.forEach((child) => {
        if (!found.has(child.key)) found.set(child.key, method);
      });
    } catch (err) {
      logger.warn(
        `[sold-sync] orderByChild(${field}) falhou (índice?): ${err.message}`
      );
    }
  }

  await byChild("espocrmOpportunityId", opportunityId, "espocrmOpportunityId");
  if (found.size === 0) {
    await byChild("espocrmLeadId", cLeadId, "espocrmLeadId");
  }

  if (found.size === 0 && cGclid) {
    const snap = await db.ref("leads_backup").get();
    if (snap.exists()) {
      snap.forEach((child) => {
        const method = recordMatches(child.val(), {
          opportunityId: null,
          cLeadId: null,
          cGclid,
        });
        if (method && !found.has(child.key)) found.set(child.key, method);
      });
    }
  }

  return found;
}

function getLegacyDatabase() {
  const existing = getApps().find((a) => a.name === LEGACY_APP_NAME);
  // Credencial explícita (ADC da CF) — sem isso o named app herda mal o
  // projeto e o RTDB legado fica em loop de "credentials are invalid".
  const app =
    existing ||
    initializeApp(
      {
        credential: applicationDefault(),
        databaseURL: LEGACY_DATABASE_URL,
      },
      LEGACY_APP_NAME
    );
  return getDatabase(app);
}

function getSiteNovoDatabase() {
  return getDatabase();
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timeout after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function applyToDatabase(db, projectId, payload, action) {
  const matches = await findMatchingLeadIds(db, {
    opportunityId: payload.opportunityId,
    cLeadId: payload.cLeadId,
    cGclid: payload.cGclid,
  });

  if (matches.size === 0) {
    return { projectId, updated: [], noop: [], matchCount: 0, reconciled: [] };
  }

  const nowIso = new Date().toISOString();
  const setPatch = action === "set" ? buildSetPatch(payload, nowIso) : null;
  const clearPatch = action === "clear" ? buildClearPatch() : null;
  const updated = [];
  const noop = [];
  const reconciled = [];

  for (const [leadId, method] of matches.entries()) {
    const ref = db.ref(`leads_backup/${leadId}`);
    const snap = await ref.get();
    const existing = snap.exists() ? snap.val() : null;

    const patch = { ...(action === "set" ? setPatch : clearPatch) };
    if (
      method === "espocrmLeadId" &&
      payload.opportunityId &&
      existing &&
      String(existing.espocrmOpportunityId || "") !== String(payload.opportunityId)
    ) {
      patch.espocrmOpportunityId = payload.opportunityId;
      reconciled.push({
        leadId,
        previousOpportunityId: existing.espocrmOpportunityId || null,
        opportunityId: payload.opportunityId,
      });
      logger.info("[sold-sync] opp_id_reconciled", {
        projectId,
        leadId,
        previousOpportunityId: existing.espocrmOpportunityId || null,
        opportunityId: payload.opportunityId,
      });
    }

    if (action === "set") {
      const snapAds = adsLeadMeta(existing);
      if (isSetNoop(existing, setPatch) && !patch.espocrmOpportunityId) {
        noop.push({ leadId, method, ...snapAds });
        continue;
      }
      // Nunca tocar autoSync / status de captura
      await ref.update(patch);
      updated.push({ leadId, method, ...snapAds });
    } else {
      const snapAds = adsLeadMeta(existing);
      if (isClearNoop(existing) && !patch.espocrmOpportunityId) {
        noop.push({ leadId, method, ...snapAds });
        continue;
      }
      await ref.update(patch);
      updated.push({ leadId, method, ...snapAds });
    }
  }

  return {
    projectId,
    updated,
    noop,
    matchCount: matches.size,
    reconciled,
  };
}

/**
 * Texto leigo para o e-mail de alerta (antes do dump técnico).
 * @param {{ reason: string, missClass?: string|null, results?: unknown, payload?: object }} opts
 */
function explainSoldSyncErrorPlain({ reason, missClass = null, results, payload }) {
  const detail = Array.isArray(results)
    ? String(results.find((r) => r && r.error)?.error || "")
    : "";
  const oppId = payload?.opportunityId ? String(payload.opportunityId) : null;
  const oppHint = oppId
    ? ` Oportunidade envolvida: ${oppId}.`
    : "";

  if (reason === "validation_error") {
    if (/amount required/i.test(detail)) {
      return (
        "Em resumo: alguém marcou uma venda como «Vendido» no CRM sem preencher o Valor da Comissão. " +
        "Por segurança, o sistema não gravou essa venda no Firebase (e a conversão offline do Google Ads, se aplicável, também não sobe)." +
        " O que fazer: abra a oportunidade no Espo, preencha o Valor Comissão e salve de novo." +
        oppHint
      );
    }
    if (/cDataVenda required/i.test(detail)) {
      return (
        "Em resumo: a venda foi marcada como «Vendido», mas faltou a data da venda. " +
        "Sem essa data o sistema não registra a venda no Firebase." +
        " O que fazer: preencha a data da venda (cDataVenda) na oportunidade e salve novamente." +
        oppHint
      );
    }
    if (/stage must be/i.test(detail)) {
      return (
        "Em resumo: o sistema recebeu um pedido para registrar venda, mas o estágio da oportunidade não é «Vendido». " +
        "Nada foi alterado no Firebase. Confira o estágio no CRM." +
        oppHint
      );
    }
    return (
      "Em resumo: os dados enviados pelo CRM estavam incompletos ou inválidos para registrar/atualizar a venda no Firebase. " +
      "Nada foi gravado. Detalhe técnico abaixo; em geral basta corrigir os campos da oportunidade e salvar de novo." +
      (detail ? ` Motivo: ${detail}.` : "") +
      oppHint
    );
  }

  if (reason === "database_error") {
    return (
      "Em resumo: o CRM pediu para atualizar a venda, mas houve falha ao gravar no Firebase (banco de dados). " +
      "A venda pode estar correta no Espo e ainda assim não aparecer no painel/relatórios que leem o Firebase. " +
      "Vale investigar com TI; pode ser necessário reprocessar o sync." +
      oppHint
    );
  }

  if (reason === "no_firebase_match") {
    if (missClass === "actionable_site_novo_gap") {
      return (
        "Em resumo: a oportunidade foi marcada como vendida no CRM, mas não encontramos o lead correspondente no Firebase do site novo. " +
        "A venda existe no Espo, porém não fica espelhada no Firebase (relatórios e Google Ads offline podem ficar incompletos). " +
        "O que fazer: conferir se o lead veio do site novo e se o vínculo Lead/Oportunidade (e IDs de clique) está preenchido." +
        oppHint
      );
    }
    if (missClass === "actionable_unknown") {
      return (
        "Em resumo: há indícios de atribuição (lead ou clique de anúncio), mas mesmo assim não achamos o registro no Firebase. " +
        "A venda no CRM não foi espelhada. Vale revisar o vínculo com o lead e os IDs de campanha." +
        oppHint
      );
    }
    return (
      "Em resumo: a venda foi atualizada no CRM, mas não encontramos lead correspondente no Firebase para espelhar os campos de «vendido». " +
      "Em muitos casos isso é esperado (ex.: lead legado ou sem atribuição online); se for lead do site novo, precisa de atenção." +
      oppHint
    );
  }

  if (reason === "internal_error") {
    return (
      "Em resumo: ocorreu um erro inesperado no sincronizador de vendas (não é só um campo faltando). " +
      "A atualização pode não ter chegado ao Firebase. TI deve olhar os logs da Cloud Function." +
      oppHint
    );
  }

  if (reason === "legacy_partial_failure") {
    return (
      "Em resumo: a venda foi gravada no Firebase do site novo, mas a cópia no banco legado falhou ou demorou. " +
      "O site novo prevalece; o legado pode ficar defasado até um reprocessamento. Em geral não exige ação comercial imediata." +
      oppHint
    );
  }

  return (
    "Em resumo: o sincronizador Espo → Firebase encontrou um problema ao processar uma oportunidade. " +
    "Veja o motivo técnico abaixo e, se for venda do site novo, confira se o status «vendido» aparece corretamente nos sistemas." +
    oppHint
  );
}

/**
 * Best-effort: SMTP via CONTACT_SMTP_CONFIG (pode falhar em IP GCP).
 * Sempre loga; se SMTP falhar, grava sold_sync_errors no RTDB site novo.
 */
async function notifySoldSyncError({
  smtpConfigRaw,
  reason,
  payload,
  results,
  skipEmail = false,
  missClass = null,
}) {
  const subject = missClass
    ? `[sold-sync] ${reason} (${missClass})`
    : `[sold-sync] ${reason}`;
  const plain = explainSoldSyncErrorPlain({ reason, missClass, results, payload });
  const text = [
    plain,
    "—",
    "Detalhes técnicos (para TI):",
    `Motivo: ${reason}`,
    missClass ? `Classe: ${missClass}` : null,
    `Quando: ${new Date().toISOString()}`,
    `Payload: ${JSON.stringify(payload, null, 2)}`,
    `Resultados: ${JSON.stringify(results, null, 2)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  logger.error(`[sold-sync] ${reason}`, { payload, results, missClass });

  let emailSent = false;
  let emailError = null;

  if (!skipEmail && smtpConfigRaw) {
    try {
      const cfg = JSON.parse(smtpConfigRaw);
      if (cfg.host && cfg.user && cfg.pass) {
        const transporter = nodemailer.createTransport({
          host: cfg.host,
          port: Number(cfg.port || 465),
          secure: Number(cfg.port || 465) === 465,
          auth: { user: cfg.user, pass: cfg.pass },
        });
        await transporter.sendMail({
          from: cfg.from || cfg.user,
          to: ERROR_EMAIL_TO,
          subject,
          text,
        });
        emailSent = true;
      }
    } catch (err) {
      emailError = err.message || String(err);
      logger.warn(`[sold-sync] e-mail falhou: ${emailError}`);
    }
  }

  try {
    const errRef = getSiteNovoDatabase().ref("sold_sync_errors").push();
    await errRef.set({
      createdAt: new Date().toISOString(),
      reason,
      missClass: missClass || null,
      payload,
      results,
      emailTo: ERROR_EMAIL_TO,
      emailSent,
      emailError,
      skipEmail: Boolean(skipEmail),
      plainSummary: plain,
    });
  } catch (err) {
    logger.warn(`[sold-sync] falha ao gravar sold_sync_errors: ${err.message}`);
  }

  return { emailSent, emailError };
}

async function handleSoldSync(payload, { smtpConfigRaw, adsConfigRaw, allowAds = false } = {}) {
  const action = payload.action;
  const results = [];

  // 1) Site novo — obrigatório
  try {
    const r = await applyToDatabase(
      getSiteNovoDatabase(),
      SITE_NOVO_PROJECT,
      payload,
      action
    );
    results.push({ ...r, ok: true });
  } catch (err) {
    logger.error(`[sold-sync] falha em ${SITE_NOVO_PROJECT}:`, err);
    results.push({
      projectId: SITE_NOVO_PROJECT,
      ok: false,
      error: err.message || String(err),
      updated: [],
      noop: [],
      matchCount: 0,
    });
  }

  // 2) Legado — best-effort com timeout (não derruba o set/clear do site novo)
  try {
    const r = await withTimeout(
      applyToDatabase(getLegacyDatabase(), LEGACY_PROJECT, payload, action),
      LEGACY_TIMEOUT_MS,
      LEGACY_PROJECT
    );
    results.push({ ...r, ok: true });
  } catch (err) {
    logger.warn(`[sold-sync] legado best-effort falhou: ${err.message || err}`);
    results.push({
      projectId: LEGACY_PROJECT,
      ok: false,
      bestEffort: true,
      error: err.message || String(err),
      updated: [],
      noop: [],
      matchCount: 0,
    });
  }

  const siteNovo = results.find((r) => r.projectId === SITE_NOVO_PROJECT);
  const totalUpdated = results.reduce((n, r) => n + (r.updated?.length || 0), 0);
  const totalNoop = results.reduce((n, r) => n + (r.noop?.length || 0), 0);
  const anyMatch = results.some((r) => (r.matchCount || 0) > 0);
  const siteNovoFailed = siteNovo && siteNovo.ok === false;

  if (siteNovoFailed) {
    await notifySoldSyncError({
      smtpConfigRaw,
      reason: "database_error",
      payload,
      results,
    });
    return { httpStatus: 500, body: { ok: false, error: "database_error", results } };
  }

  if (!anyMatch) {
    const databases = {
      [SITE_NOVO_PROJECT]: getSiteNovoDatabase(),
      [LEGACY_PROJECT]: getLegacyDatabase(),
    };
    const { missClass, skipEmail: skipMissEmail } =
      classifyNoFirebaseMatch(payload);
    if (allowAds && (action === "set" || action === "clear")) {
      try {
        const fromOpp =
          action === "clear"
            ? await adsOffline.handleAdsOfflineRetract({
                payload,
                results,
                adsConfigRaw,
                databases,
                opportunityOnly: true,
              })
            : await adsOffline.handleAdsOfflineAfterSoldSet({
                payload,
                results,
                adsConfigRaw,
                databases,
                opportunityOnly: true,
              });
        const progressed = adsAttemptProgressed(fromOpp);
        if (progressed) {
          await notifySoldSyncError({
            smtpConfigRaw,
            reason: "no_firebase_match",
            payload,
            results,
            missClass,
            skipEmail: true,
          });
          return {
            httpStatus: 200,
            body: {
              ok: true,
              action,
              firebaseMatch: false,
              updatedCount: 0,
              noopCount: 0,
              results,
              missClass,
              adsOffline: fromOpp,
            },
          };
        }
      } catch (err) {
        logger.warn(
          `[sold-sync] ads sem match Firebase falhou: ${err.message || err}`
        );
      }
    }
    await notifySoldSyncError({
      smtpConfigRaw,
      reason: "no_firebase_match",
      payload,
      results,
      missClass,
      skipEmail: skipMissEmail,
    });
    return {
      httpStatus: 404,
      body: { ok: false, error: "no_firebase_match", missClass, results },
    };
  }

  // Legado falhou mas site novo ok — resposta 200 (best-effort); registra aviso
  // sem bloquear o sync (fila Espo não deve retentar só por causa do legado).
  const legacy = results.find((r) => r.projectId === LEGACY_PROJECT);
  if (legacy && legacy.ok === false) {
    await notifySoldSyncError({
      smtpConfigRaw,
      reason: "legacy_partial_failure",
      payload,
      results,
      skipEmail: true, // aviso em RTDB; e-mail só para no_match / site novo / validação
    });
  }

  // Offline Ads só com webhook PROD. Clear confirma retract; set reenvia se não houver uploaded.
  let adsOfflineResult = null;
  const leadEntries = [];
  for (const r of results) {
    if (!r || r.ok === false) continue;
    for (const u of r.updated || []) leadEntries.push(u);
    for (const u of r.noop || []) leadEntries.push(u);
  }
  const needsAdsRetry = leadEntries.some((e) =>
    leadAdsUnconfirmed(e, payload.opportunityId)
  );
  if (
    allowAds &&
    shouldAttemptAdsOffline(action, totalUpdated, { needsAdsRetry })
  ) {
    try {
      adsOfflineResult = await adsOffline.handleAdsOfflineAfterSoldSet({
        payload,
        results,
        adsConfigRaw,
        databases: {
          [SITE_NOVO_PROJECT]: getSiteNovoDatabase(),
          [LEGACY_PROJECT]: getLegacyDatabase(),
        },
      });
    } catch (err) {
      logger.warn(
        `[sold-sync] ads-offline best-effort falhou: ${err.message || err}`
      );
      adsOfflineResult = {
        ok: false,
        error: err.message || String(err),
      };
    }
  } else if (allowAds && shouldAttemptAdsRetract(action, leadEntries)) {
    try {
      adsOfflineResult = await adsOffline.handleAdsOfflineRetract({
        payload,
        results,
        adsConfigRaw,
        databases: {
          [SITE_NOVO_PROJECT]: getSiteNovoDatabase(),
          [LEGACY_PROJECT]: getLegacyDatabase(),
        },
      });
    } catch (err) {
      logger.warn(
        `[sold-sync] ads-offline retract falhou: ${err.message || err}`
      );
      adsOfflineResult = {
        ok: false,
        error: err.message || String(err),
      };
    }
  }

  return {
    httpStatus: 200,
    body: {
      ok: true,
      action,
      updatedCount: totalUpdated,
      noopCount: totalNoop,
      legacyBestEffortFailed: Boolean(legacy && legacy.ok === false),
      results,
      adsOffline: adsOfflineResult,
    },
  };
}

function timingSafeEqualString(a, b) {
  const sa = String(a || "");
  const sb = String(b || "");
  if (sa.length !== sb.length) return false;
  let out = 0;
  for (let i = 0; i < sa.length; i++) out |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return out === 0;
}

/** Offline Ads no set com update, ou no-op se o upload ainda não foi confirmado. Clear nunca. */
function shouldAttemptAdsOffline(action, totalUpdated, opts = {}) {
  if (action !== "set") return false;
  if (Number(totalUpdated) > 0) return true;
  return Boolean(opts.needsAdsRetry);
}

function adsAttemptProgressed(result) {
  if (!result || result.skipped) return false;
  const rows = result.leadResults || [];
  return rows.some((r) =>
    ["accepted", "uploaded", "error", "retracted", "restated"].includes(r.status)
  );
}

function shouldAttemptAdsRetract(action, entries) {
  if (action !== "clear") return false;
  return (entries || []).some((e) => e.adsStatus === "uploaded");
}

module.exports = {
  SOLD_FIELDS,
  SITE_NOVO_PROJECT,
  LEGACY_PROJECT,
  ERROR_EMAIL_TO,
  normalizePayload,
  expandRequestItems,
  enrichPayloadFromEspo,
  authorizeRequest,
  parseEspoWebhookAuth,
  buildEspoSignatureV9,
  buildEspoSignatureLegacy,
  validateSetPayload,
  validateClearPayload,
  buildSetPatch,
  buildClearPatch,
  isSetNoop,
  isClearNoop,
  extractGclid,
  recordMatches,
  findMatchingLeadIds,
  classifyNoFirebaseMatch,
  handleSoldSync,
  notifySoldSyncError,
  explainSoldSyncErrorPlain,
  timingSafeEqualString,
  shouldAttemptAdsOffline,
  shouldAttemptAdsRetract,
  hasOpportunityClick,
  leadAdsUnconfirmed,
  parseAmount,
};
