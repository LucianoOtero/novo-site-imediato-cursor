/**
 * Smoke Fase 5 — atribuição Ads-like → RTDB production → deliverLead → Espo PROD.
 *
 * TRAVAS (obrigatórias):
 *   - flag CLI `--i-know-this-is-prod`
 *   - resolveEspoConfig({ prefer: "prod" }) → host flyingdonkeys.com.br (não DEV)
 *   - record.environment === "production"
 *
 * Uso:
 *   node --env-file=.env.local scripts/espo-ops/fase5-prod-smoke.mjs --i-know-this-is-prod
 *
 * Pré: ESPOCRM_API_CONFIG (bloco prod) + FIREBASE_*; schema Espo prod já espelhado.
 * Docs: docs/FASE5_ROLLOUT_PRODUCAO.md
 */
import { resolveEspoConfig, espoRequest, isEspoProdBaseUrl } from "./lib/espo-client.mjs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const allowProd = process.argv.includes("--i-know-this-is-prod");
if (!allowProd) {
  console.error(
    "ABORTADO: smoke em PROD exige --i-know-this-is-prod\n" +
      "Uso: node --env-file=.env.local scripts/espo-ops/fase5-prod-smoke.mjs --i-know-this-is-prod",
  );
  process.exit(2);
}

const EXP_ID = "24095000558";
const EXP_CAMPAIGN_NAME =
  "ATIVA - Dias de Semana - 2026 - 04 - 22 - Diurna Exp site novo vs legado 50/50";

const stamp = Date.now().toString(36);
const leadId = `fase5_${stamp}`;
const gclid = `F5PROD_${stamp}`;
const phoneLocal = `9${String(Date.now()).slice(-8)}`;
const phoneE164 = `+5511${phoneLocal}`;
const creativeId = "778899";
const adgroupId = "112233";

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
  gbraid: `GB5_${stamp}`,
  wbraid: `WB5_${stamp}`,
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
  const config = resolveEspoConfig({ prefer: "prod" });
  if (!isEspoProdBaseUrl(config.baseUrl)) {
    throw new Error(
      `Recusado: baseUrl não é Espo PROD (${config.baseUrl}). ` +
        `source=${config.source}. Não rode smoke Fase 5 contra DEV.`,
    );
  }

  console.log("Espo PROD:", config.baseUrl, `[${config.source}]`);
  console.log("AVISO: Octadesk/HSM podem disparar em produção. Telefone:", phoneE164);

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
    environment: "production",
    autoSync: true,
    cf_retry_count: 0,
  };

  if (record.environment !== "production") {
    throw new Error("Guarda interna: environment deve ser production");
  }

  console.log("RTDB leadId:", leadId);
  console.log("gclid:", gclid);
  await db.ref(`leads_backup/${leadId}`).update(record);

  console.log("Aguardando CF → Espo PROD…");
  const found = await waitForEspo(config);
  if (!found) {
    console.error("GATE FASE 5 (prod): timeout sem Lead/Opp completo");
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

    console.log(ok ? "\nGATE FASE 5 (Ads-like→Espo PROD): OK" : "\nGATE FASE 5 (Ads-like→Espo PROD): FALHOU");
    if (!ok) process.exitCode = 1;

    try {
      await espoRequest(config, "DELETE", `Opportunity/${found.opp.id}`);
      await espoRequest(config, "DELETE", `Lead/${found.lead.id}`);
      console.log("Cleanup Espo PROD ok");
    } catch (err) {
      console.warn("Cleanup Espo (manual se falhar):", err.message);
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
