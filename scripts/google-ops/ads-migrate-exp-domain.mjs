/**
 * Fase 4 da migração: alinha o braço Exp (campanha 24095000558, e SOMENTE
 * ela) ao subdomínio da marca novo.segurosimediato.com.br.
 *
 * O que faz:
 * 1) URLs finais dos anúncios RSA: comparaseguroonline.com.br →
 *    novo.segurosimediato.com.br (mesmo caminho).
 * 2) Headlines: garante "Imediato Seguros" em cada RSA (política do Google
 *    Ads de identidade da marca — motivo do "Limited ad serving").
 * 3) URLs finais em keywords com override (se houver).
 *
 * A campanha legada 21287198336 nunca entra nas queries/mutações.
 *
 * Uso:
 *   node ads-migrate-exp-domain.mjs          → dry-run
 *   node ads-migrate-exp-domain.mjs --apply  → aplica
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const OLD_HOST = "comparaseguroonline.com.br";
const NEW_HOST = "novo.segurosimediato.com.br";
const BRAND_HEADLINE = "Imediato Seguros";
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
    { method: "POST", headers: headers(ads, token), body: JSON.stringify({ query }) },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`search ${res.status}: ${text.slice(0, 1200)}`);
  const parsed = JSON.parse(text);
  return (Array.isArray(parsed) ? parsed : [parsed]).flatMap((b) => b.results || []);
}

async function mutate(ads, token, path, body) {
  const res = await fetch(`${ADS_API}/customers/${ads.customerId}/${path}`, {
    method: "POST",
    headers: headers(ads, token),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`mutate ${path} ${res.status}: ${text.slice(0, 2000)}`);
  return JSON.parse(text);
}

/** Troca só o host (mantém caminho/query). */
function swapHost(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === OLD_HOST) {
      u.hostname = NEW_HOST;
      return u.toString().replace(/\/$/, u.pathname === "/" ? "/" : "");
    }
    return url;
  } catch {
    return url;
  }
}

function hasBrandHeadline(headlines) {
  return headlines.some((h) => /imediato/i.test(h.text || ""));
}

async function main() {
  const ads = loadAds();
  const token = await getToken();
  console.log(APPLY ? "MODO APPLY" : "DRY-RUN (passe --apply para executar)");

  // --- RSAs do braço Exp ---
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

  const updates = [];
  console.log(`\n## RSAs no braço Exp: ${adRows.length}`);
  for (const r of adRows) {
    const rsa = r.adGroupAd.ad.responsiveSearchAd || {};
    const headlines = rsa.headlines || [];
    const urls = r.adGroupAd.ad.finalUrls || [];
    const newUrls = urls.map(swapHost);
    const urlChanged = JSON.stringify(urls) !== JSON.stringify(newUrls);
    const needsBrand = !hasBrandHeadline(headlines);

    let newHeadlines = headlines;
    if (needsBrand) {
      if (headlines.length < 15) {
        newHeadlines = [...headlines, { text: BRAND_HEADLINE }];
      } else {
        // substitui a última headline NÃO fixada (pinned)
        const idx = [...headlines]
          .map((h, i) => ({ h, i }))
          .reverse()
          .find(({ h }) => !h.pinnedField)?.i;
        newHeadlines = headlines.map((h, i) =>
          i === idx ? { text: BRAND_HEADLINE } : h,
        );
      }
    }

    console.log(
      `\n- [${r.adGroup.name}] ad ${r.adGroupAd.ad.id} | ${r.adGroupAd.status} | approval=${r.adGroupAd.policySummary?.approvalStatus}`,
    );
    console.log(`  URLs: ${urls.join(", ")}${urlChanged ? ` → ${newUrls.join(", ")}` : " (sem mudança)"}`);
    console.log(
      `  Headlines (${headlines.length}): ${headlines.map((h) => h.text).join(" | ")}`,
    );
    console.log(
      needsBrand
        ? `  + marca: "${BRAND_HEADLINE}" ${headlines.length < 15 ? "adicionada" : "substitui última não-fixada"}`
        : "  marca: já presente",
    );

    if (urlChanged || needsBrand) {
      updates.push({
        adId: r.adGroupAd.ad.id,
        group: r.adGroup.name,
        finalUrls: newUrls,
        headlines: newHeadlines,
        urlChanged,
        needsBrand,
      });
    }
  }

  // --- keywords com URL final override ---
  const kws = await searchStream(
    ads,
    token,
    `
    SELECT
      ad_group.id, ad_group.name,
      ad_group_criterion.resource_name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.status,
      ad_group_criterion.final_urls
    FROM keyword_view
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_criterion.status != 'REMOVED'
  `,
  );
  const kwUpdates = [];
  for (const r of kws) {
    const urls = r.adGroupCriterion.finalUrls || [];
    if (!urls.length) continue;
    const newUrls = urls.map(swapHost);
    if (JSON.stringify(urls) !== JSON.stringify(newUrls)) {
      kwUpdates.push({
        resourceName: r.adGroupCriterion.resourceName,
        text: r.adGroupCriterion.keyword?.text,
        from: urls,
        to: newUrls,
      });
    }
  }
  console.log(`\n## Keywords com URL final a trocar: ${kwUpdates.length}`);
  for (const k of kwUpdates) {
    console.log(`- "${k.text}": ${k.from.join(", ")} → ${k.to.join(", ")}`);
  }

  if (!APPLY) {
    console.log(`\nDry-run: ${updates.length} anúncios e ${kwUpdates.length} keywords seriam atualizados.`);
    return;
  }

  // --- APPLY: ads via AdService (final_urls + headlines) ---
  if (updates.length) {
    const operations = updates.map((u) => {
      const updateMask = [
        u.urlChanged ? "final_urls" : null,
        u.needsBrand ? "responsive_search_ad.headlines" : null,
      ]
        .filter(Boolean)
        .join(",");
      return {
        update: {
          resourceName: `customers/${ads.customerId}/ads/${u.adId}`,
          finalUrls: u.finalUrls,
          responsiveSearchAd: u.needsBrand ? { headlines: u.headlines } : undefined,
        },
        updateMask,
      };
    });
    for (let i = 0; i < operations.length; i += 10) {
      const chunk = operations.slice(i, i + 10);
      console.log(`\nMutate ads ${i + 1}-${i + chunk.length}…`);
      const result = await mutate(ads, token, "ads:mutate", {
        operations: chunk,
        partialFailure: true,
      });
      if (result.partialFailureError) {
        console.error("PARTIAL FAILURE:", JSON.stringify(result.partialFailureError).slice(0, 2000));
      } else {
        console.log(`OK: ${(result.results || []).length} anúncios atualizados.`);
      }
    }
  }

  if (kwUpdates.length) {
    const operations = kwUpdates.map((k) => ({
      update: { resourceName: k.resourceName, finalUrls: k.to },
      updateMask: "final_urls",
    }));
    const result = await mutate(ads, token, "adGroupCriteria:mutate", {
      operations,
      partialFailure: true,
    });
    console.log(`Keywords atualizadas: ${(result.results || []).length}`);
  }

  console.log("\nApply concluído. Monitorar aprovação com ads-monitor-approvals.mjs.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
