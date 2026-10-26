const test = require("node:test");
const assert = require("node:assert/strict");

const suhai = require("../suhai");
const espo = require("../espocrm");
const emailNotif = require("../email-notification");
const acomp = require("../suhai-acompanhamento");

const AGORA = Date.parse("2026-10-26T12:00:00.000Z");
const AGORA_ISO = new Date(AGORA).toISOString();

const item = {
  proposta: "12350578",
  protocolo: "225514006",
  ambiente: "homologacao",
  environment: "staging",
  transmitidaEm: "2026-10-20T15:00:00.000Z",
  registradoEm: "2026-10-20T15:00:05.000Z",
  final: false,
};

const pendenciaVistoria = {
  numero: 1,
  pendencia: "Vistoria Prévia",
  prestador: "Autovist",
  etapa: "Realização da vistoria",
  status: "Autovistoria pendente de realização",
  ultimaAtualizacao: "2026-10-21 09:10:00",
  linkPrestador: "https://autovist.exemplo/abc",
};

// ——— Regras puras ———

test("registro do acompanhamento só para proposta transmitida", () => {
  const dados = { suhaiProposta: { status: "sucesso", numeroProposta: 12350578, protocolo: "225514006", ambiente: "producao", geradoEm: "2026-10-16T13:00:00.000Z" } };
  assert.deepEqual(suhai.registroAcompanhamento(dados, "production", AGORA_ISO), {
    proposta: "12350578",
    protocolo: "225514006",
    ambiente: "producao",
    environment: "production",
    transmitidaEm: "2026-10-16T13:00:00.000Z",
    registradoEm: AGORA_ISO,
    final: false,
  });
  assert.equal(suhai.registroAcompanhamento({ suhaiProposta: { status: "falha" } }, "production", AGORA_ISO), null);
  assert.equal(suhai.registroAcompanhamento({}, "production", AGORA_ISO), null);
});

test("data da Suhai (Brasília) vira UTC no Espo", () => {
  assert.equal(suhai.dataSuhaiParaEspo("2026-10-20 22:30:00"), "2026-10-21 01:30:00");
  assert.equal(suhai.dataSuhaiParaEspo(""), null);
});

test("sem mudança de status nem de pendências não gera efeito", () => {
  const anterior = { ...item, status: 3, assinaturaPendencias: "" };
  const plano = suhai.planoAcompanhamento(anterior, { status: 3, statusTexto: "Pendente Análise Nível 2" }, [], AGORA_ISO);
  assert.equal(plano.nota, null);
  assert.deepEqual(plano.tarefas, []);
  assert.equal(plano.email, null);
  assert.equal(plano.atualizacao.ultimaConsulta, AGORA_ISO);
  assert.equal(plano.atualizacao.final, false);
});

test("pendência com link vira Note com o link e Task para enviar ao cliente", () => {
  const plano = suhai.planoAcompanhamento(item, { status: 12, statusTexto: "Pendências para Emissão", dataAtualizacao: "2026-10-21 09:00:00" }, [pendenciaVistoria], AGORA_ISO);
  assert.match(plano.nota, /^\[HOMOLOGAÇÃO\] ⚠️ PROPOSTA SUHAI nº 12350578 — Pendências para emissão em 21\/10\/2026 09:00/);
  assert.match(plano.nota, /Link para o cliente: https:\/\/autovist\.exemplo\/abc/);
  assert.equal(plano.tarefas.length, 1);
  assert.equal(plano.tarefas[0].chave, "task_pend_vistoria_previa");
  assert.match(plano.tarefas[0].name, /Enviar ao cliente o link de Vistoria Prévia — proposta Suhai nº 12350578/);
  assert.match(plano.tarefas[0].description, /https:\/\/autovist\.exemplo\/abc/);
  assert.equal(plano.email.momento, "suhai_pendencia");
  assert.deepEqual(plano.campos, { cStatusProposta: "Pendências para emissão", cDataStatusProposta: "2026-10-21 12:00:00" });
});

