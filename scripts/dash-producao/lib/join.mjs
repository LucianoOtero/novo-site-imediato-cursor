/**
 * Elegibilidade Opp no mês + join Opp ↔ policies.
 */
import {
  classifyNegocioCorretora,
  daysBetween,
  monthKeyFromDate,
  normDoc,
  segMatch,
  toDateOnly,
} from "./normalize.mjs";

/**
 * Opp entra no mês M se stage===Vendido e cDataDeEmisso ∈ M.
 */
export function eligibleOpp(opp, month /* YYYY-MM */) {
  if (!opp || String(opp.stage) !== "Vendido") return false;
  const em = toDateOnly(opp.cDataDeEmisso);
  if (!em) return false;
  return monthKeyFromDate(em) === month;
}

function policyDate(p) {
  return toDateOnly(p.data_emissao) || toDateOnly(p.vigencia_inicio);
}

function filterCandidates(opp, policies, { windowDays, dateField, requireSeg }) {
  const doc = normDoc(opp.cCpftext ?? opp.docDigits);
  if (!doc) return { doc, list: [] };
  const oppDate = toDateOnly(opp[dateField] ?? opp.cDataDeEmisso);
  const list = [];
  for (const p of policies) {
    if (normDoc(p.cliente_doc) !== doc) continue;
    if (requireSeg && !segMatch(opp.cSeguradora, p.seguradora)) continue;
    const pd = policyDate(p);
    const delta = daysBetween(oppDate, pd);
    if (delta == null || Math.abs(delta) > windowDays) continue;
    list.push(p);
  }
  return { doc, list };
}

/**
 * @returns {{ kind: 'one'|'none'|'multi', matches: object[], via: string, doc: string }}
 */
export function joinOppPolicy(opp, policies, opts = {}) {
  const windowDays = opts.windowDays ?? 7;
  const requireSeg = opts.requireSeg !== false;
  const primary = filterCandidates(opp, policies, {
    windowDays,
    dateField: "cDataDeEmisso",
    requireSeg,
  });
  if (!primary.doc) {
    return { kind: "none", matches: [], via: "noDoc", doc: "" };
  }
  if (primary.list.length === 1) {
    return { kind: "one", matches: primary.list, via: "cDataDeEmisso", doc: primary.doc };
  }
  if (primary.list.length > 1) {
    return { kind: "multi", matches: primary.list, via: "cDataDeEmisso", doc: primary.doc };
  }

  const vig = toDateOnly(opp.cInicioVigncia);
  const em = toDateOnly(opp.cDataDeEmisso);
  if (vig && vig !== em) {
    const secondary = filterCandidates(opp, policies, {
      windowDays,
      dateField: "cInicioVigncia",
      requireSeg,
    });
    if (secondary.list.length === 1) {
      return { kind: "one", matches: secondary.list, via: "cInicioVigncia", doc: secondary.doc };
    }
    if (secondary.list.length > 1) {
      return { kind: "multi", matches: secondary.list, via: "cInicioVigncia", doc: secondary.doc };
    }
  }
  return { kind: "none", matches: [], via: "none", doc: primary.doc };
}

/** Extrai rótulo negocio da policy (tipado ou raw). */
export function policyNegocio(p) {
  if (p.negocio_corretora) return classifyNegocioCorretora(p.negocio_corretora);
  const raw = p.raw || {};
  const v =
    raw["NEGÓCIO CORRETORA"] ||
    raw["NEGOCIO CORRETORA"] ||
    raw.negocio_corretora ||
    p.negocio ||
    null;
  return classifyNegocioCorretora(v);
}

/**
 * Policies só-Agger elegíveis: venda_nova, não usadas em join one, mês por data_emissao|vigencia.
 */
export function orphanPolicies(policies, usedPolicyIds, month) {
  const used = new Set(usedPolicyIds || []);
  return (policies || []).filter((p) => {
    if (used.has(p.id) || used.has(p.business_key)) return false;
    if (p.is_active === false) return false; // ainda assim o caller pode incluir inactive com flag
    if (policyNegocio(p) !== "venda_nova") return false;
    const d = policyDate(p);
    return monthKeyFromDate(d) === month;
  });
}
