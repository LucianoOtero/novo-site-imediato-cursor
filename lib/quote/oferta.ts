/**
 * lib/quote/oferta.ts — modelo de exibição comum às ofertas de seguro.
 *
 * A Suhai (`/cotacao-suhai`) devolve números e planos nomeados; o RPA
 * devolve os planos "recomendado" e "alternativo" com valores em texto.
 * Os dois viram `OfertaExibicao` e são renderizados pelo mesmo
 * `components/quote/OfertaCard.tsx`.
 */

import type { RpaPlano } from "@/lib/rpa-calculation";
import type { DefinicaoPlano } from "@/lib/suhai/planos";
import type { Oferta } from "@/lib/suhai/types";

export type SeloOferta = "mais_escolhido" | "recomendado";

export type CoberturaOferta = {
  texto: string;
  /** `informativa` sai em cinza (ex.: franquia), fora da lista de coberturas incluídas. */
  tom: "incluida" | "informativa";
};

export type OfertaExibicao = {
  id: string;
  seguradora?: string;
  nome: string;
  resumo?: string;
  selo?: SeloOferta;
  /** Borda com anel e botão principal. */
  destaque: boolean;
  /** `prefixo` ("R$") sai menor ao lado do numeral; sem prefixo, `valor` já vem formatado. */
  preco: { prefixo: string | null; valor: string; sufixo?: string } | null;
  legenda?: string;
  /** Gancho comercial de pagamento (ex.: "4x sem juros!"). */
  faixaPagamento?: string;
  detalhes: { rotulo: string; valor: string }[];
  coberturas: CoberturaOferta[];
};

export const ROTULO_SELO: Record<SeloOferta, string> = {
  mais_escolhido: "Mais escolhido",
  recomendado: "Recomendado",
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Separa o prefixo monetário do número ("R$2.360,18" → ["R$", "2.360,18"])
 * para exibir o "R$" menor ao lado do numeral grande. O RPA envia com e
 * sem espaço após "R$" — normalizado aqui, só para exibição.
 */
export function splitCurrency(valor: string): { prefix: string | null; amount: string } {
  const match = valor.match(/^\s*(R\$)\s*(.+)$/);
  if (match) return { prefix: match[1], amount: match[2] };
  return { prefix: null, amount: valor };
}

export function fromSuhaiOferta(plano: DefinicaoPlano, oferta: Oferta): OfertaExibicao {
  const coberturas: CoberturaOferta[] = plano.coberturas.map((texto) => ({ texto, tom: "incluida" }));
  if (oferta.franquia !== null) {
    coberturas.push({ texto: `Franquia de ${moeda.format(oferta.franquia)}`, tom: "informativa" });
  }

  return {
    id: `suhai-${plano.id}-${oferta.assistencia}`,
    nome: plano.nome,
    resumo: plano.resumo,
    selo: plano.destaque ? "mais_escolhido" : undefined,
    destaque: Boolean(plano.destaque),
    preco: { prefixo: null, valor: moeda.format(oferta.premioMensalEstimado), sufixo: "/mês" },
    legenda: `${moeda.format(oferta.premioTotal)} no ano · até ${oferta.parcelamentoMaximo}x`,
    detalhes: [],
    coberturas,
  };
}

const DETALHES_RPA: { key: keyof RpaPlano; rotulo: string }[] = [
  { key: "valorMercado", rotulo: "Valor de mercado" },
  { key: "valorFranquia", rotulo: "Franquia" },
  { key: "tipoFranquia", rotulo: "Tipo de franquia" },
  { key: "danosMateriais", rotulo: "Danos materiais" },
  { key: "danosCorporais", rotulo: "Danos corporais" },
  { key: "danosMorais", rotulo: "Danos morais" },
  { key: "morteInvalidez", rotulo: "Morte e invalidez" },
];

const COBERTURAS_RPA: { key: keyof RpaPlano; texto: string }[] = [
  { key: "assistencia", texto: "Assistência 24h" },
  { key: "vidros", texto: "Vidros" },
  { key: "carroReserva", texto: "Carro reserva" },
];

/** O RPA preenche com "N/A" os campos de um plano que a seguradora não cotou. */
const SEM_VALOR_RPA = /^(n\/?a|n\/?d|-+)$/i;

function texto(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpo = valor.trim();
  return limpo && !SEM_VALOR_RPA.test(limpo) ? limpo : undefined;
}

/** Plano com preço de verdade — sem isso o cartão não aparece nem conta como opção. */
export function rpaPlanoTemPreco(plano: RpaPlano | undefined): plano is RpaPlano {
  return /\d/.test(texto(plano?.valor) ?? "");
}

export function fromRpaPlano(variant: "recomendado" | "alternativo", plano: RpaPlano): OfertaExibicao {
  const recomendado = variant === "recomendado";
  const valor = texto(plano.valor);
  const preco = valor ? splitCurrency(valor) : null;
  const parcelamento = texto(plano.parcelamento);
  // O RPA costuma mandar só "anual" — vira sufixo do preço, como o "/mês" da Suhai.
  const anual = parcelamento?.toLowerCase() === "anual";

  return {
    id: `rpa-${variant}`,
    nome: recomendado ? "Plano recomendado" : "Plano alternativo",
    selo: recomendado ? "recomendado" : undefined,
    destaque: recomendado,
    preco: preco ? { prefixo: preco.prefix, valor: preco.amount, sufixo: anual ? "/ano" : undefined } : null,
    legenda: anual ? undefined : parcelamento,
    faixaPagamento: texto(plano.formaPagamento),
    detalhes: DETALHES_RPA.flatMap(({ key, rotulo }) => {
      const valorDetalhe = texto(plano[key]);
      return valorDetalhe ? [{ rotulo, valor: valorDetalhe }] : [];
    }),
    coberturas: COBERTURAS_RPA.filter(({ key }) => plano[key] === true).map(({ texto: rotulo }) => ({
      texto: rotulo,
      tom: "incluida" as const,
    })),
  };
}
