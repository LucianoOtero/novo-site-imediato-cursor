/**
 * firebase/functions/ads-offline-conversion.js
 *
 * Upload offline (Data Manager events:ingest) após sold-sync.
 * Contrato: docs/ADS_OFFLINE_VENDIDO_FIREBASE.md
 *
 * - HTTP 200 do ingest grava `accepted`. `uploaded` só com requestStatus SUCCESS.
 * - `accepted` e `error` permitem reenvio. gclid inválido tenta gbraid/wbraid.
 * - Feature flag: GOOGLE_ADS_API_CONFIG.enabled (permanece false até o corte).
 * - Retract (RETRACTION) só se o status era `uploaded`. Ajuste de valor = RESTATEMENT.
 * - Sem nó no Firebase, usa o click da Opportunity e audita sem inventar leads_backup.
 */
const { logger } = require("firebase-functions");
const { getDatabase } = require("firebase-admin/database");

const ADS_API_BASE = "https://googleads.googleapis.com/v25";
const DATA_MANAGER_INGEST_URL = "https://datamanager.googleapis.com/v1/events:ingest";
const DATA_MANAGER_STATUS_URL =
  "https://datamanager.googleapis.com/v1/requestStatus:retrieve";
const ADS_ADJUSTMENT_PATH = ":uploadConversionAdjustments";
const ADS_UPLOAD_TIMEOUT_MS = 8000;
const DEFAULT_CUSTOMER_ID = "9947918772";
const DEFAULT_CONVERSION_ACTION_ID = "303889427";
const DEFAULT_CURRENCY = "BRL";
const DEFAULT_TIMEZONE_OFFSET = "-03:00";
const AUDIT_RESPONSE_SNIPPET_MAX = 2000;
/** Sufixo do jobId diário (< 2^31) — agrupa uploads do mesmo dia nos job_summaries Ads. */
const DAILY_JOB_ID_SUFFIX = 1;

/**
 * @param {string|null|undefined} raw
 * @returns {{
 *   enabled: boolean,
 *   developerToken?: string,
 *   clientId?: string,
 *   clientSecret?: string,
 *   refreshToken?: string,
 *   customerId: string,
 *   loginCustomerId?: string,
 *   conversionActionId: string,
 *   currencyCode: string,
 *   timezoneOffset: string,
 * } | null}
 */
function parseAdsConfig(raw) {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object") return null;
    const enabled = j.enabled === true;
    const customerId = String(j.customerId || DEFAULT_CUSTOMER_ID).replace(
      /\D/g,
      ""
    );
    const conversionActionId = String(
      j.conversionActionId || DEFAULT_CONVERSION_ACTION_ID
    ).replace(/\D/g, "");
    const loginCustomerId = j.loginCustomerId
      ? String(j.loginCustomerId).replace(/\D/g, "")
      : "";
    return {
      enabled,
      developerToken: j.developerToken ? String(j.developerToken) : "",
      clientId: j.clientId ? String(j.clientId) : "",
      clientSecret: j.clientSecret ? String(j.clientSecret) : "",
      refreshToken: j.refreshToken ? String(j.refreshToken) : "",
      customerId,
      loginCustomerId: loginCustomerId || undefined,
      conversionActionId,
      currencyCode: String(j.currencyCode || DEFAULT_CURRENCY),
      timezoneOffset: String(j.timezoneOffset || DEFAULT_TIMEZONE_OFFSET),
    };
  } catch {
    return null;
  }
}

function configReadyForUpload(cfg) {
  // Data Manager: OAuth + customer + conversionAction (developerToken opcional)
  return Boolean(
    cfg &&
      cfg.enabled &&
      cfg.clientId &&
      cfg.clientSecret &&
      cfg.refreshToken &&
      cfg.customerId &&
      cfg.conversionActionId
  );
}

/**
 * Preferência: gclid > gbraid > wbraid (API exige só um).
 * @returns {{ type: 'gclid'|'gbraid'|'wbraid', value: string } | null}
 */
function extractClickCandidates(rec) {
  const list = [];
  if (!rec || typeof rec !== "object") return list;
  const data = rec.data && typeof rec.data === "object" ? rec.data : {};
  const utm = data.utm && typeof data.utm === "object" ? data.utm : {};
  pushClick(list, "gclid", utm.gclid);
  pushClick(list, "gclid", data.GCLID_FLD);
  pushClick(list, "gclid", data.gclid);
  pushClick(list, "gclid", rec.gclid);
  pushClick(list, "gbraid", utm.gbraid);
  pushClick(list, "gbraid", data.gbraid);
  pushClick(list, "gbraid", rec.gbraid);
  pushClick(list, "wbraid", utm.wbraid);
  pushClick(list, "wbraid", data.wbraid);
  pushClick(list, "wbraid", rec.wbraid);
  return list;
}

function clicksFromPayload(payload) {
  const list = [];
  pushClick(list, "gclid", payload?.cGclid);
  pushClick(list, "gbraid", payload?.cGbraid);
  pushClick(list, "wbraid", payload?.cWbraid);
  return list;
}

function pushClick(list, type, value) {
  const v = nonEmpty(value);
  if (!v) return;
  if (list.some((c) => c.type === type && c.value === v)) return;
  list.push({ type, value: v });
}

