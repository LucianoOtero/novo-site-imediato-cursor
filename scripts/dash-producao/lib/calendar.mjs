/**
 * Dias úteis — São Paulo capital (seg–sex − feriados BR + SP + município).
 * Lista interna 2025–2027; `extraHolidays` / `removeHolidays` para override.
 */
import { parseMonthKey, toDateOnly } from "./normalize.mjs";

/** Feriados fixos / móveis relevantes (YYYY-MM-DD) — SP capital. */
export const SP_HOLIDAYS = Object.freeze([
  // 2025
  "2025-01-01",
  "2025-01-25", // Aniversário SP
  "2025-03-03", // Carnaval
  "2025-03-04", // Carnaval
  "2025-04-18", // Paixão
  "2025-04-21", // Tiradentes
  "2025-05-01",
  "2025-06-19", // Corpus Christi
  "2025-07-09", // Revolução Constitucionalista
  "2025-09-07",
  "2025-10-12",
  "2025-11-02",
  "2025-11-15",
  "2025-11-20", // Consciência Negra (SP)
  "2025-12-25",
  // 2026
  "2026-01-01",
  "2026-01-25",
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-05-01",
  "2026-06-04",
  "2026-07-09",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
  // 2027
  "2027-01-01",
  "2027-01-25",
  "2027-02-08",
  "2027-02-09",
  "2027-03-26",
  "2027-04-21",
  "2027-05-01",
  "2027-05-27",
  "2027-07-09",
  "2027-09-07",
  "2027-10-12",
  "2027-11-02",
  "2027-11-15",
  "2027-11-20",
  "2027-12-25",
]);

function holidaySet({ extraHolidays = [], removeHolidays = [] } = {}) {
  const s = new Set(SP_HOLIDAYS);
  for (const d of removeHolidays) s.delete(toDateOnly(d));
  for (const d of extraHolidays) {
    const x = toDateOnly(d);
    if (x) s.add(x);
  }
  return s;
}

function utcYmd(y, m0, day) {
  return new Date(Date.UTC(y, m0, day));
}

function formatYmd(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isBusinessDay(dateOnly, calendar = {}) {
  const d = toDateOnly(dateOnly);
  if (!d) return false;
  const dt = new Date(`${d}T12:00:00Z`);
  const dow = dt.getUTCDay(); // 0=Sun
  if (dow === 0 || dow === 6) return false;
  return !holidaySet(calendar).has(d);
}

/**
 * Conta úteis no mês (YYYY-MM).
 * Se `asOf` informado, conta só até asOf inclusive (e não além do fim do mês).
 */
export function businessDays(month, asOf = null, calendar = {}) {
  const parsed = parseMonthKey(month);
  if (!parsed) return 0;
  const { year, month: mon } = parsed;
  const start = utcYmd(year, mon - 1, 1);
  const endMonth = utcYmd(year, mon, 0); // last day of month
  let end = endMonth;
  if (asOf) {
    const a = toDateOnly(asOf);
    if (a) {
      const asOfDt = new Date(`${a}T12:00:00Z`);
      if (asOfDt < start) return 0;
      if (asOfDt < end) end = asOfDt;
    }
  }
  let n = 0;
  for (let dt = new Date(start); dt <= end; dt.setUTCDate(dt.getUTCDate() + 1)) {
    if (isBusinessDay(formatYmd(dt), calendar)) n++;
  }
  return n;
}

/**
 * projetado = metric × (úteis_mês / úteis_decorridos_inclusive)
 * Dia 1 (1 útil decorrido): projetado = metric × úteis_mês.
 * Se elapsed=0: retorna metric (evita div/0).
 */
export function project(amount, daysElapsed, daysMonth) {
  const m = Number(amount) || 0;
  const elapsed = Number(daysElapsed) || 0;
  const monthDays = Number(daysMonth) || 0;
  if (elapsed <= 0) return m;
  if (monthDays <= 0) return m;
  return m * (monthDays / elapsed);
}
