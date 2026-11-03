import fs from "node:fs";
import path from "node:path";
import { getAuthorizedClient } from "./auth.mjs";
import { CONFIG_PATH, OPS_ROOT } from "./paths.mjs";

export const ADS_API = "https://googleads.googleapis.com/v25";

export function loadAdsConfig() {
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

export async function adsSession() {
  const ads = loadAdsConfig();
  const oauth2 = await getAuthorizedClient({ withAds: true });
  const token =
    (await oauth2.getAccessToken())?.token || oauth2.credentials.access_token;
  return { ads, token };
}

function headersFor(ads, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "developer-token": ads.developerToken,
    "Content-Type": "application/json",
  };
  if (ads.loginCustomerId) headers["login-customer-id"] = ads.loginCustomerId;
  return headers;
}

export async function searchAll({ ads, token }, query) {
  const results = [];
  let pageToken;
  do {
    const body = { query };
    if (pageToken) body.pageToken = pageToken;
    const res = await fetch(
      `${ADS_API}/customers/${ads.customerId}/googleAds:search`,
      { method: "POST", headers: headersFor(ads, token), body: JSON.stringify(body) },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`search ${res.status}: ${JSON.stringify(data).slice(0, 1500)}`);
    results.push(...(data.results || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return results;
}

export async function mutate({ ads, token }, resource, body) {
  const res = await fetch(
    `${ADS_API}/customers/${ads.customerId}/${resource}:mutate`,
    { method: "POST", headers: headersFor(ads, token), body: JSON.stringify(body) },
  );
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${resource}:mutate ${res.status}: ${text.slice(0, 2500)}`);
    err.data = data;
    throw err;
  }
  return data;
}

export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function normKeyword(t) {
  return String(t || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function gaqlString(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function writeLog(prefix, report) {
  const logDir = path.join(OPS_ROOT, "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
  const out = path.join(logDir, `${prefix}-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");
  console.log(`Log: ${out}`);
  return out;
}

export function argValue(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}