test("pendência repetida no mesmo tipo gera uma Task só", () => {
  const segunda = { ...pendenciaVistoria, numero: 2, etapa: "Solicitação", status: "OS Criada" };
  const plano = suhai.planoAcompanhamento(item, { status: 12 }, [pendenciaVistoria, segunda], AGORA_ISO);
  assert.equal(plano.tarefas.filter((t) => t.chave === "task_pend_vistoria_previa").length, 1);
});

test("vistoria frustrada pede ação do vendedor", () => {
  const anterior = { ...item, status: 12, assinaturaPendencias: suhai.assinaturaPendencias([pendenciaVistoria]) };
  const frustrada = { ...pendenciaVistoria, status: "Frustrado", linkPrestador: null };
  const plano = suhai.planoAcompanhamento(anterior, { status: 12 }, [frustrada], AGORA_ISO);
  assert.ok(plano.nota);
  assert.equal(plano.campos, null);
  assert.deepEqual(plano.tarefas.map((t) => t.chave), ["task_pend_vistoria_previa_frustrado"]);
});

test("emitida fecha o acompanhamento e pede o boleto", () => {
  const plano = suhai.planoAcompanhamento({ ...item, status: 12 }, { status: 13, statusTexto: "Emitida", dataAtualizacao: "2026-10-25 10:00:00" }, [], AGORA_ISO);
  assert.equal(plano.atualizacao.final, true);
  assert.equal(plano.atualizacao.motivoFinal, "emitida");
  assert.match(plano.nota, /✅ PROPOSTA SUHAI nº 12350578 — Emitida/);
  assert.match(plano.nota, /buscar o boleto/);
  assert.deepEqual(plano.tarefas.map((t) => t.chave), ["task_emitida"]);
  assert.match(plano.tarefas[0].name, /Enviar boleto da 1ª parcela ao cliente/);
  assert.equal(plano.email.momento, "suhai_emitida");
});

const POS_VENDA = {
  encontrada: true,
  apolice: {
    codApolice: "1003106306367",
    proposta: "12350578",
    dataEmissao: "2026-10-25",
    inicioVigencia: "2026-10-25",
    fimVigencia: "2027-10-25",
    premioTotal: 1243.06,
    qtdeParcelas: 4,
    linkApolice: "http://i4pro/apolice.pdf",
    linkBoleto: "http://i4pro/boleto-apolice.pdf",
  },
  parcelas: {
    proximaPendente: { parcela: 1, valor: 312.56, situacao: "Pendente", vencimento: "2026-11-03", formaPagamento: "Boleto Bradesco", linkBoleto: "http://i4pro/boleto-1.pdf" },
  },
};

test("emitida com a pós-venda: Note e Task levam o boleto e o PDF da apólice", () => {
  const plano = suhai.planoAcompanhamento({ ...item, status: 12 }, { status: 13, statusTexto: "Emitida" }, [], AGORA_ISO, { posVenda: POS_VENDA });
  assert.equal(plano.atualizacao.apolice, "1003106306367");
  assert.match(plano.nota, /Apólice nº 1003106306367 emitida em 25\/10\/2026/);
  assert.match(plano.nota, /Vigência: 25\/10\/2026 a 25\/10\/2027/);
  assert.match(plano.nota, /PDF da apólice: http:\/\/i4pro\/apolice\.pdf/);
  assert.match(plano.nota, /Boleto da 1ª parcela \(vence 03\/11\/2026, R\$\s?312,56\): http:\/\/i4pro\/boleto-1\.pdf/);
  assert.doesNotMatch(plano.nota, /buscar o boleto/);
  const tarefa = plano.tarefas[0];
  assert.equal(tarefa.chave, "task_emitida");
  assert.match(tarefa.description, /boleto da 1ª parcela .*http:\/\/i4pro\/boleto-1\.pdf/);
  assert.match(tarefa.description, /PDF da apólice: http:\/\/i4pro\/apolice\.pdf/);
  assert.match(plano.email.detalhe, /apólice nº 1003106306367/);
});

