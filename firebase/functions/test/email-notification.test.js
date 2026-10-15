const test = require("node:test");
const assert = require("node:assert/strict");

const { buildEmailPayload } = require("../email-notification");

const lead = { phoneE164: "+5511987654321", nome: "Maria Silva", placa: "ABC1D23" };

test("momentos Suhai chegam ao Cloud Run como update, com o detalhe na descrição", () => {
  const payload = buildEmailPayload(lead, { momento: "suhai_cotacao", detalhe: "Cotação Suhai nº 531928 apresentada" });
  assert.equal(payload.momento, "update");
  assert.match(payload.momento_descricao, /Cotação Suhai - Preço apresentado — Cotação Suhai nº 531928 apresentada$/);
});

test("erro Suhai chega como update_error", () => {
  const payload = buildEmailPayload(lead, { momento: "suhai_erro", erro: { message: "x" } });
  assert.equal(payload.momento, "update_error");
  assert.deepEqual(payload.erro, { message: "x" });
});

test("momentos existentes não mudam", () => {
  const payload = buildEmailPayload(lead, { momento: "initial" });
  assert.equal(payload.momento, "initial");
  assert.equal(payload.momento_descricao, "novo.segurosimediato — Primeiro Contato - Apenas Telefone");
});
