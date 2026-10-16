const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CAMPO_RESERVA,
  RESERVA_VALIDA_MS,
  obterIdsOuReservar,
  concluirReserva,
  etapaSuperada,
} = require("../espo-reserva");

/** Registro do RTDB em memória com a API usada pelo módulo. */
function refFalsa(inicial = {}) {
  const registro = { ...inicial };
  return {
    registro,
    once: async () => ({ val: () => ({ ...registro }) }),
    update: async (campos) => {
      for (const [chave, valor] of Object.entries(campos)) {
        if (valor === null) delete registro[chave];
        else registro[chave] = valor;
      }
    },
    child: (chave) => ({
      once: async () => ({ val: () => registro[chave] ?? null }),
      transaction: async (fn) => {
        const novo = fn(registro[chave] ?? null);
        if (novo === undefined) return { committed: false };
        registro[chave] = novo;
        return { committed: true };
      },
    }),
  };
}

function relogio(inicio = 1_000_000) {
  let atual = inicio;
  return { agora: () => atual, esperar: async (ms) => (atual += ms) };
}

test("IDs já gravados dispensam reserva", async () => {
  const ref = refFalsa({ espocrmLeadId: "L1", espocrmOpportunityId: "O1" });
  const out = await obterIdsOuReservar(ref, relogio());
  assert.deepEqual(out, { leadId: "L1", opportunityId: "O1", reservado: false });
  assert.equal(ref.registro[CAMPO_RESERVA], undefined);
});

test("sem IDs e sem reserva, esta execução reserva a criação", async () => {
  const ref = refFalsa();
  const out = await obterIdsOuReservar(ref, relogio());
  assert.equal(out.reservado, true);
  assert.equal(typeof ref.registro[CAMPO_RESERVA], "number");
});

test("com reserva ativa, espera os IDs da outra execução", async () => {
  const t = relogio();
  const ref = refFalsa({ [CAMPO_RESERVA]: t.agora() });
  let esperas = 0;
  const out = await obterIdsOuReservar(ref, {
    agora: t.agora,
    esperar: async (ms) => {
      esperas += 1;
      await t.esperar(ms);
      if (esperas === 3) await concluirReserva(ref, { leadId: "L1", opportunityId: "O1" });
    },
  });
  assert.deepEqual(out, { leadId: "L1", opportunityId: "O1", reservado: false });
  assert.equal(ref.registro[CAMPO_RESERVA], undefined);
});

test("reserva abandonada pode ser tomada", async () => {
  const t = relogio();
  const ref = refFalsa({ [CAMPO_RESERVA]: t.agora() - RESERVA_VALIDA_MS - 1 });
  const out = await obterIdsOuReservar(ref, t);
  assert.equal(out.reservado, true);
});

test("espera esgotada devolve sem reserva", async () => {
  const t = relogio();
  const ref = refFalsa({ [CAMPO_RESERVA]: t.agora(), espocrmLeadId: "L1" });
  const out = await obterIdsOuReservar(ref, { ...t, esperaMaxMs: 5000 });
  assert.deepEqual(out, { leadId: "L1", opportunityId: null, reservado: false, esperaEsgotada: true });
});

test("concluir sem IDs (entrega falhou) só libera a reserva", async () => {
  const ref = refFalsa({ [CAMPO_RESERVA]: 1 });
  await concluirReserva(ref, {});
  assert.deepEqual(ref.registro, {});
});

test("mesma etapa com as chaves em outra ordem não está superada", async () => {
  const ref = refFalsa({ data: { nome: "A", stage: "suhai_plan_selected", suhaiPlano: { cdCobertura: 1029, protocolo: "2" } } });
  const doEvento = { suhaiPlano: { protocolo: "2", cdCobertura: 1029 }, stage: "suhai_plan_selected", nome: "A" };
  assert.equal(await etapaSuperada(ref, doEvento), false);
});

test("etapa gravada depois supera a do evento", async () => {
  const ref = refFalsa({ data: { stage: "suhai_quote", suhaiCotacao: { protocolo: "2" } } });
  assert.equal(await etapaSuperada(ref, { stage: "initial" }), true);
});
