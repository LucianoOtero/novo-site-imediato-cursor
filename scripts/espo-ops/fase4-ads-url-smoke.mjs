/**
 * Smoke Fase 4 — simula URL Ads (suffix canônico Exp resolvido + gclid via
 * auto-tagging) → RTDB staging → deliverLead → Espo DEV (Lead+Opp).
 *
 * Também valida o inventário Ads já auditado:
 *   Exp finalUrlSuffix === canônico; sem gclid no suffix; sem chaves duplicadas;
 *   Controle permanece no legado.
 *
 * Uso:
 *   node --env-file=.env.local scripts/espo-ops/fase4-ads-url-smoke.mjs
 *
 * Pré: ESPO_* / ESPOCRM_API_CONFIG + FIREBASE_* (como fase2-rtdb).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveEspoConfig, espoRequest } from "./lib/espo-client.mjs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "../..");

const CANONICAL =
  "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_id={campaignid}&utm_content={creative}&utm_term={keyword}&gad_source=1&gad_campaignid={campaignid}&matchtype={matchtype}&device={device}&network={network}&placement={placement}&adgroupid={adgroupid}&creative={creative}&campaign_name={campaignname}";

const LEGACY_CTRL =
  "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}&matchtype={matchtype}&network={network}&device={device}&creative={creative}&gclid={gclid}";

const EXP_ID = "24095000558";
const CTRL_ID = "21287198336";
const EXP_CAMPAIGN_NAME =
  "ATIVA - Dias de Semana - 2026 - 04 - 22 - Diurna Exp site novo vs legado 50/50";

const stamp = Date.now().toString(36);
const leadId = `fase4_${stamp}`;
const gclid = `F4ADS_${stamp}`;
const phoneLocal = `9${String(Date.now()).slice(-8)}`;
const phoneE164 = `+5511${phoneLocal}`;
const creativeId = "778899";
const adgroupId = "112233";

/** Params como cairiam na LP após ValueTrack + auto-tagging (gclid fora do suffix). */
const adsLikeUtm = {
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: EXP_ID,
  utm_id: EXP_ID,
  utm_content: creativeId,
  utm_term: "seguro auto",
  gad_source: "1",
  gad_campaignid: EXP_ID,
  matchtype: "e",
  device: "m",
  network: "g",
  placement: "",
  adgroupid: adgroupId,
  creative: creativeId,
  campaign_name: EXP_CAMPAIGN_NAME,
  gclid,
  gbraid: `GB4_${stamp}`,
  wbraid: `WB4_${stamp}`,
};

const ATTR = [
  "cGclid",
  "cGbraid",
  "cWbraid",
  "cUtmSource",
  "cUtmMedium",
  "cUtmCampaign",
  "cUtmCampaignName",
  "cUtmContent",
  "cUtmTerm",
  "cUtmId",
  "cGadSource",
  "cGadCampaignId",
  "cMatchType",
  "cDevice",
  "cNetwork",
  "cPlacement",
  "cAdgroupId",
  "cCreative",
  "cCanalCaptura",
];

function pick(entity) {
  const out = {};
  for (const k of ATTR) {
    if (entity?.[k] != null && entity[k] !== "") out[k] = entity[k];
  }
  return out;
}

function parseSuffixKeys(suffix) {
  const keys = [];
  for (const part of String(suffix || "").split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    keys.push(eq === -1 ? part : part.slice(0, eq));
  }
  return keys;
}

function assertAdsInventory() {
  const auditPath = resolve(root, "scripts/google-ops/ads-tracking-suffix-check.json");
  const audit = JSON.parse(readFileSync(auditPath, "utf8"));
  const exp = audit.campaigns.find((c) => c.id === EXP_ID);
  const ctrl = audit.campaigns.find((c) => c.id === CTRL_ID);
  if (!exp || !ctrl) throw new Error("Audit sem Exp/Controle");

  const keys = parseSuffixKeys(exp.finalUrlSuffix);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  const hasGclidInSuffix = keys.includes("gclid");

  const checks = {
    expIsCanonical: exp.finalUrlSuffix === CANONICAL,
    ctrlStillLegacy: ctrl.finalUrlSuffix === LEGACY_CTRL,
    noDupKeysInExpSuffix: dupes.length === 0,
    noGclidInExpSuffix: !hasGclidInSuffix,
    expTemplateIntact: exp.trackingUrlTemplate === "{lpurl}?gclid={gclid}",
    ctrlTemplateIntact: ctrl.trackingUrlTemplate === "{lpurl}?gclid={gclid}",
  };

  console.log("Inventário Ads (pós-mutate):", JSON.stringify(checks, null, 2));
  if (dupes.length) console.warn("Chaves duplicadas no suffix Exp:", dupes);

  const ok = Object.values(checks).every(Boolean);
  if (!ok) throw new Error("GATE Ads inventário: falhou — não segue smoke RTDB");
  console.log("GATE Ads inventário: OK\n");
  return { checks, adsLikeQuery: new URLSearchParams(adsLikeUtm).toString() };
}

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!projectId || !clientEmail || !privateKey || !databaseURL) {
    throw new Error("FIREBASE_* incompleto no ambiente");
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    });
  }
  return getDatabase();
}

