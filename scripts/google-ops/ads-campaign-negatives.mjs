#!/usr/bin/env node
/**
 * Frases negativas numa campanha que já existe. Recusa a negativa que
 * bloquearia uma palavra-chave positiva ativa da própria campanha.
 *
 *   node ads-campaign-negatives.mjs --campaign-id=24433459330 --add="fone,numero"            → dry-run
 *   node ads-campaign-negatives.mjs --campaign-id=24433459330 --add="fone,numero" --apply
 *   node ads-campaign-negatives.mjs --campaign-id=24433459330 --add="fone,numero" --remove --apply   → rollback
 */
import { adsSession, argValue, mutate, normKeyword, searchAll, writeLog } from "./lib/ads-rest.mjs";

const APPLY = process.argv.includes("--apply");
const REMOVE = process.argv.includes("--remove");
const MODE = `${REMOVE ? "remove" : "add"}-${APPLY ? "apply" : "dry-run"}`;

const words = (t) => normKeyword(t).split(" ").filter(Boolean);

function phraseBlocks(negative, positive) {
  const n = words(negative);
  const p = words(positive);
  for (let i = 0; i + n.length <= p.length; i++) {
    if (n.every((w, j) => p[i + j] === w)) return true;
  }
  return false;
}

async function main() {
  const campaignId = String(argValue("campaign-id") || "").replace(/\D/g, "");
  const phrases = [...new Set(String(argValue("add") || "").split(",").map(normKeyword).filter(Boolean))];
  if (!campaignId || !phrases.length) throw new Error('informe --campaign-id=<id> e --add="frase1,frase2"');

  const s = await adsSession();
  const campaignRn = `customers/${s.ads.customerId}/campaigns/${campaignId}`;

  const positives = (
    await searchAll(
      s,
      `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type
       FROM ad_group_criterion
       WHERE campaign.id = ${campaignId} AND ad_group_criterion.type = 'KEYWORD'
         AND ad_group_criterion.negative = FALSE AND ad_group_criterion.status != 'REMOVED'`,
    )
  ).map((r) => r.adGroupCriterion.keyword.text);

  const existing = new Map(
    (
      await searchAll(
        s,
        `SELECT campaign_criterion.resource_name, campaign_criterion.keyword.text
         FROM campaign_criterion
         WHERE campaign_criterion.campaign = '${campaignRn}' AND campaign_criterion.type = 'KEYWORD'
           AND campaign_criterion.negative = TRUE AND campaign_criterion.keyword.match_type = 'PHRASE'`,
      )
    ).map((r) => [normKeyword(r.campaignCriterion.keyword.text), r.campaignCriterion.resourceName]),
  );

  const ops = [];
  const items = [];
  for (const phrase of phrases) {
    const rn = existing.get(phrase);
    if (REMOVE) {
      if (rn) {
        ops.push({ remove: rn });
        items.push({ phrase, action: "remove" });
      }
      continue;
    }
    if (rn) {
      items.push({ phrase, action: "skip_exists" });
      continue;
    }
    const blocked = positives.find((p) => phraseBlocks(phrase, p));
    if (blocked) {
      items.push({ phrase, action: "skip_blocks_positive", positive: blocked });
      continue;
    }
    ops.push({ create: { campaign: campaignRn, negative: true, keyword: { text: phrase, matchType: "PHRASE" } } });
    items.push({ phrase, action: "add" });
  }

  const report = { ranAt: new Date().toISOString(), mode: MODE, campaignId, positives: positives.length, items };
  if (APPLY && ops.length) {
    const res = await mutate(s, "campaignCriteria", { operations: ops });
    report.results = res.results?.map((r) => r.resourceName) || [];
  }
  writeLog(`campaign-negatives-${campaignId}`, report);
  console.log(`${MODE} | campanha=${campaignId} | positivas=${positives.length} | operações=${ops.length}`);
  for (const it of items) console.log(` - ${it.action} "${it.phrase}"${it.positive ? ` (bloquearia "${it.positive}")` : ""}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
