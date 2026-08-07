/** Auditoria (leitura) das conversion actions da conta + volume 30 dias. */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";

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

const actions = await q(`
  SELECT conversion_action.id, conversion_action.name,
         conversion_action.status, conversion_action.type,
         conversion_action.category,
         conversion_action.primary_for_goal,
         conversion_action.include_in_conversions_metric
  FROM conversion_action
  WHERE conversion_action.status != 'REMOVED'
  ORDER BY conversion_action.name
`);
console.log(`Conversion actions ativas: ${actions.length}`);
for (const r of actions) {
  const c = r.conversionAction;
  console.log(
    `- ${c.id} | ${c.status} | ${c.type} | ${c.category} | primary=${c.primaryForGoal} | inConv=${c.includeInConversionsMetric} | ${c.name}`,
  );
}

console.log("\nConversões por action (últimos 30 dias):");
const stats = await q(`
  SELECT segments.conversion_action_name, metrics.conversions,
         metrics.all_conversions
  FROM customer
  WHERE segments.date DURING LAST_30_DAYS
`);
if (!stats.length) console.log("(sem dados)");
for (const r of stats) {
  console.log(
    `- ${r.segments.conversionActionName}: conv=${r.metrics.conversions} all=${r.metrics.allConversions}`,
  );
}
