/** Lista TODOS os anúncios (qualquer tipo) do braço Exp com URLs (leitura). */
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

const res = await fetch(`${ADS_API}/customers/${cid}/googleAds:searchStream`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    query: `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group_ad.status,
        ad_group_ad.ad.id,
        ad_group_ad.ad.type,
        ad_group_ad.ad.final_urls,
        ad_group_ad.ad.final_mobile_urls,
        ad_group_ad.ad.tracking_url_template,
        ad_group_ad.policy_summary.approval_status
      FROM ad_group_ad
      WHERE campaign.id = ${EXP_CAMPAIGN_ID}
        AND ad_group_ad.status != 'REMOVED'
    `,
  }),
});
const text = await res.text();
if (!res.ok) throw new Error(text.slice(0, 1000));
const parsed = JSON.parse(text);
const rows = (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
  (b) => b.results || [],
);

console.log(`Total de anúncios (todos os tipos): ${rows.length}\n`);
const byGroup = new Map();
for (const r of rows) {
  const g = r.adGroup.name;
  if (!byGroup.has(g)) byGroup.set(g, []);
  byGroup.get(g).push(r);
}
for (const [g, list] of byGroup) {
  const domains = new Set();
  for (const r of list) {
    for (const u of r.adGroupAd.ad.finalUrls || []) {
      try {
        domains.add(new URL(u).hostname.replace(/^www\./, ""));
      } catch {}
    }
  }
  console.log(`## ${g} — domínios: [${[...domains].join(", ")}]${domains.size > 1 ? "  ⚠ MISTO" : ""}`);
  for (const r of list) {
    console.log(
      `  - ad ${r.adGroupAd.ad.id} | ${r.adGroupAd.ad.type} | ${r.adGroupAd.status} | ${r.adGroupAd.policySummary?.approvalStatus} | ${(r.adGroupAd.ad.finalUrls || []).join(", ") || "(sem URL)"}${r.adGroupAd.ad.trackingUrlTemplate ? " | tracking=" + r.adGroupAd.ad.trackingUrlTemplate : ""}`,
    );
  }
}
