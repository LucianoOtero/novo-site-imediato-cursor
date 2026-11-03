const test = require("node:test");
const assert = require("node:assert/strict");

const { noMatchIsFinal, batchHttpStatus, SITE_NOVO_PROJECT, LEGACY_PROJECT } = require("../sold-sync");

const novoOk = { projectId: SITE_NOVO_PROJECT, ok: true, matchCount: 0 };
const legadoOk = { projectId: LEGACY_PROJECT, ok: true, matchCount: 0 };
const legadoTimeout = { projectId: LEGACY_PROJECT, ok: false, bestEffort: true, matchCount: 0 };

test("sem lead esperado com o legado respondendo é definitivo", () => {
  assert.equal(noMatchIsFinal(true, [novoOk, legadoOk]), true);
});

test("sem lead esperado com timeout no legado pede nova tentativa", () => {
  assert.equal(noMatchIsFinal(true, [novoOk, legadoTimeout]), false);
});

test("sem lead acionável continua pedindo nova tentativa", () => {
  assert.equal(noMatchIsFinal(false, [novoOk, legadoOk]), false);
});

test("lote: item que pede nova tentativa prevalece sobre item ok", () => {
  assert.equal(batchHttpStatus([{ ok: true, httpStatus: 200 }, { ok: false, httpStatus: 404 }]), 404);
  assert.equal(batchHttpStatus([{ ok: true, httpStatus: 200 }, { ok: false, httpStatus: 500 }]), 500);
  assert.equal(batchHttpStatus([{ ok: false, httpStatus: 404 }, { ok: false, httpStatus: 500 }]), 500);
});

test("lote: só itens ok ou rejeições definitivas", () => {
  assert.equal(batchHttpStatus([{ ok: true, httpStatus: 200 }]), 200);
  assert.equal(batchHttpStatus([{ ok: true, httpStatus: 200 }, { ok: false, httpStatus: 400 }]), 200);
  assert.equal(batchHttpStatus([{ ok: false, httpStatus: 400 }]), 400);
});
