import {
  CONTROL_CAMPAIGN_ID,
  EXP_CAMPAIGN_ID,
  LEGACY_HOSTS,
  NOVO_HOSTS,
} from "./experiment-constants.mjs";

function sumRows(rows, predicate) {
  let sessions = 0;
  let engaged = 0;
  let durationWeighted = 0;
  for (const row of rows || []) {
    const dims = row.dimensionValues?.map((d) => d.value) || [];
    if (!predicate(dims)) continue;
    const metrics = row.metricValues?.map((m) => Number(m.value || 0)) || [];
    const s = metrics[0] || 0;
    const eng = metrics[2] ?? metrics[1];
    const dur = metrics[metrics.length - 1] || 0;
    sessions += s;
    engaged += Number(eng) || 0;
    durationWeighted += s * dur;
  }
  return {
    sessions,
    engagedSessions: engaged,
    engagementRate: sessions ? engaged / sessions : 0,
    avgSessionDuration: sessions ? durationWeighted / sessions : 0,
  };
}

/** Agrega sessões GA4 por campanha Ads + hostname canônico. */
export function aggregateGa4CampaignHosts(ga4Snapshot) {
  const rows = ga4Snapshot?.adsSessionsByCampaign?.rows || [];
  const out = {
    control: { legacy: sumRows(rows, (d) => d[0] === CONTROL_CAMPAIGN_ID && LEGACY_HOSTS.has(d[1])) },
    exp: { novo: sumRows(rows, (d) => d[0] === EXP_CAMPAIGN_ID && NOVO_HOSTS.has(d[1])) },
    contamination: {
      expOnLegacy: sumRows(
        rows,
        (d) => d[0] === EXP_CAMPAIGN_ID && LEGACY_HOSTS.has(d[1]),
      ),
      controlOnNovo: sumRows(
        rows,
        (d) => d[0] === CONTROL_CAMPAIGN_ID && NOVO_HOSTS.has(d[1]),
      ),
    },
  };
  return out;
}

export function adsTotals(adsSnapshot, campaignId) {
  return adsSnapshot?.byCampaign?.[campaignId]?.totals || null;
}

export function pctDelta(a, b) {
  if (b === 0 || b == null || a == null) return null;
  return (a - b) / b;
}

export function firebaseGroundTruth(leadsNovo, leadsLegacy) {
  const expLeads = leadsNovo?.summary?.exp?.withGclid ?? leadsNovo?.summary?.exp?.total ?? 0;
  const expGclids = leadsNovo?.summary?.exp?.uniqueGclids ?? expLeads;
  const ctrlGclids = leadsLegacy?.summary?.control?.uniqueGclids ?? 0;
  const expAds = adsTotals(null, EXP_CAMPAIGN_ID);
  return { expLeads, expGclids, ctrlGclids, note: "join with ads clicks in compare script" };
}

export { CONTROL_CAMPAIGN_ID, EXP_CAMPAIGN_ID };
