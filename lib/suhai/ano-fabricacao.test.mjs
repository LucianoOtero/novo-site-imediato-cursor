import assert from "node:assert/strict";
import { test } from "node:test";

import { anoFabricacaoPara, anoFabricacaoValido } from "./ano-fabricacao.ts";

const em2026 = new Date("2026-11-05T12:00:00");

test("0 km do ano seguinte sem fabricação vai com o ano corrente", () => {
  assert.equal(anoFabricacaoPara(2027, undefined, em2026), 2026);
  assert.equal(anoFabricacaoPara(2027, "", em2026), 2026);
  assert.equal(anoFabricacaoPara(2027, null, em2026), 2026);
});

test("fabricação igual ao ano-modelo seguinte é recusada pela Suhai e corrigida", () => {
  assert.equal(anoFabricacaoValido(2027, 2027, em2026), false);
  assert.equal(anoFabricacaoPara(2027, 2027, em2026), 2026);
});

test("fabricação válida da placa é mantida", () => {
  assert.equal(anoFabricacaoPara(2027, 2026, em2026), 2026);
  assert.equal(anoFabricacaoPara(2020, "2019", em2026), 2019);
  assert.equal(anoFabricacaoPara(2020, 2020, em2026), 2020);
});

test("fabricação de outro veículo (placa anterior) é substituída pelo ano-modelo", () => {
  assert.equal(anoFabricacaoPara(2026, 2015, em2026), 2026);
  assert.equal(anoFabricacaoPara(2018, 2019, em2026), 2018);
  assert.equal(anoFabricacaoPara(2018, Number.NaN, em2026), 2018);
});

test("na virada do ano o limite acompanha", () => {
  const em2027 = new Date("2027-01-02T12:00:00");
  assert.equal(anoFabricacaoPara(2027, undefined, em2027), 2027);
  assert.equal(anoFabricacaoPara(2028, undefined, em2027), 2027);
});
