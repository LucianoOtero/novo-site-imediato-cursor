/**
 * Força re-análise de política dos 3 RSAs do grupo Moto (braço Exp) que
 * ficaram com DISAPPROVED/ONE_WEBSITE_PER_AD_GROUP obsoleto: reenvia as
 * final_urls atuais (re-save), o que dispara nova avaliação.
 * Só toca nos ads DISAPPROVED do grupo Moto da campanha 24095000558.
 */
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
  const res = await fetch(`${ADS_API}/customers/${cid}/googleAds:searchStream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 1000));
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
    (b) => b.results || [],
  );
}

const rows = await q(`
  SELECT ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.final_urls,
         ad_group_ad.policy_summary.approval_status
  FROM ad_group_ad
  WHERE campaign.id = ${EXP_CAMPAIGN_ID}
    AND ad_group.name = 'Moto'
    AND ad_group_ad.status != 'REMOVED'
    AND ad_group_ad.policy_summary.approval_status = 'DISAPPROVED'
`);

console.log(`Ads DISAPPROVED no grupo Moto: ${rows.length}`);
if (!rows.length) {
  console.log("Nada a fazer.");
  process.exit(0);
}

const operations = rows.map((r) => ({
  update: {
    resourceName: `customers/${cid}/ads/${r.adGroupAd.ad.id}`,
    finalUrls: r.adGroupAd.ad.finalUrls,
  },
  updateMask: "final_urls",
}));

const res = await fetch(`${ADS_API}/customers/${cid}/ads:mutate`, {
  method: "POST",
  headers,
  body: JSON.stringify({ operations, partialFailure: true }),
});
const text = await res.text();
if (!res.ok) throw new Error(text.slice(0, 2000));
const result = JSON.parse(text);
if (result.partialFailureError) {
  console.error("PARTIAL FAILURE:", JSON.stringify(result.partialFailureError).slice(0, 2000));
} else {
  console.log(`Re-save enviado para ${(result.results || []).length} anúncios do grupo Moto.`);
}
