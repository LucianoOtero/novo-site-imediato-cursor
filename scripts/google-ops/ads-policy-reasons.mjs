/** Lista os motivos de política dos anúncios reprovados do braço Exp (leitura). */
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
        ad_group.name,
        ad_group_ad.ad.id,
        ad_group_ad.policy_summary.approval_status,
        ad_group_ad.policy_summary.review_status,
        ad_group_ad.policy_summary.policy_topic_entries
      FROM ad_group_ad
      WHERE campaign.id = ${EXP_CAMPAIGN_ID}
        AND ad_group_ad.status != 'REMOVED'
        AND ad_group_ad.policy_summary.approval_status = 'DISAPPROVED'
    `,
  }),
});
const text = await res.text();
if (!res.ok) throw new Error(text.slice(0, 1000));
const parsed = JSON.parse(text);
const rows = (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
  (b) => b.results || [],
);

console.log(`Anúncios DISAPPROVED: ${rows.length}\n`);
const topicCount = new Map();
for (const r of rows) {
  const entries = r.adGroupAd.policySummary?.policyTopicEntries || [];
  console.log(`- [${r.adGroup.name}] ad ${r.adGroupAd.ad.id}`);
  for (const e of entries) {
    console.log(`    topic=${e.topic} type=${e.type}`);
    topicCount.set(e.topic, (topicCount.get(e.topic) || 0) + 1);
    for (const ev of e.evidences || []) {
      console.log(`    evidencia: ${JSON.stringify(ev).slice(0, 300)}`);
    }
  }
}
console.log("\nResumo por tópico:");
for (const [topic, n] of topicCount) console.log(`- ${topic}: ${n}`);
