/**
 * Montagem de linhas + consolidação por vendedor + totais da casa.
 */
import { businessDays, project } from "./calendar.mjs";
import { inconsistencyFlags } from "./flags.mjs";
import { eligibleOpp, joinOppPolicy, orphanPolicies, policyNegocio } from "./join.mjs";
import { toDateOnly } from "./normalize.mjs";

const UNASSIGNED = "Não atribuído";

/**
 * Constrói linhas do mês a partir de Opps + policies.
 */
export function buildMonthRows({
  opps = [],
  policies = [],
  month,
  joinOpts = {},
  includeInactiveOrphans = false,
} = {}) {
  const eligible = (opps || []).filter((o) => eligibleOpp(o, month));
  const rows = [];
  const usedPolicyIds = new Set();

  for (const opp of eligible) {
    const join = joinOppPolicy(opp, policies, joinOpts);
    let emitido = 0;
    let policy = null;
    if (join.kind === "one") {
      policy = join.matches[0];
      emitido = Number(policy.comissao_valor) || 0;
      if (policy.id) usedPolicyIds.add(policy.id);
      if (policy.business_key) usedPolicyIds.add(policy.business_key);
    }
    const produzido = Number(opp.amount);
    const row = {
      source: "espo",
      oppId: opp.id,
      oppName: opp.name || null,
      vendorId: opp.assignedUserId || null,
      vendorName: opp.assignedUserName || null,
      emissionDate: toDateOnly(opp.cDataDeEmisso),
      produzido: Number.isFinite(produzido) ? produzido : 0,
      emitido: join.kind === "one" ? emitido : 0,
      amountCurrency: opp.amountCurrency || "BRL",
      seguradora: opp.cSeguradora || null,
      matchKind: join.kind,
      matchVia: join.via,
      policy,
      policyIds: join.matches.map((p) => p.id).filter(Boolean),
    };
    row.flags = inconsistencyFlags(row);
    rows.push(row);
  }

  let orphans = orphanPolicies(policies, usedPolicyIds, month);
  if (includeInactiveOrphans) {
    // orphanPolicies already filters is_active!==false; inactive orphans out of MVP escopo
  }
  for (const p of orphans) {
    if (policyNegocio(p) !== "venda_nova") continue;
    const row = {
      source: "agger_only",
      oppId: null,
      oppName: p.cliente_nome || null,
      vendorId: null,
      vendorName: p.vendedor || null,
      emissionDate: toDateOnly(p.data_emissao) || toDateOnly(p.vigencia_inicio),
      produzido: 0,
      emitido: Number(p.comissao_valor) || 0,
      amountCurrency: "BRL",
      seguradora: p.seguradora || null,
      matchKind: "agger_only",
      matchVia: "orphan",
      policy: p,
      policyIds: p.id ? [p.id] : [],
    };
    row.flags = inconsistencyFlags(row);
    rows.push(row);
  }

  return rows;
}

export function vendorKey(row) {
  if (row.vendorId) return `id:${row.vendorId}`;
  if (row.vendorName) return `name:${row.vendorName}`;
  return "unassigned";
}

export function vendorLabel(row) {
  return row.vendorName || UNASSIGNED;
}

/**
 * Média do produzido Espo nos 3 meses calendário anteriores (por vendorKey).
 * `historyByMonth`: { 'YYYY-MM': Row[] } já filtrados/elegíveis.
 */
export function avgLast3Months(vendorIdKey, historyByMonth, metric = "produzido") {
  const months = Object.keys(historyByMonth || {}).sort();
  if (months.length < 1) return null;
  // caller passa só os 3 meses anteriores; somamos todos
  let sum = 0;
  let n = 0;
  for (const m of months) {
    const rows = historyByMonth[m] || [];
    const mine = rows.filter((r) => vendorKey(r) === vendorIdKey && r.source === "espo");
    if (!mine.length) {
      n++;
      continue;
    }
    sum += mine.reduce((a, r) => a + (Number(r[metric]) || 0), 0);
    n++;
  }
  return n ? sum / n : null;
}

/**
 * Consolida por vendedor + projeções.
 * @param {object[]} rows
 * @param {{ month: string, asOf: string, calendar?: object, avg3m?: Map<string,number> }} ctx
 */
export function consolidateByVendor(rows, ctx) {
  const { month, asOf, calendar = {}, avg3m = new Map() } = ctx;
  const daysMonth = businessDays(month, null, calendar);
  const daysElapsed = businessDays(month, asOf, calendar);
  const by = new Map();

  for (const row of rows) {
    const k = vendorKey(row);
    if (!by.has(k)) {
      by.set(k, {
        vendorKey: k,
        vendorId: row.vendorId || null,
        vendorName: vendorLabel(row),
        produzido: 0,
        emitido: 0,
        lines: 0,
        flagCounts: {},
      });
    }
    const g = by.get(k);
    g.produzido += Number(row.produzido) || 0;
    g.emitido += Number(row.emitido) || 0;
    g.lines += 1;
    for (const f of row.flags || []) {
      g.flagCounts[f] = (g.flagCounts[f] || 0) + 1;
    }
  }

  const list = [...by.values()].map((g) => {
    const projetadoProduzido = project(g.produzido, daysElapsed, daysMonth);
    const projetadoEmitido = project(g.emitido, daysElapsed, daysMonth);
    return {
      ...g,
      projetadoProduzido,
      projetadoEmitido,
      media3mProduzido: avg3m.has(g.vendorKey) ? avg3m.get(g.vendorKey) : null,
      flagTotal: Object.values(g.flagCounts).reduce((a, b) => a + b, 0),
    };
  });

  list.sort((a, b) => b.produzido - a.produzido);
  return { vendors: list, daysMonth, daysElapsed };
}

/**
 * Totais da casa: (a) soma projeções vendedor (b) projeção sobre total.
 */
export function houseTotals(rows, consolidated) {
  const produzido = rows.reduce((a, r) => a + (Number(r.produzido) || 0), 0);
  const emitido = rows.reduce((a, r) => a + (Number(r.emitido) || 0), 0);
  const sumProjProd = consolidated.vendors.reduce((a, v) => a + v.projetadoProduzido, 0);
  const sumProjEm = consolidated.vendors.reduce((a, v) => a + v.projetadoEmitido, 0);
  const houseProjProd = project(produzido, consolidated.daysElapsed, consolidated.daysMonth);
  const houseProjEm = project(emitido, consolidated.daysElapsed, consolidated.daysMonth);
  return {
    produzido,
    emitido,
    projetadoProduzidoSomaVendedores: sumProjProd,
    projetadoEmitidoSomaVendedores: sumProjEm,
    projetadoProduzidoCasa: houseProjProd,
    projetadoEmitidoCasa: houseProjEm,
    lines: rows.length,
    flagLines: rows.filter((r) => (r.flags || []).length > 0).length,
  };
}