function extractClickId(rec) {
  return extractClickCandidates(rec)[0] || null;
}

function nonEmpty(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * Google Ads: yyyy-mm-dd hh:mm:ss±hh:mm
 */
function formatConversionDateTime(
  soldSyncedAt,
  soldDate,
  timezoneOffset = DEFAULT_TIMEZONE_OFFSET,
  now = new Date()
) {
  const instant = resolveConversionDate(
    soldSyncedAt,
    soldDate,
    timezoneOffset,
    now
  );
  return formatInstant(instant, timezoneOffset || DEFAULT_TIMEZONE_OFFSET);
}

function offsetMinutes(timezoneOffset) {
  const offset = timezoneOffset || DEFAULT_TIMEZONE_OFFSET;
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  const sign = m && m[1] === "-" ? -1 : 1;
  return m ? sign * (Number(m[2]) * 60 + Number(m[3])) : -3 * 60;
}

function shiftToOffset(date, timezoneOffset) {
  return new Date(date.getTime() + offsetMinutes(timezoneOffset) * 60 * 1000);
}

function civilDate(date, timezoneOffset) {
  const local = shiftToOffset(date, timezoneOffset);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatInstant(d, timezoneOffset) {
  const offset = timezoneOffset || DEFAULT_TIMEZONE_OFFSET;
  const local = shiftToOffset(d, offset);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mi = String(local.getUTCMinutes()).padStart(2, "0");
  const ss = String(local.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}${offset}`;
}

/**
 * Data anterior a hoje → 23:59:59 desse dia. Hoje ou sem data → instante do webhook.
 * Nunca devolve horário futuro.
 */
function resolveConversionDate(
  soldSyncedAt,
  soldDate,
  timezoneOffset = DEFAULT_TIMEZONE_OFFSET,
  now = new Date()
) {
  const offset = timezoneOffset || DEFAULT_TIMEZONE_OFFSET;
  const today = civilDate(now, offset);
  const saleDay = soldDate ? String(soldDate).slice(0, 10) : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(saleDay) && saleDay < today) {
    const end = new Date(`${saleDay}T23:59:59${offset}`);
    if (!Number.isNaN(end.getTime())) return end;
  }
  if (soldSyncedAt) {
    const d = new Date(soldSyncedAt);
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now.getTime()) return d;
  }
  return now;
}

/**
 * jobId diário estável (< 2^31) para agrupar uploads nos job_summaries Ads.
 * Formato: YYYYMMDD * 100 + DAILY_JOB_ID_SUFFIX (ex.: 2026090501).
 */
function buildDailyJobId(timezoneOffset = DEFAULT_TIMEZONE_OFFSET, now = new Date()) {
  const offset = timezoneOffset || DEFAULT_TIMEZONE_OFFSET;
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(offset);
  const sign = m && m[1] === "-" ? -1 : 1;
  const offMin = m
    ? sign * (Number(m[2]) * 60 + Number(m[3]))
    : -3 * 60;
  const local = new Date(now.getTime() + offMin * 60 * 1000);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const id = Number(`${yyyy}${mm}${dd}`) * 100 + DAILY_JOB_ID_SUFFIX;
  if (!Number.isFinite(id) || id < 0 || id >= 2 ** 31) {
    return Math.floor(now.getTime() / 1000) % (2 ** 31);
  }
  return id;
}

function conversionActionResource(customerId, conversionActionId) {
  return `customers/${customerId}/conversionActions/${conversionActionId}`;
}

/**
 * RFC 3339 para Data Manager `eventTimestamp`.
 * Prefer soldSyncedAt ISO; senão converte o formato Ads com offset.
 */
function toEventTimestampRfc3339(
  soldSyncedAt,
  soldDate,
  timezoneOffset = DEFAULT_TIMEZONE_OFFSET,
  now = new Date()
) {
  return resolveConversionDate(
    soldSyncedAt,
    soldDate,
    timezoneOffset,
    now
  ).toISOString();
}

function buildClickConversion({
  click,
  cfg,
  orderId,
  conversionValue,
  conversionDateTime,
}) {
  const conv = {
    conversionAction: conversionActionResource(
      cfg.customerId,
      cfg.conversionActionId
    ),
    conversionDateTime,
    conversionValue: Number(conversionValue),
    currencyCode: cfg.currencyCode || DEFAULT_CURRENCY,
    orderId: String(orderId),
  };
  conv[click.type] = click.value;
  return conv;
}

/** Evento Data Manager (equiv. ClickConversion). */
function buildDataManagerEvent({
  click,
  orderId,
  conversionValue,
  currencyCode,
  eventTimestamp,
}) {
  const adIdentifiers = {};
  adIdentifiers[click.type] = click.value;
  return {
    adIdentifiers,
    conversionValue: Number(conversionValue),
    currency: currencyCode || DEFAULT_CURRENCY,
    eventTimestamp,
    transactionId: String(orderId),
    eventSource: "WEB",
  };
}

function buildDataManagerDestination(cfg) {
  const destination = {
    operatingAccount: {
      accountType: "GOOGLE_ADS",
      accountId: cfg.customerId,
    },
    productDestinationId: String(cfg.conversionActionId),
  };
  if (cfg.loginCustomerId) {
    destination.loginAccount = {
      accountType: "GOOGLE_ADS",
      accountId: cfg.loginCustomerId,
    };
  }
  return destination;
}

function truncateSnippet(value, max = AUDIT_RESPONSE_SNIPPET_MAX) {
  if (value == null) return null;
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * Shape do registro de auditoria (sem createdAt — preenchido no append).
 */
function buildAuditEntry({
  status,
  reason = null,
  opportunityId = null,
  orderId = null,
  leadId = null,
  projectId = null,
  clickIdType = null,
  clickId = null,
  conversionValue = null,
  currencyCode = null,
  conversionDateTime = null,
  conversionActionId = null,
  customerId = null,
  adsJobId = null,
  adsRequestId = null,
  error = null,
  responseSnippet = null,
}) {
  return {
    status,
    reason: reason || null,
    opportunityId: opportunityId || null,
    orderId: orderId || opportunityId || null,
    leadId: leadId || null,
    projectId: projectId || null,
    clickIdType: clickIdType || null,
    clickId: clickId || null,
    conversionValue:
      conversionValue != null && Number.isFinite(Number(conversionValue))
        ? Number(conversionValue)
        : null,
    currencyCode: currencyCode || null,
    conversionDateTime: conversionDateTime || null,
    conversionActionId: conversionActionId || null,
    customerId: customerId || null,
    adsJobId: adsJobId != null ? adsJobId : null,
    adsRequestId: adsRequestId || null,
    error: error ? truncateSnippet(error, 800) : null,
    responseSnippet: responseSnippet
      ? truncateSnippet(responseSnippet)
      : null,
  };
}

/**
 * Append-only em ads_offline_audit (site novo). Retorna pushId ou null.
 */
async function appendAdsOfflineAudit(entry) {
  try {
    const ref = getDatabase().ref("ads_offline_audit").push();
    await ref.set({
      createdAt: new Date().toISOString(),
      ...entry,
    });
    return ref.key;
  } catch (err) {
    logger.warn(
      `[ads-offline] falha ao gravar ads_offline_audit: ${err.message}`
    );
    return null;
  }
}

async function refreshAccessToken(cfg) {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    refresh_token: cfg.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!res.ok || !data.access_token) {
    throw new Error(
      `OAuth refresh falhou HTTP ${res.status}: ${text.slice(0, 300)}`
    );
  }
  return String(data.access_token);
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

/**
 * Upload via Data Manager API (events:ingest).
 * UploadClickConversions da Ads API está bloqueado para integrações novas.
 *
 * @returns {{
 *   ok: boolean,
 *   raw?: object,
 *   error?: string,
 *   requestId?: string|null,
 *   jobId?: null,
 * }}
 */
async function uploadOfflineConversion(cfg, event, accessToken) {
  const body = {
    destinations: [buildDataManagerDestination(cfg)],
    encoding: "HEX",
    validateOnly: false,
    events: [event],
  };

  const res = await withTimeout(
    fetch(DATA_MANAGER_INGEST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    ADS_UPLOAD_TIMEOUT_MS,
    "ads_datamanager_ingest"
  );

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  const requestId =
    data.requestId ||
    data.request_id ||
    res.headers?.get?.("request-id") ||
    null;

  if (!res.ok) {
    return {
      ok: false,
      raw: data,
      error: `Data Manager HTTP ${res.status}: ${text.slice(0, 400)}`,
      requestId,
      jobId: null,
    };
  }

  return {
    ok: true,
    raw: data,
    requestId,
    jobId: null,
  };
}

function alreadyUploaded(existing, orderId) {
  if (!existing || typeof existing !== "object") return false;
  return (
    existing.adsOfflineConversionStatus === "uploaded" &&
    String(existing.adsOfflineOrderId || "") === String(orderId)
  );
}

function adsFlagsPatch({
  status,
  clickType,
  orderId,
  errorMessage,
  adsJobId = null,
  adsOfflineAuditKey = null,
  requestId = null,
}) {
  const now = new Date().toISOString();
  const patch = {
    adsOfflineConversionStatus: status,
    adsOfflineOrderId: orderId || null,
    adsOfflineClickIdType: clickType || null,
    adsOfflineConversionUploadedAt:
      status === "uploaded" || status === "restated" || status === "retracted"
        ? now
        : status === "skipped"
          ? now
          : null,
  };
  if (requestId) patch.adsOfflineRequestId = requestId;
  if (adsJobId != null) {
    patch.adsOfflineJobId = adsJobId;
  }
  if (adsOfflineAuditKey) {
    patch.adsOfflineAuditKey = adsOfflineAuditKey;
  }
  if (status === "error") {
    patch.adsOfflineConversionLastError = errorMessage || "unknown";
    patch.adsOfflineConversionLastErrorAt = now;
  } else {
    patch.adsOfflineConversionLastError = null;
    patch.adsOfflineConversionLastErrorAt = null;
  }
  return patch;
}

/**
 * Processa uploads para leads do set (site novo + legado) e, sem nó,
 * para o click gravado na Opportunity. HTTP 200 do ingest fica `accepted`
 * até o status assíncrono ser SUCCESS.
 */
async function handleAdsOfflineAfterSoldSet({
  payload,
  results,
  adsConfigRaw,
  databases,
  opportunityOnly = false,
}) {
  const cfg = parseAdsConfig(adsConfigRaw);
  if (!cfg) {
    logger.info("[ads-offline] skip: secret ausente/inválido");
    await appendAdsOfflineAudit(
      buildAuditEntry({
        status: "skipped",
        reason: "no_config",
        opportunityId: payload?.opportunityId || null,
      })
    );
    return { skipped: true, reason: "no_config" };
  }
  if (!cfg.enabled) {
    logger.info("[ads-offline] skip: enabled=false");
    await appendAdsOfflineAudit(
      buildAuditEntry({
        status: "skipped",
        reason: "disabled",
        opportunityId: payload?.opportunityId || null,
        customerId: cfg.customerId,
        conversionActionId: cfg.conversionActionId,
      })
    );
    return { skipped: true, reason: "disabled" };
  }
  if (!configReadyForUpload(cfg)) {
    logger.warn("[ads-offline] skip: enabled mas credenciais incompletas");
    await appendAdsOfflineAudit(
      buildAuditEntry({
        status: "error",
        reason: "incomplete_config",
        opportunityId: payload?.opportunityId || null,
        customerId: cfg.customerId,
        conversionActionId: cfg.conversionActionId,
      })
    );
    return { skipped: true, reason: "incomplete_config" };
  }

  const orderId = String(payload.opportunityId || "").trim();
  if (!orderId) {
    await appendAdsOfflineAudit(
      buildAuditEntry({
        status: "skipped",
        reason: "no_opportunity_id",
        customerId: cfg.customerId,
        conversionActionId: cfg.conversionActionId,
      })
    );
    return { skipped: true, reason: "no_opportunity_id" };
  }

  const payloadClicks = clicksFromPayload(payload);
  const targets = [];
  if (!opportunityOnly) {
    for (const r of results || []) {
      if (!r || r.ok === false) continue;
      const db = databases && databases[r.projectId];
      if (!db) continue;
      for (const bucket of [r.updated, r.noop]) {
        for (const u of bucket || []) {
          if (u?.leadId) {
            targets.push({
              projectId: r.projectId,
              leadId: u.leadId,
              db,
              previousAmount: u.previousAmount,
            });
          }
        }
      }
    }
  }

  if (targets.length === 0) {
    if (payloadClicks.length > 0) {
      return uploadFromOpportunity({
        cfg,
        payload,
        orderId,
        clicks: payloadClicks,
      });
    }
    await appendAdsOfflineAudit(
      buildAuditEntry({
        status: "skipped",
        reason: "no_updated_leads",
        opportunityId: orderId,
        orderId,
        customerId: cfg.customerId,
        conversionActionId: cfg.conversionActionId,
      })
    );
    return { skipped: true, reason: "no_updated_leads" };
  }

  let accessToken;
  try {
    accessToken = await refreshAccessToken(cfg);
  } catch (err) {
    const message = err.message || String(err);
    logger.error(`[ads-offline] OAuth: ${message}`);
    await appendAdsOfflineAudit(
      buildAuditEntry({
        status: "error",
        reason: "oauth_error",
        opportunityId: orderId,
        orderId,
        customerId: cfg.customerId,
        conversionActionId: cfg.conversionActionId,
        error: message,
      })
    );
    return { ok: false, reason: "oauth_error", error: message };
  }

  const requestJobId = buildDailyJobId(cfg.timezoneOffset);
  const leadResults = [];

  for (const t of targets) {
    const item = {
      projectId: t.projectId,
      leadId: t.leadId,
      status: null,
    };
    try {
      const ref = t.db.ref(`leads_backup/${t.leadId}`);
      const snap = await ref.get();
      const existing = snap.exists() ? snap.val() : null;

      if (alreadyUploaded(existing, orderId)) {
        const nextValue = Number(
          existing?.soldCommissionAmount != null
            ? existing.soldCommissionAmount
            : payload.amount
        );
        const prevValue =
          t.previousAmount != null ? Number(t.previousAmount) : nextValue;
        if (
          Number.isFinite(nextValue) &&
          nextValue > 0 &&
          Number.isFinite(prevValue) &&
          nextValue !== prevValue
        ) {
          const conversionDateTime = formatConversionDateTime(
            new Date().toISOString(),
            null,
            cfg.timezoneOffset
          );
          const adj = await uploadConversionAdjustment(cfg, accessToken, {
            adjustmentType: "RESTATEMENT",
            orderId,
            conversionDateTime,
            adjustedValue: nextValue,
          });
          const status = adj.ok ? "restated" : "error";
          const auditKey = await appendAdsOfflineAudit(
            buildAuditEntry({
              status,
              reason: adj.ok ? "restatement_ok" : "restatement_error",
              opportunityId: orderId,
              orderId,
              leadId: t.leadId,
              projectId: t.projectId,
              conversionValue: nextValue,
              currencyCode: cfg.currencyCode,
              conversionDateTime,
              customerId: cfg.customerId,
              conversionActionId: cfg.conversionActionId,
              error: adj.ok ? null : adj.error,
              responseSnippet: adj.raw,
            })
          );
          await ref.update(
            adsFlagsPatch({
              status,
              clickType: existing?.adsOfflineClickIdType || null,
              orderId,
              errorMessage: adj.ok ? null : adj.error,
              adsOfflineAuditKey: auditKey,
            })
          );
          item.status = status;
          item.error = adj.ok ? null : adj.error;
          item.adsOfflineAuditKey = auditKey;
          leadResults.push(item);
          continue;
        }
        const auditKey = await appendAdsOfflineAudit(
          buildAuditEntry({
            status: "noop_already_uploaded",
            reason: "already_uploaded",
            opportunityId: orderId,
            orderId,
            leadId: t.leadId,
            projectId: t.projectId,
            clickIdType: existing?.adsOfflineClickIdType || null,
            adsJobId: existing?.adsOfflineJobId || null,
            customerId: cfg.customerId,
            conversionActionId: cfg.conversionActionId,
          })
        );
        if (auditKey) {
          try {
            await ref.update({ adsOfflineAuditKey: auditKey });
          } catch {
            /* ignore */
          }
        }
        item.status = "noop_already_uploaded";
        item.adsOfflineAuditKey = auditKey;
        leadResults.push(item);
        continue;
      }

      const conversionValue =
        existing?.soldCommissionAmount != null
          ? existing.soldCommissionAmount
          : payload.amount;
      if (!(Number(conversionValue) > 0)) {
        const auditKey = await appendAdsOfflineAudit(
          buildAuditEntry({
            status: "skipped",
            reason: "non_positive_amount",
            opportunityId: orderId,
            orderId,
            leadId: t.leadId,
            projectId: t.projectId,
            conversionValue,
            currencyCode: cfg.currencyCode,
            customerId: cfg.customerId,
            conversionActionId: cfg.conversionActionId,
          })
        );
        await ref.update(
          adsFlagsPatch({
            status: "skipped",
            clickType: null,
            orderId,
            adsOfflineAuditKey: auditKey,
          })
        );
        item.status = "skipped";
        item.reason = "non_positive_amount";
        item.adsOfflineAuditKey = auditKey;
        leadResults.push(item);
        continue;
      }

      if (
        existing?.adsOfflineConversionStatus === "accepted" &&
        existing.adsOfflineRequestId
      ) {
        const confirmed = await retrieveRequestStatus(
          accessToken,
          existing.adsOfflineRequestId
        );
        if (confirmed.kind === "pending") {
          item.status = "accepted";
          item.adsRequestId = existing.adsOfflineRequestId;
          leadResults.push(item);
          continue;
        }
        if (confirmed.kind === "success") {
          const auditKey = await appendAdsOfflineAudit(
            buildAuditEntry({
              status: "uploaded",
              reason: "confirm_ok",
              opportunityId: orderId,
              orderId,
              leadId: t.leadId,
              projectId: t.projectId,
              clickIdType: existing.adsOfflineClickIdType || null,
              conversionValue,
              currencyCode: cfg.currencyCode,
              customerId: cfg.customerId,
              conversionActionId: cfg.conversionActionId,
              adsRequestId: existing.adsOfflineRequestId,
            })
          );
          await ref.update(
            adsFlagsPatch({
              status: "uploaded",
              clickType: existing.adsOfflineClickIdType || null,
              orderId,
              requestId: existing.adsOfflineRequestId,
              adsOfflineAuditKey: auditKey,
            })
          );
          item.status = "uploaded";
          item.adsOfflineAuditKey = auditKey;
          leadResults.push(item);
          continue;
        }
        if (!isInvalidGclid(confirmed.errorInfo)) {
          const auditKey = await appendAdsOfflineAudit(
            buildAuditEntry({
              status: "error",
              reason: "confirm_failed",
              opportunityId: orderId,
              orderId,
              leadId: t.leadId,
              projectId: t.projectId,
              customerId: cfg.customerId,
              conversionActionId: cfg.conversionActionId,
              adsRequestId: existing.adsOfflineRequestId,
              error: confirmed.errorInfo || confirmed.requestStatus,
            })
          );
          await ref.update(
            adsFlagsPatch({
              status: "error",
              clickType: existing.adsOfflineClickIdType || null,
              orderId,
              errorMessage: JSON.stringify(confirmed.errorInfo || confirmed.requestStatus),
              requestId: existing.adsOfflineRequestId,
              adsOfflineAuditKey: auditKey,
            })
          );
          item.status = "error";
          item.adsOfflineAuditKey = auditKey;
          leadResults.push(item);
          continue;
        }
      }

      const skipRejected =
        existing?.adsOfflineClickIdType &&
        isInvalidGclid(existing?.adsOfflineConversionLastError)
          ? existing.adsOfflineClickIdType
          : null;
      let clicks = extractClickCandidates(existing).slice();
      for (const extra of clicksFromPayload(payload)) {
        if (!clicks.some((c) => c.type === extra.type && c.value === extra.value)) {
          clicks.push(extra);
        }
      }
      if (skipRejected) clicks = clicks.filter((c) => c.type !== skipRejected);
      if (!clicks.length) {
        const auditKey = await appendAdsOfflineAudit(
          buildAuditEntry({
            status: "skipped",
            reason: "no_click_id",
            opportunityId: orderId,
            orderId,
            leadId: t.leadId,
            projectId: t.projectId,
            customerId: cfg.customerId,
            conversionActionId: cfg.conversionActionId,
            conversionValue:
              existing?.soldCommissionAmount != null
                ? existing.soldCommissionAmount
                : payload.amount,
            currencyCode: cfg.currencyCode,
          })
        );
        const patch = adsFlagsPatch({
          status: "skipped",
          clickType: null,
          orderId,
          adsOfflineAuditKey: auditKey,
        });
        await ref.update(patch);
        item.status = "skipped";
        item.reason = "no_click_id";
        item.adsOfflineAuditKey = auditKey;
        leadResults.push(item);
        continue;
      }

      const conversionDateTime = formatConversionDateTime(
        existing?.soldSyncedAt,
        existing?.soldDate || payload.cDataVenda,
        cfg.timezoneOffset
      );
      const eventTimestamp = toEventTimestampRfc3339(
        existing?.soldSyncedAt,
        existing?.soldDate || payload.cDataVenda,
        cfg.timezoneOffset
      );
      let settled = null;
      for (let i = 0; i < clicks.length; i++) {
        const click = clicks[i];
        const event = buildDataManagerEvent({
          click,
          orderId,
          conversionValue,
          currencyCode: cfg.currencyCode,
          eventTimestamp,
        });
        const upload = await uploadOfflineConversion(cfg, event, accessToken);
        const auditBase = {
          opportunityId: orderId,
          orderId,
          leadId: t.leadId,
          projectId: t.projectId,
          clickIdType: click.type,
          clickId: click.value,
          conversionValue,
          currencyCode: cfg.currencyCode,
          conversionDateTime,
          conversionActionId: cfg.conversionActionId,
          customerId: cfg.customerId,
          adsJobId: requestJobId,
          adsRequestId: upload.requestId,
          responseSnippet: upload.raw,
        };
        if (!upload.ok) {
          settled = { status: "error", reason: "upload_error", click, error: upload.error, auditBase };
          break;
        }
        const confirmed = await retrieveRequestStatus(accessToken, upload.requestId);
        if (confirmed.kind === "failed" && isInvalidGclid(confirmed.errorInfo) && i < clicks.length - 1) {
          continue;
        }
        if (confirmed.kind === "success") {
          settled = { status: "uploaded", reason: "upload_ok", click, requestId: upload.requestId, auditBase };
          break;
        }
        if (confirmed.kind === "failed") {
          settled = {
            status: "error",
            reason: "confirm_failed",
            click,
            requestId: upload.requestId,
            error: confirmed.errorInfo || confirmed.requestStatus,
            auditBase,
          };
          break;
        }
        settled = { status: "accepted", reason: "ingest_accepted", click, requestId: upload.requestId, auditBase };
        break;
      }

      const auditKey = await appendAdsOfflineAudit(
        buildAuditEntry({
          ...settled.auditBase,
          status: settled.status,
          reason: settled.reason,
          error: settled.error || null,
        })
      );
      const patch = adsFlagsPatch({
        status: settled.status,
        clickType: settled.click.type,
        orderId,
        errorMessage: settled.status === "error" ? String(settled.error || "error") : null,
        adsJobId: settled.auditBase.adsJobId,
        adsOfflineAuditKey: auditKey,
        requestId: settled.requestId || null,
      });
      await ref.update(patch);
      item.status = settled.status;
      item.clickIdType = settled.click.type;
      item.adsJobId = settled.auditBase.adsJobId;
      item.adsRequestId = settled.requestId || null;
      item.error = settled.error || null;
      item.adsOfflineAuditKey = auditKey;
      leadResults.push(item);
      logger.info(
        `[ads-offline] ${settled.status} orderId=${orderId} lead=${t.leadId} type=${settled.click.type}`
      );
    } catch (err) {
      const message = err.message || String(err);
      logger.warn(
        `[ads-offline] lead ${t.leadId} falhou (best-effort): ${message}`
      );
      const auditKey = await appendAdsOfflineAudit(
        buildAuditEntry({
          status: "error",
          reason: "lead_exception",
          opportunityId: orderId,
          orderId,
          leadId: t.leadId,
          projectId: t.projectId,
          customerId: cfg.customerId,
          conversionActionId: cfg.conversionActionId,
          error: message,
        })
      );
      try {
        await t.db.ref(`leads_backup/${t.leadId}`).update(
          adsFlagsPatch({
            status: "error",
            clickType: null,
            orderId,
            errorMessage: message,
            adsOfflineAuditKey: auditKey,
          })
        );
      } catch {
        /* ignore */
      }
      item.status = "error";
      item.error = message;
      item.adsOfflineAuditKey = auditKey;
      leadResults.push(item);
    }
  }

  return {
    ok: leadResults.every(
      (r) =>
        r.status === "uploaded" ||
        r.status === "accepted" ||
        r.status === "restated" ||
        r.status === "retracted" ||
        r.status === "skipped" ||
        r.status === "noop_already_uploaded"
    ),
    orderId,
    adsJobId: requestJobId,
    leadResults,
  };
}

function classifyRequestStatus(data) {
  const list = data?.requestStatusPerDestination || [];
  const first = list[0] || {};
  const requestStatus = String(first.requestStatus || first.request_status || "");
  const errorInfo = first.errorInfo || first.error_info || null;
  const upper = requestStatus.toUpperCase();
  let kind = "pending";
  if (upper.includes("FAIL") || upper.includes("PARTIAL")) kind = "failed";
  else if (upper.includes("SUCCESS")) kind = "success";
  return { kind, requestStatus: requestStatus || null, errorInfo };
}

function isInvalidGclid(errorInfo) {
  return /INVALID_GCLID/i.test(
    typeof errorInfo === "string" ? errorInfo : JSON.stringify(errorInfo || "")
  );
}

async function retrieveRequestStatus(accessToken, requestId) {
  if (!requestId) return { kind: "pending", requestStatus: null, errorInfo: null };
  try {
    const url = `${DATA_MANAGER_STATUS_URL}?requestId=${encodeURIComponent(requestId)}`;
    const res = await withTimeout(
      fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ADS_UPLOAD_TIMEOUT_MS,
      "ads_datamanager_status"
    );
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
    if (!res.ok) return { kind: "pending", requestStatus: null, errorInfo: null };
    return classifyRequestStatus(data);
  } catch (err) {
    logger.warn(`[ads-offline] status retrieve: ${err.message}`);
    return { kind: "pending", requestStatus: null, errorInfo: null };
  }
}

async function uploadConversionAdjustment(
  cfg,
  accessToken,
  { adjustmentType, orderId, conversionDateTime, adjustedValue }
) {
  if (!cfg.developerToken) {
    return { ok: false, error: "developerToken ausente para ajuste" };
  }
  const adjustment = {
    conversionAction: conversionActionResource(cfg.customerId, cfg.conversionActionId),
    adjustmentType,
    orderId: String(orderId),
    adjustmentDateTime: conversionDateTime,
  };
  if (adjustmentType === "RESTATEMENT") {
    adjustment.restatementValue = {
      adjustedValue: Number(adjustedValue),
      currencyCode: cfg.currencyCode || DEFAULT_CURRENCY,
    };
  }
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": cfg.developerToken,
    "Content-Type": "application/json",
  };
  if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;
  const url = `${ADS_API_BASE}/customers/${cfg.customerId}${ADS_ADJUSTMENT_PATH}`;
  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        conversionAdjustments: [adjustment],
        partialFailure: true,
      }),
    }),
    ADS_UPLOAD_TIMEOUT_MS,
    "ads_adjustment"
  );
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok || data.partialFailureError) {
    return { ok: false, error: text.slice(0, 400), raw: data };
  }
  return { ok: true, raw: data };
}

async function readOppAdsState(orderId) {
  const snap = await getDatabase().ref(`ads_offline_by_opportunity/${orderId}`).get();
  return snap.exists() ? snap.val() : null;
}

async function writeOppAdsState(orderId, patch) {
  await getDatabase().ref(`ads_offline_by_opportunity/${orderId}`).update({
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

async function uploadFromOpportunity({ cfg, payload, orderId, clicks }) {
  if (!(Number(payload.amount) > 0)) {
    await appendAdsOfflineAudit(
      buildAuditEntry({
        status: "skipped",
        reason: "non_positive_amount",
        opportunityId: orderId,
        orderId,
        customerId: cfg.customerId,
        conversionActionId: cfg.conversionActionId,
        conversionValue: payload.amount,
      })
    );
    return { skipped: true, reason: "non_positive_amount", leadResults: [] };
  }
  let accessToken;
  try {
    accessToken = await refreshAccessToken(cfg);
  } catch (err) {
    return { ok: false, reason: "oauth_error", error: err.message, leadResults: [] };
  }
  const prior = await readOppAdsState(orderId);
  if (prior?.adsOfflineConversionStatus === "uploaded") {
    return {
      skipped: true,
      reason: "already_uploaded",
      leadResults: [{ status: "noop_already_uploaded" }],
    };
  }
  if (prior?.adsOfflineConversionStatus === "accepted" && prior.adsOfflineRequestId) {
    const confirmed = await retrieveRequestStatus(accessToken, prior.adsOfflineRequestId);
    if (confirmed.kind === "pending") {
      return { leadResults: [{ status: "accepted" }] };
    }
    if (confirmed.kind === "success") {
      await writeOppAdsState(orderId, { adsOfflineConversionStatus: "uploaded" });
      return { leadResults: [{ status: "uploaded" }] };
    }
  }
  const conversionDateTime = formatConversionDateTime(
    new Date().toISOString(),
    payload.cDataVenda,
    cfg.timezoneOffset
  );
  const eventTimestamp = toEventTimestampRfc3339(
    new Date().toISOString(),
    payload.cDataVenda,
    cfg.timezoneOffset
  );
  let settled = null;
  for (let i = 0; i < clicks.length; i++) {
    const click = clicks[i];
    const event = buildDataManagerEvent({
      click,
      orderId,
      conversionValue: payload.amount,
      currencyCode: cfg.currencyCode,
      eventTimestamp,
    });
    const upload = await uploadOfflineConversion(cfg, event, accessToken);
    if (!upload.ok) {
      settled = { status: "error", click, error: upload.error, requestId: upload.requestId };
      break;
    }
    const confirmed = await retrieveRequestStatus(accessToken, upload.requestId);
    if (confirmed.kind === "failed" && isInvalidGclid(confirmed.errorInfo) && i < clicks.length - 1) {
      continue;
    }
    if (confirmed.kind === "success") {
      settled = { status: "uploaded", click, requestId: upload.requestId };
      break;
    }
    if (confirmed.kind === "failed") {
      settled = {
        status: "error",
        click,
        requestId: upload.requestId,
        error: confirmed.errorInfo || confirmed.requestStatus,
      };
      break;
    }
    settled = { status: "accepted", click, requestId: upload.requestId };
    break;
  }
  if (!settled) {
    return { skipped: true, reason: "no_click_id", leadResults: [] };
  }
  await appendAdsOfflineAudit(
    buildAuditEntry({
      status: settled.status,
      reason: settled.status === "error" ? "upload_error" : "opportunity_click",
      opportunityId: orderId,
      orderId,
      clickIdType: settled.click.type,
      clickId: settled.click.value,
      conversionValue: payload.amount,
      currencyCode: cfg.currencyCode,
      conversionDateTime,
      customerId: cfg.customerId,
      conversionActionId: cfg.conversionActionId,
      adsRequestId: settled.requestId,
      error: settled.error || null,
    })
  );
  await writeOppAdsState(orderId, {
    adsOfflineConversionStatus: settled.status,
    adsOfflineRequestId: settled.requestId || null,
    adsOfflineClickIdType: settled.click.type,
    adsOfflineOrderId: orderId,
  });
  return {
    ok: settled.status !== "error",
    leadResults: [{ status: settled.status, adsRequestId: settled.requestId }],
  };
}

async function handleAdsOfflineRetract({
  payload,
  results,
  adsConfigRaw,
  databases,
  opportunityOnly = false,
}) {
  const cfg = parseAdsConfig(adsConfigRaw);
  if (!cfg || !cfg.enabled || !configReadyForUpload(cfg)) {
    return { skipped: true, reason: "disabled" };
  }
  const orderId = String(payload?.opportunityId || "").trim();
  if (!orderId) return { skipped: true, reason: "no_opportunity_id" };
  let accessToken;
  try {
    accessToken = await refreshAccessToken(cfg);
  } catch (err) {
    return { ok: false, reason: "oauth_error", error: err.message, leadResults: [] };
  }
  const conversionDateTime = formatConversionDateTime(
    new Date().toISOString(),
    null,
    cfg.timezoneOffset
  );
  const leadResults = [];

  async function retractOne({ leadRef, leadId, projectId }) {
    const adj = await uploadConversionAdjustment(cfg, accessToken, {
      adjustmentType: "RETRACTION",
      orderId,
      conversionDateTime,
    });
    const status = adj.ok ? "retracted" : "error";
    const auditKey = await appendAdsOfflineAudit(
      buildAuditEntry({
        status,
        reason: adj.ok ? "retract_ok" : "retract_error",
        opportunityId: orderId,
        orderId,
        leadId,
        projectId,
        conversionDateTime,
        customerId: cfg.customerId,
        conversionActionId: cfg.conversionActionId,
        error: adj.ok ? null : adj.error,
        responseSnippet: adj.raw,
      })
    );
    if (leadRef) {
      await leadRef.update(
        adsFlagsPatch({
          status,
          clickType: null,
          orderId,
          errorMessage: adj.ok ? null : adj.error,
          adsOfflineAuditKey: auditKey,
        })
      );
    } else {
      await writeOppAdsState(orderId, { adsOfflineConversionStatus: status });
    }
    leadResults.push({ status, leadId: leadId || null, error: adj.ok ? null : adj.error });
  }

  if (opportunityOnly) {
    const prior = await readOppAdsState(orderId);
    if (prior?.adsOfflineConversionStatus !== "uploaded") {
      return { skipped: true, reason: "nothing_to_retract", leadResults: [] };
    }
    await retractOne({});
    return { ok: leadResults.every((r) => r.status === "retracted"), leadResults };
  }

  for (const r of results || []) {
    if (!r || r.ok === false) continue;
    const db = databases && databases[r.projectId];
    if (!db) continue;
    for (const u of r.updated || []) {
      if (u?.adsStatus !== "uploaded" || !u.leadId) continue;
      await retractOne({
        leadRef: db.ref(`leads_backup/${u.leadId}`),
        leadId: u.leadId,
        projectId: r.projectId,
      });
    }
  }
  if (!leadResults.length) return { skipped: true, reason: "nothing_to_retract", leadResults };
  return { ok: leadResults.every((r) => r.status === "retracted"), orderId, leadResults };
}

module.exports = {
  ADS_API_BASE,
  DATA_MANAGER_INGEST_URL,
  ADS_UPLOAD_TIMEOUT_MS,
  DEFAULT_CUSTOMER_ID,
  DEFAULT_CONVERSION_ACTION_ID,
  AUDIT_RESPONSE_SNIPPET_MAX,
  parseAdsConfig,
  configReadyForUpload,
  extractClickId,
  formatConversionDateTime,
  toEventTimestampRfc3339,
  buildDailyJobId,
  conversionActionResource,
  buildClickConversion,
  buildDataManagerEvent,
  buildDataManagerDestination,
  truncateSnippet,
  buildAuditEntry,
  appendAdsOfflineAudit,
  alreadyUploaded,
  adsFlagsPatch,
  handleAdsOfflineAfterSoldSet,
  handleAdsOfflineRetract,
  classifyRequestStatus,
  isInvalidGclid,
  extractClickCandidates,
  clicksFromPayload,
};
