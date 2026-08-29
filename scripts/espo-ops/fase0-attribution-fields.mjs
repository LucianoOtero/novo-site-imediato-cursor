/**
 * Fase 0 / inventário — criar/verificar campos de atribuição Ads no EspoCRM.
 *
 * Uso (PowerShell):
 *   $env:ESPOCRM_API_CONFIG = gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo
 *   node scripts/espo-ops/fase0-attribution-fields.mjs --prefer=dev     # inventário DEV
 *   node scripts/espo-ops/fase0-attribution-fields.mjs --prefer=prod    # inventário PROD (Fase 5)
 *   node scripts/espo-ops/fase0-attribution-fields.mjs --create --prefer=dev
 *
 * CREATE/rebuild em prod exige --i-know-this-is-prod (preferir UI Admin).
 * Naming: o Field Manager prefixa "c" automaticamente — enviar `wbraid` para obter `cWbraid`.
 * Docs: docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md · docs/FASE5_ROLLOUT_PRODUCAO.md
 */
import {
  resolveEspoConfig,
  espoRequest,
  isEspoDevBaseUrl,
  isEspoProdBaseUrl,
} from "./lib/espo-client.mjs";

const prefer = process.argv.find((a) => a.startsWith("--prefer="))?.split("=")[1] || "dev";
const doCreate = process.argv.includes("--create");
const doRebuild = process.argv.includes("--rebuild");
const allowProdWrite = process.argv.includes("--i-know-this-is-prod");

/** Campos canônicos (nome final com prefixo c). */
const VARCHAR_FIELDS = [
  { final: "cWbraid", apiName: "wbraid", label: "Wbraid", maxLength: 255 },
  { final: "cUtmCampaignName", apiName: "utmCampaignName", label: "UTM Campaign Name", maxLength: 255 },
  { final: "cUtmId", apiName: "utmId", label: "UTM ID", maxLength: 255 },
  { final: "cAdgroupId", apiName: "adgroupId", label: "Ad Group ID", maxLength: 255 },
  { final: "cGbraid", apiName: "gbraid", label: "Gbraid", maxLength: 255 },
  { final: "cUtmSource", apiName: "utmSource", label: "UTM Source", maxLength: 255 },
  { final: "cUtmMedium", apiName: "utmMedium", label: "UTM Medium", maxLength: 255 },
  { final: "cUtmCampaign", apiName: "utmCampaign", label: "UTM Campaign", maxLength: 255 },
  { final: "cUtmContent", apiName: "utmContent", label: "UTM Content", maxLength: 255 },
  { final: "cUtmTerm", apiName: "utmTerm", label: "UTM Term", maxLength: 255 },
  { final: "cGadSource", apiName: "gadSource", label: "Gad Source", maxLength: 64 },
  { final: "cGadCampaignId", apiName: "gadCampaignId", label: "Gad Campaign ID", maxLength: 64 },
  { final: "cMatchType", apiName: "matchType", label: "Match Type", maxLength: 16 },
  { final: "cDevice", apiName: "device", label: "Device", maxLength: 16 },
  { final: "cNetwork", apiName: "network", label: "Network", maxLength: 64 },
  { final: "cPlacement", apiName: "placement", label: "Placement", maxLength: 255 },
  { final: "cCreative", apiName: "creative", label: "Creative", maxLength: 64 },
  { final: "cGclid", apiName: "gclid", label: "GCLID", maxLength: 255 },
  { final: "cWebpage", apiName: "webpage", label: "Webpage", maxLength: 255 },
];

const ENUM_CANAL = {
  final: "cCanalCaptura",
  apiName: "canalCaptura",
  label: "Canal de captura",
  type: "enum",
  options: ["", "formulario", "whatsapp", "telefone"],
  optionLabels: {
    "": "",
    formulario: "Formulário",
    whatsapp: "Modal WhatsApp",
    telefone: "Modal telefone",
  },
};

/** Pacote completo por entidade (Fase 0). */
const PACKAGE_BY_ENTITY = {
  Lead: [
    ENUM_CANAL,
    ...VARCHAR_FIELDS.filter((f) =>
      ["cWbraid", "cUtmCampaignName", "cUtmId", "cAdgroupId"].includes(f.final),
    ),
  ],
  Opportunity: [
    ENUM_CANAL,
    ...VARCHAR_FIELDS.filter((f) =>
      [
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
      ].includes(f.final),
    ),
  ],
};

async function getFields(config, entity) {
  const all = await espoRequest(config, "GET", "Metadata");
  return all?.entityDefs?.[entity]?.fields || {};
}