test("emitida no cartão: sem boleto, a Task manda a apólice", () => {
  const cartao = {
    ...POS_VENDA,
    apolice: { ...POS_VENDA.apolice, linkBoleto: null },
    parcelas: { proximaPendente: { parcela: 1, situacao: "Pendente", formaPagamento: "Cartão de crédito", linkBoleto: null } },
  };
  const plano = suhai.planoAcompanhamento({ ...item, status: 12 }, { status: 13 }, [], AGORA_ISO, { posVenda: cartao });
  assert.match(plano.nota, /Pagamento no cartão: não há boleto/);
  assert.match(plano.tarefas[0].name, /Enviar apólice Suhai ao cliente/);
  assert.match(plano.tarefas[0].description, /sem boleto/);
});

test("emitida sem apólice na pós-venda cai no texto do Portal do Cotador", () => {
  const plano = suhai.planoAcompanhamento({ ...item, status: 12 }, { status: 13 }, [], AGORA_ISO, { posVenda: { encontrada: false } });
  assert.equal(plano.atualizacao.apolice, undefined);
  assert.match(plano.tarefas[0].description, /buscar o boleto da 1ª parcela no Portal do Cotador/);
});

test("recusa reavaliável traz o parecer e o caminho da nova proposta", () => {
  const status = {
    status: 5,
    statusTexto: "Recusa Reavaliável (AUT)",
    recusaReavaliavelAut: "Poderá ser submetida para nova análise com fator fipe: 95.00%.",
    parecer: null,
  };
  const plano = suhai.planoAcompanhamento({ ...item, status: 3 }, status, [], AGORA_ISO);
  assert.equal(plano.atualizacao.final, true);
  assert.match(plano.nota, /fator fipe: 95\.00%/);
  assert.equal(plano.tarefas[0].chave, "task_recusa");
  assert.match(plano.tarefas[0].description, /novo cálculo e uma nova proposta/);
  assert.equal(plano.email.momento, "suhai_recusa");
});

test("cancelada só registra, sem Task", () => {
  const plano = suhai.planoAcompanhamento({ ...item, status: 3 }, { status: 7, statusTexto: "Cancelada à Pedido" }, [], AGORA_ISO);
  assert.equal(plano.atualizacao.final, true);
  assert.deepEqual(plano.tarefas, []);
  assert.match(plano.nota, /🚫 PROPOSTA SUHAI nº 12350578 — Cancelada a pedido/);
});

test("produção sai sem o prefixo de homologação", () => {
  const plano = suhai.planoAcompanhamento({ ...item, ambiente: "producao" }, { status: 3 }, [], AGORA_ISO);
  assert.match(plano.nota, /^🔎 PROPOSTA SUHAI/);
});

test("acompanhamento expira depois de maxDias", () => {
  assert.equal(suhai.acompanhamentoExpirado(item, AGORA, 45), false);
  assert.equal(suhai.acompanhamentoExpirado(item, AGORA + 45 * 86400000, 45), true);
  assert.match(suhai.tarefaExpirada({ ...item, statusTexto: "Aguardando emissão" }, 45).name, /sem desfecho em 45 dias/);
});

test("e-mail tem momento próprio para o acompanhamento", () => {
  const payload = emailNotif.buildEmailPayload({ phoneE164: "+5511900000001" }, { momento: "suhai_emitida", detalhe: "x" });
  assert.equal(payload.momento, "update");
  assert.match(payload.momento_descricao, /Apólice emitida — x$/);
});

// ——— Rodada com RTDB, gateway e Espo simulados ———

