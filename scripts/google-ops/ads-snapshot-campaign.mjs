/**
 * Snapshot read-only de uma campanha (configuração, agenda, geo, idioma, negativas e um RSA).
 *
 * Uso:
 *   node ads-snapshot-campaign.mjs --campaign-id=24095000558 --out=logs/exp-snapshot-for-suhai.json
 */
import fs from "node:fs";
import path from "node:path";
import { OPS_ROOT } from "./lib/paths.mjs";
import { adsSession, argValue, searchAll } from "./lib/ads-rest.mjs";
import { EXP_CAMPAIGN_ID } from "./lib/experiment-constants.mjs";

async function main() {
  const id = String(argValue("campaign-id") || EXP_CAMPAIGN_ID).replace(/\D/g, "");
  const out = path.join(OPS_ROOT, argValue("out") || `logs/campaign-snapshot-${id}.json`);
  const s = await adsSession();

  const [camp] = await searchAll(
    s,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.bidding_strategy_type,
       campaign.network_settings.target_google_search, campaign.network_settings.target_search_network,
       campaign.network_settings.target_content_network, campaign.network_settings.target_partner_search_network,
       campaign.geo_target_type_setting.positive_geo_target_type,
       campaign.geo_target_type_setting.negative_geo_target_type,
       campaign.final_url_suffix, campaign.tracking_url_template, campaign_budget.amount_micros
     FROM campaign WHERE campaign.id = ${id}`,
  );
  if (!camp) throw new Error(`campanha ${id} não encontrada`);

  const criteria = await searchAll(
    s,
    `SELECT campaign_criterion.type, campaign_criterion.negative,
       campaign_criterion.location.geo_target_constant, campaign_criterion.language.language_constant,
       campaign_criterion.ad_schedule.day_of_week, campaign_criterion.ad_schedule.start_hour,
       campaign_criterion.ad_schedule.end_hour, campaign_criterion.keyword.text,
       campaign_criterion.keyword.match_type
     FROM campaign_criterion WHERE campaign.id = ${id}`,
  );
  const of = (type) => criteria.filter((r) => r.campaignCriterion.type === type).map((r) => r.campaignCriterion);

  const snap = {
    snapshotAt: new Date().toISOString(),
    customerId: s.ads.customerId,
    sourceCampaignId: id,
    campaign: camp.campaign,
    budgetMicros: camp.campaignBudget?.amountMicros || null,
    geo: of("LOCATION").map((c) => ({ geoTargetConstant: c.location.geoTargetConstant, negative: Boolean(c.negative) })),
    languages: of("LANGUAGE").map((c) => c.language.languageConstant),
    schedule: of("AD_SCHEDULE").map((c) => c.adSchedule),
    campaignNegatives: of("KEYWORD")
      .filter((c) => c.negative)
      .map((c) => ({ text: c.keyword.text, matchType: c.keyword.matchType })),
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(snap, null, 2), "utf8");
  console.log(`OK ${out} | ${snap.campaign.name} | negativas=${snap.campaignNegatives.length} | geo=${snap.geo.length}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
