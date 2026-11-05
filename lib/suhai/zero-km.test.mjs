import assert from "node:assert/strict";
import { test } from "node:test";

import { aceitaZeroKm, anoMinimoZeroKm, mensagemZeroKm } from "./zero-km.ts";

const em2026 = new Date("2026-11-05T12:00:00");

test("0 km vale do ano passado em diante", () => {
  assert.equal(anoMinimoZeroKm(em2026), 2025);
  assert.equal(aceitaZeroKm(2025, em2026), true);
  assert.equal(aceitaZeroKm(2026, em2026), true);
  assert.equal(aceitaZeroKm(2027, em2026), true);
});

test("ano anterior ao limite é recusado, como faz a Suhai", () => {
  assert.equal(aceitaZeroKm(2024, em2026), false);
  assert.equal(aceitaZeroKm(2013, em2026), false);
  assert.equal(aceitaZeroKm(Number.NaN, em2026), false);
});

test("o limite acompanha a virada do ano", () => {
  const em2027 = new Date("2027-01-02T12:00:00");
  assert.equal(aceitaZeroKm(2025, em2027), false);
  assert.equal(aceitaZeroKm(2026, em2027), true);
});

test("a mensagem cita o ano mínimo e orienta a informar a placa", () => {
  const texto = mensagemZeroKm(em2026);
  assert.match(texto, /2025 ou mais novo/);
  assert.match(texto, /informe a placa/);
});
