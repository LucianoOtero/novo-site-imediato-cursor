/**
 * Agrega snapshots comerciais de múltiplas coortes (mesmo as-of).
 *
 * Uso:
 *   node experiment-compare-commercial-weeks.mjs \
 *     --as-of 2026-08-22 \
 *     --w1 experiment-commercial-w1-asof-2026-08-22.json \
 *     --w2 experiment-commercial-w2-asof-2026-08-22.json \
 *     --out experiment-commercial-comparison-asof-2026-08-22.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../google-ops/lib/cli-args.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));
}

function pctDelta(w2, w1) {
  if (w1 == null || w2 == null || w1 === 0) return null;
  return (w2 - w1) / w1;
}

function armBlock(snap) {
  const c = snap.arms.control;
  const e = snap.arms.exp;
  return {
    window: snap.cohortWindow,
    cohortAgeDays: snap.cohortAgeDays,
    maturityNote: snap.maturityNote,
    control: {
      opportunities: c.opportunities,
      soldVendido: c.soldVendido,
      amountSum: c.amountSum,
      saleRatePerClick: c.saleRatePerClick,
      amountPerClick: c.amountPerClick,
      roasCommercial: c.roasCommercial,
      clicks: snap.clicksAds?.control,
      cost: snap.costAds?.control,
    },
    exp: {
      opportunities: e.opportunities,
      soldVendido: e.soldVendido,
      amountSum: e.amountSum,
      saleRatePerClick: e.saleRatePerClick,
      amountPerClick: e.amountPerClick,
      roasCommercial: e.roasCommercial,
      clicks: snap.clicksAds?.exp,
      cost: snap.costAds?.exp,
    },
    gapExpVsCtrl: snap.comparison,
  };
}

async function main() {
  const args = parseArgs();
  const asOf = args["as-of"] || new Date().toISOString().slice(0, 10);
  const weeks = [];
  for (let i = 1; i <= 12; i++) {
    const key = `w${i}`;
    if (args[key]) weeks.push({ label: key.toUpperCase(), snap: readJson(args[key]) });
  }
  if (!weeks.length) {
    throw new Error("Informe --w1, --w2, … com paths dos snapshots comerciais.");
  }

  const OUT =
    args.out ||
    path.join(__dirname, `experiment-commercial-comparison-asof-${asOf}.json`);

  const byWeek = {};
  for (const { label, snap } of weeks) {
    byWeek[label] = armBlock(snap);
  }

  let weekOverWeek = null;
  if (weeks.length >= 2) {
    const w1 = weeks[0].snap;
    const w2 = weeks[1].snap;
    weekOverWeek = {
      control: {
        soldVendido: {
          w1: w1.arms.control.soldVendido,
          w2: w2.arms.control.soldVendido,
          deltaPct: pctDelta(
            w2.arms.control.soldVendido,
            w1.arms.control.soldVendido,
          ),
        },
        amountSum: {
          w1: w1.arms.control.amountSum,
          w2: w2.arms.control.amountSum,
          deltaPct: pctDelta(
            w2.arms.control.amountSum,
            w1.arms.control.amountSum,
          ),
        },
        amountPerClick: {
          w1: w1.arms.control.amountPerClick,
          w2: w2.arms.control.amountPerClick,
          deltaPct: pctDelta(
            w2.arms.control.amountPerClick,
            w1.arms.control.amountPerClick,
          ),
        },
      },
      exp: {
        soldVendido: {
          w1: w1.arms.exp.soldVendido,
          w2: w2.arms.exp.soldVendido,
          deltaPct: pctDelta(
            w2.arms.exp.soldVendido,
            w1.arms.exp.soldVendido,
          ),
        },
        amountSum: {
          w1: w1.arms.exp.amountSum,
          w2: w2.arms.exp.amountSum,
          deltaPct: pctDelta(
            w2.arms.exp.amountSum,
            w1.arms.exp.amountSum,
          ),
        },
        amountPerClick: {
          w1: w1.arms.exp.amountPerClick,
          w2: w2.arms.exp.amountPerClick,
          deltaPct: pctDelta(
            w2.arms.exp.amountPerClick,
            w1.arms.exp.amountPerClick,
          ),
        },
      },
    };
  }

  const out = {
    generatedAt: new Date().toISOString(),
    reportDate: asOf,
    weeks: byWeek,
    weekOverWeek,
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`Commercial comparison: ${OUT}`);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