function rtdbFalso(inicial) {
  const raiz = JSON.parse(JSON.stringify(inicial));
  const partes = (caminho) => caminho.split("/").filter(Boolean);
  const ler = (caminho) => partes(caminho).reduce((no, p) => (no == null ? undefined : no[p]), raiz);
  const gravar = (caminho, valor) => {
    const ps = partes(caminho);
    let no = raiz;
    for (const p of ps.slice(0, -1)) no = no[p] = no[p] && typeof no[p] === "object" ? no[p] : {};
    if (valor === null || valor === undefined) delete no[ps.at(-1)];
    else no[ps.at(-1)] = JSON.parse(JSON.stringify(valor));
  };
  const ref = (caminho) => ({
    child: (sub) => ref(`${caminho}/${sub}`),
    once: async () => ({ val: () => (ler(caminho) === undefined ? null : JSON.parse(JSON.stringify(ler(caminho)))) }),
    set: async (valor) => gravar(caminho, valor),
    update: async (campos) => {
      for (const [k, v] of Object.entries(campos)) gravar(`${caminho}/${k}`, v);
    },
  });
  return { raiz, ref: ref("") };
}

function gatewayFalso(respostas) {
  const chamadas = [];
  const fetchImpl = async (url, opcoes) => {
    const rota = new URL(url).pathname;
    chamadas.push({ url, rota, corpo: JSON.parse(opcoes.body), auth: opcoes.headers.authorization });
    const resposta = respostas[rota];
    const status = resposta && resposta.httpStatus ? resposta.httpStatus : 200;
    return { ok: status < 400, status, text: async () => JSON.stringify(resposta && resposta.corpo ? resposta.corpo : resposta) };
  };
  return { chamadas, fetchImpl };
}

function espoFalso(t, { falharNote = false } = {}) {
  const chamadas = { notes: [], tasks: [], puts: [] };
  t.mock.method(espo, "postNote", async (_cfg, id, texto) => {
    if (falharNote) throw new Error("Espo fora");
    chamadas.notes.push({ id, texto });
  });
  t.mock.method(espo, "createTask", async (_cfg, id, tarefa) => chamadas.tasks.push({ id, ...tarefa }));
  t.mock.method(espo, "putFields", async (_cfg, entidade, id, campos) => chamadas.puts.push({ entidade, id, campos }));
  t.mock.method(emailNotif, "sendAdminEmail", async () => ({ success: true }));
  return chamadas;
}

const config = {
  enabled: true,
  ambientes: { homologacao: { url: "https://homologacao---gw.run.app", audience: "https://gw.run.app" } },
};
const espoAll = { dev: { baseUrl: "https://dev.exemplo", apiKey: "k" }, prod: {} };
const logger = { info() {}, warn() {}, error() {} };
const obterToken = async (audience) => `token-para-${audience}`;

function estadoInicial(extra = {}) {
  return {
    suhai_acompanhamento: { ld_teste: { ...item, ...extra } },
    leads_backup: {
      ld_teste: {
        environment: "staging",
        espocrmLeadId: "L1",
        espocrmOpportunityId: "O1",
        data: { phoneE164: "+5511900000001", nome: "Teste", captureChannel: "suhai_form" },
      },
    },
  };
}

