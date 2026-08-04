/**
 * Corrige campanha Exp (somente):
 * 1) Ads Auto DISAPPROVED: URL → /cotacao
 * 2) Remove vínculos de sitelinks da campanha Exp (domínios legados)
 * 4) Alinha URLs dos ads dos grupos pausados para comparaseguroonline.com.br
 *
 * NÃO altera a campanha original (BASE).
 * Dry-run: node ads-fix-exp-urls.mjs
 * Apply:  node ads-fix-exp-urls.mjs --apply
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const NEW_ORIGIN = "https://comparaseguroonline.com.br";
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
  if (!res.ok) throw new Error(`search ${res.status}: ${text.slice(0, 1200)}`);
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
    (b) => b.results || [],
  );
}

async function mutate(ads, token, path, body) {
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/${path}`,
    {
      method: "POST",
      headers: headers(ads, token),
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`mutate ${path} ${res.status}: ${text.slice(0, 2000)}`);
  return JSON.parse(text);
}

function mapLegacyUrl(url) {
  if (!url) return `${NEW_ORIGIN}/cotacao`;
  let u;
  try {
    u = new URL(url.startsWith("http") ? url : `https://${url}`);
  } catch {
    return `${NEW_ORIGIN}/cotacao`;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "comparaseguroonline.com.br") {
    // home → cotacao (mais estável para Ads)
    if (u.pathname === "/" || u.pathname === "") return `${NEW_ORIGIN}/cotacao`;
    return `${NEW_ORIGIN}${u.pathname.replace(/\/$/, "") || "/cotacao"}`;
  }

  const path = u.pathname.replace(/\/$/, "").toLowerCase();
  const map = {
    "": "/cotacao",
    "/": "/cotacao",
    "/seguro-motos": "/seguro-moto",
    "/seguro-moto": "/seguro-moto",
    "/seguro-caminhao": "/seguro-caminhao",
    "/seguro-auto": "/seguro-auto",
    "/seguro-taxi": "/seguro-taxi",
    "/seguro-utilitario": "/seguro-utilitario",
    "/seguro-uber": "/seguro-uber",
    "/assistencia-24-horas": "/assistencia-24-horas",
    "/cotacao/online": "/cotacao",
    "/cotaca-online/seguro-auto": "/seguro-auto",
    "/auto/carro": "/seguro-auto",
  };
  return `${NEW_ORIGIN}${map[path] || "/cotacao"}`;
}

async function main() {
  const ads = loadAds();
  const token = await getToken();
  console.log(APPLY ? "MODO APPLY" : "DRY-RUN (passe --apply para executar)");

  // --- 1 + 4: list ads in Exp ---
  const adRows = await searchStream(
    ads,
    token,
    `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group_ad.resource_name,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.type
    FROM ad_group_ad
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `,
  );

  const adUpdates = [];
  for (const r of adRows) {
    const urls = r.adGroupAd.ad.finalUrls || [];
    const next = urls.map(mapLegacyUrl);
    const changed =
      urls.length !== next.length || urls.some((u, i) => u !== next[i]);
    // force home comparaseguro → cotacao even if "same host"
    const needs =
      changed ||
      urls.some(
        (u) =>
          /^https?:\/\/(www\.)?comparaseguroonline\.com\.br\/?$/i.test(u),
      );
    if (!needs && !urls.every((u) => u.includes("comparaseguroonline.com.br"))) {
      // still on legacy
      if (urls.some((u) => /segurosimediato|cotacaoseguroauto|imediatoassistencia/i.test(u))) {
        adUpdates.push({
          resourceName: r.adGroupAd.resourceName,
          group: r.adGroup.name,
          adId: r.adGroupAd.ad.id,
          from: urls,
          to: next.length ? next : [mapLegacyUrl(urls[0])],
          approval: r.adGroupAd.policySummary?.approvalStatus,
        });
      }
      continue;
    }
    if (needs || urls.some((u) => /segurosimediato|cotacaoseguroauto|imediatoassistencia/i.test(u))) {
      const to = urls.map(mapLegacyUrl);
      if (JSON.stringify(urls) !== JSON.stringify(to)) {
        adUpdates.push({
          resourceName: r.adGroupAd.resourceName,
          group: r.adGroup.name,
          adId: r.adGroupAd.ad.id,
          from: urls,
          to,
          approval: r.adGroupAd.policySummary?.approvalStatus,
        });
      }
    }
  }

  console.log(`\n## Ads a atualizar: ${adUpdates.length}`);
  for (const u of adUpdates) {
    console.log(
      `- [${u.group}] ad ${u.adId} (${u.approval}): ${u.from.join(", ")} → ${u.to.join(", ")}`,
    );
  }

  // --- 2: campaign sitelink links ---
  const sitelinks = await searchStream(
    ads,
    token,
    `
    SELECT
      campaign.id,
      campaign_asset.resource_name,
      campaign_asset.status,
      asset.id,
      asset.final_urls,
      asset.sitelink_asset.link_text
    FROM campaign_asset
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND asset.type = 'SITELINK'
      AND campaign_asset.status != 'REMOVED'
  `,
  );
  console.log(`\n## Sitelinks vinculados à campanha Exp: ${sitelinks.length}`);
  const sitelinkRemoves = [];
  for (const r of sitelinks) {
    const urls = r.asset.finalUrls || [];
    const bad = urls.some(
      (u) => !/comparaseguroonline\.com\.br/i.test(u),
    );
    console.log(
      `- ${r.asset.sitelinkAsset?.linkText || r.asset.id}: ${urls.join(", ") || "(sem URL)"} ${bad ? "→ REMOVER vínculo" : "(ok)"}`,
    );
    if (bad || urls.length === 0) {
      sitelinkRemoves.push(r.campaignAsset.resourceName);
    }
  }

  // also ad_group level
  const agSitelinks = await searchStream(
    ads,
    token,
    `
    SELECT
      campaign.id,
      ad_group_asset.resource_name,
      ad_group_asset.status,
      ad_group.name,
      asset.final_urls,
      asset.sitelink_asset.link_text
    FROM ad_group_asset
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND asset.type = 'SITELINK'
      AND ad_group_asset.status != 'REMOVED'
  `,
  );
  console.log(`\n## Sitelinks vinculados a grupos Exp: ${agSitelinks.length}`);
  const agRemoves = [];
  for (const r of agSitelinks) {
    const urls = r.asset.finalUrls || [];
    const bad = !urls.every((u) => /comparaseguroonline\.com\.br/i.test(u));
    console.log(
      `- [${r.adGroup.name}] ${r.asset.sitelinkAsset?.linkText}: ${urls.join(", ")} ${bad ? "→ REMOVER" : ""}`,
    );
    if (bad) agRemoves.push(r.adGroupAsset.resourceName);
  }

  if (!APPLY) {
    console.log("\nDry-run ok. Execute: node ads-fix-exp-urls.mjs --apply");
    return;
  }

  // APPLY ad updates — RSA final URLs via AdGroupAdService
  if (adUpdates.length) {
    const operations = adUpdates.map((u) => ({
      update: {
        resourceName: u.resourceName,
        ad: {
          resourceName: `customers/${ads.customerId}/ads/${u.adId}`,
          finalUrls: u.to,
        },
      },
      updateMask: "ad.final_urls",
    }));

    // mutate in chunks of 10
    for (let i = 0; i < operations.length; i += 10) {
      const chunk = operations.slice(i, i + 10);
      console.log(`\nMutate ads ${i + 1}-${i + chunk.length}…`);
      const result = await mutate(ads, token, "adGroupAds:mutate", {
        operations: chunk,
        partialFailure: true,
      });
      console.log(JSON.stringify(result, null, 2).slice(0, 2000));
    }
  }

  if (sitelinkRemoves.length) {
    console.log(`\nRemovendo ${sitelinkRemoves.length} vínculos campaign sitelink…`);
    const operations = sitelinkRemoves.map((resourceName) => ({
      remove: resourceName,
    }));
    for (let i = 0; i < operations.length; i += 20) {
      const chunk = operations.slice(i, i + 20);
      const result = await mutate(ads, token, "campaignAssets:mutate", {
        operations: chunk,
        partialFailure: true,
      });
      console.log(JSON.stringify(result, null, 2).slice(0, 1500));
    }
  }

  if (agRemoves.length) {
    console.log(`\nRemovendo ${agRemoves.length} vínculos ad_group sitelink…`);
    const operations = agRemoves.map((resourceName) => ({
      remove: resourceName,
    }));
    for (let i = 0; i < operations.length; i += 20) {
      const chunk = operations.slice(i, i + 20);
      const result = await mutate(ads, token, "adGroupAssets:mutate", {
        operations: chunk,
        partialFailure: true,
      });
      console.log(JSON.stringify(result, null, 2).slice(0, 1500));
    }
  }

  console.log("\nApply concluído. Rode ads-audit-experiment.mjs para verificar.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
