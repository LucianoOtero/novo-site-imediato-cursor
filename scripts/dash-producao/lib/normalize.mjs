/**
 * Normalização de documentos e seguradoras (join Espo ↔ Agger).
 */

const SEG_STOP = new Set([
  "cia",
  "de",
  "da",
  "do",
  "dos",
  "das",
  "e",
  "seguros",
  "seguradora",
  "sa",
  "s",
  "a",
  "gerais",
  "companhia",
  "cartao",
  "mensal",
]);

/** Só dígitos (CPF/CNPJ). */
export function normDoc(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/** Minúsculo, sem acento, só [a-z0-9 ] */
export function normSeg(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Primeiro token significativo da seguradora. */
export function segToken(value) {
  const n = normSeg(value);
  const parts = n.split(/\s+/).filter((p) => p && !SEG_STOP.has(p));
  return parts[0] || n;
}

/** Fuzzy: token Espo casa com razão Agger. */
export function segMatch(espoSeg, aggerSeg) {
  const tok = segToken(espoSeg);
  if (!tok) return true;
  const agTok = segToken(aggerSeg);
  const agFull = normSeg(aggerSeg);
  return agTok.includes(tok) || tok.includes(agTok) || agFull.includes(tok);
}

/** YYYY-MM-DD a partir de Date ou string ISO/date. */
export function toDateOnly(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** Diferença em dias (a − b), datas YYYY-MM-DD interpretadas em UTC. */
export function daysBetween(a, b) {
  const da = toDateOnly(a);
  const db = toDateOnly(b);
  if (!da || !db) return null;
  const ta = Date.UTC(+da.slice(0, 4), +da.slice(5, 7) - 1, +da.slice(8, 10));
  const tb = Date.UTC(+db.slice(0, 4), +db.slice(5, 7) - 1, +db.slice(8, 10));
  return Math.round((ta - tb) / 86400000);
}

export function monthKeyFromDate(dateOnly) {
  const d = toDateOnly(dateOnly);
  return d ? d.slice(0, 7) : null;
}

export function parseMonthKey(month /* YYYY-MM */) {
  const m = String(month || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return { year: +m[1], month: +m[2] };
}

/** NOVO NEGÓCIO → venda_nova; NEGÓCIO PRÓPRIO → renovacao */
export function classifyNegocioCorretora(raw) {
  const n = String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
  if (!n) return null;
  if (n.includes("NOVO")) return "venda_nova";
  if (n.includes("PROPRIO") || n.includes("PRÓPRIO")) return "renovacao";
  return "outro";
}
