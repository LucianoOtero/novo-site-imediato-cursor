/**
 * Fase 2 — baseline match Espo Opp (Vendido) × agger_policy.
 * Join hypoteses:
 *  A) doc_norm + seguradora_norm + |emisso - vig_inicio| <= N days
 *  B) doc_norm + |emisso - vig_inicio| <= N days (sem seguradora)
 * Env: DATABASE_URL, reads fase2-espo-vendido-sample.json
 */
import fs from "node:fs";
import pg from "pg";
import { resolveDatabaseUrl, pgClientOptions } from "../../agger-ops/ingest/load-database-url.mjs";

function normDoc(s) {
  return String(s || "").replace(/\D/g, "");
}
function normSeg(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
/** Compact token for fuzzy seg match (first significant word). */
function segToken(s) {
  const n = normSeg(s);
  const stop = new Set(["cia", "de", "seguros", "seguradora", "sa", "s", "a", "gerais", "companhia"]);
  const parts = n.split(/\s+/).filter((p) => p && !stop.has(p));
  return parts[0] || n;
}
function daysBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((da - db) / 86400000);
}

const samplePath = new URL("./fase2-espo-vendido-sample.json", import.meta.url);
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const opps = sample.joinCandidates || [];

const url = resolveDatabaseUrl();
if (!url) {
  console.error("NO_DB");
  process.exit(1);
}
const client = new pg.Client(pgClientOptions(url));
await client.connect();

const { rows: policies } = await client.query(`
  SELECT id, business_key, seguradora, numero_apolice, numero_proposta,
         cliente_doc, vigencia_inicio, data_emissao, comissao_valor, vendedor, is_active,
         COALESCE(raw->>'NEGÓCIO CORRETORA', raw->>'NEGOCIO CORRETORA') AS negocio
  FROM agger_policy
  WHERE is_active
`);
await client.end();

const byDoc = new Map();
for (const p of policies) {
  const d = normDoc(p.cliente_doc);
  if (!d) continue;
  if (!byDoc.has(d)) byDoc.set(d, []);
  byDoc.get(d).push(p);
}

function matchOpp(opp, { windowDays = 7, useSeg = true } = {}) {
  const docs = byDoc.get(opp.docDigits) || [];
  if (!opp.docDigits || docs.length === 0) return { kind: "none", matches: [] };

  const segTok = segToken(opp.cSeguradora);
  const candidates = docs.filter((p) => {
    const d = daysBetween(opp.cDataDeEmisso, p.vigencia_inicio || p.data_emissao);
    if (d == null || Math.abs(d) > windowDays) return false;
    if (!useSeg) return true;
    if (!segTok) return true;
    const pTok = segToken(p.seguradora);
    return pTok.includes(segTok) || segTok.includes(pTok) || normSeg(p.seguradora).includes(segTok);
  });

  if (candidates.length === 0) return { kind: "none", matches: [] };
  if (candidates.length === 1) return { kind: "one", matches: candidates };
  return { kind: "multi", matches: candidates };
}

function summarize(label, opts) {
  let one = 0,
    none = 0,
    multi = 0;
  let withDoc = 0;
  const multiSizes = [];
  for (const opp of opps) {
    if (!opp.docDigits) {
      none++;
      continue;
    }
    withDoc++;
    const r = matchOpp(opp, opts);
    if (r.kind === "one") one++;
    else if (r.kind === "multi") {
      multi++;
      multiSizes.push(r.matches.length);
    } else none++;
  }
  return {
    label,
    opts,
    n: opps.length,
    withDoc,
    one,
    multi,
    none,
    oneRate: opps.length ? +(one / opps.length).toFixed(3) : 0,
    oneRateAmongDoc: withDoc ? +(one / withDoc).toFixed(3) : 0,
    multiAvg: multiSizes.length
      ? +(multiSizes.reduce((a, b) => a + b, 0) / multiSizes.length).toFixed(2)
      : 0,
  };
}

const reports = [
  summarize("doc+seg±3d", { windowDays: 3, useSeg: true }),
  summarize("doc+seg±7d", { windowDays: 7, useSeg: true }),
  summarize("doc+seg±15d", { windowDays: 15, useSeg: true }),
  summarize("doc±7d (sem seg)", { windowDays: 7, useSeg: false }),
  summarize("doc±15d (sem seg)", { windowDays: 15, useSeg: false }),
];

console.log(JSON.stringify({ asOf: new Date().toISOString(), policyN: policies.length, reports }, null, 2));

// negocio mix among 1:1 matches at recommended rule
const rec = { windowDays: 7, useSeg: true };
const negocioMix = {};
for (const opp of opps) {
  const r = matchOpp(opp, rec);
  if (r.kind !== "one") continue;
  const v = r.matches[0].negocio || "(null)";
  negocioMix[v] = (negocioMix[v] || 0) + 1;
}
console.log("NEGOCIO_AMONG_1TO1_doc+seg±7d", JSON.stringify(negocioMix, null, 2));
