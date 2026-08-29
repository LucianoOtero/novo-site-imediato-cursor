/**
 * Smoke Fase 2 — atribuição Lead+Opp no Espo DEV via espocrm.js (mesmo
 * módulo da CF). Não passa pelo RTDB; valida schema + PUT best-effort.
 *
 * Uso:
 *   node scripts/espo-ops/fase2-attribution-smoke.mjs
 *   node scripts/espo-ops/fase2-attribution-smoke.mjs --keep
 *
 * Credenciais: ESPOCRM_API_CONFIG (bloco dev) ou ESPO_BASE_URL+ESPO_API_KEY.
 */
import { createRequire } from "node:module";
import { resolveEspoConfig, espoRequest } from "./lib/espo-client.mjs";

const require = createRequire(import.meta.url);
const espo = require("../../firebase/functions/espocrm.js");

const keep = process.argv.includes("--keep");
const stamp = Date.now().toString(36);
const phoneLocal = `9${String(Date.now()).slice(-8)}`;

const leadData = {
  phoneE164: `+5511${phoneLocal}`,
  captureChannel: "lead_form",
  utm: {
    gclid: `F2SMOKE_${stamp}`,
    gbraid: `GB_${stamp}`,
    wbraid: `WB_${stamp}`,
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign: "24095000558",
    campaign_name: "Campanha Teste Fase2",
    utm_content: "ad_smoke",
    utm_term: "seguro auto",
    utm_id: `utm_${stamp}`,
    gad_source: "1",
    gad_campaignid: "24095000558",
    matchtype: "e",
    device: "m",
    network: "g",
    placement: "youtube.com",
    adgroupid: "111222",
    creative: "333444",
  },
};

const ATTR_KEYS = [
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

function pick(entity, keys) {
  const out = {};
  for (const k of keys) {
    if (entity?.[k] !== undefined && entity?.[k] !== null && entity?.[k] !== "") {
      out[k] = entity[k];
    }
  }
  return out;
}

function missing(entity, keys) {
  return keys.filter((k) => entity?.[k] === undefined || entity?.[k] === null || entity?.[k] === "");
}

async function main() {
  const config = resolveEspoConfig({ prefer: "dev" });
  if (!/dev\.flyingdonkeys\.com\.br/i.test(config.baseUrl)) {
    throw new Error(`Recusado: baseUrl não é Espo DEV (${config.baseUrl})`);
  }

  console.log("Espo DEV:", config.baseUrl);
  console.log("Telefone smoke:", leadData.phoneE164);

  const delivered = await espo.deliverStage(config, leadData, { capturedAt: new Date().toISOString() });
  console.log("deliverStage:", delivered);

  const leadExt = espo.attributionLeadExtendedFields(leadData);
  const oppAttr = espo.attributionOpportunityFields(leadData);
  const canal = espo.canalCapturaFields(leadData);

  await espo.putFields(config, "Lead", delivered.leadId, { ...leadExt, ...canal }, "fase2-smoke");
  await espo.putFields(config, "Opportunity", delivered.opportunityId, { ...oppAttr, ...canal }, "fase2-smoke");

  const lead = await espoRequest(config, "GET", `Lead/${delivered.leadId}`);
  const opp = await espoRequest(config, "GET", `Opportunity/${delivered.opportunityId}`);

  const leadGot = pick(lead, ATTR_KEYS);
  const oppGot = pick(opp, ATTR_KEYS);
  const leadMiss = missing(lead, ATTR_KEYS);
  const oppMiss = missing(opp, ATTR_KEYS);

  console.log("\nLead atribuição:", JSON.stringify(leadGot, null, 2));
  console.log("Lead faltando:", leadMiss.length ? leadMiss.join(", ") : "(nenhum)");
  console.log("\nOpp atribuição:", JSON.stringify(oppGot, null, 2));
  console.log("Opp faltando:", oppMiss.length ? oppMiss.join(", ") : "(nenhum)");

  const ok =
    leadMiss.length === 0 &&
    oppMiss.length === 0 &&
    leadGot.cUtmCampaignName === "Campanha Teste Fase2" &&
    oppGot.cUtmCampaignName === "Campanha Teste Fase2" &&
    leadGot.cCanalCaptura === "formulario" &&
    oppGot.cCanalCaptura === "formulario";

  if (!keep) {
    try {
      await espoRequest(config, "DELETE", `Opportunity/${delivered.opportunityId}`);
      await espoRequest(config, "DELETE", `Lead/${delivered.leadId}`);
      console.log("\nCleanup: Lead+Opp apagados no DEV.");
    } catch (err) {
      console.warn("Cleanup parcial:", err.message);
    }
  } else {
    console.log("\n--keep: Lead", delivered.leadId, "Opp", delivered.opportunityId);
  }

  if (!ok) {
    console.error("\nGATE FASE 2 (Espo DEV): FALHOU");
    process.exit(1);
  }
  console.log("\nGATE FASE 2 (Espo DEV mapeamento): OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
