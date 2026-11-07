const test = require("node:test");
const assert = require("node:assert/strict");

const espo = require("../espocrm");
const varredura = require("../whatsapp-optout-varredura");

const AGORA = Date.parse("2026-11-07T15:00:00.000Z");
const logger = { info() {}, warn() {}, error() {} };
const espoConfig = { baseUrl: "https://espo.exemplo", apiKey: "k" };
const octaConfig = { baseUrl: "https://octa.exemplo/", apiKey: "chave" };

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

function espoFalso(t, { leadId = "L1" } = {}) {
  const chamadas = { notes: [] };
  t.mock.method(espo, "findExistingLead", async () => leadId);
  t.mock.method(espo, "postNote", async (_cfg, id, texto) => chamadas.notes.push({ id, texto }));
  return chamadas;
}

const chat = (id, extra = {}) => ({
  id,
  channel: "whatsapp",
  contact: { phoneContacts: [{ countryCode: "55", number: "11987654321" }] },
  ...extra,
});
const msg = (id, body, minutosAtras, tipo = "contact") => ({
  id,
  body,
  time: new Date(AGORA - minutosAtras * 60000).toISOString(),
  sentBy: { type: tipo },
});

/** Octadesk falso: `conversas` por página e `mensagens` por conversa. */
function octaFalso({ conversas = [], mensagens = {}, falharMensagens = [] } = {}) {
  const chamadas = [];
  const fetchImpl = async (url, opcoes = {}) => {
    const u = new URL(url);
    chamadas.push({ metodo: opcoes.method || "GET", caminho: u.pathname, busca: u.search, headers: opcoes.headers, corpo: opcoes.body });
    const json = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo, text: async () => JSON.stringify(corpo) });
    if (u.pathname === "/chat") return json(200, conversas);
    const m = u.pathname.match(/^\/chat\/([^/]+)\/messages$/);
    if (m && (opcoes.method || "GET") === "GET") {
      if (falharMensagens.includes(m[1])) return json(500, { erro: "x" });
      return json(200, mensagens[m[1]] || []);
    }
    if (m && opcoes.method === "POST") return json(201, { ok: true });
    return json(404, {});
  };
  return { fetchImpl, chamadas };
}

test("telefone da conversa: junta countryCode e number; aceita número já com 55", () => {
  assert.equal(varredura.telefoneDaConversa(chat("c")), "5511987654321");
  assert.equal(varredura.telefoneDaConversa({ contact: { phoneContacts: [{ countryCode: "55", number: "5511987654321" }] } }), "5511987654321");
  assert.equal(varredura.telefoneDaConversa({ contact: { phoneContacts: [{ number: "(55) 99876-5432" }] } }), "5555998765432");
  assert.equal(varredura.telefoneDaConversa({ contact: { phoneContacts: [{ countryCode: "55", number: "123" }] } }), null);
  assert.equal(varredura.telefoneDaConversa({}), null);
});

test("pedidos: só mensagem do contato, depois da janela, com o texto do botão", () => {
  const desde = AGORA - 10 * 60000;
  const r = varredura.pedidosNaConversa(
    [
      msg("1", "Prefiro não receber", 3),
      msg("2", "Prefiro não receber", 3, "agent"),
      msg("3", "Prefiro não receber", 30),
      msg("4", "Quero o cálculo", 2),
      msg("5", "não quero receber", 1),
    ],
    desde,
  );
  assert.deepEqual(r.map((m) => m.id), ["1", "5"], "em ordem cronológica");
});

test("varredura: registra o pedido, deixa Note, marca a mensagem e avança o cursor; sem e-mail de agente não responde", async (t) => {
  const notas = espoFalso(t);
  const db = rtdbFalso();
  const octa = octaFalso({
    conversas: [chat("c1"), chat("c2", { channel: "instagram" })],
    mensagens: { c1: [msg("m1", "Prefiro não receber", 2)] },
  });
  const r = await varredura.varrer({ octaConfig, espoConfig, rootRef: db.ref, agora: AGORA, fetchImpl: octa.fetchImpl, logger });
  assert.deepEqual(r, { conversas: 1, pedidos: 1, respostas: 0, erros: 0 });
  const pedido = db.raiz.whatsapp_optout["5511987654321"];
  assert.equal(pedido.origem, "octadesk_varredura");
  assert.equal(pedido.em, new Date(AGORA - 2 * 60000).toISOString());
  assert.equal(notas.notes.length, 1);
  assert.deepEqual(db.raiz.whatsapp_optout_varredura.mensagens.m1, { em: new Date(AGORA).toISOString(), nota: "ok", respondido: false });
  assert.equal(db.raiz.whatsapp_optout_varredura.cursor, new Date(AGORA).toISOString());
  assert.equal(octa.chamadas.filter((c) => c.metodo === "POST").length, 0);
  assert.equal(octa.chamadas[0].headers["X-API-KEY"], "chave");
});

