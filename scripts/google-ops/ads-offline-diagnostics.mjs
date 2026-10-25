/**
 * Diagnóstico agregado de uploads offline da action SegurosImediatoOffline.
 *
 * A API Ads NÃO lista conversões individuais por orderId — só summaries.
 * Fonte linha a linha: RTDB ads_offline_audit (ver docs/ADS_OFFLINE_VENDIDO_FIREBASE.md).
 *
 * Pré: npm run auth -- --with-ads (em scripts/google-ops)
 *      config.local.json → googleAds.developerToken + customerId
 *
 * Uso: node scripts/google-ops/ads-offline-diagnostics.mjs
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const ACTION_ID = "303889427";

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const ads = config.googleAds || {};
if (!ads.developerToken || String(ads.developerToken).includes("PREENCHER")) {
  console.error("Preencha googleAds.developerToken em config.local.json");
  process.exit(1);
}
const cid = String(ads.customerId || "9947918772").replace(/\D/g, "");

const oauth2 = await getAuthorizedClient({ withAds: true });
const t = await oauth2.getAccessToken();
const headers = {
  Authorization: `Bearer ${t?.token || oauth2.credentials.access_token}`,
  "developer-token": ads.developerToken,
  "Content-Type": "application/json",
};
if (ads.loginCustomerId) {
  headers["login-customer-id"] = String(ads.loginCustomerId).replace(/\D/g, "");
}

const query = `
  SELECT
    offline_conversion_upload_conversion_action_summary.conversion_action_id,
    offline_conversion_upload_conversion_action_summary.conversion_action_name,
    offline_conversion_upload_conversion_action_summary.client,
    offline_conversion_upload_conversion_action_summary.status,
    offline_conversion_upload_conversion_action_summary.successful_event_count,
    offline_conversion_upload_conversion_action_summary.total_event_count,
    offline_conversion_upload_conversion_action_summary.pending_event_count,
    offline_conversion_upload_conversion_action_summary.alerts,
    offline_conversion_upload_conversion_action_summary.job_summaries,
    offline_conversion_upload_conversion_action_summary.daily_summaries,
    offline_conversion_upload_conversion_action_summary.last_upload_date_time
  FROM offline_conversion_upload_conversion_action_summary
  WHERE offline_conversion_upload_conversion_action_summary.conversion_action_id = ${ACTION_ID}
`;

const res = await fetch(`${ADS_API}/customers/${cid}/googleAds:searchStream`, {
  method: "POST",
  headers,
  body: JSON.stringify({ query }),
});
const text = await res.text();
if (!res.ok) {
  console.error(text.slice(0, 2000));
  process.exit(1);
}

const parsed = JSON.parse(text);
const rows = (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
  (b) => b.results || []
);

if (!rows.length) {
  console.log(
    JSON.stringify(
      {
        note: "Sem diagnostics para esta action/customer (sem uploads recentes ou customer_id distinto do import).",
        customerId: cid,
        conversionActionId: ACTION_ID,
      },
      null,
      2
    )
  );
  process.exit(0);
}

const out = rows.map((r) => {
  const s = r.offlineConversionUploadConversionActionSummary || {};
  return {
    conversionActionId: s.conversionActionId,
    conversionActionName: s.conversionActionName,
    client: s.client,
    status: s.status,
    successfulEventCount: s.successfulEventCount,
    totalEventCount: s.totalEventCount,
    pendingEventCount: s.pendingEventCount,
    lastUploadDateTime: s.lastUploadDateTime,
    alerts: s.alerts || [],
    jobSummaries: s.jobSummaries || [],
    dailySummaries: s.dailySummaries || [],
  };
});

console.log(JSON.stringify({ customerId: cid, summaries: out }, null, 2));
console.error(
  "\nNota: contagens são agregadas. Para opp/lead, use RTDB ads_offline_audit."
);
