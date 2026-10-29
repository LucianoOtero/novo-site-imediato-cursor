const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizePayload, enrichPayloadFromEspo, validateSetPayload } = require("../sold-sync");

const CONFIG = JSON.stringify({
  dev: { baseUrl: "https://espo-dev.test", apiKey: "k-dev" },
  prod: { baseUrl: "https://espo-prod.test", apiKey: "k-prod" },
});

/** Espo DEV sem a Opportunity (404) e PROD com ela, como na produção. */
function espoFalso(opp) {
  const original = global.fetch;
  global.fetch = async (url) => {
    if (String(url).startsWith("https://espo-dev.test")) {
      return { ok: false, status: 404, text: async () => "" };
    }
    return { ok: true, status: 200, text: async () => JSON.stringify(opp) };
  };
  return () => {
    global.fetch = original;
  };
}

const VENDIDA = {
  id: "opp1",
  stage: "Vendido",
  amount: 439.5,
  cDataVenda: "2026-10-29 13:39:00",
  cLeadId: "lead1",
  cGclid: "gclid1",
  modifiedAt: "2026-10-29 13:39:00",
};

test("edição de venda sem stage no webhook completa comissão e data pelo Espo", async () => {
  const restaurar = espoFalso(VENDIDA);
  try {
    const p = await enrichPayloadFromEspo(normalizePayload({ id: "opp1", modifiedAt: VENDIDA.modifiedAt }), CONFIG);
    assert.equal(p.action, "set");
    assert.equal(p.stage, "Vendido");
    assert.equal(p.amount, 439.5);
    assert.equal(p.cDataVenda, "2026-10-29");
    assert.equal(validateSetPayload(p), null);
  } finally {
    restaurar();
  }
});

test("webhook com stage Vendido continua completando pelo Espo", async () => {
  const restaurar = espoFalso(VENDIDA);
  try {
    const p = await enrichPayloadFromEspo(normalizePayload({ id: "opp1", stage: "Vendido" }), CONFIG);
    assert.equal(p.action, "set");
    assert.equal(p.amount, 439.5);
    assert.equal(validateSetPayload(p), null);
  } finally {
    restaurar();
  }
});

test("comissão enviada no webhook prevalece sobre a do Espo", async () => {
  const restaurar = espoFalso(VENDIDA);
  try {
    const p = await enrichPayloadFromEspo(normalizePayload({ id: "opp1", amount: "500,00" }), CONFIG);
    assert.equal(p.action, "set");
    assert.equal(p.amount, 500);
  } finally {
    restaurar();
  }
});

test("edição sem stage de oportunidade fora de Vendido vira clear sem copiar comissão", async () => {
  const restaurar = espoFalso({ ...VENDIDA, stage: "Proximo de Fechar" });
  try {
    const p = await enrichPayloadFromEspo(normalizePayload({ id: "opp1" }), CONFIG);
    assert.equal(p.action, "clear");
    assert.equal(p.amount, null);
    assert.equal(p.cDataVenda, null);
  } finally {
    restaurar();
  }
});