test("com optoutAgentEmail: responde uma vez ao cliente; a mesma mensagem na passada seguinte não repete nada", async (t) => {
  const notas = espoFalso(t);
  const db = rtdbFalso();
  const config = { ...octaConfig, optoutAgentEmail: "agente@imediato.exemplo" };
  const dados = { conversas: [chat("c1")], mensagens: { c1: [msg("m1", "Prefiro não receber", 2)] } };
  const octa1 = octaFalso(dados);
  await varredura.varrer({ octaConfig: config, espoConfig, rootRef: db.ref, agora: AGORA, fetchImpl: octa1.fetchImpl, logger });
  const posts = octa1.chamadas.filter((c) => c.metodo === "POST");
  assert.equal(posts.length, 1);
  assert.equal(posts[0].caminho, "/chat/c1/messages");
  assert.equal(posts[0].headers["octa-agent-email"], "agente@imediato.exemplo");
  assert.deepEqual(JSON.parse(posts[0].corpo), { chatId: "c1", type: "public", channel: "whatsapp", body: varredura.RESPOSTA });

  const octa2 = octaFalso(dados);
  const r2 = await varredura.varrer({ octaConfig: config, espoConfig, rootRef: db.ref, agora: AGORA + 60000, fetchImpl: octa2.fetchImpl, logger });
  assert.equal(r2.pedidos, 0);
  assert.equal(octa2.chamadas.filter((c) => c.metodo === "POST").length, 0);
  assert.equal(notas.notes.length, 1);
});

test("conversa já com agente: grava o pedido e a Note, mas não responde (não toma a conversa)", async (t) => {
  const notas = espoFalso(t);
  const db = rtdbFalso();
  const config = { ...octaConfig, optoutAgentEmail: "agente@imediato.exemplo" };
  const octa = octaFalso({
    conversas: [chat("c1", { agent: { email: "outro@imediato.exemplo" }, status: "talking" })],
    mensagens: { c1: [msg("m1", "Prefiro não receber", 2)] },
  });
  const r = await varredura.varrer({ octaConfig: config, espoConfig, rootRef: db.ref, agora: AGORA, fetchImpl: octa.fetchImpl, logger });
  assert.deepEqual(r, { conversas: 1, pedidos: 1, respostas: 0, erros: 0 });
  assert.equal(db.raiz.whatsapp_optout["5511987654321"].origem, "octadesk_varredura");
  assert.equal(notas.notes.length, 1);
  assert.equal(octa.chamadas.filter((c) => c.metodo === "POST").length, 0);
  assert.deepEqual(db.raiz.whatsapp_optout_varredura.mensagens.m1, {
    em: new Date(AGORA).toISOString(),
    nota: "ok",
    respondido: false,
    emAtendimento: true,
  });
});

test("dois toques seguidos na mesma conversa: um pedido com Note e uma resposta só", async (t) => {
  const notas = espoFalso(t);
  const db = rtdbFalso();
  const config = { ...octaConfig, optoutAgentEmail: "agente@imediato.exemplo" };
  const octa = octaFalso({
    conversas: [chat("c1")],
    mensagens: { c1: [msg("m2", "Prefiro não receber", 1), msg("m1", "Prefiro não receber", 2)] },
  });
  const r = await varredura.varrer({ octaConfig: config, espoConfig, rootRef: db.ref, agora: AGORA, fetchImpl: octa.fetchImpl, logger });
  assert.equal(r.pedidos, 2);
  assert.equal(r.respostas, 1);
  assert.equal(notas.notes.length, 1);
  assert.equal(db.raiz.whatsapp_optout["5511987654321"].em, new Date(AGORA - 60000).toISOString());
});

test("falha ao ler uma conversa: as outras seguem e o cursor não avança", async (t) => {
  espoFalso(t);
  const anterior = new Date(AGORA - 5 * 60000).toISOString();
  const db = rtdbFalso({ whatsapp_optout_varredura: { cursor: anterior } });
  const outro = { ...chat("c2"), contact: { phoneContacts: [{ countryCode: "55", number: "21987654321" }] } };
  const octa = octaFalso({
    conversas: [chat("c1"), outro],
    mensagens: { c2: [msg("m9", "Prefiro não receber", 1)] },
    falharMensagens: ["c1"],
  });
  const r = await varredura.varrer({ octaConfig, espoConfig, rootRef: db.ref, agora: AGORA, fetchImpl: octa.fetchImpl, logger });
  assert.equal(r.erros, 1);
  assert.equal(r.pedidos, 1);
  assert.ok(db.raiz.whatsapp_optout["5521987654321"]);
  assert.equal(db.raiz.whatsapp_optout_varredura.cursor, anterior);
  const filtro = new URLSearchParams(octa.chamadas[0].busca).get("filters[0][value]");
  assert.equal(filtro, new Date(AGORA - 7 * 60000).toISOString());
});

test("janela: sem cursor olha 15 min; cursor muito antigo é limitado a 6 h", async (t) => {
  espoFalso(t);
  const db1 = rtdbFalso();
  const o1 = octaFalso();
  await varredura.varrer({ octaConfig, espoConfig, rootRef: db1.ref, agora: AGORA, fetchImpl: o1.fetchImpl, logger });
  assert.equal(new URLSearchParams(o1.chamadas[0].busca).get("filters[0][value]"), new Date(AGORA - 15 * 60000).toISOString());

  const db2 = rtdbFalso({ whatsapp_optout_varredura: { cursor: new Date(AGORA - 48 * 3600e3).toISOString() } });
  const o2 = octaFalso();
  await varredura.varrer({ octaConfig, espoConfig, rootRef: db2.ref, agora: AGORA, fetchImpl: o2.fetchImpl, logger });
  assert.equal(new URLSearchParams(o2.chamadas[0].busca).get("filters[0][value]"), new Date(AGORA - 6 * 3600e3).toISOString());
});

test("falha ao listar as conversas: lança e não mexe no cursor", async (t) => {
  espoFalso(t);
  const db = rtdbFalso();
  const fetchImpl = async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => "fora" });
  await assert.rejects(varredura.varrer({ octaConfig, espoConfig, rootRef: db.ref, agora: AGORA, fetchImpl, logger }), /HTTP 503/);
  assert.equal(db.raiz.whatsapp_optout_varredura, undefined);
});
