/**
 * Baseline do experimento (Fase 0 da migração para novo.segurosimediato.com.br).
 *
 * Somente leitura: extrai impressões/cliques/custo/conversões por dia dos
 * 2 braços (campanha original 21287198336 e campanha Exp 24095000558) nos
 * últimos 14 dias e salva snapshot JSON datado para comparação pós-migração.
 *
 * Uso: node ads-baseline-experiment.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const ORIG_CAMPAIGN_ID = "21287198336";

// Janela fixa de 14 dias terminando ONTEM, para a pausa do braço Exp
// (2026-08-06) não distorcer o baseline.
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
const END_DATE = isoDaysAgo(1);
const START_DATE = isoDaysAgo(14);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function getAccessToken() {
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const tokenRes = await oauth2.getAccessToken();
  return tokenRes?.token || oauth2.credentials.access_token;
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

async function main() {
  const ads = loadAdsConfig();
  const token = await getAccessToken();

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
      metrics.cost_micros,
      metrics.conversions
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
      byCampaign[id] = { name: r.campaign.name, daily: [], totals: null };
    }
    byCampaign[id].daily.push({
      date: r.segments.date,
      impressions: Number(r.metrics.impressions || 0),
      clicks: Number(r.metrics.clicks || 0),
      ctr: Number(r.metrics.ctr || 0),
      costMicros: Number(r.metrics.costMicros || 0),
      conversions: Number(r.metrics.conversions || 0),
    });
  }

  for (const [id, c] of Object.entries(byCampaign)) {
    const t = c.daily.reduce(
      (acc, d) => ({
        impressions: acc.impressions + d.impressions,
        clicks: acc.clicks + d.clicks,
        costMicros: acc.costMicros + d.costMicros,
        conversions: acc.conversions + d.conversions,
      }),
      { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 },
    );
    c.totals = {
      ...t,
      ctr: t.impressions ? t.clicks / t.impressions : 0,
      costBRL: t.costMicros / 1e6,
    };
    console.log(
      `\n## ${id} — ${c.name}\n` +
        `   14d: impressões=${t.impressions} cliques=${t.clicks} ` +
        `CTR=${(c.totals.ctr * 100).toFixed(2)}% custo=R$${c.totals.costBRL.toFixed(2)} conv=${t.conversions}`,
    );
    for (const d of c.daily) {
      console.log(
        `   ${d.date}: imp=${d.impressions} clk=${d.clicks} conv=${d.conversions}`,
      );
    }
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    purpose:
      "Baseline pré-migração para novo.segurosimediato.com.br (Fase 0)",
    customerId: ads.customerId,
    period: { start: START_DATE, end: END_DATE },
    campaigns: byCampaign,
  };
  const dateTag = new Date().toISOString().slice(0, 10);
  const outPath = path.join(__dirname, `ads-baseline-${dateTag}.json`);
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`\nSnapshot salvo em: ${outPath}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
