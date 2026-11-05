/**
 * lib/suhai/parcelas.ts — parcelamento e fator FIPE das ofertas Suhai.
 *
 * A Suhai devolve, por cobertura, a tabela de parcelas com juros e IOF: a
 * parcela de 12x não é o à vista dividido por 12. Todo texto de preço
 * (tela, proposta) sai daqui, a partir dessa tabela, para que o valor
 * mostrado seja o que o cliente vai pagar.
 *
 * Registros antigos não têm a tabela; só o à vista (`premioTotal`) e a maior
 * parcela (`premioMensalEstimado`). Sem a tabela, uma quantidade intermediária
 * fica sem valor — nunca é estimada por divisão.
 */

export type ParcelaOferta = {
  quantidade: number;
  valorParcela: number;
  /** Total pago no parcelamento, como a Suhai informa; pode faltar. */
  valorTotal: number | null;
};

export type OfertaComParcelas = {
  premioTotal: number;
  premioMensalEstimado: number;
  parcelamentoMaximo: number;
  parcelas?: ParcelaOferta[] | null;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numeroBR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

export function parcelaPara(oferta: OfertaComParcelas, quantidade: number): ParcelaOferta | null {
  const daTabela = oferta.parcelas?.find((parcela) => parcela.quantidade === quantidade);
  if (daTabela) return daTabela;
  if (quantidade === 1 && oferta.premioTotal > 0) {
    return { quantidade: 1, valorParcela: oferta.premioTotal, valorTotal: oferta.premioTotal };
  }
  if (quantidade > 1 && quantidade === oferta.parcelamentoMaximo && oferta.premioMensalEstimado > 0) {
    return { quantidade, valorParcela: oferta.premioMensalEstimado, valorTotal: null };
  }
  return null;
}

/** Quantidades oferecidas no seletor: as da tabela ou, sem ela, 1 até o máximo. */
export function quantidadesDisponiveis(oferta: OfertaComParcelas): number[] {
  const daTabela = (oferta.parcelas ?? []).map((parcela) => parcela.quantidade).filter((n) => n >= 1);
  if (daTabela.length > 0) return [...new Set(daTabela)].sort((a, b) => a - b);
  const maximo = Math.max(1, Math.floor(oferta.parcelamentoMaximo || 1));
  return Array.from({ length: maximo }, (_, indice) => indice + 1);
}

/** "R$ 2.556,34 à vista ou 12x de R$ 261,91" */
export function textoPrecoOferta(oferta: OfertaComParcelas): string {
  const aVista = `${moeda.format(oferta.premioTotal)} à vista`;
  const maxima = parcelaPara(oferta, oferta.parcelamentoMaximo);
  if (!maxima || maxima.quantidade <= 1) return aVista;
  return `${aVista} ou ${maxima.quantidade}x de ${moeda.format(maxima.valorParcela)}`;
}

/** "à vista, R$ 2.556,34" · "12x de R$ 261,91 (total R$ 3.142,92)" · "5x" (sem valor conhecido) */
export function textoParcelamento(oferta: OfertaComParcelas, quantidade: number): string {
  const parcela = parcelaPara(oferta, quantidade);
  if (quantidade === 1) return parcela ? `à vista, ${moeda.format(parcela.valorParcela)}` : "à vista";
  if (!parcela) return `${quantidade}x`;
  const total = parcela.valorTotal ? ` (total ${moeda.format(parcela.valorTotal)})` : "";
  return `${quantidade}x de ${moeda.format(parcela.valorParcela)}${total}`;
}

/**
 * Percentual da FIPE indenizado. A Suhai informa o fator em percentual
 * ("100", "70"); valor até 1 é tratado como fração (0,7 → 70).
 */
export function percentualFipe(fator: number | null | undefined): number | null {
  if (typeof fator !== "number" || !Number.isFinite(fator) || fator <= 0) return null;
  const percentual = fator <= 1 ? fator * 100 : fator;
  return Math.round(percentual * 10) / 10;
}

/** Fator a partir dos dois valores, quando a Suhai não manda o fator. */
export function percentualFipePorValores(
  valorTabela: number | null | undefined,
  valorComFator: number | null | undefined,
): number | null {
  if (!valorTabela || !valorComFator || valorTabela <= 0) return null;
  return percentualFipe((valorComFator / valorTabela) * 100);
}

/** "70% da FIPE (R$ 44.339,40)" · "100% da FIPE (R$ 40.222,00)" */
export function textoFipe(percentual: number | null, valorIndenizacao: number | null): string | null {
  if (percentual === null && !valorIndenizacao) return null;
  const parte = percentual === null ? "Valor de indenização" : `${numeroBR.format(percentual)}% da FIPE`;
  return valorIndenizacao ? `${parte} (${moeda.format(valorIndenizacao)})` : parte;
}