async function waitForEspo(config, { tries = 36, delayMs = 5000 } = {}) {
  for (let i = 0; i < tries; i++) {
    const q = new URLSearchParams({
      maxSize: "3",
      "where[0][type]": "equals",
      "where[0][attribute]": "cGclid",
      "where[0][value]": gclid,
    });
    const leadRes = await espoRequest(config, "GET", `Lead?${q}`);
    const lead = leadRes?.list?.[0];
    if (lead?.id) {
      const oppRes = await espoRequest(config, "GET", `Opportunity?${q}`);
      const opp = oppRes?.list?.[0];
      if (
        opp?.id &&
        lead.cUtmCampaignName === EXP_CAMPAIGN_NAME &&
        opp.cUtmCampaignName === EXP_CAMPAIGN_NAME &&
        lead.cUtmContent === creativeId &&
        opp.cUtmContent === creativeId &&
        lead.cAdgroupId === adgroupId &&
        opp.cAdgroupId === adgroupId &&
        lead.cCanalCaptura === "formulario" &&
        opp.cCanalCaptura === "formulario"
      ) {
        return { lead, opp };
      }
    }
    console.log(`… tentativa ${i + 1}/${tries}`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

async function main() {
  const { adsLikeQuery } = assertAdsInventory();
  console.log("URL Ads-like (query resolvida + gclid auto-tag):");
  console.log(`https://staging.example/?${adsLikeQuery}\n`);

  const config = resolveEspoConfig({ prefer: "dev" });
  if (!/dev\.flyingdonkeys\.com\.br/i.test(config.baseUrl)) {
    throw new Error(`Recusado: não é Espo DEV (${config.baseUrl})`);
  }

  const db = initDb();
  const record = {
    data: {
      ramo: "auto",
      phoneE164,
      nome: null,
      email: null,
      utm: adsLikeUtm,
      stage: "initial",
      captureChannel: "lead_form",
      modalChannel: null,
      rpaChoice: null,
      rpaResultado: null,
    },
    timestamp: new Date().toISOString(),
    status: "pending",
    synced: false,
    source: "site_novo",
    environment: "staging",
    autoSync: true,
    cf_retry_count: 0,
  };

  console.log("RTDB leadId:", leadId);
  console.log("gclid:", gclid);
  console.log("phone:", phoneE164);
  await db.ref(`leads_backup/${leadId}`).update(record);

  console.log("Aguardando CF → Espo DEV…");
  const found = await waitForEspo(config);
  if (!found) {
    console.error("GATE FASE 4 (Ads-like→Espo): timeout sem Lead/Opp completo");
    process.exitCode = 1;
  } else {
    const leadGot = pick(found.lead);
    const oppGot = pick(found.opp);
    console.log("Lead:", JSON.stringify(leadGot, null, 2));
    console.log("Opp:", JSON.stringify(oppGot, null, 2));

    const ok =
      leadGot.cGclid === gclid &&
      oppGot.cGclid === gclid &&
      leadGot.cUtmCampaign === EXP_ID &&
      oppGot.cUtmCampaign === EXP_ID &&
      leadGot.cUtmCampaignName === EXP_CAMPAIGN_NAME &&
      oppGot.cUtmCampaignName === EXP_CAMPAIGN_NAME &&
      leadGot.cUtmContent === creativeId &&
      leadGot.cCreative === creativeId &&
      leadGot.cAdgroupId === adgroupId &&
      leadGot.cUtmId === EXP_ID &&
      leadGot.cCanalCaptura === "formulario" &&
      oppGot.cCanalCaptura === "formulario";

    console.log(ok ? "\nGATE FASE 4 (Ads-like→Espo DEV): OK" : "\nGATE FASE 4 (Ads-like→Espo DEV): FALHOU");
    if (!ok) process.exitCode = 1;

    try {
      await espoRequest(config, "DELETE", `Opportunity/${found.opp.id}`);
      await espoRequest(config, "DELETE", `Lead/${found.lead.id}`);
      console.log("Cleanup Espo DEV ok");
    } catch (err) {
      console.warn("Cleanup Espo:", err.message);
    }
  }

  try {
    await db.ref(`leads_backup/${leadId}`).remove();
    console.log("Cleanup RTDB ok");
  } catch (err) {
    console.warn("Cleanup RTDB:", err.message);
  }

  process.exit(process.exitCode || 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
