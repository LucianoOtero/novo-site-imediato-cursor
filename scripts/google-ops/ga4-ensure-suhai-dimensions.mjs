#!/usr/bin/env node
/**
 * Dimensões e métrica (escopo evento) dos parâmetros suhai_* na property
 * GA4 do site, e eventos-chave de relatório (preço exibido e proposta).
 * Não altera o site, o GTM nem o Google Ads. Vale só para eventos futuros.
 *
 *   node ga4-ensure-suhai-dimensions.mjs           → dry-run
 *   node ga4-ensure-suhai-dimensions.mjs --apply
 */
import fs from "node:fs";
import { getAnalyticsAdmin, getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const PROPERTY_ID = "281067607";
const APPLY = process.argv.includes("--apply");

const DIMENSIONS = [
  { parameterName: "arm", displayName: "Suhai Arm" },
  { parameterName: "field", displayName: "Suhai Field" },
  { parameterName: "result", displayName: "Suhai Result" },
  { parameterName: "plan", displayName: "Suhai Plan" },
  { parameterName: "assist", displayName: "Suhai Assist" },
  { parameterName: "premium_band", displayName: "Suhai Premium Band" },
  { parameterName: "stage", displayName: "Suhai Offer Stage" },
  { parameterName: "level", displayName: "Suhai Assist Level" },
  { parameterName: "http_status", displayName: "Suhai HTTP Status" },
  { parameterName: "slow", displayName: "Suhai Slow" },
  { parameterName: "recalc", displayName: "Suhai Recalc" },
  { parameterName: "simulated", displayName: "Suhai Simulated" },
];

const METRICS = [{ parameterName: "duration_ms", displayName: "Suhai Duration ms", measurementUnit: "MILLISECONDS" }];

const KEY_EVENTS = ["suhai_quote_price", "suhai_proposal_sent"];

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const propertyId = String(config.ga4?.propertyId || PROPERTY_ID).replace(/\D/g, "") || PROPERTY_ID;
  const parent = `properties/${propertyId}`;
  const admin = getAnalyticsAdmin(await getAuthorizedClient({ withAnalytics: true }));

  const dims = (await admin.properties.customDimensions.list({ parent, pageSize: 200 })).data.customDimensions || [];
  const mets = (await admin.properties.customMetrics.list({ parent, pageSize: 200 })).data.customMetrics || [];
  const kes = (await admin.properties.keyEvents.list({ parent, pageSize: 200 })).data.keyEvents || [];
  const temDim = new Set(dims.map((d) => String(d.parameterName).toLowerCase()));
  const temMet = new Set(mets.map((m) => String(m.parameterName).toLowerCase()));
  const temKe = new Set(kes.map((k) => k.eventName));

  const faltaDim = DIMENSIONS.filter((d) => !temDim.has(d.parameterName));
  const faltaMet = METRICS.filter((m) => !temMet.has(m.parameterName));
  const faltaKe = KEY_EVENTS.filter((e) => !temKe.has(e));
  console.log(`Dimensões: ${dims.length} hoje; faltam ${faltaDim.length}: ${faltaDim.map((d) => d.parameterName).join(", ") || "-"}`);
  console.log(`Métricas: faltam ${faltaMet.map((m) => m.parameterName).join(", ") || "-"}`);
  console.log(`Eventos-chave: faltam ${faltaKe.join(", ") || "-"}`);
  if (dims.length + faltaDim.length > 50) throw new Error("passaria do limite de 50 dimensões de evento");

  if (!APPLY) {
    console.log("Dry-run. Nada alterado.");
    return;
  }
  for (const d of faltaDim) {
    const r = await admin.properties.customDimensions.create({ parent, requestBody: { ...d, scope: "EVENT" } });
    console.log("Criada dimensão:", d.parameterName, "→", r.data.name);
  }
  for (const m of faltaMet) {
    const r = await admin.properties.customMetrics.create({ parent, requestBody: { ...m, scope: "EVENT" } });
    console.log("Criada métrica:", m.parameterName, "→", r.data.name);
  }
  for (const eventName of faltaKe) {
    const r = await admin.properties.keyEvents.create({ parent, requestBody: { eventName, countingMethod: "ONCE_PER_EVENT" } });
    console.log("Criado evento-chave:", eventName, "→", r.data.name);
  }
  console.log("Registro em:", new Date().toISOString());
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
