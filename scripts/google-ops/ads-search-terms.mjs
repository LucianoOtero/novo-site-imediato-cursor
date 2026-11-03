/**
 * Termos de pesquisa (read-only) que contêm um padrão, por campanha e por termo.
 *
 * Uso:
 *   node ads-search-terms.mjs --match=suhai --days=30
 *   node ads-search-terms.mjs --match=suhai --days=90 --campaign-id=24095000558 --top=50
 */
import { adsSession, argValue, gaqlString, normKeyword, searchAll, writeLog } from "./lib/ads-rest.mjs";

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  const match = normKeyword(argValue("match") || "");
  if (!match) throw new Error("informe --match=<texto>");
  const days = Number(argValue("days") || 30);
  const top = Number(argValue("top") || 40);
  const campaignId = argValue("campaign-id");
  const end = new Date(Date.now() - 864e5);
  const start = new Date(end.getTime() - (days - 1) * 864e5);

  const s = await adsSession();
  const rows = await searchAll(
    s,
    `SELECT campaign.id, campaign.name, search_term_view.search_term,
       metrics.clicks, metrics.impressions, metrics.cost_micros,
       metrics.conversions, metrics.all_conversions
     FROM search_term_view
     WHERE segments.date BETWEEN '${ymd(start)}' AND '${ymd(end)}'
       AND search_term_view.search_term LIKE '%${gaqlString(match)}%'
       ${campaignId ? `AND campaign.id = ${String(campaignId).replace(/\D/g, "")}` : ""}`,
  );

  const add = (acc, r) => {
    acc.clicks += Number(r.metrics.clicks || 0);
    acc.impressions += Number(r.metrics.impressions || 0);
    acc.cost += Number(r.metrics.costMicros || 0) / 1e6;
    acc.conversions += Number(r.metrics.conversions || 0);
    acc.allConversions += Number(r.metrics.allConversions || 0);
    return acc;
  };
  const empty = () => ({ clicks: 0, impressions: 0, cost: 0, conversions: 0, allConversions: 0 });

  const byCampaign = new Map();
  const byTerm = new Map();
  for (const r of rows) {
    const ck = `${r.campaign.id}|${r.campaign.name}`;
    byCampaign.set(ck, add(byCampaign.get(ck) || empty(), r));
    const tk = normKeyword(r.searchTermView.searchTerm);
    byTerm.set(tk, add(byTerm.get(tk) || empty(), r));
  }
  const round = (m) => ({ ...m, cost: Math.round(m.cost * 100) / 100, conversions: Math.round(m.conversions * 10) / 10 });
  const campaigns = [...byCampaign].map(([k, m]) => ({ campaign: k.split("|")[1], id: k.split("|")[0], ...round(m) }))
    .sort((a, b) => b.cost - a.cost);
  const terms = [...byTerm].map(([t, m]) => ({ term: t, ...round(m) })).sort((a, b) => b.clicks - a.clicks);
  const total = round([...byTerm.values()].reduce((acc, m) => {
    for (const k of Object.keys(acc)) acc[k] += m[k];
    return acc;
  }, empty()));

  writeLog(`search-terms-${match.replace(/\s/g, "-")}`, { ranAt: new Date().toISOString(), match, days, total, campaigns, terms });
  console.log(`"${match}" ${ymd(start)}..${ymd(end)} | termos=${terms.length} | cliques=${total.clicks} | custo=R$ ${total.cost} | conv=${total.conversions} | todas=${total.allConversions}`);
  for (const c of campaigns) console.log(` [${c.id}] ${c.campaign}: ${c.clicks} cliques, R$ ${c.cost}, ${c.conversions} conv`);
  for (const t of terms.slice(0, top)) console.log(`   ${t.term}: ${t.clicks} cliques, R$ ${t.cost}, ${t.conversions} conv`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
