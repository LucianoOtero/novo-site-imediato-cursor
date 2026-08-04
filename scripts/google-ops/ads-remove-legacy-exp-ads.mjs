/**
 * Remove (não só pausa) anúncios da campanha Exp cujo final URL
 * NÃO é comparaseguroonline.com.br — necessário p/ política "um site por grupo".
 *
 * Dry-run: node ads-remove-legacy-exp-ads.mjs
 * Apply:  node ads-remove-legacy-exp-ads.mjs --apply
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const APPLY = process.argv.includes("--apply");

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

async function getToken() {
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const t = await oauth2.getAccessToken();
  return t?.token || oauth2.credentials.access_token;
}

function headers(ads, token) {
  const h = {
    Authorization: `Bearer ${token}`,
    "developer-token": ads.developerToken,
    "Content-Type": "application/json",
  };
  if (ads.loginCustomerId) h["login-customer-id"] = ads.loginCustomerId;
  return h;
}

async function searchStream(ads, token, query) {
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: headers(ads, token),
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 1200));
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
    (b) => b.results || [],
  );
}

async function mutate(ads, token, operations) {
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/adGroupAds:mutate`,
    {
      method: "POST",
      headers: headers(ads, token),
      body: JSON.stringify({ operations, partialFailure: true }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 2000));
  return JSON.parse(text);
}

function isNewDomain(urls) {
  return (
    urls.length > 0 &&
    urls.every((u) => /comparaseguroonline\.com\.br/i.test(u))
  );
}

async function main() {
  const ads = loadAds();
  const token = await getToken();
  console.log(APPLY ? "MODO APPLY" : "DRY-RUN");

  const rows = await searchStream(
    ads,
    token,
    `
    SELECT
      ad_group.name,
      ad_group_ad.resource_name,
      ad_group_ad.status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.final_urls
    FROM ad_group_ad
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
  `,
  );

  const toRemove = [];
  // também remove home / (sem cotacao) disapproved antigos se quiser só /cotacao enabled?
  // Política: só remove domínio legado. Mantém comparaseguro mesmo se / 
  for (const r of rows) {
    const urls = r.adGroupAd.ad.finalUrls || [];
    if (!isNewDomain(urls)) {
      toRemove.push({
        resourceName: r.adGroupAd.resourceName,
        group: r.adGroup.name,
        adId: r.adGroupAd.ad.id,
        status: r.adGroupAd.status,
        urls,
      });
    }
  }

  // Auto: remove também os antigos DISAPPROVED com URL exatamente home /
  for (const r of rows) {
    const urls = r.adGroupAd.ad.finalUrls || [];
    const isHome =
      urls.length === 1 &&
      /^https?:\/\/(www\.)?comparaseguroonline\.com\.br\/?$/i.test(urls[0]);
    if (isHome && r.adGroupAd.status === "PAUSED") {
      if (!toRemove.some((x) => x.resourceName === r.adGroupAd.resourceName)) {
        toRemove.push({
          resourceName: r.adGroupAd.resourceName,
          group: r.adGroup.name,
          adId: r.adGroupAd.ad.id,
          status: r.adGroupAd.status,
          urls,
          reason: "home / pausada",
        });
      }
    }
  }

  console.log(`Remover: ${toRemove.length}`);
  for (const x of toRemove) {
    console.log(
      `- [${x.group}] ${x.adId} (${x.status}) ${x.urls.join(", ")} ${x.reason || ""}`,
    );
  }

  if (!APPLY) {
    console.log("\nExecute: node ads-remove-legacy-exp-ads.mjs --apply");
    return;
  }

  for (let i = 0; i < toRemove.length; i += 10) {
    const chunk = toRemove.slice(i, i + 10);
    const result = await mutate(
      ads,
      token,
      chunk.map((x) => ({ remove: x.resourceName })),
    );
    console.log(JSON.stringify(result, null, 2).slice(0, 1500));
  }
  console.log("Remoção concluída.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
