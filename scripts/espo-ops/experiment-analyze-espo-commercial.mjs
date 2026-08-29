/**
 * Placar comercial do experimento por coorte (Espo + Firebase + Ads).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchFirebaseBackup } from "../google-ops/lib/firebase-fetch.mjs";
import {
  CONTROL_CAMPAIGN_ID,
  EXP_CAMPAIGN_ID,
} from "../google-ops/lib/experiment-constants.mjs";
import { parseArgs, requireArg } from "../google-ops/lib/cli-args.mjs";
import {
  OPP_SELECT,
  accumulateArm,
  attributeArm,
  buildFirebaseGclidArmIndex,
  normalizePhone,
  captureDateOf,
  dateInWindow,
  emptyArmMetrics,
  finalizeArm,
  readAdsArmTotals,
} from "./lib/experiment-commercial.mjs";
import {
  espoListAll,
  isTestLead,
  resolveEspoConfig,
} from "./lib/espo-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fetchOpportunityPool(config) {
  const byId = new Map();
  const recent = await espoListAll(config, "Opportunity", {
    select: OPP_SELECT,
    orderBy: "createdAt",
    order: "desc",
    maxSize: 200,
    maxPages: 40,
  });
  for (const row of recent) byId.set(row.id, row);

  for (const webpage of [
    "novo.segurosimediato.com.br",
    "comparaseguroonline.com.br",
    "mdmidia.com.br",
  ]) {
    const chunk = await espoListAll(config, "Opportunity", {
      select: OPP_SELECT,
      where: [{ type: "equals", attribute: "cWebpage", value: webpage }],
      orderBy: "createdAt",
      order: "desc",
      maxSize: 200,
      maxPages: 15,
    });
    for (const row of chunk) byId.set(row.id, row);
  }
  return [...byId.values()];
}

function inCohort(opp, fbIndex, cohortStart, cohortEnd) {
  if (opp.id && fbIndex.oppIdMap.has(opp.id)) return true;
  if (opp.cLeadId && fbIndex.leadIdMap.has(opp.cLeadId)) return true;
  if (opp.cGclid && fbIndex.gclidMap.has(opp.cGclid)) return true;
  const phone = normalizePhone(opp.cCelular);
  if (phone && fbIndex.phoneMap?.has(phone)) return true;
  const cap = captureDateOf(opp);
  return cap && dateInWindow(cap, cohortStart, cohortEnd);
}

async function main() {
  const args = parseArgs();
  const cohortStart = requireArg(args, "cohort-start");
  const cohortEnd = requireArg(args, "cohort-end");
  const asOf = args["as-of"] || new Date().toISOString().slice(0, 10);
  const adsJsonPath = args["ads-json"];
  const OUT =
    args.out ||
    path.join(
      __dirname,
      `experiment-commercial-${cohortStart}_${cohortEnd}-asof-${asOf}.json`,
    );

  const config = resolveEspoConfig({ prefer: "prod" });
  console.log("Espo:", config.baseUrl);
  console.log(`Coorte ${cohortStart} → ${cohortEnd}, as-of ${asOf}`);

  console.log("Firebase…");
  const novoRaw = fetchFirebaseBackup("imediato-seguros-site-novo");
  const legadoRaw = fetchFirebaseBackup("leads-imediato-seguros");
  const fbIndex = buildFirebaseGclidArmIndex(
    novoRaw,
    legadoRaw,
    cohortStart,
    cohortEnd,
  );
  console.log(
    "Firebase index:",
    fbIndex.gclidMap.size,
    "gclids,",
    fbIndex.oppIdMap.size,
    "oppIds,",
    fbIndex.leadIdMap.size,
    "leadIds,",
    fbIndex.phoneMap.size,
    "phones",
  );

  console.log("Opportunities Espo…");
  const pool = await fetchOpportunityPool(config);
  console.log("Opps no pool:", pool.length);

  let adsClicks = { control: null, exp: null };
  let adsCost = { control: null, exp: null };
  if (adsJsonPath) {
    const ads = JSON.parse(fs.readFileSync(path.resolve(adsJsonPath), "utf8"));
    const ctrl = readAdsArmTotals(ads, CONTROL_CAMPAIGN_ID);
    const exp = readAdsArmTotals(ads, EXP_CAMPAIGN_ID);
    adsClicks = { control: ctrl.clicks, exp: exp.clicks };
    adsCost = { control: ctrl.cost, exp: exp.cost };
  }

  const arms = {
    control: emptyArmMetrics(),
    exp: emptyArmMetrics(),
  };
  const stats = {
    poolSize: pool.length,
    processed: 0,
    inCohort: 0,
    excludedTests: 0,
    excludedUnattributed: 0,
    excludedOutOfWindow: 0,
    deduped: 0,
  };

  const cohortEndTs = Date.parse(`${cohortEnd}T23:59:59Z`);
  const asOfTs = Date.parse(`${asOf}T23:59:59Z`);
  const cohortAgeDays = Math.round((asOfTs - cohortEndTs) / 86400000);
  const seen = new Set();

  for (const opp of pool) {
    stats.processed++;
    if (isTestLead(opp)) {
      stats.excludedTests++;
      continue;
    }
    if (!inCohort(opp, fbIndex, cohortStart, cohortEnd)) {
      stats.excludedOutOfWindow++;
      continue;
    }
    stats.inCohort++;

    const { arm, method } = attributeArm(opp, fbIndex);
    if (!arm || (arm !== "exp" && arm !== "control")) {
      stats.excludedUnattributed++;
      continue;
    }
    if (seen.has(opp.id)) {
      stats.deduped++;
      continue;
    }
    seen.add(opp.id);

    arms[arm].attribution[method] = (arms[arm].attribution[method] || 0) + 1;
    accumulateArm(arms[arm], opp, {
      asOf,
      clicks: adsClicks[arm],
      cost: adsCost[arm],
    });
  }

  finalizeArm(arms.control);
  finalizeArm(arms.exp);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    reportDate: asOf,
    cohortWindow: { start: cohortStart, end: cohortEnd },
    cohortAgeDays,
    maturityNote:
      cohortAgeDays < 21
        ? "imatura"
        : cohortAgeDays < 30
          ? "parcial"
          : "madura",
    campaigns: {
      controlId: CONTROL_CAMPAIGN_ID,
      expId: EXP_CAMPAIGN_ID,
    },
    saleDefinition: {
      primary: 'stage === "Vendido"',
      audit: "cDataVenda preenchida",
      valueField: "amount (Valor Comissão)",
    },
    clicksAds: adsClicks,
    costAds: adsCost,
    stats,
    arms,
    comparison: {
      saleRatePerClick: {
        control: arms.control.saleRatePerClick,
        exp: arms.exp.saleRatePerClick,
        deltaPct:
          arms.control.saleRatePerClick && arms.exp.saleRatePerClick
            ? arms.exp.saleRatePerClick / arms.control.saleRatePerClick - 1
            : null,
      },
      amountPerClick: {
        control: arms.control.amountPerClick,
        exp: arms.exp.amountPerClick,
        deltaPct:
          arms.control.amountPerClick && arms.exp.amountPerClick
            ? arms.exp.amountPerClick / arms.control.amountPerClick - 1
            : null,
      },
      roasCommercial: {
        control: arms.control.roasCommercial,
        exp: arms.exp.roasCommercial,
        deltaPct:
          arms.control.roasCommercial && arms.exp.roasCommercial
            ? arms.exp.roasCommercial / arms.control.roasCommercial - 1
            : null,
      },
      amountSum: {
        control: arms.control.amountSum,
        exp: arms.exp.amountSum,
      },
      soldVendido: {
        control: arms.control.soldVendido,
        exp: arms.exp.soldVendido,
      },
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Commercial snapshot: ${OUT}`);
  console.log(JSON.stringify(snapshot.comparison, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
