import {
  avgLast3Months,
  buildMonthRows,
  consolidateByVendor,
  houseTotals,
  vendorKey,
} from "@dash-core/index.mjs";
import { getPool } from "./db";
import { fetchVendidosMonth, resolveEspoDashConfig } from "./espo";

export type AggerPolicy = {
  id: string;
  business_key?: string;
  seguradora?: string | null;
  cliente_doc?: string | null;
  cliente_nome?: string | null;
  data_emissao?: string | null;
  vigencia_inicio?: string | null;
  comissao_valor?: number | null;
  vendedor?: string | null;
  is_active?: boolean;
  raw?: Record<string, unknown> | null;
  negocio_corretora?: string | null;
};

function prevMonths(month: string, n: number): string[] {
  const [y0, m0] = month.split("-").map(Number);
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    let y = y0;
    let m = m0 - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    out.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return out;
}

export function currentMonthKey(asOf = new Date()): string {
  // America/Sao_Paulo roughly via UTC-3 for month boundary is imperfect near midnight;
  // use Intl for date parts in SP.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(asOf);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

export function asOfDateSp(asOf = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(asOf); // YYYY-MM-DD
}

export async function loadPolicies(): Promise<AggerPolicy[]> {
  const pool = getPool();
  const { rows } = await pool.query<AggerPolicy>(`
    SELECT id, business_key, seguradora, cliente_doc, cliente_nome,
           data_emissao::text, vigencia_inicio::text,
           comissao_valor, vendedor, is_active, raw
    FROM agger_policy
    WHERE is_active = true
  `);
  return rows;
}

export async function lastAggerRun(): Promise<{
  id: number;
  run_date: string | null;
  finished_at: string | null;
  status: string | null;
} | null> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT id, run_date::text, finished_at::text, status
    FROM agger_run
    ORDER BY id DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

export async function computeProduction(month: string) {
  const espo = resolveEspoDashConfig();
  const asOf = asOfDateSp();
  const [{ list: opps, fetchedAt }, policies] = await Promise.all([
    fetchVendidosMonth(espo, month),
    loadPolicies(),
  ]);

  // Domain lib is ESM JS — keep call sites loosely typed.
  const build = buildMonthRows as (args: Record<string, unknown>) => Array<{
    source: string;
    vendorId?: string | null;
    vendorName?: string | null;
    flags?: string[];
    produzido: number;
    emitido: number;
    [k: string]: unknown;
  }>;

  const rows = build({
    opps,
    policies,
    month,
  });

  // média 3m: só produzido Espo (sem join)
  const histMonths = prevMonths(month, 3);
  const historyByMonth: Record<string, typeof rows> = {};
  for (const hm of histMonths) {
    const { list } = await fetchVendidosMonth(espo, hm);
    historyByMonth[hm] = build({
      opps: list,
      policies: [],
      month: hm,
    }).filter((r) => r.source === "espo");
  }

  const avg3m = new Map<string, number>();
  const vendorKeys = new Set(rows.map((r) => vendorKey(r)));
  for (const k of vendorKeys) {
    const v = avgLast3Months(k, historyByMonth, "produzido");
    if (v != null) avg3m.set(k, v);
  }

  const consolidated = consolidateByVendor(rows, { month, asOf, avg3m }) as {
    vendors: Array<Record<string, unknown>>;
    daysMonth: number;
    daysElapsed: number;
  };
  const house = houseTotals(rows, consolidated);

  const flagSummary: Record<string, number> = {};
  for (const r of rows) {
    for (const f of r.flags || []) {
      flagSummary[f] = (flagSummary[f] || 0) + 1;
    }
  }

  return {
    month,
    asOf,
    espoFetchedAt: fetchedAt,
    espoSource: espo.source,
    house,
    vendors: consolidated.vendors,
    daysMonth: consolidated.daysMonth,
    daysElapsed: consolidated.daysElapsed,
    flagSummary,
    counts: {
      lines: rows.length,
      espo: rows.filter((r) => r.source === "espo").length,
      aggerOnly: rows.filter((r) => r.source === "agger_only").length,
      oppsFetched: opps.length,
      policiesLoaded: policies.length,
    },
    rows,
  };
}
