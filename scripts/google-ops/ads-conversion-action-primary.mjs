#!/usr/bin/env node
/**
 * Torna uma ação de conversão principal ou secundária (primary_for_goal).
 * Padrão: a 6665179423, "Ação de conversão criada automaticamente para leads
 * qualificados", que o Google criou e que não recebe nenhum envio — como
 * principal, ela aparece no alerta urgente do Diagnóstico de conversões
 * otimizadas ("nenhuma tentativa de importação com dados do usuário").
 *
 *   node ads-conversion-action-primary.mjs                      → só relata
 *   node ads-conversion-action-primary.mjs --apply              → secundária
 *   node ads-conversion-action-primary.mjs --primary=true --apply   (rollback)
 *   node ads-conversion-action-primary.mjs --id=<id> ...
 */
import { adsSession, argValue, mutate, searchAll, writeLog } from "./lib/ads-rest.mjs";

const APPLY = process.argv.includes("--apply");
const ID = String(argValue("id") || "6665179423").replace(/\D/g, "");
const PRIMARY = argValue("primary") === "true";

async function lerAcao(s) {
  const [row] = await searchAll(
    s,
    `SELECT conversion_action.resource_name, conversion_action.name, conversion_action.type,
       conversion_action.category, conversion_action.status, conversion_action.primary_for_goal,
       conversion_action.include_in_conversions_metric
     FROM conversion_action WHERE conversion_action.id = ${ID}`,
  );
  return row?.conversionAction;
}

/** Campanhas ativas cujo lance usa a categoria da ação (meta da conta ou da campanha). */
async function lerUsoNoLance(s, categoria) {
  const conta = await searchAll(
    s,
    `SELECT customer_conversion_goal.category, customer_conversion_goal.origin, customer_conversion_goal.biddable
     FROM customer_conversion_goal WHERE customer_conversion_goal.category = '${categoria}'`,
  );
  const campanhas = await searchAll(
    s,
    `SELECT campaign.id, campaign.name, campaign_conversion_goal.origin, campaign_conversion_goal.biddable
     FROM campaign_conversion_goal
     WHERE campaign_conversion_goal.category = '${categoria}' AND campaign_conversion_goal.biddable = TRUE
       AND campaign.status = 'ENABLED'`,
  );
  const trintaDias = await searchAll(
    s,
    `SELECT metrics.all_conversions FROM conversion_action
     WHERE conversion_action.id = ${ID} AND segments.date DURING LAST_30_DAYS`,
  );
  return {
    metasDaConta: conta.map((r) => r.customerConversionGoal),
    campanhasComLance: campanhas.map((r) => ({ id: r.campaign.id, nome: r.campaign.name, origem: r.campaignConversionGoal.origin })),
    conversoes30Dias: trintaDias.reduce((soma, r) => soma + Number(r.metrics.allConversions || 0), 0),
  };
}

async function main() {
  const s = await adsSession();
  const antes = await lerAcao(s);
  if (!antes) throw new Error(`Ação ${ID} não encontrada`);
  const report = {
    ranAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "dry-run",
    alvo: { primaryForGoal: PRIMARY },
    antes,
    uso: await lerUsoNoLance(s, antes.category),
    steps: [],
  };

  if (antes.primaryForGoal === PRIMARY) {
    report.steps.push({ step: "noop", reason: `já está com primaryForGoal=${PRIMARY}` });
  } else if (APPLY) {
    await mutate(s, "conversionActions", {
      operations: [{ update: { resourceName: antes.resourceName, primaryForGoal: PRIMARY }, updateMask: "primary_for_goal" }],
    });
    report.steps.push({ step: "updated", primaryForGoal: PRIMARY });
  } else {
    report.steps.push({ step: "would_update", primaryForGoal: PRIMARY });
  }

  report.depois = await lerAcao(s);
  writeLog("conversion-action-primary", report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