test("rodada: pendência nova vira Note, Task, campos, e-mail e status gravado", async (t) => {
  const db = rtdbFalso(estadoInicial());
  const espoChamadas = espoFalso(t);
  const gw = gatewayFalso({
    "/proposta/status": { protocolo: "225514006", proposta: "12350578", status: 12, statusTexto: "Pendências para Emissão", dataAtualizacao: "2026-10-21 09:00:00" },
    "/proposta/pendencias": { propostas: [{ proposta: "12350578", pendencias: [pendenciaVistoria] }], semRegistro: false },
  });

  const resumo = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, emailUrls: { dev: "https://mail" }, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });

  assert.deepEqual({ total: resumo.total, mudou: resumo.mudou }, { total: 1, mudou: 1 });
  assert.equal(gw.chamadas[0].auth, "Bearer token-para-https://gw.run.app");
  assert.ok(gw.chamadas[0].url.startsWith("https://homologacao---gw.run.app/proposta/status"));
  assert.deepEqual(gw.chamadas[0].corpo, { proposta: "12350578" });
  assert.equal(espoChamadas.notes.length, 1);
  assert.equal(espoChamadas.notes[0].id, "L1");
  assert.deepEqual(espoChamadas.tasks.map((x) => x.chave), ["task_pend_vistoria_previa"]);
  assert.deepEqual(espoChamadas.puts.map((p) => `${p.entidade}/${p.id}`), ["Lead/L1", "Opportunity/O1"]);

  const salvo = db.raiz.suhai_acompanhamento.ld_teste;
  assert.equal(salvo.status, 12);
  assert.equal(salvo.final, false);
  assert.ok(salvo.efeitos.task_pend_vistoria_previa);
  assert.ok(Object.keys(salvo.efeitos).some((k) => k.startsWith("email_12_")));
  assert.equal(db.raiz.leads_backup.ld_teste.suhai_status_proposta.status, 12);
  assert.deepEqual(db.raiz.leads_backup.ld_teste.data.nome, "Teste");

  // Segunda rodada uma hora depois, mesma resposta: nada novo.
  const resumo2 = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, emailUrls: { dev: "https://mail" }, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA + 3600000, logger });
  assert.equal(resumo2.sem_mudanca, 1);
  assert.equal(espoChamadas.notes.length, 1);
  assert.equal(espoChamadas.tasks.length, 1);
});

test("rodada: consulta recente é pulada e ambiente sem gateway não é consultado", async (t) => {
  espoFalso(t);
  const recente = rtdbFalso(estadoInicial({ ultimaConsulta: new Date(AGORA - 10 * 60000).toISOString() }));
  const gw = gatewayFalso({});
  const resumo = await acomp.acompanharPropostas({ rootRef: recente.ref, config, espoAll, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });
  assert.equal(resumo.pulado, 1);

  const producao = rtdbFalso(estadoInicial({ ambiente: "producao" }));
  const resumo2 = await acomp.acompanharPropostas({ rootRef: producao.ref, config, espoAll, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });
  assert.equal(resumo2.pulado, 1);
  assert.equal(gw.chamadas.length, 0);
});

test("rodada: Note falhando não grava o status, e a próxima rodada tenta de novo", async (t) => {
  const db = rtdbFalso(estadoInicial({ status: 3 }));
  espoFalso(t, { falharNote: true });
  const gw = gatewayFalso({
    "/proposta/status": { proposta: "12350578", status: 13, statusTexto: "Emitida", dataAtualizacao: "2026-10-25 10:00:00" },
  });
  const resumo = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });

  assert.equal(resumo.erro, 1);
  const salvo = db.raiz.suhai_acompanhamento.ld_teste;
  assert.equal(salvo.status, 3);
  assert.equal(salvo.final, false);
  assert.ok(salvo.efeitos.task_emitida, "a Task que deu certo fica marcada");
  assert.equal(db.raiz.leads_backup.ld_teste.suhai_status_proposta, undefined);
  assert.equal(gw.chamadas.filter((c) => c.rota === "/proposta/pendencias").length, 0, "status final não consulta pendências");
});

