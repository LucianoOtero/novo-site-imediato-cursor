/**
 * Inventário/criação dos campos da cotação Suhai no EspoCRM (Lead e Opportunity).
 *
 * Uso (PowerShell):
 *   $env:ESPOCRM_API_CONFIG = gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo
 *   node scripts/espo-ops/fase0-suhai-fields.mjs --prefer=dev            # inventário DEV
 *   node scripts/espo-ops/fase0-suhai-fields.mjs --prefer=prod           # inventário PROD
 *   node scripts/espo-ops/fase0-suhai-fields.mjs --create --prefer=dev   # cria o que faltar no DEV
 *
 * CREATE em prod exige --i-know-this-is-prod (preferir UI Admin).
 * Opções novas em enums existentes (cEtapaFunil, cCanalCaptura, cSeguradora)
 * não são alteradas aqui: o relatório lista as que faltam para a UI Admin.
 * Docs: docs/FLUXO_SUHAI_CRM_WHATSAPP.md
 */
import { resolveEspoConfig, espoRequest, isEspoDevBaseUrl, isEspoProdBaseUrl } from "./lib/espo-client.mjs";

const prefer = process.argv.find((a) => a.startsWith("--prefer="))?.split("=")[1] || "dev";
const doCreate = process.argv.includes("--create");
const allowProdWrite = process.argv.includes("--i-know-this-is-prod");

const NOVOS = [
  { final: "cNumeroCotacao", apiName: "numeroCotacao", label: "Número da cotação", type: "varchar", maxLength: 40 },
  { final: "cNumeroProposta", apiName: "numeroProposta", label: "Número da proposta", type: "varchar", maxLength: 40 },
  { final: "cPlanoEscolhido", apiName: "planoEscolhido", label: "Plano escolhido", type: "varchar", maxLength: 120 },
  { final: "cPremioTotal", apiName: "premioTotal", label: "Prêmio total", type: "currency" },
  { final: "cPagamento", apiName: "pagamento", label: "Pagamento", type: "varchar", maxLength: 80 },
  { final: "cFranquia", apiName: "franquia", label: "Franquia", type: "varchar", maxLength: 30 },
  // Acompanhamento da proposta (rotina agendada, 2026-10-25).
  { final: "cStatusProposta", apiName: "statusProposta", label: "Status da proposta", type: "varchar", maxLength: 60 },
  { final: "cDataStatusProposta", apiName: "dataStatusProposta", label: "Data do status da proposta", type: "datetime" },
];

const OPCOES_ESPERADAS = {
  cEtapaFunil: ["Cotação Suhai apresentada", "Plano escolhido", "Proposta transmitida", "Proposta com erro"],
  cCanalCaptura: ["cotacao_suhai"],
};

const OPCOES_OPP = {
  cSeguradora: ["Suhai"],
};

function payload(def) {
  const base = { name: def.apiName, label: def.label, required: false, audited: false, readOnly: false, tooltip: null };
  if (def.type === "currency") return { ...base, type: "currency" };
  if (def.type === "datetime") return { ...base, type: "datetime" };
  return { ...base, type: "varchar", maxLength: def.maxLength || 255 };
}

async function getFields(config, entity) {
  const all = await espoRequest(config, "GET", "Metadata");
  return all?.entityDefs?.[entity]?.fields || {};
}

function opcoesFaltando(field, esperadas) {
  if (!field) return { campo: "ausente", faltando: esperadas };
  const atuais = Array.isArray(field.options) ? field.options : [];
  const lower = atuais.map((o) => String(o).toLowerCase());
  return { campo: field.type, faltando: esperadas.filter((o) => !lower.includes(o.toLowerCase())), atuais };
}

async function main() {
  const config = resolveEspoConfig({ prefer });
  const onProd = isEspoProdBaseUrl(config.baseUrl);
  if (prefer === "dev" && onProd) {
    console.error("ABORTADO: prefer=dev resolveu para PROD.");
    process.exit(2);
  }
  if (prefer === "dev" && !isEspoDevBaseUrl(config.baseUrl)) {
    console.warn("ATENÇÃO: prefer=dev mas baseUrl não é DEV:", config.baseUrl);
  }
  if (onProd && doCreate && !allowProdWrite) {
    console.error("ABORTADO: CREATE em PROD exige --i-know-this-is-prod.");
    process.exit(2);
  }

  console.log(`Espo (${prefer}): ${config.baseUrl}`);
  console.log(doCreate ? "Modo: CREATE + verify" : "Modo: inventário (read-only)");
  const report = { baseUrl: config.baseUrl, prefer, entities: {} };

  for (const entity of ["Lead", "Opportunity"]) {
    const fields = await getFields(config, entity);
    const rows = [];
    for (const def of NOVOS) {
      const exists = Boolean(fields[def.final]);
      let created = false;
      let error = null;
      if (!exists && doCreate) {
        try {
          await espoRequest(config, "POST", `Admin/fieldManager/${entity}`, { body: payload(def) });
          created = true;
          console.log(`  CREATE ${entity}.${def.final} OK`);
        } catch (e) {
          error = e.message.slice(0, 300);
          console.log(`  CREATE ${entity}.${def.final} FAIL: ${error}`);
        }
      } else {
        console.log(`  ${exists ? "OK     " : "MISSING"} ${entity}.${def.final}${exists ? ` (${fields[def.final].type})` : ""}`);
      }
      rows.push({ field: def.final, existed: exists, created, error });
    }

    const enums = { ...OPCOES_ESPERADAS, ...(entity === "Opportunity" ? OPCOES_OPP : {}) };
    const opcoes = {};
    for (const [campo, esperadas] of Object.entries(enums)) {
      opcoes[campo] = opcoesFaltando(fields[campo], esperadas);
      const { faltando, campo: tipo } = opcoes[campo];
      console.log(
        `  ENUM   ${entity}.${campo} (${tipo}): ${faltando.length ? `faltando ${faltando.join(", ")}` : "opções OK"}`,
      );
    }
    report.entities[entity] = { fields: rows, opcoes };
  }

  const outPath = new URL(`./fase0-suhai-fields-${prefer}.json`, import.meta.url);
  const fs = await import("node:fs/promises");
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Relatório: ${outPath.pathname}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
