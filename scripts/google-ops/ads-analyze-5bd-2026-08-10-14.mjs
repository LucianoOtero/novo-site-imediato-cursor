/**
 * Extração read-only do experimento para a janela 10–14/08/2026
 * (últimos 5 dias úteis a partir de 16/08/2026).
 *
 * NÃO sobrescreve ads-baseline-2026-08-06.json.
 * Uso: node ads-analyze-5bd-2026-08-10-14.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const ORIG_CAMPAIGN_ID = "21287198336";
const START_DATE = "2026-08-10";
const END_DATE = "2026-08-14";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "ads-analysis-5bd-2026-08-10-14.json");

function loadAdsConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const ads = config.googleAds || {};
  return {
    customerId: String(ads.customerId).replace(/\D/g, ""),
    developerToken: ads.developerToken,
    loginCustomerId: ads.loginCustomerId
      ? String(ads.loginCustomerId).replace(/\D/g, "")
      : "",
  };
}

async function getAccessToken({ withAds = true, withAnalytics = false } = {}) {
  const oauth2 = await getAuthorizedClient({ withAds, withAnalytics });
  const tokenRes = await oauth2.getAccessToken();
  return {
    token: tokenRes?.token || oauth2.credentials.access_token,
    oauth2,
  };
}

async function search(ads, accessToken, query) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": ads.developerToken,
    "Content-Type": "application/json",
  };
  if (ads.loginCustomerId) headers["login-customer-id"] = ads.loginCustomerId;

  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/googleAds:searchStream`,
    { method: "POST", headers, body: JSON.stringify({ query }) },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Ads ${res.status}: ${text.slice(0, 1000)}`);
  const parsed = JSON.parse(text);
  const batches = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];
  for (const batch of batches) {
    for (const r of batch.results || []) rows.push(r);
  }
  return rows;
}

function summarizeDaily(daily) {
  const t = daily.reduce(
    (acc, d) => ({
      impressions: acc.impressions + d.impressions,
      clicks: acc.clicks + d.clicks,
      costMicros: acc.costMicros + d.costMicros,
      conversions: acc.conversions + d.conversions,
    }),
    { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 },
  );
  const cost = t.costMicros / 1e6;
  return {
    ...t,
    cost,
    ctr: t.impressions ? t.clicks / t.impressions : 0,
    cpc: t.clicks ? cost / t.clicks : 0,
    cvr: t.clicks ? t.conversions / t.clicks : 0,
    cpa: t.conversions ? cost / t.conversions : null,
  };
}

function pctDelta(exp, control) {
  if (control === 0 || control == null) return null;
  return (exp - control) / control;
}

async function main() {
  const ads = loadAdsConfig();
  const { token } = await getAccessToken({ withAds: true });

  // 1) Serving / primary status dos dois braços
  const serving = await search(
    ads,
    token,
    `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.primary_status,
      campaign.primary_status_reasons
    FROM campaign
    WHERE campaign.id IN (${ORIG_CAMPAIGN_ID}, ${EXP_CAMPAIGN_ID})
  `,
  );

  // 2) Configuração dos braços (confirma o split nominal do experimento)
  const experimentArms = await search(
    ads,
    token,
    `
    SELECT
      experiment_arm.resource_name,
      experiment_arm.name,
      experiment_arm.control,
      experiment_arm.traffic_split,
      experiment_arm.campaigns,
      experiment_arm.in_design_campaigns,
      experiment_arm.experiment
    FROM experiment_arm
  `,
  );

  // 3) Aprovações RSAs Exp
  const approvals = await search(
    ads,
    token,
    `
    SELECT
      ad_group.name,
      ad_group.status,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.review_status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.final_urls
    FROM ad_group_ad
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
  `,
  );

  const approvalCounts = { APPROVED: 0, DISAPPROVED: 0, ENABLED: 0, OTHER: 0 };
  const approvalList = approvals.map((r) => {
    const approval = r.adGroupAd.policySummary?.approvalStatus || "UNKNOWN";
    const adStatus = r.adGroupAd.status;
    if (adStatus === "ENABLED") approvalCounts.ENABLED++;
    if (approval === "APPROVED") approvalCounts.APPROVED++;
    else if (approval === "DISAPPROVED") approvalCounts.DISAPPROVED++;
    else approvalCounts.OTHER++;
    return {
      adId: String(r.adGroupAd.ad.id),
      group: r.adGroup.name,
      groupStatus: r.adGroup.status,
      adStatus,
      approval,
      review: r.adGroupAd.policySummary?.reviewStatus || "UNKNOWN",
      url: (r.adGroupAd.ad.finalUrls || [])[0] || "",
    };
  });

  // 4) Métricas diárias por campanha
  const rows = await search(
    ads,
    token,
    `
    SELECT
      campaign.id,
      campaign.name,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_from_interactions_rate,
      metrics.cost_per_conversion
    FROM campaign
    WHERE campaign.id IN (${ORIG_CAMPAIGN_ID}, ${EXP_CAMPAIGN_ID})
      AND segments.date BETWEEN '${START_DATE}' AND '${END_DATE}'
    ORDER BY segments.date
  `,
  );

  const byCampaign = {};
  for (const r of rows) {
    const id = String(r.campaign.id);
    if (!byCampaign[id]) {
      byCampaign[id] = { name: r.campaign.name, daily: [] };
    }
    byCampaign[id].daily.push({
      date: r.segments.date,
      impressions: Number(r.metrics.impressions || 0),
      clicks: Number(r.metrics.clicks || 0),
      ctr: Number(r.metrics.ctr || 0),
      averageCpc: Number(r.metrics.averageCpc || 0) / 1e6,
      costMicros: Number(r.metrics.costMicros || 0),
      cost: Number(r.metrics.costMicros || 0) / 1e6,
      conversions: Number(r.metrics.conversions || 0),
      cvr: Number(r.metrics.conversionsFromInteractionsRate || 0),
      cpa:
        r.metrics.costPerConversion != null
          ? Number(r.metrics.costPerConversion) / 1e6
          : null,
    });
  }

  for (const c of Object.values(byCampaign)) {
    c.totals = summarizeDaily(c.daily);
  }

  // 5) Conversões por action + campanha
  let byAction = [];
  try {
    const actionRows = await search(
      ads,
      token,
      `
      SELECT
        campaign.id,
        campaign.name,
        segments.date,
        segments.conversion_action,
        segments.conversion_action_name,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.id IN (${ORIG_CAMPAIGN_ID}, ${EXP_CAMPAIGN_ID})
        AND segments.date BETWEEN '${START_DATE}' AND '${END_DATE}'
        AND metrics.all_conversions > 0
      ORDER BY segments.date
    `,
    );
    byAction = actionRows.map((r) => ({
      campaignId: String(r.campaign.id),
      campaignName: r.campaign.name,
      date: r.segments.date,
      conversionAction: r.segments.conversionAction || "",
      conversionActionName: r.segments.conversionActionName || "",
      conversions: Number(r.metrics.conversions || 0),
      allConversions: Number(r.metrics.allConversions || 0),
      conversionsValue: Number(r.metrics.conversionsValue || 0),
    }));
  } catch (e) {
    console.warn("Query por conversion_action falhou:", e.message || e);
  }

  // Agregar actions por campanha
  const actionTotals = {};
  for (const a of byAction) {
    const key = `${a.campaignId}||${a.conversionActionName}`;
    if (!actionTotals[key]) {
      actionTotals[key] = {
        campaignId: a.campaignId,
        conversionActionName: a.conversionActionName,
        conversions: 0,
        allConversions: 0,
        conversionsValue: 0,
        days: {},
      };
    }
    actionTotals[key].conversions += a.conversions;
    actionTotals[key].allConversions += a.allConversions;
    actionTotals[key].conversionsValue += a.conversionsValue;
    actionTotals[key].days[a.date] =
      (actionTotals[key].days[a.date] || 0) + a.conversions;
  }

  const control = byCampaign[ORIG_CAMPAIGN_ID]?.totals || null;
  const exp = byCampaign[EXP_CAMPAIGN_ID]?.totals || null;
  const comparison =
    control && exp
      ? {
          impressions: {
            control: control.impressions,
            exp: exp.impressions,
            deltaPct: pctDelta(exp.impressions, control.impressions),
            shareExp:
              control.impressions + exp.impressions
                ? exp.impressions / (control.impressions + exp.impressions)
                : null,
          },
          clicks: {
            control: control.clicks,
            exp: exp.clicks,
            deltaPct: pctDelta(exp.clicks, control.clicks),
            shareExp:
              control.clicks + exp.clicks
                ? exp.clicks / (control.clicks + exp.clicks)
                : null,
          },
          cost: {
            control: control.cost,
            exp: exp.cost,
            deltaPct: pctDelta(exp.cost, control.cost),
            shareExp:
              control.cost + exp.cost ? exp.cost / (control.cost + exp.cost) : null,
          },
          conversions: {
            control: control.conversions,
            exp: exp.conversions,
            deltaPct: pctDelta(exp.conversions, control.conversions),
            shareExp:
              control.conversions + exp.conversions
                ? exp.conversions / (control.conversions + exp.conversions)
                : null,
          },
          ctr: { control: control.ctr, exp: exp.ctr, deltaPct: pctDelta(exp.ctr, control.ctr) },
          cpc: { control: control.cpc, exp: exp.cpc, deltaPct: pctDelta(exp.cpc, control.cpc) },
          cvr: { control: control.cvr, exp: exp.cvr, deltaPct: pctDelta(exp.cvr, control.cvr) },
          cpa: { control: control.cpa, exp: exp.cpa, deltaPct: pctDelta(exp.cpa, control.cpa) },
        }
      : null;

  const snapshot = {
    generatedAt: new Date().toISOString(),
    window: { start: START_DATE, end: END_DATE, note: "5 dias úteis (seg–sex)" },
    campaigns: {
      controlId: ORIG_CAMPAIGN_ID,
      expId: EXP_CAMPAIGN_ID,
    },
    serving: serving.map((r) => ({
      id: String(r.campaign.id),
      name: r.campaign.name,
      status: r.campaign.status,
      primaryStatus: r.campaign.primaryStatus,
      reasons: r.campaign.primaryStatusReasons || [],
    })),
    experimentArms: experimentArms.map((r) => ({
      resourceName: r.experimentArm.resourceName,
      name: r.experimentArm.name,
      control: r.experimentArm.control || false,
      trafficSplit: Number(r.experimentArm.trafficSplit || 0),
      campaigns: r.experimentArm.campaigns || [],
      inDesignCampaigns: r.experimentArm.inDesignCampaigns || [],
      experiment: r.experimentArm.experiment || "",
    })),
    approvals: { counts: approvalCounts, ads: approvalList },
    byCampaign,
    comparison,
    conversionsByAction: {
      daily: byAction,
      totals: Object.values(actionTotals),
    },
    notes: {
      formBias:
        "Exp converte no passo 1 (form_initial_contact → iwx7); legado no submit final. Comparar formulário com cautela.",
      modalComparable:
        "Modais WA/telefone simétricos desde ~05/08 — melhor base comparável.",
      readOnly: true,
    },
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Snapshot salvo: ${OUT_PATH}`);
  console.log("\n=== SERVING ===");
  for (const s of snapshot.serving) {
    console.log(
      `${s.id} | ${s.status} | ${s.primaryStatus} | ${(s.reasons || []).join(",") || "-"}`,
    );
  }
  console.log("\n=== APPROVALS EXP ===");
  console.log(JSON.stringify(approvalCounts));
  console.log("\n=== EXPERIMENT ARMS ===");
  console.log(JSON.stringify(snapshot.experimentArms, null, 2));
  console.log("\n=== TOTALS ===");
  console.log(
    "Controle:",
    JSON.stringify(byCampaign[ORIG_CAMPAIGN_ID]?.totals || null, null, 2),
  );
  console.log(
    "Exp:",
    JSON.stringify(byCampaign[EXP_CAMPAIGN_ID]?.totals || null, null, 2),
  );
  console.log("\n=== COMPARISON ===");
  console.log(JSON.stringify(comparison, null, 2));
  console.log("\n=== ACTIONS ===");
  for (const a of Object.values(actionTotals)) {
    console.log(
      `${a.campaignId} | ${a.conversionActionName} | conv=${a.conversions.toFixed(2)}`,
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
