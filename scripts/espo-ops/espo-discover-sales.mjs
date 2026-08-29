/**
 * Descoberta read-only EspoCRM — inventário de cWebpage, cEtapaFunil,
 * stage, cDataVenda. Sem PII no snapshot gravado.
 *
 * Uso:
 *   $env:ESPOCRM_API_CONFIG = (gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo)
 *   node espo-discover-sales.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveEspoConfig,
  espoListAll,
  isTestLead,
  siteBucket,
} from "./lib/espo-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "espo-discovery-snapshot.json");

const OPP_SELECT = [
  "id",
  "name",
  "stage",
  "amount",
  "cPremioLiquido",
  "cDataVenda",
  "cDataDoLead",
  "cWebpage",
  "cEtapaFunil",
  "cEscolhaCalculo",
  "cStatusCalculo",
  "cGclid",
  "cLeadId",
  "cCelular",
  "closeDate",
  "createdAt",
  "modifiedAt",
];

function bump(map, key) {
  const k = key || "(vazio)";
  map[k] = (map[k] || 0) + 1;
}

function mainStats(rows) {
  const byWebpage = {};
  const bySite = {};
  const byEtapa = {};
  const byStage = {};
  let withSale = 0;
  let withAmount = 0;
  let withGclid = 0;
  let tests = 0;
  for (const r of rows) {
    if (isTestLead(r)) {
      tests++;
      continue;
    }
    bump(byWebpage, r.cWebpage);
    bump(bySite, siteBucket(r.cWebpage));
    bump(byEtapa, r.cEtapaFunil);
    bump(byStage, r.stage);
    if (r.cDataVenda) withSale++;
    if (r.amount != null && Number(r.amount) > 0) withAmount++;
    if (r.cGclid) withGclid++;
  }
  return {
    totalListed: rows.length,
    excludedTests: tests,
    analyzed: rows.length - tests,
    withSale,
    withAmount,
    withGclid,
    byWebpage,
    bySite,
    byEtapa,
    byStage,
  };
}

async function sampleDescriptions(config, site, limit = 15) {
  const webpages =
    site === "novo"
      ? ["novo.segurosimediato.com.br", "comparaseguroonline.com.br"]
      : ["mdmidia.com.br"];
  const samples = [];
  for (const webpage of webpages) {
    const list = await espoListAll(config, "Opportunity", {
      select: ["id", "cWebpage", "cEtapaFunil", "stage", "cDataVenda", "description"],
      where: [
        { type: "equals", attribute: "cWebpage", value: webpage },
      ],
      maxSize: limit,
      maxPages: 1,
    });
    for (const r of list.slice(0, limit)) {
      if (isTestLead(r)) continue;
      const desc = String(r.description || "");
      samples.push({
        site,
        webpage: r.cWebpage,
        etapa: r.cEtapaFunil || null,
        stage: r.stage || null,
        hasSale: Boolean(r.cDataVenda),
        descriptionLength: desc.length,
        hints: {
          mentionsModal: /modal|whatsapp|wa\.me|telefone informado/i.test(desc),
          mentionsForm: /formul[aá]rio|leadform|cotacao|cálculo/i.test(desc),
          mentionsWhatsapp: /whatsapp|wa\.me/i.test(desc),
          mentionsPhone: /ligar|telefone|tel:/i.test(desc),
        },
      });
    }
  }
  return samples.slice(0, limit);
}

async function main() {
  const config = resolveEspoConfig({ prefer: "prod" });
  console.log(`Espo: ${config.baseUrl} (read-only discovery)`);

  // Opportunities mais recentes primeiro + todas as do site novo (filtro dedicado).
  const recent = await espoListAll(config, "Opportunity", {
    select: OPP_SELECT,
    orderBy: "createdAt",
    order: "desc",
    maxSize: 200,
    maxPages: 25,
  });

  const novoPages = [];
  for (const webpage of [
    "novo.segurosimediato.com.br",
    "comparaseguroonline.com.br",
  ]) {
    const chunk = await espoListAll(config, "Opportunity", {
      select: OPP_SELECT,
      where: [{ type: "equals", attribute: "cWebpage", value: webpage }],
      orderBy: "createdAt",
      order: "desc",
      maxSize: 200,
      maxPages: 10,
    });
    novoPages.push(...chunk);
  }

  const byId = new Map();
  for (const r of [...recent, ...novoPages]) byId.set(r.id, r);
  const opps = [...byId.values()];

  const stats = mainStats(opps);
  const sold = opps.filter((r) => r.cDataVenda && !isTestLead(r));
  const soldBySite = {};
  const soldByEtapa = {};
  for (const r of sold) {
    bump(soldBySite, siteBucket(r.cWebpage));
    bump(soldByEtapa, r.cEtapaFunil);
  }

  let samplesNovo = [];
  let samplesLegado = [];
  try {
    samplesNovo = await sampleDescriptions(config, "novo", 12);
    samplesLegado = await sampleDescriptions(config, "legado", 12);
  } catch (e) {
    console.warn("Amostra description falhou:", e.message);
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    baseUrl: config.baseUrl,
    readOnly: true,
    opportunityStats: stats,
    sold: {
      count: sold.length,
      bySite: soldBySite,
      byEtapa: soldByEtapa,
    },
    descriptionHints: {
      novo: samplesNovo,
      legado: samplesLegado,
      note: "Sem PII — só flags de texto. Canal form/modal não aparece de forma confiável só no Espo.",
    },
    conclusions: {
      canSplitFormVsModalFromEspoAlone: false,
      canSplitWhatsappVsPhoneFromEspoAlone: false,
      saleFieldPresent: stats.withSale > 0,
      recommendedNext: "Join Firebase captureChannel/source × Opportunity (cGclid/cLeadId/cCelular hash).",
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log("Snapshot:", OUT);
  console.log(JSON.stringify({ opportunityStats: stats, sold: snapshot.sold }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
