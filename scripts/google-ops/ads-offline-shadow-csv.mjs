/**
 * Sombra somente leitura: CSV do Espo × o que a função nova emitiria.
 * Não faz POST no Google Ads nem no Data Manager.
 *
 *   node scripts/google-ops/ads-offline-shadow-csv.mjs --self-test
 *   node scripts/google-ops/ads-offline-shadow-csv.mjs --file=conversoes.txt --opps=opps.json
 *   node scripts/google-ops/ads-offline-shadow-csv.mjs --file=conversoes.txt --from-espo --since=2026-10-27
 *
 * --opps: JSON array { id, amount, cDataVenda, cGclid, soldSyncedAt? }.
 * --from-espo: GET Opportunity stage=Vendido (ESPOCRM_API_CONFIG). Sem escrita.
 * --since=AAAA-MM-DD: compara só vendas (e linhas do CSV) a partir dessa data
 *   civil — sem isso, as vendas antigas que nunca foram ao CSV aparecem como
 *   "missing_in_csv".
 * --janela-csv: usa como janela a menor e a maior data do próprio arquivo
 *   (uso diário contra o lote de um dia).
 * Divergência grave: gclid que a função enviaria e que não casa valor ou data civil no CSV.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ads = require("../../firebase/functions/ads-offline-conversion.js");
const sold = require("../../firebase/functions/sold-sync.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  const eq = hit.indexOf("=");
  return eq === -1 ? true : hit.slice(eq + 1);
}

function splitCsv(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseBatchCsv(text) {
  const rows = [];
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("Parameters:") || line.includes("Google Click ID")) continue;
    const cols = splitCsv(line);
    if (cols.length < 4 || !cols[0]) continue;
    const time = cols[2] || "";
    rows.push({
      gclid: cols[0],
      name: cols[1] || "",
      time,
      value: Number(String(cols[3]).replace(",", ".")),
      currency: cols[4] || "BRL",
      civilDate: time.slice(0, 10),
    });
  }
  return rows;
}

export function projectOpportunity(opp, now = new Date()) {
  const amount = sold.parseAmount(opp.amount);
  const soldDate = opp.cDataVenda ? String(opp.cDataVenda).slice(0, 10) : null;
  const time = ads.formatConversionDateTime(
    opp.soldSyncedAt || null,
    soldDate,
    "-03:00",
    now
  );
  const gclid = opp.cGclid || opp.gclid || null;
  return {
    opportunityId: opp.id || opp.opportunityId || null,
    gclid,
    value: amount,
    time,
    civilDate: time.slice(0, 10),
    wouldSend: Boolean(gclid) && Number(amount) > 0,
  };
}

/** Menor e maior data civil do lote — a janela que o arquivo diário cobre. */
export function csvWindow(csvRows) {
  const dates = csvRows.map((r) => r.civilDate).filter(Boolean).sort();
  return dates.length ? { since: dates[0], until: dates[dates.length - 1] } : { since: null, until: null };
}

export function compareShadow(csvRows, opportunities, now = new Date(), since = null, until = null) {
  const inWindow = (date) => (!since || date >= since) && (!until || date <= until);
  const projected = opportunities
    .map((o) => projectOpportunity(o, now))
    .filter((p) => p.wouldSend && inWindow(p.civilDate));
  const byGclid = new Map();
  for (const row of csvRows.filter((r) => inWindow(r.civilDate))) {
    if (!byGclid.has(row.gclid)) byGclid.set(row.gclid, []);
    byGclid.get(row.gclid).push(row);
  }
  const grave = [];
  const matched = [];
  for (const p of projected) {
    const hits = byGclid.get(p.gclid) || [];
    if (!hits.length) {
      grave.push({ kind: "missing_in_csv", opportunityId: p.opportunityId, gclid: p.gclid, value: p.value, civilDate: p.civilDate });
      continue;
    }
    const exact = hits.find(
      (h) => h.civilDate === p.civilDate && Math.abs(h.value - p.value) < 0.02
    );
    if (exact) {
      matched.push(p.opportunityId);
      continue;
    }
    grave.push({
      kind: "mismatch",
      opportunityId: p.opportunityId,
      gclid: p.gclid,
      expectedValue: p.value,
      expectedDate: p.civilDate,
      csvValue: hits[0].value,
      csvDate: hits[0].civilDate,
    });
  }
  return { projected: projected.length, matched: matched.length, grave };
}

