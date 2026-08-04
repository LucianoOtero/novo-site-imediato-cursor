/**
 * Recria RSAs da campanha Exp com URL no domínio novo (final_urls é imutável).
 * Pausa o anúncio antigo após criar o novo.
 *
 * Dry-run: node ads-recreate-exp-ads.mjs
 * Apply:  node ads-recreate-exp-ads.mjs --apply
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
  if (!res.ok) throw new Error(`search ${res.status}: ${text.slice(0, 1500)}`);
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap(
    (b) => b.results || [],
  );
}

async function mutate(ads, token, body) {
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/adGroupAds:mutate`,
    {
      method: "POST",
      headers: headers(ads, token),
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`mutate ${res.status}: ${text.slice(0, 2500)}`);
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
    if (u.pathname === "/" || u.pathname === "") return `${NEW_ORIGIN}/cotacao`;
    return `${NEW_ORIGIN}${u.pathname.replace(/\/$/, "") || "/cotacao"}`;
  }
  const path = u.pathname.replace(/\/$/, "").toLowerCase();
  const map = {
    "": "/cotacao",
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

function needsRemap(urls) {
  return urls.some((u) => {
    const mapped = mapLegacyUrl(u);
    return mapped !== u;
  });
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
      ad_group.id,
      ad_group.name,
      ad_group_ad.resource_name,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.final_urls,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.responsive_search_ad.path1,
      ad_group_ad.ad.responsive_search_ad.path2
    FROM ad_group_ad
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `,
  );

  const jobs = [];
  for (const r of rows) {
    const urls = r.adGroupAd.ad.finalUrls || [];
    if (!needsRemap(urls)) continue;
    const newUrls = urls.map(mapLegacyUrl);
    const rsa = r.adGroupAd.ad.responsiveSearchAd || {};
    jobs.push({
      adGroupId: r.adGroup.id,
      groupName: r.adGroup.name,
      oldResource: r.adGroupAd.resourceName,
      oldStatus: r.adGroupAd.status,
      approval: r.adGroupAd.policySummary?.approvalStatus,
      adId: r.adGroupAd.ad.id,
      from: urls,
      to: newUrls,
      headlines: rsa.headlines || [],
      descriptions: rsa.descriptions || [],
      path1: rsa.path1 || "",
      path2: rsa.path2 || "",
    });
  }

  console.log(`Ads a recriar: ${jobs.length}`);
  for (const j of jobs) {
    console.log(
      `- [${j.groupName}] ${j.adId} (${j.approval}/${j.oldStatus}): ${j.from[0]} → ${j.to[0]}`,
    );
  }

  if (!APPLY) {
    console.log("\nDry-run ok. Execute: node ads-recreate-exp-ads.mjs --apply");
    return;
  }

  for (const j of jobs) {
    console.log(`\nRecriando [${j.groupName}] ad ${j.adId}…`);

    // Limite: máx. 3 RSA ENABLED por grupo — pausar o antigo ANTES de criar.
    if (j.oldStatus === "ENABLED") {
      try {
        await mutate(ads, token, {
          operations: [
            {
              update: {
                resourceName: j.oldResource,
                status: "PAUSED",
              },
              updateMask: "status",
            },
          ],
        });
        console.log("Antigo pausado (antes do create):", j.oldResource);
      } catch (e) {
        console.error("Falha ao pausar antigo:", e.message.slice(0, 500));
        continue;
      }
    }

    const rsa = {
      headlines: j.headlines.map((h) => ({
        text: h.text,
        ...(h.pinnedField ? { pinnedField: h.pinnedField } : {}),
      })),
      descriptions: j.descriptions.map((d) => ({
        text: d.text,
        ...(d.pinnedField ? { pinnedField: d.pinnedField } : {}),
      })),
    };
    if (j.to[0].includes("/cotacao")) {
      rsa.path1 = "cotacao";
    } else {
      if (j.path1) rsa.path1 = j.path1.slice(0, 15);
      if (j.path2 && j.path2 !== "online") rsa.path2 = j.path2.slice(0, 15);
    }

    const createBody = {
      operations: [
        {
          create: {
            adGroup: `customers/${ads.customerId}/adGroups/${j.adGroupId}`,
            status: j.oldStatus === "PAUSED" ? "PAUSED" : "ENABLED",
            ad: {
              finalUrls: j.to,
              responsiveSearchAd: rsa,
            },
          },
        },
      ],
      partialFailure: true,
    };

    try {
      const created = await mutate(ads, token, createBody);
      if (created.partialFailureError) {
        console.error(
          "CREATE partial failure:",
          JSON.stringify(created.partialFailureError).slice(0, 800),
        );
        // tenta reativar o antigo se o create falhou e estava ENABLED
        if (j.oldStatus === "ENABLED") {
          await mutate(ads, token, {
            operations: [
              {
                update: {
                  resourceName: j.oldResource,
                  status: "ENABLED",
                },
                updateMask: "status",
              },
            ],
          });
          console.log("Rollback: antigo reativado");
        }
        continue;
      }
      console.log("Criado:", created.results?.[0]?.resourceName);
    } catch (e) {
      console.error("Falha:", e.message.slice(0, 1000));
      if (j.oldStatus === "ENABLED") {
        try {
          await mutate(ads, token, {
            operations: [
              {
                update: {
                  resourceName: j.oldResource,
                  status: "ENABLED",
                },
                updateMask: "status",
              },
            ],
          });
          console.log("Rollback: antigo reativado");
        } catch {
          /* ignore */
        }
      }
    }
  }

  console.log("\nConcluído. Rode node ads-audit-experiment.mjs");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
