/**
 * Read-only: verifica tracking template / final URL suffix na conta,
 * campanhas Exp+Controle, e overrides em ad group / anúncio (Exp).
 *
 * Uso: node scripts/google-ops/ads-check-tracking-suffix.mjs
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";
import { EXP_CAMPAIGN_ID, CONTROL_CAMPAIGN_ID } from "./lib/experiment-constants.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";

const PLANNED_SUFFIX =
  "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_id={campaignid}&utm_content={creative}&utm_term={keyword}&gad_source=1&gad_campaignid={campaignid}&matchtype={matchtype}&device={device}&network={network}&placement={placement}&adgroupid={adgroupid}&creative={creative}&campaign_name={campaignname}";

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
  if (!res.ok) throw new Error(`Ads ${res.status}: ${text.slice(0, 1500)}`);
  const parsed = JSON.parse(text);
  const batches = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];
  for (const batch of batches) {
    for (const r of batch.results || []) rows.push(r);
  }
  return rows;
}

function verdict(report) {
  const notes = [];
  const exp = (report.campaigns || []).find((c) => c.id === EXP_CAMPAIGN_ID);
  const ctrl = (report.campaigns || []).find((c) => c.id === CONTROL_CAMPAIGN_ID);

  if (report.customer?.error) {
    notes.push(`Conta: não foi possível ler customer (${report.customer.error})`);
  } else {
    if (report.customer?.finalUrlSuffix) {
      notes.push(
        `CONTA tem finalUrlSuffix — conferir herança vs override da campanha Exp.`,
      );
    } else {
      notes.push("Conta: finalUrlSuffix vazio.");
    }
    if (report.customer?.trackingUrlTemplate) {
      notes.push("CONTA tem trackingUrlTemplate.");
    } else {
      notes.push("Conta: trackingUrlTemplate vazio.");
    }
    if (report.customer?.autoTaggingEnabled === false) {
      notes.push("ALERTA: auto-tagging DESLIGADO na conta.");
    } else if (report.customer?.autoTaggingEnabled === true) {
      notes.push("Auto-tagging ligado (gclid via auto-tagging ok).");
    }
  }

  if (!exp) {
    notes.push("Campanha Exp não encontrada.");
  } else if (!exp.finalUrlSuffix) {
    notes.push(
      "Exp: finalUrlSuffix VAZIO — sem conflito de suffix existente; ok aplicar o canônico no nível campanha.",
    );
  } else if (exp.finalUrlSuffix === PLANNED_SUFFIX) {
    notes.push("Exp: finalUrlSuffix JÁ É o canônico do plano.");
  } else {
    notes.push(
      "Exp: finalUrlSuffix EXISTE e DIFERE do plano — risco de sobrescrever; revisar conteúdo antes de mutate.",
    );
  }

  if (exp?.trackingUrlTemplate) {
    notes.push(
      "Exp: trackingUrlTemplate EXISTE — verificar se já injeta UTMs (pode interagir com o suffix).",
    );
  } else if (exp) {
    notes.push("Exp: trackingUrlTemplate vazio.");
  }

  if (ctrl?.finalUrlSuffix || ctrl?.trackingUrlTemplate) {
    notes.push(
      "Controle tem tracking e/ou suffix — NÃO alterar na Fase 4 (só referência).",
    );
  } else if (ctrl) {
    notes.push("Controle: tracking/suffix vazios.");
  }

  if ((report.expAdGroupsWithOverride || []).length) {
    notes.push(
      `Exp: ${report.expAdGroupsWithOverride.length} ad group(s) com override de tracking/suffix.`,
    );
  } else {
    notes.push("Exp: nenhum ad group com override de tracking/suffix.");
  }

  if ((report.expAdsWithOverride || []).length) {
    notes.push(
      `Exp: ${report.expAdsWithOverride.length} anúncio(s) com override de tracking/suffix.`,
    );
  } else {
    notes.push("Exp: nenhum anúncio ENABLED/não-REMOVED com override de tracking/suffix (amostra filtrada).");
  }

  return notes;
}

async function main() {
  const ads = loadAdsConfig();
  const token = await getAccessToken();

  const report = {
    customerId: ads.customerId,
    checkedAt: new Date().toISOString(),
    plannedSuffix: PLANNED_SUFFIX,
  };

  try {
    const cust = await search(
      ads,
      token,
      `SELECT customer.id, customer.tracking_url_template, customer.final_url_suffix, customer.auto_tagging_enabled FROM customer LIMIT 1`,
    );
    const c = cust[0]?.customer || {};
    report.customer = {
      trackingUrlTemplate: c.trackingUrlTemplate || null,
      finalUrlSuffix: c.finalUrlSuffix || null,
      autoTaggingEnabled: c.autoTaggingEnabled ?? null,
    };
  } catch (error) {
    report.customer = { error: String(error.message || error).slice(0, 400) };
  }

  const camps = await search(
    ads,
    token,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.tracking_url_template, campaign.final_url_suffix, campaign.url_custom_parameters
     FROM campaign
     WHERE campaign.id IN (${EXP_CAMPAIGN_ID}, ${CONTROL_CAMPAIGN_ID})`,
  );
  report.campaigns = camps.map((r) => ({
    id: String(r.campaign.id),
    name: r.campaign.name,
    status: r.campaign.status,
    trackingUrlTemplate: r.campaign.trackingUrlTemplate || null,
    finalUrlSuffix: r.campaign.finalUrlSuffix || null,
    urlCustomParameters: r.campaign.urlCustomParameters || [],
  }));

  const ag = await search(
    ads,
    token,
    `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.tracking_url_template, ad_group.final_url_suffix
     FROM ad_group
     WHERE campaign.id = ${EXP_CAMPAIGN_ID}`,
  );
  report.expAdGroupsWithOverride = ag
    .filter((r) => r.adGroup.trackingUrlTemplate || r.adGroup.finalUrlSuffix)
    .map((r) => ({
      id: String(r.adGroup.id),
      name: r.adGroup.name,
      status: r.adGroup.status,
      trackingUrlTemplate: r.adGroup.trackingUrlTemplate || null,
      finalUrlSuffix: r.adGroup.finalUrlSuffix || null,
    }));

  const adsRows = await search(
    ads,
    token,
    `SELECT ad_group_ad.ad.id, ad_group_ad.status, ad_group_ad.ad.type,
            ad_group_ad.ad.tracking_url_template, ad_group_ad.ad.final_url_suffix, ad_group_ad.ad.final_urls
     FROM ad_group_ad
     WHERE campaign.id = ${EXP_CAMPAIGN_ID}
       AND ad_group_ad.status != 'REMOVED'`,
  );
  report.expAdsWithOverride = adsRows
    .filter(
      (r) =>
        r.adGroupAd.ad.trackingUrlTemplate || r.adGroupAd.ad.finalUrlSuffix,
    )
    .slice(0, 50)
    .map((r) => ({
      adId: String(r.adGroupAd.ad.id),
      type: r.adGroupAd.ad.type,
      status: r.adGroupAd.status,
      trackingUrlTemplate: r.adGroupAd.ad.trackingUrlTemplate || null,
      finalUrlSuffix: r.adGroupAd.ad.finalUrlSuffix || null,
      finalUrls: r.adGroupAd.ad.finalUrls || [],
    }));
  report.expAdsScanned = adsRows.length;

  const enabled = await search(
    ads,
    token,
    `SELECT ad_group_ad.ad.id FROM ad_group_ad
     WHERE campaign.id = ${EXP_CAMPAIGN_ID} AND ad_group_ad.status = 'ENABLED'`,
  );
  report.expEnabledAdsCount = enabled.length;
  report.verdict = verdict(report);

  const outPath = "scripts/google-ops/ads-tracking-suffix-check.json";
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nSalvo em ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
