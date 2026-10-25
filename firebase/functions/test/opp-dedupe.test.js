const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const {
  chaveDedupe,
  indiceRef,
  diasDeReuso,
  oppAbertaRecente,
  registrar,
  notaNovaJornada,
} = require("../opp-dedupe");

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = Date.parse("2026-10-25T15:00:00Z");
const LEAD = { phoneE164: "+5511900000099", ramo: "auto" };

/** Nó do RTDB em memória com a API usada pelo módulo. */
function refFalsa(valor = null) {
  const no = { valor };
  return {
    no,
    once: async () => ({ val: () => no.valor }),
    set: async (novo) => {
      no.valor = novo;
    },
  };
}

function entrada(diasAtras, opportunityId = "opp1") {
  return { opportunityId, at: new Date(AGORA - diasAtras * DIA_MS).toISOString() };
}

function espoCom(opps) {
  const chamadas = [];
  return {
    chamadas,
    buscarOpportunity: async (id) => {
      chamadas.push(id);
      if (!(id in opps)) {
        const erro = new Error("HTTP 404");
        erro.status = 404;
        throw erro;
      }
      return opps[id];
    },
  };
}

test("chave igual à do site: sha256 de telefone:ramo", () => {
  const esperado = crypto.createHash("sha256").update("+5511900000099:auto").digest("hex");
  assert.equal(chaveDedupe(LEAD), esperado);
  assert.equal(chaveDedupe({ ramo: "auto" }), null);
});

test("indiceRef separa por ambiente", () => {
  const caminhos = [];
  const root = { child: (caminho) => (caminhos.push(caminho), {}) };
  indiceRef(root, "staging", LEAD);
  assert.equal(caminhos[0], `opp_dedupe/staging/${chaveDedupe(LEAD)}`);
  assert.equal(indiceRef(root, "staging", {}), null);
});

test("diasDeReuso: ausente, zero ou inválido desliga", () => {
  assert.equal(diasDeReuso(null), 0);
  assert.equal(diasDeReuso({}), 0);
  assert.equal(diasDeReuso({ oppReuseDays: 0 }), 0);
  assert.equal(diasDeReuso({ oppReuseDays: "x" }), 0);
  assert.equal(diasDeReuso({ oppReuseDays: 7 }), 7);
});

test("desligado não consulta nada", async () => {
  const espo = espoCom({ opp1: { id: "opp1", stage: "Cotação Enviada" } });
  const r = await oppAbertaRecente(refFalsa(entrada(1)), { dias: 0, agora: AGORA, ...espo });
  assert.equal(r, null);
  assert.deepEqual(espo.chamadas, []);
});

test("Opportunity aberta dentro da janela é reaproveitada", async () => {
  const espo = espoCom({ opp1: { id: "opp1", stage: "Cotação Enviada" } });
  const r = await oppAbertaRecente(refFalsa(entrada(6)), { dias: 7, agora: AGORA, ...espo });
  assert.deepEqual(r, { opportunityId: "opp1", stage: "Cotação Enviada" });
});

test("fora da janela não consulta o Espo", async () => {
  const espo = espoCom({ opp1: { id: "opp1", stage: "Novo Sem Contato" } });
  const r = await oppAbertaRecente(refFalsa(entrada(7.5)), { dias: 7, agora: AGORA, ...espo });
  assert.equal(r, null);
  assert.deepEqual(espo.chamadas, []);
});

test("Vendido e Perdido não são reaproveitados", async () => {
  for (const stage of ["Vendido", "Perdido"]) {
    const espo = espoCom({ opp1: { id: "opp1", stage } });
    assert.equal(await oppAbertaRecente(refFalsa(entrada(1)), { dias: 7, agora: AGORA, ...espo }), null);
  }
});

test("Opportunity apagada no CRM (404) cai para criar nova", async () => {
  const espo = espoCom({});
  assert.equal(await oppAbertaRecente(refFalsa(entrada(1)), { dias: 7, agora: AGORA, ...espo }), null);
});

test("outros erros do Espo sobem para o chamador decidir", async () => {
  const buscarOpportunity = async () => {
    const erro = new Error("HTTP 500");
    erro.status = 500;
    throw erro;
  };
  await assert.rejects(oppAbertaRecente(refFalsa(entrada(1)), { dias: 7, agora: AGORA, buscarOpportunity }));
});

test("sem índice ou índice sem id não reaproveita", async () => {
  const espo = espoCom({});
  assert.equal(await oppAbertaRecente(refFalsa(null), { dias: 7, agora: AGORA, ...espo }), null);
  assert.equal(await oppAbertaRecente(refFalsa({ at: entrada(1).at }), { dias: 7, agora: AGORA, ...espo }), null);
  assert.equal(await oppAbertaRecente(null, { dias: 7, agora: AGORA, ...espo }), null);
});

test("registrar grava id e momento", async () => {
  const ref = refFalsa();
  await registrar(ref, "opp9", AGORA);
  assert.deepEqual(ref.no.valor, { opportunityId: "opp9", at: "2026-10-25T15:00:00.000Z" });
});

test("nota traz a data no fuso de São Paulo", () => {
  assert.match(notaNovaJornada(Date.parse("2026-10-26T01:30:00Z")), /Nova jornada do site em 25\/10/);
});