test("rodada: emissão busca a apólice pela placa e põe o boleto na Task", async (t) => {
  const inicial = estadoInicial({ status: 12, transmitidaEm: "2026-10-20T15:00:00.000Z" });
  inicial.leads_backup.ld_teste.data.placa = "abc-1d23";
  const db = rtdbFalso(inicial);
  const espoChamadas = espoFalso(t);
  const gw = gatewayFalso({
    "/proposta/status": { proposta: "12350578", status: 13, statusTexto: "Emitida", dataAtualizacao: "2026-10-25 10:00:00" },
    "/posvenda/apolice-da-proposta": POS_VENDA,
  });
  const resumo = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });

  assert.equal(resumo.mudou, 1);
  const chamada = gw.chamadas.find((c) => c.rota === "/posvenda/apolice-da-proposta");
  assert.deepEqual(chamada.corpo, { proposta: "12350578", placa: "ABC1D23", emissaoDesde: "2026-10-19" });
  assert.match(espoChamadas.tasks[0].description, /http:\/\/i4pro\/boleto-1\.pdf/);
  assert.equal(db.raiz.suhai_acompanhamento.ld_teste.apolice, "1003106306367");
  assert.equal(db.raiz.suhai_acompanhamento.ld_teste.final, true);
});

test("rodada: pós-venda fora não segura a emissão", async (t) => {
  const db = rtdbFalso(estadoInicial({ status: 12 }));
  const espoChamadas = espoFalso(t);
  const gw = gatewayFalso({
    "/proposta/status": { proposta: "12350578", status: 13, statusTexto: "Emitida" },
    "/posvenda/apolice-da-proposta": { httpStatus: 503, corpo: { erro: "sem_api_key", mensagem: "sem chave" } },
  });
  const resumo = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });

  assert.equal(resumo.mudou, 1);
  assert.match(espoChamadas.tasks[0].description, /Portal do Cotador/);
  assert.equal(db.raiz.suhai_acompanhamento.ld_teste.final, true);
});

test("rodada: gateway fora conta erros seguidos e avisa por e-mail na 6ª", async (t) => {
  espoFalso(t);
  const db = rtdbFalso(estadoInicial({ errosSeguidos: 5 }));
  const gw = gatewayFalso({ "/proposta/status": { httpStatus: 502, corpo: { erro: "indisponivel", mensagem: "fetch failed" } } });
  const resumo = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, emailUrls: { dev: "https://mail" }, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });

  assert.equal(resumo.erro, 1);
  const salvo = db.raiz.suhai_acompanhamento.ld_teste;
  assert.equal(salvo.errosSeguidos, 6);
  assert.equal(salvo.ultimoErro, "fetch failed");
  assert.ok(salvo.efeitos[`email_erro_${AGORA_ISO.slice(0, 10)}`]);
  assert.equal(emailNotif.sendAdminEmail.mock.callCount(), 1);
});

test("rodada: lead apagado encerra o acompanhamento", async (t) => {
  espoFalso(t);
  const inicial = estadoInicial();
  delete inicial.leads_backup;
  const db = rtdbFalso(inicial);
  const resumo = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, obterToken, fetchImpl: gatewayFalso({}).fetchImpl, agora: AGORA, logger });
  assert.equal(resumo.lead_apagado, 1);
  assert.equal(db.raiz.suhai_acompanhamento.ld_teste.motivoFinal, "lead_apagado");
});

test("rodada: proposta antiga abre Task de conferência e encerra", async (t) => {
  const espoChamadas = espoFalso(t);
  const db = rtdbFalso(estadoInicial({ transmitidaEm: "2026-08-01T00:00:00.000Z", statusTexto: "Aguardando emissão" }));
  const gw = gatewayFalso({});
  const resumo = await acomp.acompanharPropostas({ rootRef: db.ref, config, espoAll, obterToken, fetchImpl: gw.fetchImpl, agora: AGORA, logger });
  assert.equal(resumo.expirado, 1);
  assert.deepEqual(espoChamadas.tasks.map((x) => x.chave), ["task_expirada"]);
  assert.equal(db.raiz.suhai_acompanhamento.ld_teste.motivoFinal, "expirado");
  assert.equal(gw.chamadas.length, 0);
});

test("bloco do Espo segue o environment do lead", () => {
  assert.equal(acomp.espoBloco(espoAll, "staging").baseUrl, "https://dev.exemplo");
  assert.equal(acomp.espoBloco(espoAll, "production"), null);
});
