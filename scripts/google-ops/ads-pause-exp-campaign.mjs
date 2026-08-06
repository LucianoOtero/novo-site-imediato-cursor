/**
 * Pausa APENAS a campanha do experimento (24095000558) antes da migração
 * para novo.segurosimediato.com.br. A campanha legada 21287198336 não é
 * tocada em hipótese alguma.
 *
 * Trava de segurança: só executa a pausa se a campanha alvo tiver
 * experiment_type diferente de BASE (ou seja, for de fato o braço Exp).
 *
 * Uso:
 *   node ads-pause-exp-campaign.mjs          → pausa
 *   node ads-pause-exp-campaign.mjs --resume → reativa (ENABLED)
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";
const LEGACY_CAMPAIGN_ID = "21287198336";

const RESUME = process.argv.includes("--resume");

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
  if (!res.ok) throw new Error(`Ads ${res.status}: ${text.slice(0, 1000)}`);
  const parsed = JSON.parse(text);
  const batches = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];
  for (const batch of batches) {
    for (const r of batch.results || []) rows.push(r);
  }
  return rows;
}

async function main() {
  const ads = loadAdsConfig();
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const tokenRes = await oauth2.getAccessToken();
  const token = tokenRes?.token || oauth2.credentials.access_token;

  const rows = await search(
    ads,
    token,
    `
    SELECT campaign.id, campaign.name, campaign.status, campaign.experiment_type
    FROM campaign
    WHERE campaign.id IN (${EXP_CAMPAIGN_ID}, ${LEGACY_CAMPAIGN_ID})
  `,
  );

  console.log("Estado atual:");
  for (const r of rows) {
    console.log(
      `- ${r.campaign.id} | ${r.campaign.status} | expType=${r.campaign.experimentType || "-"} | ${r.campaign.name}`,
    );
  }

  const target = rows.find((r) => String(r.campaign.id) === EXP_CAMPAIGN_ID);
  if (!target) throw new Error(`Campanha ${EXP_CAMPAIGN_ID} não encontrada.`);
  if (!target.campaign.experimentType || target.campaign.experimentType === "BASE") {
    throw new Error(
      `TRAVA: campanha ${EXP_CAMPAIGN_ID} não é do tipo experimento (expType=${target.campaign.experimentType}). Abortando sem alterar nada.`,
    );
  }

  const newStatus = RESUME ? "ENABLED" : "PAUSED";
  if (target.campaign.status === newStatus) {
    console.log(`\nCampanha Exp já está ${newStatus}. Nada a fazer.`);
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
              status: newStatus,
            },
            updateMask: "status",
          },
        ],
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Mutate ${res.status}: ${text.slice(0, 1000)}`);
  console.log(`\nCampanha Exp ${EXP_CAMPAIGN_ID} → ${newStatus}. OK.`);

  const after = await search(
    ads,
    token,
    `
    SELECT campaign.id, campaign.name, campaign.status
    FROM campaign
    WHERE campaign.id IN (${EXP_CAMPAIGN_ID}, ${LEGACY_CAMPAIGN_ID})
  `,
  );
  console.log("\nEstado final (conferência):");
  for (const r of after) {
    console.log(`- ${r.campaign.id} | ${r.campaign.status} | ${r.campaign.name}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
