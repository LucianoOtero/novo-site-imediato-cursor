/**
 * Flags de inconsistência / qualidade por linha consolidada.
 */

export const FLAG = Object.freeze({
  amount0: "amount0",
  noDoc: "noDoc",
  noMatch: "noMatch",
  multiMatch: "multiMatch",
  inactivePolicy: "inactivePolicy",
  vendorMismatch: "vendorMismatch",
  unassigned: "unassigned",
  currencyNonBRL: "currencyNonBRL",
  amountCommissionGap: "amountCommissionGap",
});

/**
 * @param {object} row linha já montada (produzido/emitido/match/…)
 * @returns {string[]}
 */
export function inconsistencyFlags(row) {
  const flags = [];
  if (!row) return flags;

  if (row.source === "espo") {
    const amount = Number(row.produzido);
    if (!Number.isFinite(amount) || amount === 0) flags.push(FLAG.amount0);

    const cur = row.amountCurrency || row.currency || "BRL";
    if (String(cur).toUpperCase() !== "BRL") flags.push(FLAG.currencyNonBRL);

    if (!row.vendorId && !row.vendorName) flags.push(FLAG.unassigned);

    if (row.matchKind === "none" && row.matchVia === "noDoc") flags.push(FLAG.noDoc);
    else if (row.matchKind === "none") flags.push(FLAG.noMatch);
    if (row.matchKind === "multi") flags.push(FLAG.multiMatch);

    if (row.policy && row.policy.is_active === false) flags.push(FLAG.inactivePolicy);

    if (
      row.matchKind === "one" &&
      row.vendorName &&
      row.policy?.vendedor &&
      normName(row.vendorName) !== normName(row.policy.vendedor)
    ) {
      flags.push(FLAG.vendorMismatch);
    }

    if (row.matchKind === "one") {
      const am = Number(row.produzido);
      const cv = Number(row.emitido);
      if (Number.isFinite(am) && am !== 0 && Number.isFinite(cv)) {
        if (Math.abs(cv - am) / Math.abs(am) > 0.1) flags.push(FLAG.amountCommissionGap);
      }
    }
  }

  if (row.source === "agger_only") {
    if (row.policy && row.policy.is_active === false) flags.push(FLAG.inactivePolicy);
    if (!row.vendorName) flags.push(FLAG.unassigned);
  }

  return flags;
}

function normName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
