/**
 * Valida OAuth + Developer Token: lista contas acessíveis e campanhas ativas.
 *
 * Pré: npm run auth -- --with-ads
 *      config.local.json → googleAds.developerToken + customerId
 */
import fs from "node:fs";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const ADS_API = "https://googleads.googleapis.com/v25";

function loadAdsConfig() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const ads = config.googleAds || {};
  if (!ads.developerToken || ads.developerToken.includes("PREENCHER")) {
    throw new Error("Preencha googleAds.developerToken em config.local.json");
  }
  if (!ads.customerId) {
    throw new Error("Preencha googleAds.customerId em config.local.json");
  }
  return {
    customerId: String(ads.customerId).replace(/\D/g, ""),
    developerToken: ads.developerToken,
    loginCustomerId: ads.loginCustomerId
      ? String(ads.loginCustomerId).replace(/\D/g, "")
      : "",
  };
}

async function adsFetch(path, { accessToken, developerToken, loginCustomerId, body }) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }
  const res = await fetch(`${ADS_API}${path}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Ads API ${res.status}: ${text.slice(0, 800)}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function main() {
  const ads = loadAdsConfig();
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const tokenRes = await oauth2.getAccessToken();
  const accessToken = tokenRes?.token || oauth2.credentials.access_token;
  if (!accessToken) {
    throw new Error("Sem access_token. Rode: npm run auth -- --with-ads");
  }

  console.log("Listando contas acessíveis…");
  const listed = await adsFetch("/customers:listAccessibleCustomers", {
    accessToken,
    developerToken: ads.developerToken,
    loginCustomerId: ads.loginCustomerId,
  });
  const resources = listed.resourceNames || [];
  console.log("Contas:", resources.length ? resources.join("\n  ") : "(nenhuma)");

  const cid = ads.customerId;
  console.log(`\nConsulta rápida em customers/${cid}…`);
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
    LIMIT 20
  `;
  const search = await adsFetch(`/customers/${cid}/googleAds:search`, {
    accessToken,
    developerToken: ads.developerToken,
    loginCustomerId: ads.loginCustomerId || undefined,
    body: { query },
  });
  const rows = search.results || [];
  console.log(`Campanhas (até 20): ${rows.length}`);
  for (const row of rows) {
    const c = row.campaign || {};
    console.log(`- [${c.status}] ${c.name} (id=${c.id})`);
  }
  console.log("\nAds API OK.");
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});
