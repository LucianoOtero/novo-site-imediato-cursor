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
  numero_apolice?: string | null;
  numero_proposta?: string | null;
  ramo?: string | null;
};

/** Linha do motor (`buildMonthRows`), com a apólice Agger casada quando houver. */
export type ProductionRow = {
  source: string;
  oppId?: string | null;
  oppName?: string | null;
  vendorId?: string | null;
  vendorName?: string | null;
  emissionDate?: string | null;
  produzido: number;
  emitido: number;
  seguradora?: string | null;
  matchKind?: string;
  matchVia?: string;
  flags?: string[];
  policy?: AggerPolicy | null;
  policyIds?: string[];
};

export type LineFilters = {
  vendorKey?: string;
  vendor?: string;
  flag?: string;
  source?: string;
  day?: string;
  q?: string;
};

const UNASSIGNED = "Não atribuído";

export function espoOppUrl(oppId: string | null | undefined): string | null {
  if (!oppId) return null;
  return `${process.env.ESPO_BASE_URL || "https://flyingdonkeys.com.br"}/#Opportunity/view/${oppId}`;
}

/** Linha do analítico e do export (colunas do plano, seção 1.7). */
export function toLine(r: ProductionRow) {
  return {
    source: r.source,
    oppId: r.oppId ?? null,
    oppName: r.oppName ?? null,
    vendorKey: vendorKey(r) as string,
    vendorId: r.vendorId ?? null,
    vendorName: r.vendorName || UNASSIGNED,
    emissionDate: r.emissionDate ?? null,
    produzido: r.produzido,
    emitido: r.emitido,
    seguradora: r.seguradora ?? r.policy?.seguradora ?? null,
    ramo: r.policy?.ramo ?? null,
    numeroApolice: r.policy?.numero_apolice ?? null,
    numeroProposta: r.policy?.numero_proposta ?? null,
    vendedorAgger: r.policy?.vendedor ?? null,
    matchKind: r.matchKind ?? null,
    matchVia: r.matchVia ?? null,
    flags: r.flags || [],
    espoUrl: espoOppUrl(r.oppId),
  };
}

export type Line = ReturnType<typeof toLine>;

function sem(s: string | null | undefined): string {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterLines(lines: Line[], f: LineFilters): Line[] {
  const q = sem(f.q).trim();
  const vendor = sem(f.vendor);
  return lines.filter(
    (l) =>
      (!f.vendorKey || l.vendorKey === f.vendorKey) &&
      (!vendor || sem(l.vendorName).includes(vendor) || l.vendorId === f.vendor) &&
      (!f.flag || (f.flag === "__any" ? l.flags.length > 0 : l.flags.includes(f.flag))) &&
      (!f.source || l.source === f.source) &&
      (!f.day || l.emissionDate === f.day) &&
      (!q ||
        [l.oppName, l.oppId, l.numeroApolice, l.numeroProposta, l.seguradora, l.ramo].some((v) =>
          sem(v).includes(q),
        )),
  );
}

export function lineFiltersFrom(params: URLSearchParams): LineFilters {
  const day = params.get("day") || "";
  return {
    vendorKey: params.get("vendorKey") || "",
    vendor: params.get("vendor") || "",
    flag: params.get("flag") || "",
    source: params.get("source") || "",
    day: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "",
    q: (params.get("q") || "").slice(0, 80),
  };
}

export function sumLines(lines: Line[]) {
  return {
    linhas: lines.length,
    produzido: lines.reduce((a, l) => a + (Number(l.produzido) || 0), 0),
    emitido: lines.reduce((a, l) => a + (Number(l.emitido) || 0), 0),
  };
}

/** Opções dos filtros a partir do mês inteiro (não do recorte). */
export function lineFacets(lines: Line[]) {
  const vendors = new Map<string, string>();
  const flags: Record<string, number> = {};
  const days: Record<string, number> = {};
  for (const l of lines) {
    vendors.set(l.vendorKey, l.vendorName);
    for (const f of l.flags) flags[f] = (flags[f] || 0) + 1;
    if (l.emissionDate) days[l.emissionDate] = (days[l.emissionDate] || 0) + 1;
  }
  return {
    vendors: [...vendors.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    flags,
    days: Object.entries(days)
      .map(([day, linhas]) => ({ day, linhas }))
      .sort((a, b) => b.day.localeCompare(a.day)),
  };
}

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
           comissao_valor, vendedor, is_active, raw,
           numero_apolice, numero_proposta, ramo
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

/**
 * `history: false` pula os 3 meses anteriores (só servem à média 3m por
 * vendedor): o analítico e as inconsistências não consultam o Espo 4 vezes.
 */
export async function computeProduction(month: string, opts: { history?: boolean } = {}) {
  const withHistory = opts.history !== false;
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
  const histMonths = withHistory ? prevMonths(month, 3) : [];
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

  rows.sort(
    (a, b) =>
      String(b.emissionDate || "").localeCompare(String(a.emissionDate || "")) ||
      String(a.vendorName || "").localeCompare(String(b.vendorName || ""), "pt-BR"),
  );

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
    withHistory,
    counts: {
      lines: rows.length,
      espo: rows.filter((r) => r.source === "espo").length,
      aggerOnly: rows.filter((r) => r.source === "agger_only").length,
      oppsFetched: opps.length,
      policiesLoaded: policies.length,
    },
    rows: rows as unknown as ProductionRow[],
  };
}
