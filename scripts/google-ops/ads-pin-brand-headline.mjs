/**
 * Fixa a headline da marca ("Imediato Seguros") na posição 1 (HEADLINE_1,
 * "Show only in position 1") de todos os RSAs da campanha Exp — recomendação
 * oficial da política "Limited ad serving" (update de junho/2026) para
 * anunciantes com marca menos conhecida.
 *
 * Só toca a campanha Exp (24095000558); a legada nunca entra na query.
 * Editar o RSA dispara nova revisão de política (esperado; reaprovação
 * costuma ser rápida — monitorar com ads-monitor-approvals.mjs).
 *
 * Uso:
 *   node ads-pin-brand-headline.mjs          → dry-run
 *   node ads-pin-brand-headline.mjs --apply  → aplica
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const BRAND_HEADLINE = "Imediato Seguros";
// Prioridade de seleção da headline de marca: nome completo primeiro;
// depois construções tipo "… na Imediato" (uso claro da marca). Headlines
// como "Atendimento Imediato" NÃO contam — "imediato" ali é adjetivo.
const BRAND_PATTERNS = [/imediato\s+seguros/i, /seguros\s+imediato/i, /\bna\s+imediato\b/i];
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

async function main() {
  const ads = loadAds();
  const token = await getToken();
  console.log(APPLY ? "MODO APPLY" : "DRY-RUN (passe --apply para executar)");

  const rows = await searchStream(
    ads,
    token,
    `
    SELECT
      ad_group.name,
      ad_group_ad.status,
      ad_group_ad.policy_summary.approval_status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines
    FROM ad_group_ad
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `,
  );
  console.log(`RSAs no braço Exp: ${rows.length}\n`);

  const updates = [];
  for (const r of rows) {
    const headlines = r.adGroupAd.ad.responsiveSearchAd?.headlines || [];
    const label = `[${r.adGroup.name}] ad ${r.adGroupAd.ad.id} (${r.adGroupAd.status}/${r.adGroupAd.policySummary?.approvalStatus})`;

    let brandIdx = -1;
    for (const re of BRAND_PATTERNS) {
      brandIdx = headlines.findIndex((h) => re.test(h.text || ""));
      if (brandIdx !== -1) break;
    }

    let newHeadlines;
    if (brandIdx !== -1) {
      if (headlines[brandIdx].pinnedField === "HEADLINE_1") {
        console.log(`- ${label}: "${headlines[brandIdx].text}" já fixada na posição 1`);
        continue;
      }
      newHeadlines = headlines.map((h, i) =>
        i === brandIdx ? { ...h, pinnedField: "HEADLINE_1" } : h,
      );
      console.log(`- ${label}: fixar "${headlines[brandIdx].text}" na posição 1`);
    } else if (headlines.length < 15) {
      newHeadlines = [...headlines, { text: BRAND_HEADLINE, pinnedField: "HEADLINE_1" }];
      console.log(`- ${label}: sem headline de marca — adicionar "${BRAND_HEADLINE}" fixada na posição 1`);
    } else {
      const idx = [...headlines]
        .map((h, i) => ({ h, i }))
        .reverse()
        .find(({ h }) => !h.pinnedField)?.i;
      newHeadlines = headlines.map((h, i) =>
        i === idx ? { text: BRAND_HEADLINE, pinnedField: "HEADLINE_1" } : h,
      );
      console.log(`- ${label}: sem headline de marca e 15 headlines — substituir última não-fixada por "${BRAND_HEADLINE}" fixada`);
    }
    updates.push({ adId: r.adGroupAd.ad.id, headlines: newHeadlines });
  }

  console.log(`\nAnúncios a atualizar: ${updates.length}`);
  if (!APPLY || !updates.length) return;

  for (let i = 0; i < updates.length; i += 10) {
    const chunk = updates.slice(i, i + 10);
    const res = await fetch(`${ADS_API}/customers/${ads.customerId}/ads:mutate`, {
      method: "POST",
      headers: headers(ads, token),
      body: JSON.stringify({
        operations: chunk.map((u) => ({
          update: {
            resourceName: `customers/${ads.customerId}/ads/${u.adId}`,
            responsiveSearchAd: { headlines: u.headlines },
          },
          updateMask: "responsive_search_ad.headlines",
        })),
        partialFailure: true,
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`mutate ${res.status}: ${text.slice(0, 2000)}`);
    const result = JSON.parse(text);
    if (result.partialFailureError) {
      console.error("PARTIAL FAILURE:", JSON.stringify(result.partialFailureError).slice(0, 2000));
    } else {
      console.log(`Mutate ${i + 1}-${i + chunk.length}: OK (${(result.results || []).length} anúncios)`);
    }
  }
  console.log("\nApply concluído. Monitorar reaprovação com ads-monitor-approvals.mjs.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
