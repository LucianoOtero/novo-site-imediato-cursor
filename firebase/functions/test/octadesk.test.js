const test = require("node:test");
const assert = require("node:assert/strict");

const { sendTemplate } = require("../octadesk");

const config = { baseUrl: "https://octa.test/api/v1/", apiKey: "k", fromNumber: "+5511900000000", templates: { calculo_pronto: "tpl-1" } };
const lead = { phoneE164: "+5511900000001", nome: "Maria" };
const rapido = { esperaRetentativaMs: 0 };

function fetchFalso(respostas) {
  const chamadas = [];
  const fn = async (url) => {
    chamadas.push(url);
    const proxima = respostas.shift();
    if (proxima instanceof Error) throw proxima;
    return { ok: proxima >= 200 && proxima < 300, status: proxima, text: async () => "corpo" };
  };
  return { fn, chamadas };
}

async function comFetch(respostas, executar) {
  const original = global.fetch;
  const falso = fetchFalso(respostas);
  global.fetch = falso.fn;
  try {
    return { resultado: await executar().catch((erro) => erro), chamadas: falso.chamadas };
  } finally {
    global.fetch = original;
  }
}

test("502 seguido de sucesso: tenta de novo e não lança", async () => {
  const { resultado, chamadas } = await comFetch([502, 200], () => sendTemplate(config, "calculo_pronto", lead, ["Maria"], "ld_x", rapido));
  assert.equal(resultado, undefined);
  assert.equal(chamadas.length, 2);
  assert.equal(chamadas[0], "https://octa.test/api/v1/chat/send-template");
});

test("erro de rede seguido de sucesso: tenta de novo", async () => {
  const { resultado, chamadas } = await comFetch([new TypeError("fetch failed"), 200], () =>
    sendTemplate(config, "calculo_pronto", lead, [], "ld_x", rapido),
  );
  assert.equal(resultado, undefined);
  assert.equal(chamadas.length, 2);
});

test("503 duas vezes: lança com o status da segunda tentativa", async () => {
  const { resultado, chamadas } = await comFetch([503, 504], () => sendTemplate(config, "calculo_pronto", lead, [], "ld_x", rapido));
  assert.match(resultado.message, /HTTP 504/);
  assert.equal(chamadas.length, 2);
});

test("4xx e 500 não são repetidos", async () => {
  for (const status of [400, 500]) {
    const { resultado, chamadas } = await comFetch([status, 200], () => sendTemplate(config, "calculo_pronto", lead, [], "ld_x", rapido));
    assert.match(resultado.message, new RegExp(`HTTP ${status}`));
    assert.equal(chamadas.length, 1);
  }
});
