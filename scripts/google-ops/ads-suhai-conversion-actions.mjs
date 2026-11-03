#!/usr/bin/env node
/**
 * Ações de conversão próprias da Suhai (WEBPAGE, disparadas pelo GTM).
 * Todas nascem secundárias (primary_for_goal=false): não entram nas metas
 * padrão da conta, então a Porto e as demais campanhas não mudam. A campanha
 * Suhai passa a usá-las pela meta personalizada (ads-suhai-custom-goal.mjs).
 *
 *   node ads-suhai-conversion-actions.mjs            → dry-run (lê e relata)
 *   node ads-suhai-conversion-actions.mjs --apply    → cria as que faltam
 *   node ads-suhai-conversion-actions.mjs --remove   → status REMOVED (rollback)
 */
import { pathToFileURL } from "node:url";

import { adsSession, gaqlString, mutate, searchAll, writeLog } from "./lib/ads-rest.mjs";

const APPLY = process.argv.includes("--apply");
const REMOVE = process.argv.includes("--remove");

export const ACOES_SUHAI = [
  { chave: "contato", name: "Suhai - Contato inicial", category: "SUBMIT_LEAD_FORM", value: 10, lookbackDays: 30 },
  { chave: "preco", name: "Suhai - Preço exibido", category: "REQUEST_QUOTE", value: 0, lookbackDays: 30 },
  { chave: "proposta", name: "Suhai - Proposta enviada", category: "BEGIN_CHECKOUT", value: 120, lookbackDays: 30 },
];

function rotulo(acao) {
  for (const snippet of acao.tagSnippets || []) {
    const hit = String(snippet.eventSnippet || "").match(/send_to['"]?\s*:\s*['"](AW-\d+)\/([^'"]+)['"]/);
    if (hit) return { conversionId: hit[1], label: hit[2] };
  }
  return null;
}

export async function lerAcoesSuhai(s) {
  const nomes = ACOES_SUHAI.map((a) => `'${gaqlString(a.name)}'`).join(",");
  const rows = await searchAll(
    s,
    `SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.category,
       conversion_action.primary_for_goal, conversion_action.resource_name, conversion_action.tag_snippets,
       conversion_action.value_settings.default_value
     FROM conversion_action WHERE conversion_action.name IN (${nomes}) AND conversion_action.status != 'REMOVED'`,
  );
  return new Map(rows.map((r) => [r.conversionAction.name, r.conversionAction]));
}

async function main() {
  const s = await adsSession();
  const report = { ranAt: new Date().toISOString(), mode: REMOVE ? "remove" : APPLY ? "apply" : "dry-run", steps: [] };
  const [referencia] = await searchAll(
    s,
    `SELECT conversion_action.name, conversion_action.counting_type, conversion_action.attribution_model_settings.attribution_model,
       conversion_action.click_through_lookback_window_days, conversion_action.primary_for_goal
     FROM conversion_action WHERE conversion_action.id = 282128343`,
  );
  report.referencia282128343 = referencia?.conversionAction;

  let existentes = await lerAcoesSuhai(s);

  if (REMOVE) {
    const ops = [...existentes.values()].map((a) => ({
      update: { resourceName: a.resourceName, status: "REMOVED" },
      updateMask: "status",
    }));
    if (ops.length) await mutate(s, "conversionActions", { operations: ops });
    report.steps.push({ step: "removed", count: ops.length, names: [...existentes.keys()] });
  } else {
    const faltam = ACOES_SUHAI.filter((a) => !existentes.has(a.name));
    if (faltam.length && APPLY) {
      await mutate(s, "conversionActions", {
        operations: faltam.map((a) => ({
          create: {
            name: a.name,
            type: "WEBPAGE",
            category: a.category,
            status: "ENABLED",
            primaryForGoal: false,
            countingType: "ONE_PER_CLICK",
            clickThroughLookbackWindowDays: a.lookbackDays,
            viewThroughLookbackWindowDays: 1,
            attributionModelSettings: { attributionModel: "GOOGLE_SEARCH_ATTRIBUTION_DATA_DRIVEN" },
            valueSettings: {
              defaultValue: a.value,
              defaultCurrencyCode: "BRL",
              alwaysUseDefaultValue: a.value > 0,
            },
          },
        })),
      });
      existentes = await lerAcoesSuhai(s);
    }
    report.steps.push({ step: APPLY ? "created" : "would_create", names: faltam.map((a) => a.name) });
  }

  report.acoes = ACOES_SUHAI.map((a) => {
    const atual = existentes.get(a.name);
    return {
      chave: a.chave,
      name: a.name,
      existe: Boolean(atual) && !REMOVE,
      id: atual?.id,
      primaryForGoal: atual?.primaryForGoal,
      categoria: atual?.category ?? a.category,
      valor: a.value,
      ...(atual ? rotulo(atual) : {}),
    };
  });

  writeLog("suhai-conversion-actions", report);
  console.log(JSON.stringify({ mode: report.mode, steps: report.steps, acoes: report.acoes, referencia: report.referencia282128343 }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
