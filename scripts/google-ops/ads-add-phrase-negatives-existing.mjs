/**
 * Frases negativas da seguradora (ex.: "suhai") nas campanhas existentes listadas na spec
 * (phraseNegativesOnExisting.campaignIds), para a campanha nova não disputar com elas.
 *
 * Uso:
 *   node ads-add-phrase-negatives-existing.mjs --spec=ads-suhai-campaign-spec.json            # dry-run
 *   node ads-add-phrase-negatives-existing.mjs --spec=ads-suhai-campaign-spec.json --apply
 *   node ads-add-phrase-negatives-existing.mjs --spec=ads-suhai-campaign-spec.json --remove --apply   # rollback
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adsSession, argValue, mutate, normKeyword, searchAll, writeLog } from "./lib/ads-rest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const REMOVE = process.argv.includes("--remove");
const MODE = `${REMOVE ? "remove" : "add"}-${APPLY ? "apply" : "dry-run"}`;

async function main() {
  const specArg = argValue("spec");
  if (!specArg) throw new Error("informe --spec=<arquivo.json>");
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, specArg), "utf8"));
  const cfg = spec.phraseNegativesOnExisting || {};
  const phrases = (cfg.phrases || []).map(normKeyword).filter(Boolean);
  const ids = (cfg.campaignIds || []).map(String);
  if (!phrases.length || !ids.length) throw new Error("phraseNegativesOnExisting sem phrases ou campaignIds");

  const s = await adsSession();
  const campaigns = await searchAll(
    s,
    `SELECT campaign.id, campaign.name, campaign.status
     FROM campaign WHERE campaign.id IN (${ids.join(",")})`,
  );
  const found = new Set(campaigns.map((r) => String(r.campaign.id)));
  const missing = ids.filter((id) => !found.has(id));
  if (missing.length) throw new Error(`campanhas não encontradas: ${missing.join(", ")}`);
  const own = campaigns.find((r) => r.campaign.name === spec.campaignName);
  if (own) throw new Error("a campanha da própria seguradora não pode receber a frase negativa");

  const existing = await searchAll(
    s,
    `SELECT campaign.id, campaign_criterion.resource_name, campaign_criterion.keyword.text,
       campaign_criterion.keyword.match_type
     FROM campaign_criterion
     WHERE campaign.id IN (${ids.join(",")})
       AND campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE
       AND campaign_criterion.keyword.match_type = 'PHRASE'`,
  );
  const have = new Map();
  for (const r of existing) {
    have.set(`${r.campaign.id}|${normKeyword(r.campaignCriterion.keyword.text)}`, r.campaignCriterion.resourceName);
  }

  const ops = [];
  const items = [];
  for (const c of campaigns) {
    const cid = String(c.campaign.id);
    for (const phrase of phrases) {
      const rn = have.get(`${cid}|${phrase}`);
      if (REMOVE && rn) {
        ops.push({ remove: rn });
        items.push({ campaignId: cid, campaignName: c.campaign.name, phrase, action: "remove" });
      } else if (!REMOVE && !rn) {
        ops.push({
          create: {
            campaign: `customers/${s.ads.customerId}/campaigns/${cid}`,
            negative: true,
            keyword: { text: phrase, matchType: "PHRASE" },
          },
        });
        items.push({ campaignId: cid, campaignName: c.campaign.name, phrase, action: "add" });
      }
    }
  }

  const report = {
    ranAt: new Date().toISOString(),
    mode: MODE,
    customerId: s.ads.customerId,
    phrases,
    campaigns: campaigns.map((c) => ({ id: String(c.campaign.id), name: c.campaign.name, status: c.campaign.status })),
    items,
  };
  if (APPLY && ops.length) {
    const res = await mutate(s, "campaignCriteria", { operations: ops });
    report.results = res.results?.map((r) => r.resourceName) || [];
  }
  writeLog(`${normKeyword(spec.logPrefix || "insurer")}-phrase-existing`, report);
  console.log(`${MODE} | campanhas=${campaigns.length} | operações=${ops.length}`);
  for (const it of items) console.log(` - ${it.action} "${it.phrase}" em ${it.campaignName} (${it.campaignId})`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
