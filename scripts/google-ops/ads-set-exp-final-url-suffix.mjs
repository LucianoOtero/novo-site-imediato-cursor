/**
 * Fase 4 — substitui finalUrlSuffix da campanha Exp (24095000558) pelo
 * canônico do plano. NÃO altera trackingUrlTemplate, Controle, nem conta.
 *
 * Uso:
 *   node ads-set-exp-final-url-suffix.mjs --dry-run
 *   node ads-set-exp-final-url-suffix.mjs --apply
 *
 * Travas: só Exp; aborta se id ≠ EXP; Controle nunca entra nas operations.
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";
import { EXP_CAMPAIGN_ID, CONTROL_CAMPAIGN_ID } from "./lib/experiment-constants.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";

const CANONICAL_SUFFIX =
  "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_id={campaignid}&utm_content={creative}&utm_term={keyword}&gad_source=1&gad_campaignid={campaignid}&matchtype={matchtype}&device={device}&network={network}&placement={placement}&adgroupid={adgroupid}&creative={creative}&campaign_name={campaignname}";

const APPLY = process.argv.includes("--apply");
const DRY = process.argv.includes("--dry-run") || !APPLY;

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

function headersFor(ads, accessToken) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": ads.developerToken,
    "Content-Type": "application/json",
  };
  if (ads.loginCustomerId) headers["login-customer-id"] = ads.loginCustomerId;
  return headers;
}

async function search(ads, accessToken, query) {
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: headersFor(ads, accessToken),
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

function snap(r) {
  return {
    id: String(r.campaign.id),
    name: r.campaign.name,
    status: r.campaign.status,
    experimentType: r.campaign.experimentType || null,
    trackingUrlTemplate: r.campaign.trackingUrlTemplate || null,
    finalUrlSuffix: r.campaign.finalUrlSuffix || null,
  };
}

async function main() {
  if (!DRY && !APPLY) {
    throw new Error("Use --dry-run ou --apply");
  }

  const ads = loadAdsConfig();
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const token = (await oauth2.getAccessToken())?.token || oauth2.credentials.access_token;

  const rows = await search(
    ads,
    token,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.experiment_type,
            campaign.tracking_url_template, campaign.final_url_suffix
     FROM campaign
     WHERE campaign.id IN (${EXP_CAMPAIGN_ID}, ${CONTROL_CAMPAIGN_ID})`,
  );

  const exp = rows.map(snap).find((c) => c.id === EXP_CAMPAIGN_ID);
  const ctrl = rows.map(snap).find((c) => c.id === CONTROL_CAMPAIGN_ID);
  if (!exp) throw new Error(`Exp ${EXP_CAMPAIGN_ID} não encontrada`);
  if (!ctrl) throw new Error(`Controle ${CONTROL_CAMPAIGN_ID} não encontrada`);

  const backup = {
    at: new Date().toISOString(),
    mode: DRY ? "dry-run" : "apply",
    customerId: ads.customerId,
    expBefore: exp,
    controlBefore: ctrl,
    canonicalSuffix: CANONICAL_SUFFIX,
  };
  fs.writeFileSync(
    "scripts/google-ops/ads-fase4-suffix-backup.json",
    JSON.stringify(backup, null, 2),
    "utf8",
  );
  console.log("Backup gravado em scripts/google-ops/ads-fase4-suffix-backup.json");
  console.log("Exp antes:", JSON.stringify(exp, null, 2));
  console.log("Controle antes (não será alterado):", JSON.stringify(ctrl, null, 2));

  if (exp.id !== EXP_CAMPAIGN_ID) {
    throw new Error("TRAVA: id da Exp divergente — abortando");
  }
  if (!exp.experimentType || exp.experimentType === "BASE") {
    throw new Error(
      `TRAVA: campanha ${EXP_CAMPAIGN_ID} não parece braço Exp (experimentType=${exp.experimentType})`,
    );
  }
  if (exp.finalUrlSuffix === CANONICAL_SUFFIX) {
    console.log("\nExp já está com o suffix canônico. Nada a mutar.");
    return;
  }

  if (DRY) {
    console.log("\n[DRY-RUN] Mutate que seria aplicado:");
    console.log(`  resource: customers/${ads.customerId}/campaigns/${EXP_CAMPAIGN_ID}`);
    console.log(`  updateMask: finalUrlSuffix`);
    console.log(`  finalUrlSuffix ← canônico (${CANONICAL_SUFFIX.length} chars)`);
    console.log("Rode com --apply para executar.");
    return;
  }

  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/campaigns:mutate`,
    {
      method: "POST",
      headers: headersFor(ads, token),
      body: JSON.stringify({
        operations: [
          {
            update: {
              resourceName: `customers/${ads.customerId}/campaigns/${EXP_CAMPAIGN_ID}`,
              finalUrlSuffix: CANONICAL_SUFFIX,
            },
            updateMask: "finalUrlSuffix",
          },
        ],
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Mutate ${res.status}: ${text.slice(0, 2000)}`);
  console.log("\nMutate OK:", text.slice(0, 500));

  const afterRows = await search(
    ads,
    token,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.experiment_type,
            campaign.tracking_url_template, campaign.final_url_suffix
     FROM campaign
     WHERE campaign.id IN (${EXP_CAMPAIGN_ID}, ${CONTROL_CAMPAIGN_ID})`,
  );
  const expAfter = afterRows.map(snap).find((c) => c.id === EXP_CAMPAIGN_ID);
  const ctrlAfter = afterRows.map(snap).find((c) => c.id === CONTROL_CAMPAIGN_ID);

  const result = {
    ...backup,
    appliedAt: new Date().toISOString(),
    expAfter,
    controlAfter: ctrlAfter,
    ok:
      expAfter?.finalUrlSuffix === CANONICAL_SUFFIX &&
      ctrlAfter?.finalUrlSuffix === ctrl.finalUrlSuffix &&
      expAfter?.trackingUrlTemplate === exp.trackingUrlTemplate &&
      ctrlAfter?.trackingUrlTemplate === ctrl.trackingUrlTemplate,
  };
  fs.writeFileSync(
    "scripts/google-ops/ads-fase4-suffix-result.json",
    JSON.stringify(result, null, 2),
    "utf8",
  );

  console.log("\nExp depois:", JSON.stringify(expAfter, null, 2));
  console.log("Controle depois:", JSON.stringify(ctrlAfter, null, 2));
  if (!result.ok) {
    console.error("\nGATE FALHOU — conferir result JSON");
    process.exit(1);
  }
  console.log("\nGATE mutate: Exp=canônico; Controle e tracking templates intactos.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
