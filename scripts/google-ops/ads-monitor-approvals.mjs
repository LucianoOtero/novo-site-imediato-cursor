/**
 * Snapshot de aprovação dos anúncios da campanha Exp.
 * Escreve ads-approval-status.json e imprime resumo + deltas.
 */
import fs from "node:fs";
import path from "node:path";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH, OPS_ROOT } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const STATUS_PATH = path.join(OPS_ROOT, "ads-approval-status.json");

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

  const rows = await searchStream(
    ads,
    token,
    `
    SELECT
      ad_group.name,
      ad_group.status,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.review_status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.final_urls
    FROM ad_group_ad
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
  `,
  );

  const adsList = rows.map((r) => ({
    adId: String(r.adGroupAd.ad.id),
    group: r.adGroup.name,
    groupStatus: r.adGroup.status,
    adStatus: r.adGroupAd.status,
    approval: r.adGroupAd.policySummary?.approvalStatus || "UNKNOWN",
    review: r.adGroupAd.policySummary?.reviewStatus || "UNKNOWN",
    url: (r.adGroupAd.ad.finalUrls || [])[0] || "",
  }));

  const counts = {
    APPROVED: 0,
    DISAPPROVED: 0,
    REVIEW_IN_PROGRESS: 0,
    OTHER: 0,
    ENABLED: 0,
  };
  for (const a of adsList) {
    if (a.adStatus === "ENABLED") counts.ENABLED++;
    if (a.approval === "APPROVED") counts.APPROVED++;
    else if (a.approval === "DISAPPROVED") counts.DISAPPROVED++;
    else if (a.review === "REVIEW_IN_PROGRESS" || a.approval === "UNKNOWN")
      counts.REVIEW_IN_PROGRESS++;
    else counts.OTHER++;
  }

  const prev = fs.existsSync(STATUS_PATH)
    ? JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"))
    : null;
  const prevMap = new Map((prev?.ads || []).map((a) => [a.adId, a]));

  const changes = [];
  for (const a of adsList) {
    const p = prevMap.get(a.adId);
    if (!p) {
      changes.push(`NOVO ad ${a.adId} [${a.group}] ${a.approval}/${a.review}`);
      continue;
    }
    if (p.approval !== a.approval || p.review !== a.review) {
      changes.push(
        `MUDOU ad ${a.adId} [${a.group}] ${p.approval}/${p.review} → ${a.approval}/${a.review}`,
      );
    }
  }

  const snap = {
    at: new Date().toISOString(),
    campaignId: EXP_CAMPAIGN_ID,
    counts,
    ads: adsList,
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(snap, null, 2), "utf8");

  console.log(
    `[${snap.at}] Exp ads: enabled=${counts.ENABLED} approved=${counts.APPROVED} disapproved=${counts.DISAPPROVED} in_review≈${counts.REVIEW_IN_PROGRESS} total=${adsList.length}`,
  );
  if (changes.length) {
    console.log("Mudanças:");
    for (const c of changes) console.log(" -", c);
  } else {
    console.log("Sem mudanças de aprovação desde o último check.");
  }

  const dis = adsList.filter((a) => a.approval === "DISAPPROVED");
  if (dis.length) {
    console.log("DISAPPROVED:");
    for (const a of dis) console.log(` - [${a.group}] ${a.adId} ${a.url}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
