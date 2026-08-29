/**
 * Smoke Fase 2 — grava lead sintético no RTDB (environment=staging) para
 * disparar deliverLead → Espo DEV, depois confere Lead+Opp e limpa.
 *
 * Uso (com Firebase Admin no env, ex. após `vercel env pull`):
 *   node --env-file=.env.vercel.check scripts/espo-ops/fase2-rtdb-attribution-smoke.mjs
 */
import { resolveEspoConfig, espoRequest } from "./lib/espo-client.mjs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const stamp = Date.now().toString(36);
const leadId = `fase2_${stamp}`;
const gclid = `F2RTDB_${stamp}`;
const phoneLocal = `9${String(Date.now()).slice(-8)}`;
const phoneE164 = `+5511${phoneLocal}`;

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
      const oppQ = new URLSearchParams({
        maxSize: "3",
        "where[0][type]": "equals",
        "where[0][attribute]": "cGclid",
        "where[0][value]": gclid,
      });
      const oppRes = await espoRequest(config, "GET", `Opportunity?${oppQ}`);
      const opp = oppRes?.list?.[0];
      // Exige pacote na Opp (PUT best-effort) — evita corrida com e-mails
      // Octadesk que rodam antes do enriquecimento na CF.
      if (
        opp?.id &&
        lead.cUtmCampaignName === "Campanha Teste RTDB Fase2" &&
        opp.cUtmCampaignName === "Campanha Teste RTDB Fase2" &&
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
      utm: {
        gclid,
        gbraid: `GB_${stamp}`,
        wbraid: `WB_${stamp}`,
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "24095000558",
        campaign_name: "Campanha Teste RTDB Fase2",
        utm_content: "ad_rtdb",
        utm_term: "seguro",
        utm_id: `utm_${stamp}`,
        gad_source: "1",
        gad_campaignid: "24095000558",
        matchtype: "e",
        device: "m",
        network: "g",
        placement: "yt",
        adgroupid: "555",
        creative: "666",
      },
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
    console.error("GATE FASE 2 (RTDB→Espo): timeout sem Lead/Opp");
    process.exitCode = 1;
  } else {
    const leadGot = pick(found.lead);
    const oppGot = pick(found.opp);
    console.log("Lead:", JSON.stringify(leadGot, null, 2));
    console.log("Opp:", JSON.stringify(oppGot, null, 2));
    const ok =
      leadGot.cUtmCampaignName === "Campanha Teste RTDB Fase2" &&
      oppGot.cUtmCampaignName === "Campanha Teste RTDB Fase2" &&
      leadGot.cCanalCaptura === "formulario" &&
      oppGot.cCanalCaptura === "formulario" &&
      leadGot.cGclid === gclid &&
      oppGot.cGclid === gclid;
    console.log(ok ? "\nGATE FASE 2 (RTDB→Espo DEV): OK" : "\nGATE FASE 2 (RTDB→Espo DEV): FALHOU");
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
