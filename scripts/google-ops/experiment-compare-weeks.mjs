/**
 * Compara duas janelas do experimento (W1 vs W2).
 *
 * Uso:
 *   node experiment-compare-weeks.mjs \
 *     --w1-start 2026-08-10 --w1-end 2026-08-14 \
 *     --w2-start 2026-08-17 --w2-end 2026-08-21 \
 *     --ads-w1 ads-analysis-w1.json --ads-w2 ads-analysis-w2.json \
 *     --ga4-w1 ga4-analysis-w1.json --ga4-w2 ga4-analysis-w2.json \
 *     --leads-novo-w1 leads-analysis-w1-novo.json \
 *     --leads-novo-w2 leads-analysis-w2-novo.json \
 *     --leads-legacy-w1 legacy-leads-analysis-w1.json \
 *     --leads-legacy-w2 legacy-leads-analysis-w2.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, requireArg } from "./lib/cli-args.mjs";
import {
  CONTROL_CAMPAIGN_ID,
  EXP_CAMPAIGN_ID,
  aggregateGa4CampaignHosts,
  adsTotals,
  pctDelta,
} from "./lib/experiment-aggregate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function armMetrics(ads, campaignId, clicksFromFirebase) {
  const t = adsTotals(ads, campaignId);
  if (!t) return null;
  const leads = clicksFromFirebase?.leads ?? null;
  const uniqueGclids = clicksFromFirebase?.uniqueGclids ?? null;
  return {
    impressions: t.impressions,
    clicks: t.clicks,
    cost: t.cost,
    conversions: t.conversions,
    ctr: t.ctr,
    cpc: t.cpc,
    cvr: t.cvr,
    cpa: t.cpa,
    leadsWithGclid: leads,
    uniqueGclids,
    leadRateByClick: t.clicks && uniqueGclids != null ? uniqueGclids / t.clicks : null,
    cpaPerUniqueGclid:
      t.cost && uniqueGclids ? t.cost / uniqueGclids : null,
  };
}

function weekPair(w1, w2) {
  if (!w1 || !w2) return null;
  const out = {};
  for (const k of new Set([...Object.keys(w1), ...Object.keys(w2)])) {
    out[k] = { w1: w1[k], w2: w2[k], deltaPct: pctDelta(w2[k], w1[k]) };
  }
  return out;
}

function offlineAllConv(ads, campaignId) {
  const totals = ads?.conversionsByAction?.totals || [];
  const pick = totals.filter(
    (a) =>
      String(a.campaignId) === String(campaignId) &&
      /offline|SegurosImediatoOffline/i.test(a.conversionActionName || ""),
  );
  return pick.reduce((s, a) => s + (a.allConversions || 0), 0);
}

async function main() {
  const args = parseArgs();
  const w1 = {
    start: requireArg(args, "w1-start"),
    end: requireArg(args, "w1-end"),
  };
  const w2 = {
    start: requireArg(args, "w2-start"),
    end: requireArg(args, "w2-end"),
  };

  const adsW1 = readJson(args["ads-w1"] || path.join(__dirname, `ads-analysis-${w1.start}_${w1.end}.json`));
  const adsW2 = readJson(args["ads-w2"] || path.join(__dirname, `ads-analysis-${w2.start}_${w2.end}.json`));
  const ga4W1 = readJson(args["ga4-w1"] || path.join(__dirname, `ga4-analysis-${w1.start}_${w1.end}.json`));
  const ga4W2 = readJson(args["ga4-w2"] || path.join(__dirname, `ga4-analysis-${w2.start}_${w2.end}.json`));
  const leadsNovoW1 = readJson(
    args["leads-novo-w1"] ||
      path.join(__dirname, `leads-analysis-${w1.start}_${w1.end}.json`),
  );
  const leadsNovoW2 = readJson(
    args["leads-novo-w2"] ||
      path.join(__dirname, `leads-analysis-${w2.start}_${w2.end}.json`),
  );
  const leadsLegacyW1 = readJson(
    args["leads-legacy-w1"] ||
      path.join(__dirname, `legacy-leads-analysis-${w1.start}_${w1.end}.json`),
  );
  const leadsLegacyW2 = readJson(
    args["leads-legacy-w2"] ||
      path.join(__dirname, `legacy-leads-analysis-${w2.start}_${w2.end}.json`),
  );

  const ctrlW1 = armMetrics(adsW1, CONTROL_CAMPAIGN_ID, {
    uniqueGclids: leadsLegacyW1.summary?.control?.uniqueGclids,
    leads: leadsLegacyW1.summary?.control?.records,
  });
  const ctrlW2 = armMetrics(adsW2, CONTROL_CAMPAIGN_ID, {
    uniqueGclids: leadsLegacyW2.summary?.control?.uniqueGclids,
    leads: leadsLegacyW2.summary?.control?.records,
  });
  const expW1 = armMetrics(adsW1, EXP_CAMPAIGN_ID, {
    uniqueGclids: leadsNovoW1.summary?.exp?.uniqueGclids,
    leads: leadsNovoW1.summary?.exp?.withGclid,
  });
  const expW2 = armMetrics(adsW2, EXP_CAMPAIGN_ID, {
    uniqueGclids: leadsNovoW2.summary?.exp?.uniqueGclids,
    leads: leadsNovoW2.summary?.exp?.withGclid,
  });

  const ga4AggW1 = aggregateGa4CampaignHosts(ga4W1);
  const ga4AggW2 = aggregateGa4CampaignHosts(ga4W2);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    windows: { w1, w2 },
    campaigns: { controlId: CONTROL_CAMPAIGN_ID, expId: EXP_CAMPAIGN_ID },
    arms: {
      control: { w1: ctrlW1, w2: ctrlW2, weekOverWeek: weekPair(ctrlW1, ctrlW2) },
      exp: { w1: expW1, w2: expW2, weekOverWeek: weekPair(expW1, expW2) },
    },
    gapExpMinusCtrl: {
      w1: {
        leadRateByClick: pctDelta(expW1?.leadRateByClick, ctrlW1?.leadRateByClick),
        cpaPerUniqueGclid: pctDelta(expW1?.cpaPerUniqueGclid, ctrlW1?.cpaPerUniqueGclid),
        cvr: pctDelta(expW1?.cvr, ctrlW1?.cvr),
      },
      w2: {
        leadRateByClick: pctDelta(expW2?.leadRateByClick, ctrlW2?.leadRateByClick),
        cpaPerUniqueGclid: pctDelta(expW2?.cpaPerUniqueGclid, ctrlW2?.cpaPerUniqueGclid),
        cvr: pctDelta(expW2?.cvr, ctrlW2?.cvr),
      },
    },
    ga4: {
      w1: ga4AggW1,
      w2: ga4AggW2,
      weekOverWeek: {
        controlLegacyEngagement: weekPair(
          ga4AggW1.control.legacy,
          ga4AggW2.control.legacy,
        ),
        expNovoEngagement: weekPair(ga4AggW1.exp.novo, ga4AggW2.exp.novo),
      },
    },
    offlineAllConversions: {
      w1: {
        control: offlineAllConv(adsW1, CONTROL_CAMPAIGN_ID),
        exp: offlineAllConv(adsW1, EXP_CAMPAIGN_ID),
      },
      w2: {
        control: offlineAllConv(adsW2, CONTROL_CAMPAIGN_ID),
        exp: offlineAllConv(adsW2, EXP_CAMPAIGN_ID),
      },
    },
    adsActions: {
      w1: adsW1.conversionsByAction?.totals || [],
      w2: adsW2.conversionsByAction?.totals || [],
    },
    firebase: {
      novo: {
        w1: leadsNovoW1.summary,
        w2: leadsNovoW2.summary,
      },
      legacy: {
        w1: leadsLegacyW1.summary,
        w2: leadsLegacyW2.summary,
      },
    },
  };

  const OUT =
    args.out ||
    path.join(
      __dirname,
      `experiment-comparison-${w1.start}_${w1.end}_vs_${w2.start}_${w2.end}.json`,
    );
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Comparison snapshot: ${OUT}`);
  console.log(JSON.stringify(snapshot.arms, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
