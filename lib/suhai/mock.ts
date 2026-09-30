/**
 * lib/suhai/mock.ts — gerador de cotação simulada.
 *
 * Enquanto a Suhai não libera as credenciais de homologação, o fluxo precisa
 * de respostas plausíveis para que a UI, o parser de ofertas e os testes
 * sejam desenvolvidos. Os preços são determinísticos: a mesma entrada produz
 * sempre a mesma cotação, o que permite asserções estáveis.
 *
 * Isto não estima preço real e não deve ser exibido ao público: a rota só
 * usa o mock quando o gateway não está configurado, e o resultado carrega
 * `simulado: true` para a UI sinalizar.
 */

import { PLANOS } from "./planos";
import type { CotacaoPayload, CotacaoResultado, Oferta } from "./types";

function hash(texto: string): number {
  let acumulado = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    acumulado ^= texto.charCodeAt(i);
    acumulado = Math.imul(acumulado, 16777619);
  }
  return Math.abs(acumulado);
}

/** Valor de referência do veículo, derivado do ano e de um ruído estável. */
function valorReferencia(payload: CotacaoPayload): number {
  const semente = hash(`${payload.veiculo.marca}|${payload.veiculo.modelo}`);
  const base = 35000 + (semente % 60000);
  const idade = Math.max(0, new Date().getFullYear() - payload.veiculo.anoModelo);
  const depreciado = base * Math.pow(0.92, idade);
  return Math.round(depreciado / 100) * 100;
}

const FATOR_PLANO: Record<string, number> = {
  essencial: 1,
  completo: 1.38,
  completo_terceiros: 1.62,
};

const ADICIONAL_ASSISTENCIA: Record<number, number> = { 0: 0, 1: 96, 2: 168 };

export function gerarCotacaoSimulada(payload: CotacaoPayload): CotacaoResultado {
  const fipe = valorReferencia(payload);
  const semente = hash(`${payload.veiculo.placa ?? ""}|${payload.uso.cepPernoite}|${payload.proponente.cpf}`);

  // Taxa base entre 3,2% e 5,6% do valor de referência ao ano.
  const taxaBase = 0.032 + (semente % 240) / 10000;
  const agravoUso = payload.uso.utilizacao === "particular" ? 1 : 1.24;
  const agravoGaragem = payload.uso.garagem.residencia ? 1 : 1.12;

  const ofertas: Oferta[] = [];
  for (const plano of PLANOS) {
    for (const assistencia of [0, 1, 2] as const) {
      const codigo = plano.codigos[assistencia][0];
      const premio =
        fipe * taxaBase * FATOR_PLANO[plano.id] * agravoUso * agravoGaragem + ADICIONAL_ASSISTENCIA[assistencia];
      const premioTotal = Math.round(premio * 100) / 100;

      ofertas.push({
        cdCobertura: codigo,
        planoId: plano.id,
        assistencia,
        premioTotal,
        premioMensalEstimado: Math.round((premioTotal / 12) * 100) / 100,
        importanciaSegurada: plano.id === "essencial" ? fipe : Math.round(fipe * 1.0),
        franquia: plano.id === "essencial" ? null : Math.round((fipe * 0.05) / 10) * 10,
        parcelamentoMaximo: 12,
      });
    }
  }

  return {
    protocolo: `SIM-${semente.toString(36).toUpperCase().slice(0, 8)}`,
    ofertas,
    veiculo: {
      marca: payload.veiculo.marca,
      modelo: payload.veiculo.modelo,
      anoModelo: payload.veiculo.anoModelo,
      valorFipe: fipe,
    },
    simulado: true,
    geradoEm: new Date().toISOString(),
  };
}