function selfTest() {
  const now = new Date("2026-09-21T15:00:00.000Z");
  const csv = parseBatchCsv(`Parameters:TimeZone=-0300,,,,
"Google Click ID","Conversion Name","Conversion Time","Conversion Value","Conversion Currency"
G-OK,SegurosImediatoOffline,"2026-09-04 23:59:59",1234.56,BRL
G-BAD,SegurosImediatoOffline,"2026-09-04 12:00:00",10,BRL
`);
  const opps = [
    { id: "opp-ok", amount: "1.234,56", cDataVenda: "2026-09-04", cGclid: "G-OK" },
    { id: "opp-bad", amount: "99,00", cDataVenda: "2026-09-04", cGclid: "G-BAD" },
    { id: "opp-noclick", amount: "50", cDataVenda: "2026-09-04" },
  ];
  const report = compareShadow(csv, opps, now);
  if (report.projected !== 2) throw new Error(`projected ${report.projected}`);
  if (report.matched !== 1) throw new Error(`matched ${report.matched}`);
  if (report.grave.length !== 1 || report.grave[0].opportunityId !== "opp-bad") {
    throw new Error(`grave ${JSON.stringify(report.grave)}`);
  }
  const projected = projectOpportunity(opps[0], now);
  if (projected.time !== "2026-09-04 23:59:59-03:00") {
    throw new Error(`time ${projected.time}`);
  }
  const antiga = { id: "opp-antiga", amount: "10", cDataVenda: "2026-08-01", cGclid: "G-OLD" };
  const comJanela = compareShadow(csv, [...opps, antiga], now, "2026-09-01");
  if (comJanela.projected !== 2 || comJanela.grave.some((g) => g.opportunityId === "opp-antiga")) {
    throw new Error(`since ${JSON.stringify(comJanela)}`);
  }
  const janela = csvWindow(csv);
  if (janela.since !== "2026-09-04" || janela.until !== "2026-09-04") throw new Error(`janela ${JSON.stringify(janela)}`);
  const hoje = { id: "opp-hoje", amount: "10", cDataVenda: "2026-09-21", cGclid: "G-HOJE" };
  if (compareShadow(csv, [...opps, hoje], now, janela.since, janela.until).grave.length !== 1) {
    throw new Error("janela-csv não cortou a venda fora do lote");
  }
  console.log("OK: sombra self-test (1 match, 1 divergência de valor, sem click ignorado, --since corta venda antiga)");
}

async function loadOppsFromEspo() {
  const { resolveEspoConfig, espoListAll } = await import("../espo-ops/lib/espo-client.mjs");
  const config = resolveEspoConfig({ prefer: "prod" });
  const list = await espoListAll(config, "Opportunity", {
    select: ["id", "amount", "cDataVenda", "cGclid", "stage"],
    where: [{ type: "equals", attribute: "stage", value: "Vendido" }],
    orderBy: "modifiedAt",
    maxPages: 20,
  });
  return list;
}

async function main() {
  if (arg("self-test")) {
    selfTest();
    return;
  }
  const file = arg("file");
  if (!file || file === true) {
    console.error("Informe --file=caminho.txt ou --self-test. Este script não envia nada ao Google.");
    process.exit(2);
  }
  const csv = parseBatchCsv(fs.readFileSync(path.resolve(file), "utf8"));
  let opps = [];
  const oppsFile = arg("opps");
  if (oppsFile && oppsFile !== true) {
    opps = JSON.parse(fs.readFileSync(path.resolve(oppsFile), "utf8"));
  } else if (arg("from-espo")) {
    opps = await loadOppsFromEspo();
  } else {
    console.error("Informe --opps=arquivo.json ou --from-espo.");
    process.exit(2);
  }
  let since = arg("since");
  let until = null;
  if (since === true || (since && !/^\d{4}-\d{2}-\d{2}$/.test(since))) {
    console.error("--since deve ser AAAA-MM-DD.");
    process.exit(2);
  }
  if (arg("janela-csv")) ({ since, until } = csvWindow(csv));
  const report = compareShadow(csv, opps, new Date(), since || null, until);
  const outPath = path.join(__dirname, "ads-offline-shadow-last.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify({ at: new Date().toISOString(), since: since || null, until, csvRows: csv.length, ...report }, null, 2)
  );
  console.log(
    `janela=${since || "-"}..${until || "-"} csv=${csv.length} projetadas=${report.projected} casadas=${report.matched} graves=${report.grave.length}`
  );
  if (report.grave.length) {
    console.log(JSON.stringify(report.grave.slice(0, 20), null, 2));
    process.exit(1);
  }
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
