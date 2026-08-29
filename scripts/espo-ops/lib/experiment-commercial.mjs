import {
  CONTROL_CAMPAIGN_ID,
  EXP_CAMPAIGN_ID,
} from "../../google-ops/lib/experiment-constants.mjs";

export const SOLD_STAGE = "Vendido";

export const OPP_SELECT = [
  "id",
  "name",
  "stage",
  "amount",
  "cPremioLiquido",
  "cDataVenda",
  "cDataDoLead",
  "cWebpage",
  "cGclid",
  "cLeadId",
  "cCelular",
  "createdAt",
  "modifiedAt",
];

export function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(0, 13);
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

export function campaignBucketFromUtm(campaignRaw) {
  const camp = String(campaignRaw || "").replace(/\D/g, "");
  if (camp === EXP_CAMPAIGN_ID) return "exp";
  if (camp === CONTROL_CAMPAIGN_ID) return "control";
  return null;
}

export function captureDateOf(opp) {
  const d = opp.cDataDoLead || (opp.createdAt || "").slice(0, 10);
  return d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;
}

export function dateInWindow(iso, start, end) {
  if (!iso) return false;
  const d = String(iso).slice(0, 10);
  return d >= start && d <= end;
}

export function daysBetween(a, b) {
  if (!a || !b) return null;
  const t0 = Date.parse(a);
  const t1 = Date.parse(b);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return Math.round((t1 - t0) / 86400000);
}

export function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function emptyArmMetrics() {
  return {
    opportunities: 0,
    soldVendido: 0,
    soldCDataVenda: 0,
    reconciliation: {
      vendidoAndCDataVenda: 0,
      vendidoOnly: 0,
      cDataVendaOnly: 0,
      vendidoWithAmount: 0,
      vendidoWithoutAmount: 0,
    },
    amountSum: 0,
    premioSum: 0,
    amountAvg: null,
    saleRatePerOpp: null,
    saleRatePerClick: null,
    amountPerClick: null,
    roasCommercial: null,
    medianDaysToSold: null,
    stageDistribution: {},
    attribution: {
      byFirebaseOppId: 0,
      byFirebaseLeadId: 0,
      byFirebaseGclid: 0,
      byFirebasePhone: 0,
      byWebpageHeuristic: 0,
      unattributed: 0,
    },
  };
}

export function isSoldVendido(opp, asOf) {
  if (String(opp.stage || "") !== SOLD_STAGE) return false;
  if (!asOf) return true;
  const mod = (opp.modifiedAt || opp.cDataVenda || "").slice(0, 10);
  return !mod || mod <= asOf;
}

export function isSoldCDataVenda(opp, asOf) {
  const d = opp.cDataVenda;
  if (!d) return false;
  const saleDay = String(d).slice(0, 10);
  return !asOf || saleDay <= asOf;
}

export function buildFirebaseGclidArmIndex(novoRaw, legadoRaw, start, end) {
  /** @type {Map<string, "exp"|"control"|"otherAds">} */
  const gclidMap = new Map();
  /** @type {Map<string, "exp"|"control">} */
  const oppIdMap = new Map();
  /** @type {Map<string, "exp"|"control">} */
  const leadIdMap = new Map();

  /** @type {Map<string, "exp"|"control">} */
  const phoneMap = new Map();

  function armFromUtm(utm, gclid, legacyProject) {
    const camp = String(
      utm?.utm_campaign || utm?.utm_id || utm?.gad_campaignid || "",
    ).replace(/\D/g, "");
    if (camp === EXP_CAMPAIGN_ID) return "exp";
    if (camp === CONTROL_CAMPAIGN_ID) return "control";
    if (legacyProject && gclid) return "control";
    if (gclid) return "otherAds";
    return null;
  }

  function ingest(raw, { legacyProject }) {
    for (const rec of Object.values(raw || {})) {
      if (!rec || typeof rec !== "object") continue;
      const data = rec.data || {};
      const ts = rec.timestamp || rec.syncedAt || rec.d || "";
      if (!dateInWindow(ts, start, end)) continue;
      if (rec.environment && rec.environment !== "production") continue;
      const utm = data.utm || {};
      const gclid =
        utm.gclid || data.GCLID_FLD || data.gclid || rec.gclid || null;
      const arm = armFromUtm(utm, gclid, legacyProject);
      if (arm !== "exp" && arm !== "control") continue;
      if (gclid) gclidMap.set(gclid, arm);
      const leadId = rec.espocrmLeadId || data.espocrmLeadId || null;
      const oppId =
        rec.espocrmOpportunityId || data.espocrmOpportunityId || null;
      if (leadId) leadIdMap.set(leadId, arm);
      if (oppId) oppIdMap.set(oppId, arm);
      const phone = normalizePhone(
        data.phoneE164 || data.CELULAR || data.celular || data.cCelular,
      );
      if (phone) phoneMap.set(phone, arm);
    }
  }

  ingest(novoRaw, { legacyProject: false });
  ingest(legadoRaw, { legacyProject: true });
  return { gclidMap, oppIdMap, leadIdMap, phoneMap };
}

