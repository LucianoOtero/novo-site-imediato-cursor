const test = require("node:test");
const assert = require("node:assert/strict");

const { montarResumo, resumirErros } = require("../sold-sync-resumo");

const AGORA = Date.parse("2026-11-05T11:00:00Z");
const logger = { warn() {}, info() {} };

function erro(opp, reason, extra = {}) {
  return { createdAt: "2026-11-05T09:00:00.000Z", reason, payload: { opportunityId: opp }, results: [], ...extra };
}

test("resumo agrupa por motivo e oportunidade e ignora o que não pede alerta", () => {
  const texto = montarResumo([
    erro("oppA", "validation_error", { results: [{ error: "amount required for action=set" }] }),
    erro("oppA", "validation_error", { results: [{ error: "amount required for action=set" }] }),
    erro("oppB", "no_firebase_match", { missClass: "actionable_unknown" }),
    erro("oppC", "no_firebase_match", { missClass: "expected_no_attribution", skipEmail: true }),
    erro("oppD", "legacy_partial_failure", { skipEmail: true }),
  ]);
  assert.match(texto, /^3 ocorrência\(s\) em 2 oportunidade\(s\)/);
  assert.match(texto, /amount required for action=set\): 1 oportunidade\(s\) — oppA \(2x\)/);
  assert.match(texto, /actionable_unknown\): 1 oportunidade\(s\) — oppB/);
  assert.doesNotMatch(texto, /oppC|oppD/);
});

test("sem registro que peça alerta não há resumo", () => {
  assert.equal(montarResumo([erro("oppC", "no_firebase_match", { skipEmail: true })]), null);
  assert.equal(montarResumo([]), null);
});

/** RTDB em memória com a API usada pelo módulo. */
function bancoFalso(erros, estado = null) {
  const dados = { sold_sync_errors: erros, sold_sync_resumo: estado };
  const consulta = (filtro) => ({
    startAfter: (k) => consulta((lst) => filtro(lst).filter(([c]) => c > k)),
    limitToFirst: (n) => consulta((lst) => filtro(lst).slice(0, n)),
    limitToLast: (n) => consulta((lst) => filtro(lst).slice(-n)),
    once: async () => ({ val: () => Object.fromEntries(filtro(Object.entries(dados.sold_sync_errors || {}).sort())) }),
  });
  return {
    dados,
    child: (path) => ({
      once: async () => ({ val: () => dados[path] }),
      update: async (patch) => {
        dados[path] = { ...(dados[path] || {}), ...patch };
      },
      orderByKey: () => consulta((lst) => lst),
    }),
  };
}

function cloudRunFalso(sucesso) {
  const original = global.fetch;
  const enviados = [];
  global.fetch = async (url, init) => {
    enviados.push(JSON.parse(init.body));
    return { ok: true, status: 200, text: async () => JSON.stringify({ success: sucesso }) };
  };
  return { enviados, restaurar: () => (global.fetch = original) };
}

test("primeira rodada olha só as últimas 24 h e grava o marcador depois do envio", async () => {
  const db = bancoFalso({
    k1: { ...erro("velha", "validation_error"), createdAt: "2026-11-01T09:00:00.000Z" },
    k2: erro("oppA", "validation_error"),
  });
  const cr = cloudRunFalso(true);
  try {
    assert.equal(await resumirErros({ rootRef: db, emailUrl: "https://mail", agora: AGORA, logger }), "enviado");
    assert.equal(cr.enviados.length, 1);
    assert.match(cr.enviados[0].momento_descricao, /Vendas do Espo com problema — 1 ocorrência\(s\) em 1 oportunidade\(s\)/);
    assert.doesNotMatch(cr.enviados[0].momento_descricao, /velha/);
    assert.equal(db.dados.sold_sync_resumo.ultimaChave, "k2");
  } finally {
    cr.restaurar();
  }
});

test("rodada seguinte lê só depois do marcador; sem alerta não envia", async () => {
  const db = bancoFalso(
    { k1: erro("oppA", "validation_error"), k2: erro("oppC", "no_firebase_match", { skipEmail: true }) },
    { ultimaChave: "k1" }
  );
  const cr = cloudRunFalso(true);
  try {
    assert.equal(await resumirErros({ rootRef: db, emailUrl: "https://mail", agora: AGORA, logger }), "sem alertas");
    assert.equal(cr.enviados.length, 0);
    assert.equal(db.dados.sold_sync_resumo.ultimaChave, "k2");
  } finally {
    cr.restaurar();
  }
});

test("falha no envio não avança o marcador", async () => {
  const db = bancoFalso({ k2: erro("oppA", "validation_error") }, { ultimaChave: "k1" });
  const cr = cloudRunFalso(false);
  try {
    assert.equal(await resumirErros({ rootRef: db, emailUrl: "https://mail", agora: AGORA, logger }), "falha no envio");
    assert.equal(db.dados.sold_sync_resumo.ultimaChave, "k1");
  } finally {
    cr.restaurar();
  }
});
