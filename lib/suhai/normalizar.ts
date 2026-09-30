/**
 * lib/suhai/normalizar.ts — converte a cotação bruta do gateway no formato
 * que a tela de ofertas consome.
 *
 * O gateway devolve as coberturas como a Suhai as envia: código, nome e
 * tabela de parcelamento. A tradução para os três planos do site acontece
 * aqui, usando `lib/suhai/planos.ts`, para que a regra de produto fique num
 * lugar só e o gateway permaneça um transporte fiel.
 */

import { classificarCobertura } from "./planos";
import type { CotacaoPayload, CotacaoResultado, Oferta } from "./types";

export type ParcelaBruta = {
  quantidade: number;
  valorTotal: number | null;
  valorParcela: number | null;
  juros: number | null;
  iof: number | null;
  percentualJuros: number | null;
};

export type CoberturaBruta = {
  id: number;
  nome: string;
  premioLiquido: number | null;
  parcelas: ParcelaBruta[];
};

export type CotacaoBruta = {
  protocolo: string;
  codMsgRet: string;
  textoMsgRet: string;
  veiculo: {
    valorFipe: number | null;
    fatorFipe: number | null;
    valorFipeComFator: number | null;
    importanciaSegurada: number | null;
  };
  franquia: { plano: string | null; valor: number | null } | null;
  coberturas: CoberturaBruta[];
};

function maiorParcelamento(parcelas: ParcelaBruta[]): ParcelaBruta | null {
  return parcelas.reduce<ParcelaBruta | null>(
    (maior, atual) => (!maior || atual.quantidade > maior.quantidade ? atual : maior),
    null,
  );
}

export function normalizarCotacao(bruta: CotacaoBruta, payload: CotacaoPayload): CotacaoResultado {
  const ofertas: Oferta[] = [];

  for (const cobertura of bruta.coberturas) {
    const classificacao = classificarCobertura(cobertura.id);
    // A Suhai devolve combos que o site não oferece (RCF puro, compreensiva,
    // roubo+RCF sem perda total). Ficam de fora da tela, não são erro.
    if (!classificacao) continue;

    const aVista = cobertura.parcelas.find((parcela) => parcela.quantidade === 1);
    const parcelado = maiorParcelamento(cobertura.parcelas);

    const premioTotal = aVista?.valorTotal ?? cobertura.premioLiquido ?? 0;
    const premioMensalEstimado =
      parcelado?.valorParcela ?? (parcelado?.quantidade ? premioTotal / parcelado.quantidade : premioTotal);

    ofertas.push({
      cdCobertura: cobertura.id,
      planoId: classificacao.plano.id,
      assistencia: classificacao.assistencia,
      premioTotal,
      premioMensalEstimado,
      importanciaSegurada: bruta.veiculo.importanciaSegurada,
      // A franquia só se aplica aos planos com perda total; o Essencial
      // (roubo e furto) é indenização integral.
      franquia: classificacao.plano.id === "essencial" ? null : (bruta.franquia?.valor ?? null),
      parcelamentoMaximo: parcelado?.quantidade ?? 1,
    });
  }

  return {
    protocolo: bruta.protocolo,
    ofertas,
    veiculo: {
      marca: payload.veiculo.marca,
      modelo: payload.veiculo.modelo,
      anoModelo: payload.veiculo.anoModelo,
      valorFipe: bruta.veiculo.valorFipeComFator ?? bruta.veiculo.valorFipe,
    },
    simulado: false,
    geradoEm: new Date().toISOString(),
  };
}
