import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parcelaPara,
  percentualFipe,
  percentualFipePorValores,
  quantidadesDisponiveis,
  textoFipe,
  textoParcelamento,
  textoPrecoOferta,
} from "./parcelas.ts";

const semNbsp = (texto) => texto?.replace(/\u00a0/g, " ");

// Plano Completo da cotação 228592368 (caso da proposta 12490227).
const completo = {
  premioTotal: 2556.34,
  premioMensalEstimado: 261.91,
  parcelamentoMaximo: 12,
  parcelas: [
    { quantidade: 1, valorParcela: 2556.34, valorTotal: 2556.34 },
    { quantidade: 6, valorParcela: 470.12, valorTotal: 2820.72 },
    { quantidade: 12, valorParcela: 261.91, valorTotal: 3142.92 },
  ],
};

const antigo = { premioTotal: 2556.34, premioMensalEstimado: 261.91, parcelamentoMaximo: 12 };

test("parcela vem da tabela da Suhai, não do à vista dividido", () => {
  assert.equal(parcelaPara(completo, 12).valorParcela, 261.91);
  assert.notEqual(parcelaPara(completo, 12).valorParcela, Math.round((2556.34 / 12) * 100) / 100);
  assert.equal(parcelaPara(completo, 6).valorTotal, 2820.72);
});

test("registro antigo: só à vista e a parcela máxima; intermediária fica sem valor", () => {
  assert.equal(parcelaPara(antigo, 1).valorParcela, 2556.34);
  assert.equal(parcelaPara(antigo, 12).valorParcela, 261.91);
  assert.equal(parcelaPara(antigo, 12).valorTotal, null);
  assert.equal(parcelaPara(antigo, 10), null);
  assert.equal(semNbsp(textoParcelamento(antigo, 10)), "10x");
});

test("quantidades do seletor seguem a tabela ou o máximo", () => {
  assert.deepEqual(quantidadesDisponiveis(completo), [1, 6, 12]);
  assert.deepEqual(quantidadesDisponiveis({ ...antigo, parcelamentoMaximo: 4 }), [1, 2, 3, 4]);
});

test("textos de preço e parcelamento", () => {
  assert.equal(semNbsp(textoPrecoOferta(completo)), "R$ 2.556,34 à vista ou 12x de R$ 261,91");
  assert.equal(semNbsp(textoPrecoOferta({ ...antigo, parcelamentoMaximo: 1 })), "R$ 2.556,34 à vista");
  assert.equal(semNbsp(textoParcelamento(completo, 12)), "12x de R$ 261,91 (total R$ 3.142,92)");
  assert.equal(semNbsp(textoParcelamento(completo, 1)), "à vista, R$ 2.556,34");
  assert.equal(semNbsp(textoParcelamento(antigo, 12)), "12x de R$ 261,91");
});

test("fator FIPE em percentual ou fração", () => {
  assert.equal(percentualFipe(70), 70);
  assert.equal(percentualFipe(100), 100);
  assert.equal(percentualFipe(0.7), 70);
  assert.equal(percentualFipe(null), null);
  assert.equal(percentualFipe(0), null);
  assert.equal(percentualFipePorValores(63342, 44339.4), 70);
  assert.equal(percentualFipePorValores(null, 44339.4), null);
});

test("texto da indenização", () => {
  assert.equal(semNbsp(textoFipe(70, 44339.4)), "70% da FIPE (R$ 44.339,40)");
  assert.equal(semNbsp(textoFipe(null, 44339.4)), "Valor de indenização (R$ 44.339,40)");
  assert.equal(textoFipe(null, null), null);
});