function varcharPayload(def) {
  return {
    type: "varchar",
    name: def.apiName,
    label: def.label,
    maxLength: def.maxLength || 255,
    required: false,
    audited: false,
    readOnly: false,
    tooltip: null,
  };
}

function enumPayload(def) {
  return {
    type: "enum",
    name: def.apiName,
    label: def.label,
    options: def.options,
    optionLabels: def.optionLabels,
    required: false,
    audited: false,
    readOnly: false,
    tooltip: null,
  };
}

async function createField(config, entity, def) {
  const payload = def.type === "enum" ? enumPayload(def) : varcharPayload(def);
  return espoRequest(config, "POST", `Admin/fieldManager/${entity}`, { body: payload });
}

async function main() {
  const config = resolveEspoConfig({ prefer });
  const onProd = isEspoProdBaseUrl(config.baseUrl);
  const onDev = isEspoDevBaseUrl(config.baseUrl);

  if (prefer === "dev" && !onDev) {
    console.warn("ATENÇÃO: prefer=dev mas baseUrl não é DEV:", config.baseUrl);
  }
  if (prefer === "prod" && !onProd) {
    console.warn("ATENÇÃO: prefer=prod mas baseUrl não é PROD:", config.baseUrl);
  }
  // Inventário prod é permitido (Fase 5). CREATE/rebuild em prod exige flag.
  if (onProd && (doCreate || doRebuild) && !allowProdWrite) {
    console.error(
      "ABORTADO: CREATE/rebuild em PROD exige --i-know-this-is-prod (preferir UI Admin).",
    );
    process.exit(2);
  }
  if (prefer === "dev" && onProd) {
    console.error("ABORTADO: prefer=dev resolveu para PROD — confira ESPOCRM_API_CONFIG.");
    process.exit(2);
  }

  console.log(`Espo (${prefer}): ${config.baseUrl} [${config.source || "?"}]`);
  console.log(doCreate ? "Modo: CREATE + verify" : "Modo: inventário (read-only)");

  const report = { baseUrl: config.baseUrl, prefer, entities: {} };

  for (const [entity, defs] of Object.entries(PACKAGE_BY_ENTITY)) {
    const fields = await getFields(config, entity);
    const rows = [];
    for (const def of defs) {
      const exists = Boolean(fields[def.final]);
      let created = false;
      let error = null;
      if (!exists && doCreate) {
        try {
          await createField(config, entity, def);
          created = true;
          console.log(`  CREATE ${entity}.${def.final} OK`);
        } catch (e) {
          error = e.message.slice(0, 300);
          console.log(`  CREATE ${entity}.${def.final} FAIL: ${error}`);
        }
      } else if (exists) {
        console.log(`  OK     ${entity}.${def.final} (${fields[def.final].type})`);
      } else {
        console.log(`  MISSING ${entity}.${def.final}`);
      }
      rows.push({
        field: def.final,
        type: def.type || "varchar",
        existed: exists,
        created,
        error,
      });
    }
    report.entities[entity] = rows;
  }

  if (doCreate && doRebuild) {
    try {
      await espoRequest(config, "POST", "Admin/rebuild", { body: {} });
      console.log("Admin/rebuild OK");
    } catch (e) {
      console.log("Admin/rebuild FAIL:", e.message.slice(0, 200));
    }
  }

  // Re-inventário após create
  if (doCreate) {
    console.log("\n--- Re-inventário ---");
    let missing = 0;
    for (const [entity, defs] of Object.entries(PACKAGE_BY_ENTITY)) {
      const fields = await getFields(config, entity);
      for (const def of defs) {
        const ok = Boolean(fields[def.final]);
        if (!ok) missing += 1;
        console.log(`${ok ? "OK" : "MISSING"} ${entity}.${def.final}`);
      }
    }
    if (missing === 0) {
      console.log("\nGATE Fase 0 (campos): VERDE");
    } else {
      console.log(`\nGATE Fase 0 (campos): ${missing} ainda ausente(s)`);
      console.log(
        "Se CREATE falhou com HTTP 403: a Role do api_dev não tem Admin/fieldManager.",
      );
      console.log(
        "Opções: (1) criar na UI Admin do DEV, ou (2) ampliar Role API com permissão de Field Manager e reexecutar --create.",
      );
    }
  }

  const outPath = new URL("./fase0-attribution-fields-report.json", import.meta.url);
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8"),
  );
  console.log(`Relatório: ${outPath.pathname}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
