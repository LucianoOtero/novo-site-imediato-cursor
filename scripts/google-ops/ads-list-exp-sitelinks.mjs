/** Lista sitelinks vinculados à campanha Exp (somente leitura). */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const ads = config.googleAds;
const cid = String(ads.customerId).replace(/\D/g, "");

const oauth2 = await getAuthorizedClient({ withAds: true });
const t = await oauth2.getAccessToken();
const headers = {
  Authorization: `Bearer ${t?.token || oauth2.credentials.access_token}`,
  "developer-token": ads.developerToken,
  "Content-Type": "application/json",
};
if (ads.loginCustomerId)
  headers["login-customer-id"] = String(ads.loginCustomerId).replace(/\D/g, "");

async function q(query) {
  const res = await fetch(
    `${ADS_API}/customers/${cid}/googleAds:searchStream`,
    { method: "POST", headers, body: JSON.stringify({ query }) },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 800));
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
    (b) => b.results || [],
  );
}

const camp = await q(`
  SELECT campaign.id, campaign_asset.resource_name, asset.id,
         asset.final_urls, asset.sitelink_asset.link_text
  FROM campaign_asset
  WHERE campaign.id = ${EXP_CAMPAIGN_ID}
    AND asset.type = 'SITELINK'
    AND campaign_asset.status != 'REMOVED'
`);
console.log(`Sitelinks vinculados à campanha Exp: ${camp.length}`);
for (const r of camp) {
  console.log(
    `- asset ${r.asset.id} | ${r.asset.sitelinkAsset?.linkText} | ${(r.asset.finalUrls || []).join(", ")}`,
  );
}

const ag = await q(`
  SELECT campaign.id, ad_group.name, ad_group_asset.resource_name, asset.id,
         asset.final_urls, asset.sitelink_asset.link_text
  FROM ad_group_asset
  WHERE campaign.id = ${EXP_CAMPAIGN_ID}
    AND asset.type = 'SITELINK'
    AND ad_group_asset.status != 'REMOVED'
`);
console.log(`Sitelinks vinculados a grupos da Exp: ${ag.length}`);
for (const r of ag) {
  console.log(
    `- [${r.adGroup.name}] asset ${r.asset.id} | ${r.asset.sitelinkAsset?.linkText} | ${(r.asset.finalUrls || []).join(", ")}`,
  );
}