export function attributeArm(opp, fbIndex) {
  const { gclidMap, oppIdMap, leadIdMap, phoneMap } = fbIndex;

  if (opp.id && oppIdMap.has(opp.id)) {
    return { arm: oppIdMap.get(opp.id), method: "byFirebaseOppId" };
  }
  if (opp.cLeadId && leadIdMap.has(opp.cLeadId)) {
    return { arm: leadIdMap.get(opp.cLeadId), method: "byFirebaseLeadId" };
  }
  if (opp.cGclid && gclidMap.has(opp.cGclid)) {
    return { arm: gclidMap.get(opp.cGclid), method: "byFirebaseGclid" };
  }
  const phone = normalizePhone(opp.cCelular);
  if (phone && phoneMap.has(phone)) {
    return { arm: phoneMap.get(phone), method: "byFirebasePhone" };
  }

  const wp = String(opp.cWebpage || "").toLowerCase();
  if (
    (wp.includes("novo.segurosimediato") || wp.includes("comparaseguroonline")) &&
    opp.cGclid
  ) {
    return { arm: "exp", method: "byWebpageHeuristic" };
  }

  return { arm: null, method: "unattributed" };
}

export function accumulateArm(metrics, opp, { asOf, clicks, cost }) {
  metrics.opportunities++;
  inc(metrics.stageDistribution, opp.stage || "unknown");

  const vendido = isSoldVendido(opp, asOf);
  const dataVenda = isSoldCDataVenda(opp, asOf);
  if (vendido) metrics.soldVendido++;
  if (dataVenda) metrics.soldCDataVenda++;
  if (vendido && dataVenda) metrics.reconciliation.vendidoAndCDataVenda++;
  else if (vendido) metrics.reconciliation.vendidoOnly++;
  else if (dataVenda) metrics.reconciliation.cDataVendaOnly++;

  if (vendido) {
    const amt = Number(opp.amount) || 0;
    const premio = Number(opp.cPremioLiquido) || 0;
    metrics.amountSum += amt;
    metrics.premioSum += premio;
    if (amt > 0) metrics.reconciliation.vendidoWithAmount++;
    else metrics.reconciliation.vendidoWithoutAmount++;

    const capture = captureDateOf(opp);
    const saleRef = opp.cDataVenda || (opp.modifiedAt || "").slice(0, 10);
    const dts = daysBetween(capture, saleRef);
    if (dts != null && dts >= 0 && dts < 400) {
      if (!metrics._daysToSold) metrics._daysToSold = [];
      metrics._daysToSold.push(dts);
    }
  }

  metrics.saleRatePerOpp =
    metrics.opportunities > 0
      ? metrics.soldVendido / metrics.opportunities
      : null;
  if (clicks != null && clicks > 0) {
    metrics.saleRatePerClick = metrics.soldVendido / clicks;
    metrics.amountPerClick = metrics.amountSum / clicks;
  }
  if (cost != null && cost > 0) {
    metrics.roasCommercial = metrics.amountSum / cost;
  }
  metrics.amountAvg =
    metrics.soldVendido > 0 ? metrics.amountSum / metrics.soldVendido : null;
  metrics.medianDaysToSold = metrics._daysToSold
    ? median(metrics._daysToSold)
    : null;
}

function inc(obj, key, n = 1) {
  if (!key) return;
  obj[key] = (obj[key] || 0) + n;
}

export function finalizeArm(metrics) {
  delete metrics._daysToSold;
  return metrics;
}

export function readAdsArmTotals(adsJson, campaignId) {
  const byCamp = adsJson?.byCampaign?.[campaignId];
  if (byCamp?.totals) {
    return {
      clicks: byCamp.totals.clicks || 0,
      cost: byCamp.totals.cost ?? (byCamp.totals.costMicros || 0) / 1_000_000,
    };
  }
  const cmp = adsJson?.comparison;
  if (cmp) {
    const key =
      String(campaignId) === EXP_CAMPAIGN_ID ? "exp" : "control";
    const block = cmp[key];
    if (block) {
      return {
        clicks: block.clicks || 0,
        cost: block.cost || 0,
      };
    }
  }
  return { clicks: 0, cost: 0 };
}
