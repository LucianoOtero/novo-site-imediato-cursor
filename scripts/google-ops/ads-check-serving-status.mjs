/**
 * Verifica o primary_status da campanha Exp e dos ad groups — mostra se o
 * Google está limitando a veiculação (ex.: "Veiculação limitada" por
 * identidade do anunciante) e as razões.
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = process.argv[2] || "24095000558";

function loadAds() {
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

async function searchStream(ads, token, query) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "developer-token": ads.developerToken,
    "Content-Type": "application/json",
  };
  if (ads.loginCustomerId) headers["login-customer-id"] = ads.loginCustomerId;
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/googleAds:searchStream`,
    { method: "POST", headers, body: JSON.stringify({ query }) },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 800));
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
    (b) => b.results || [],
  );
}

async function main() {
  const ads = loadAds();
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const token =
    (await oauth2.getAccessToken())?.token || oauth2.credentials.access_token;

  const campaigns = await searchStream(
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
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
  `,
  );
  for (const r of campaigns) {
    console.log(`Campanha ${r.campaign.id} (${r.campaign.name})`);
    console.log(`  status: ${r.campaign.status}`);
    console.log(`  primary_status: ${r.campaign.primaryStatus}`);
    console.log(
      `  reasons: ${(r.campaign.primaryStatusReasons || []).join(", ") || "(nenhuma)"}`,
    );
  }

  const groups = await searchStream(
    ads,
    token,
    `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.primary_status,
      ad_group.primary_status_reasons
    FROM ad_group
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group.status != 'REMOVED'
  `,
  );
  console.log("\nAd groups:");
  for (const r of groups) {
    console.log(
      `  [${r.adGroup.name}] ${r.adGroup.status} | primary: ${r.adGroup.primaryStatus} | reasons: ${(r.adGroup.primaryStatusReasons || []).join(", ") || "(nenhuma)"}`,
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
