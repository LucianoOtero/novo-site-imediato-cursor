/** Rótulo e ação esperada por flag de `scripts/dash-producao/lib/flags.mjs`. */
export const FLAG_INFO: Record<string, { label: string; descricao: string }> = {
  noMatch: {
    label: "Sem apólice no Agger",
    descricao: "Opp vendida sem apólice correspondente no Agger (pode ser emissão pendente).",
  },
  noDoc: {
    label: "Sem CPF/CNPJ",
    descricao: "Opp sem CPF/CNPJ no Espo: o cruzamento com o Agger não é possível.",
  },
  multiMatch: {
    label: "Mais de uma apólice",
    descricao: "Mais de uma apólice ativa casou com a Opp: emitido não somado até resolver.",
  },
  amount0: {
    label: "Produzido zerado",
    descricao: "Opp vendida com valor (amount) zero ou vazio no Espo.",
  },
  amountCommissionGap: {
    label: "Produzido ≠ emitido",
    descricao: "Diferença acima de 10% entre o produzido (Espo) e a comissão emitida (Agger).",
  },
  vendorMismatch: {
    label: "Vendedor diferente",
    descricao: "Vendedor da Opp no Espo difere do vendedor da apólice no Agger.",
  },
  unassigned: {
    label: "Sem vendedor",
    descricao: "Linha sem vendedor atribuído (Espo) ou sem vendedor na apólice (Agger).",
  },
  inactivePolicy: {
    label: "Apólice inativa",
    descricao: "Apólice casada não está mais ativa no Agger.",
  },
  currencyNonBRL: {
    label: "Moeda ≠ BRL",
    descricao: "Valor da Opp em moeda diferente de BRL.",
  },
};

export const FLAG_ORDER = Object.keys(FLAG_INFO);

export function flagLabel(flag: string): string {
  return FLAG_INFO[flag]?.label || flag;
}
