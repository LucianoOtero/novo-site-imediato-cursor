/**
 * Read-only: ações de conversão ativas, metas padrão da conta e metas de lance por campanha.
 *
 * Uso:
 *   node ads-conversion-goals.mjs --campaign-ids=24278639461,24095000558
 */
import { adsSession, argValue, searchAll, writeLog } from "./lib/ads-rest.mjs";

async function main() {
  const ids = String(argValue("campaign-ids") || "").split(",").map((x) => x.replace(/\D/g, "")).filter(Boolean);
  const s = await adsSession();

  const actions = (
    await searchAll(
      s,
      `SELECT conversion_action.id, conversion_action.name, conversion_action.category,
         conversion_action.origin, conversion_action.type, conversion_action.primary_for_goal
       FROM conversion_action WHERE conversion_action.status = 'ENABLED'`,
    )
  ).map((r) => r.conversionAction);

  const accountGoals = (
    await searchAll(
      s,
      `SELECT customer_conversion_goal.category, customer_conversion_goal.origin, customer_conversion_goal.biddable
       FROM customer_conversion_goal`,
    )
  ).map((r) => r.customerConversionGoal);

  const campaignGoals = ids.length
    ? (
        await searchAll(
          s,
          `SELECT campaign.id, campaign.name, campaign_conversion_goal.category,
             campaign_conversion_goal.origin, campaign_conversion_goal.biddable
           FROM campaign_conversion_goal WHERE campaign.id IN (${ids.join(",")})`,
        )
      ).map((r) => ({ campaignId: String(r.campaign.id), campaign: r.campaign.name, ...r.campaignConversionGoal }))
    : [];

  writeLog("conversion-goals", { ranAt: new Date().toISOString(), actions, accountGoals, campaignGoals });

  console.log("Ações ativas (id | nome | categoria | origem | tipo | primária):");
  for (const a of actions) {
    console.log(` ${a.id} | ${a.name} | ${a.category} | ${a.origin} | ${a.type} | ${a.primaryForGoal ? "sim" : "não"}`);
  }
  console.log("Metas padrão da conta usadas no lance:");
  for (const g of accountGoals.filter((x) => x.biddable)) console.log(` ${g.category} / ${g.origin}`);
  for (const id of ids) {
    const rows = campaignGoals.filter((g) => g.campaignId === id);
    console.log(`Campanha ${id} ${rows[0]?.campaign || ""} — metas no lance:`);
    for (const g of rows.filter((x) => x.biddable)) console.log(` ${g.category} / ${g.origin}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
