/**
 * Auditoria da campanha Exp site novo vs legado + campanha original.
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const ORIG_CAMPAIGN_ID = "21287198336";

function loadAdsConfig() {
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

async function getAccessToken() {
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const tokenRes = await oauth2.getAccessToken();
  return tokenRes?.token || oauth2.credentials.access_token;
}

async function search(ads, accessToken, query) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": ads.developerToken,
    "Content-Type": "application/json",
  };
  if (ads.loginCustomerId) headers["login-customer-id"] = ads.loginCustomerId;

  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Ads ${res.status}: ${text.slice(0, 1000)}`);
  // searchStream returns NDJSON array chunks
  const parsed = JSON.parse(text);
  const batches = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];
  for (const batch of batches) {
    for (const r of batch.results || []) rows.push(r);
  }
  return rows;
}

function domainOf(url) {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return String(url);
  }
}

function printSection(title) {
  console.log(`\n## ${title}`);
}

async function main() {
  const ads = loadAdsConfig();
  const token = await getAccessToken();

  printSection("Campanhas (original + Exp)");
  const campaigns = await search(
    ads,
    token,
    `
    SELECT campaign.id, campaign.name, campaign.status, campaign.experiment_type,
           campaign.serving_status
    FROM campaign
    WHERE campaign.id IN (${ORIG_CAMPAIGN_ID}, ${EXP_CAMPAIGN_ID})
  `,
  );
  for (const r of campaigns) {
    const c = r.campaign;
    console.log(
      `- ${c.id} | ${c.status} | serving=${c.servingStatus || "?"} | expType=${c.experimentType || "-"} | ${c.name}`,
    );
  }

  printSection("Experimentos da conta");
  try {
    const exps = await search(
      ads,
      token,
      `
      SELECT experiment.resource_name, experiment.name, experiment.status,
             experiment.type, experiment.start_date, experiment.end_date,
             experiment.description
      FROM experiment
      ORDER BY experiment.name
    `,
    );
    if (!exps.length) console.log("(nenhum experimento listado via resource experiment)");
    for (const r of exps) {
      const e = r.experiment;
      console.log(
        `- [${e.status}] ${e.name} | ${e.startDate || "?"} → ${e.endDate || "?"} | ${e.type || ""}`,
      );
    }
  } catch (e) {
    console.log("Falha ao listar experiment:", e.message.slice(0, 300));
  }

  printSection("Anúncios RSA — campanha Exp (domínio + aprovação)");
  const adsRows = await search(
    ads,
    token,
    `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.policy_summary.review_status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_search_ad.path1,
      ad_group_ad.ad.responsive_search_ad.path2
    FROM ad_group_ad
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
  `,
  );

  const byGroup = new Map();
  for (const r of adsRows) {
    const gid = r.adGroup.id;
    if (!byGroup.has(gid)) {
      byGroup.set(gid, {
        name: r.adGroup.name,
        groupStatus: r.adGroup.status,
        ads: [],
        domains: new Set(),
      });
    }
    const urls = r.adGroupAd.ad.finalUrls || [];
    const domains = urls.map(domainOf).filter(Boolean);
    domains.forEach((d) => byGroup.get(gid).domains.add(d));
    byGroup.get(gid).ads.push({
      adId: r.adGroupAd.ad.id,
      adStatus: r.adGroupAd.status,
      approval: r.adGroupAd.policySummary?.approvalStatus,
      review: r.adGroupAd.policySummary?.reviewStatus,
      urls,
      domains,
      path: [r.adGroupAd.ad.responsiveSearchAd?.path1, r.adGroupAd.ad.responsiveSearchAd?.path2]
        .filter(Boolean)
        .join("/"),
    });
  }

  let mixedGroups = 0;
  let disapproved = 0;
  for (const [gid, g] of byGroup) {
    const domains = [...g.domains];
    const mixed = domains.length > 1;
    if (mixed) mixedGroups++;
    console.log(
      `\n### Grupo ${gid} "${g.name}" [${g.groupStatus}] domínios=[${domains.join(", ") || "—"}]${mixed ? " ⚠ MISTO" : ""}`,
    );
    for (const a of g.ads) {
      if (a.approval === "DISAPPROVED") disapproved++;
      console.log(
        `  - ad ${a.adId} | adStatus=${a.adStatus} | approval=${a.approval} | review=${a.review} | ${a.urls.join(" | ") || "(sem URL)"}`,
      );
    }
  }
  console.log(
    `\nResumo anúncios Exp: grupos=${byGroup.size}, grupos domínio misto=${mixedGroups}, ads DISAPPROVED=${disapproved}, total ads=${adsRows.length}`,
  );

  printSection("Palavras-chave com URL final — campanha Exp");
  const kws = await search(
    ads,
    token,
    `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.status,
      ad_group_criterion.final_urls
    FROM keyword_view
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_criterion.status != 'REMOVED'
  `,
  );
  const kwWithUrl = kws.filter(
    (r) => (r.adGroupCriterion.finalUrls || []).length > 0,
  );
  console.log(`Keywords com final_urls: ${kwWithUrl.length} / ${kws.length}`);
  const kwDomainByGroup = new Map();
  for (const r of kwWithUrl) {
    const gid = r.adGroup.id;
    if (!kwDomainByGroup.has(gid)) kwDomainByGroup.set(gid, new Set());
    for (const u of r.adGroupCriterion.finalUrls || []) {
      kwDomainByGroup.get(gid).add(domainOf(u));
    }
    console.log(
      `  - [${r.adGroupCriterion.status}] g=${r.adGroup.name} | "${r.adGroupCriterion.keyword?.text}" → ${r.adGroupCriterion.finalUrls.join(", ")}`,
    );
  }
  if (!kwWithUrl.length) console.log("(nenhuma keyword com URL final override)");

  printSection("Sitelinks da conta (amostra — domínio)");
  try {
    const assets = await search(
      ads,
      token,
      `
      SELECT
        asset.id,
        asset.name,
        asset.sitelink_asset.link_text,
        asset.final_urls
      FROM asset
      WHERE asset.type = 'SITELINK'
      LIMIT 30
    `,
    );
    const sitelinkDomains = new Set();
    for (const r of assets) {
      for (const u of r.asset.finalUrls || []) sitelinkDomains.add(domainOf(u));
      const urls = (r.asset.finalUrls || []).join(", ");
      console.log(
        `- ${r.asset.sitelinkAsset?.linkText || r.asset.name || r.asset.id}: ${urls || "(sem URL)"}`,
      );
    }
    console.log(
      `\nDomínios nos sitelinks amostrados: ${[...sitelinkDomains].join(", ") || "—"}`,
    );
  } catch (e) {
    console.log("Sitelinks:", e.message.slice(0, 400));
  }

  printSection("Diagnóstico");
  const allExpDomains = new Set();
  for (const g of byGroup.values()) g.domains.forEach((d) => allExpDomains.add(d));
  console.log(`Domínios usados nos anúncios Exp: ${[...allExpDomains].join(", ") || "—"}`);
  if (mixedGroups > 0) {
    console.log(
      "AÇÃO: em cada grupo MISTO, unificar domínio (atualizar/remover anúncios pausados com domínio antigo).",
    );
  }
  if (allExpDomains.has("segurosimediato.com.br") && allExpDomains.has("comparaseguroonline.com.br")) {
    console.log(
      "AÇÃO: campanha Exp ainda tem os dois domínios — alinhar tudo a comparaseguroonline.com.br.",
    );
  }
  if (disapproved > 0) {
    console.log(
      "AÇÃO: após unificar domínio, salvar anúncios / Contestar no Gerenciador de políticas.",
    );
  }
  console.log(
    "Site (checado antes): apex/www /cotacao /seguro-auto retornam 200 ao AdsBot — 'destino que não funciona' tende a ser stale ou URL legada/sitelink ainda no grupo.",
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
