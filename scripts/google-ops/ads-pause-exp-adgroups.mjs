/**
 * Pausa os GRUPOS DE ANÚNCIOS da campanha do experimento (24095000558),
 * pois o status da campanha trial não pode ser alterado diretamente
 * (CANNOT_MODIFY_FOR_TRIAL_CAMPAIGN). A campanha legada 21287198336 não
 * é tocada — todas as queries filtram por campaign.id = 24095000558.
 *
 * Antes de pausar, salva snapshot dos status atuais em
 * ads-exp-adgroups-before-pause.json para restauração exata via --resume.
 *
 * Uso:
 *   node ads-pause-exp-adgroups.mjs          → salva snapshot e pausa todos os grupos ENABLED
 *   node ads-pause-exp-adgroups.mjs --resume → restaura status do snapshot
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";
const EXP_CAMPAIGN_ID = "24095000558";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(__dirname, "ads-exp-adgroups-before-pause.json");
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

async function mutateAdGroups(ads, accessToken, updates) {
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/adGroups:mutate`,
    {
      method: "POST",
      headers: headersFor(ads, accessToken),
      body: JSON.stringify({
        operations: updates.map((u) => ({
          update: {
            resourceName: `customers/${ads.customerId}/adGroups/${u.id}`,
            status: u.status,
          },
          updateMask: "status",
        })),
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Mutate ${res.status}: ${text.slice(0, 1000)}`);
}

async function listExpAdGroups(ads, token) {
  return search(
    ads,
    token,
    `
    SELECT ad_group.id, ad_group.name, ad_group.status, campaign.id
    FROM ad_group
    WHERE campaign.id = ${EXP_CAMPAIGN_ID}
      AND ad_group.status != 'REMOVED'
  `,
  );
}

async function main() {
  const ads = loadAdsConfig();
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const tokenRes = await oauth2.getAccessToken();
  const token = tokenRes?.token || oauth2.credentials.access_token;

  const rows = await listExpAdGroups(ads, token);
  console.log(`Grupos da campanha Exp ${EXP_CAMPAIGN_ID}:`);
  for (const r of rows) {
    console.log(`- ${r.adGroup.id} | ${r.adGroup.status} | ${r.adGroup.name}`);
  }

  if (RESUME) {
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      throw new Error(`Snapshot não encontrado: ${SNAPSHOT_PATH}`);
    }
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8"));
    const updates = snapshot.adGroups
      .filter((g) => {
        const current = rows.find((r) => String(r.adGroup.id) === String(g.id));
        return current && current.adGroup.status !== g.status;
      })
      .map((g) => ({ id: g.id, status: g.status }));
    if (!updates.length) {
      console.log("\nNada a restaurar — status já batem com o snapshot.");
      return;
    }
    await mutateAdGroups(ads, token, updates);
    console.log(`\nRestaurados ${updates.length} grupos ao status do snapshot.`);
  } else {
    const enabled = rows.filter((r) => r.adGroup.status === "ENABLED");
    if (!enabled.length) {
      console.log("\nNenhum grupo ENABLED — nada a pausar.");
      return;
    }
    const snapshot = {
      savedAt: new Date().toISOString(),
      campaignId: EXP_CAMPAIGN_ID,
      adGroups: rows.map((r) => ({
        id: String(r.adGroup.id),
        name: r.adGroup.name,
        status: r.adGroup.status,
      })),
    };
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2), "utf8");
    console.log(`\nSnapshot salvo em: ${SNAPSHOT_PATH}`);

    await mutateAdGroups(
      ads,
      token,
      enabled.map((r) => ({ id: String(r.adGroup.id), status: "PAUSED" })),
    );
    console.log(`Pausados ${enabled.length} grupos.`);
  }

  const after = await listExpAdGroups(ads, token);
  console.log("\nEstado final:");
  for (const r of after) {
    console.log(`- ${r.adGroup.id} | ${r.adGroup.status} | ${r.adGroup.name}`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
