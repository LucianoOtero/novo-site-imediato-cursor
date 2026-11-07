const test = require("node:test");
const assert = require("node:assert/strict");

const espo = require("../espocrm");
const optout = require("../whatsapp-optout");

const AGORA = Date.parse("2026-11-07T15:00:00.000Z");
const SEGREDO = "segredo-de-teste";
const logger = { info() {}, warn() {}, error() {} };
const espoConfig = { baseUrl: "https://espo.exemplo", apiKey: "k" };

function rtdbFalso(inicial = {}) {
  const raiz = JSON.parse(JSON.stringify(inicial));
  const partes = (caminho) => caminho.split("/").filter(Boolean);
  const ler = (caminho) => partes(caminho).reduce((no, p) => (no == null ? undefined : no[p]), raiz);
  const gravar = (caminho, valor) => {
    const ps = partes(caminho);
    let no = raiz;
    for (const p of ps.slice(0, -1)) no = no[p] = no[p] && typeof no[p] === "object" ? no[p] : {};
    no[ps.at(-1)] = JSON.parse(JSON.stringify(valor));
  };
  const ref = (caminho) => ({
    child: (sub) => ref(`${caminho}/${sub}`),
    once: async () => ({ val: () => (ler(caminho) === undefined ? null : JSON.parse(JSON.stringify(ler(caminho)))) }),
    update: async (campos) => {
      for (const [k, v] of Object.entries(campos)) gravar(`${caminho}/${k}`, v);
    },
  });
  return { raiz, ref: ref("") };
}

function espoFalso(t, { leadId = "L1", falhar = false } = {}) {
  const chamadas = { buscas: [], notes: [] };
  t.mock.method(espo, "findExistingLead", async (_cfg, dados) => {
    chamadas.buscas.push(dados.phoneE164);
    if (falhar) throw new Error("Espo fora");
    return leadId;
  });
  t.mock.method(espo, "postNote", async (_cfg, id, texto) => chamadas.notes.push({ id, texto }));
  return chamadas;
}

const pedido = (db, extra = {}) =>
  optout.processarPedido({
    token: SEGREDO,
    corpo: { telefone: "+55 (11) 98765-4321", opcao: "Não quero receber" },
    segredo: SEGREDO,
    rootRef: db.ref,
    espoConfig,
    agora: AGORA,
    logger,
    ...extra,
  });

test("telefone: aceita +55, máscara e número sem DDI; recusa o resto", () => {
  assert.equal(optout.digitosTelefone("+55 (11) 98765-4321"), "5511987654321");
  assert.equal(optout.digitosTelefone("5511987654321"), "5511987654321");
  assert.equal(optout.digitosTelefone("11987654321"), "5511987654321");
  assert.equal(optout.digitosTelefone("1133334444"), "551133334444");
  assert.equal(optout.digitosTelefone("987654321"), null);
  assert.equal(optout.digitosTelefone(""), null);
  assert.equal(optout.digitosTelefone(undefined), null);
});

test("opção: só 'Não quero receber', sem depender de acento, caixa ou pontuação", () => {
  assert.equal(optout.opcaoValida("Não quero receber"), true);
  assert.equal(optout.opcaoValida("  nao QUERO receber. "), true);
  assert.equal(optout.opcaoValida("Quero receber"), false);
  assert.equal(optout.opcaoValida(""), false);
});

test("token errado, ausente ou secret vazio: 401 e nada gravado", async (t) => {
  const chamadas = espoFalso(t);
  for (const extra of [{ token: "outro" }, { token: undefined }, { segredo: "" }]) {
    const db = rtdbFalso();
    const r = await pedido(db, extra);
    assert.equal(r.status, 401);
    assert.deepEqual(db.raiz, {});
  }
  assert.equal(chamadas.notes.length, 0);
});

test("telefone ou opção inválidos: 400", async (t) => {
  espoFalso(t);
  const db = rtdbFalso();
  assert.equal((await pedido(db, { corpo: { telefone: "123", opcao: "Não quero receber" } })).corpo.error, "telefone_invalido");
  assert.equal((await pedido(db, { corpo: { telefone: "11987654321", opcao: "Sim" } })).corpo.error, "opcao_invalida");
  assert.equal((await pedido(db, { corpo: null })).status, 400);
  assert.deepEqual(db.raiz, {});
});

test("pedido válido: grava em whatsapp_optout e deixa Note no Lead do Espo", async (t) => {
  const chamadas = espoFalso(t);
  const db = rtdbFalso();
  const r = await pedido(db);
  assert.deepEqual(r, { status: 200, corpo: { ok: true, repetido: false, nota: "ok" } });
  assert.deepEqual(db.raiz.whatsapp_optout["5511987654321"], { em: new Date(AGORA).toISOString(), origem: "octadesk_botao" });
  assert.deepEqual(chamadas.buscas, ["+5511987654321"]);
  assert.equal(chamadas.notes[0].id, "L1");
  assert.match(chamadas.notes[0].texto, /Não quero receber/);
});

test("aceita os nomes de campo em inglês (phone/option)", async (t) => {
  espoFalso(t);
  const db = rtdbFalso();
  const r = await pedido(db, { corpo: { phone: "5511987654321", option: "Não quero receber" } });
  assert.equal(r.status, 200);
  assert.ok(db.raiz.whatsapp_optout["5511987654321"]);
});

test("toque repetido em 10 minutos não repete a Note; depois disso, sim", async (t) => {
  const chamadas = espoFalso(t);
  const db = rtdbFalso();
  await pedido(db);
  const repetido = await pedido(db, { agora: AGORA + 60 * 1000 });
  assert.deepEqual(repetido.corpo, { ok: true, repetido: true, nota: "repetido" });
  assert.equal(chamadas.notes.length, 1);
  assert.equal(db.raiz.whatsapp_optout["5511987654321"].em, new Date(AGORA + 60 * 1000).toISOString());

  await pedido(db, { agora: AGORA + optout.JANELA_REPETICAO_MS + 120 * 1000 });
  assert.equal(chamadas.notes.length, 2);
});

test("Espo fora ou sem Lead: o pedido é gravado e a resposta é 200", async (t) => {
  espoFalso(t, { falhar: true });
  const db = rtdbFalso();
  const r = await pedido(db);
  assert.deepEqual(r.corpo, { ok: true, repetido: false, nota: "falhou" });
  assert.ok(db.raiz.whatsapp_optout["5511987654321"]);

  t.mock.restoreAll();
  espoFalso(t, { leadId: null });
  assert.equal((await pedido(rtdbFalso())).corpo.nota, "sem_lead");
  assert.equal((await pedido(rtdbFalso(), { espoConfig: null })).corpo.nota, "sem_lead");
});

test("bloqueio: lead criado até o pedido fica bloqueado; lead criado depois volta a receber", async () => {
  const db = rtdbFalso({ whatsapp_optout: { "5511987654321": { em: "2026-11-07T15:00:00.000Z" } } });
  const bloqueia = (ts, tel = "+5511987654321") => optout.optOutBloqueia(db.ref, tel, ts);
  assert.equal(await bloqueia("2026-11-07T14:00:00.000Z"), true);
  assert.equal(await bloqueia("2026-11-07T15:00:00.000Z"), true);
  assert.equal(await bloqueia("2026-11-08T09:00:00.000Z"), false);
  assert.equal(await bloqueia(undefined), true);
  assert.equal(await bloqueia("2026-11-07T14:00:00.000Z", "+5511900000000"), false);
  assert.equal(await bloqueia("2026-11-07T14:00:00.000Z", ""), false);
});
