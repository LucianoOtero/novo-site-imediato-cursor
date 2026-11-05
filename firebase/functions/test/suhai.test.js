const test = require("node:test");
const assert = require("node:assert/strict");

const suhai = require("../suhai");

const ofertas = [
  { cdCobertura: 1013, plano: "Essencial", assistencia: 0, premioTotal: 900.5, premioMensalEstimado: 90.05, franquia: null, importanciaSegurada: 50000, parcelamentoMaximo: 10 },
  { cdCobertura: 1009, plano: "Completo", assistencia: 1, premioTotal: 2400, premioMensalEstimado: 240, franquia: 3500, importanciaSegurada: 50000, parcelamentoMaximo: 10 },
];

const base = {
  captureChannel: "suhai_form",
  phoneE164: "+5511987654321",
  nome: "Maria Silva",
  veiculoMarcaModelo: "VW GOLF",
};

const cotacao = {
  status: "sucesso",
  ambiente: "homologacao",
  simulado: false,
  protocolo: "531928",
  veiculo: "VW GOLF 2020",
  valorFipe: 80000,
  premissas: { utilizacao: "particular", garagemResidencia: true, garagemTrabalho: false, garagemEscola: false, classeBonus: 0, cepPernoite: "01310100" },
  ofertas,
  geradoEm: "2026-10-15T19:00:00.000Z",
};

const proposta = {
  status: "sucesso",
  ambiente: "homologacao",
  protocolo: "531928",
  numeroProposta: "9061210",
  cdCobertura: 1009,
  formaPagamento: "boleto",
  parcelas: 10,
  diaVencimento: 10,
  vigenciaInicio: "2026-10-16",
  geradoEm: "2026-10-15T19:05:00.000Z",
};

test("isSuhai só reconhece o canal suhai_form", () => {
  assert.equal(suhai.isSuhai(base), true);
  assert.equal(suhai.isSuhai({ captureChannel: "lead_form" }), false);
});

test("flagKey separa ocorrências que se repetem", () => {
  assert.equal(suhai.flagKey("progress", { ...base, suhaiEtapa: "cep" }), "progress_cep");
  assert.equal(suhai.flagKey("progress", { placa: "ABC1D23" }), "progress_veiculo");
  assert.equal(suhai.flagKey("progress", {}), "progress_pessoais");
  assert.equal(suhai.flagKey("suhai_quote", { suhaiCotacao: cotacao }), "suhai_quote_531928");
  const falha = suhai.flagKey("suhai_quote", { suhaiCotacao: { status: "falha", geradoEm: "2026-10-15T19:00:00.000Z" } });
  assert.doesNotMatch(falha, /[.#$/[\]:]/);
  assert.equal(suhai.flagKey("suhai_proposal", { suhaiProposta: proposta }), "suhai_proposal_9061210");
  assert.equal(suhai.flagKey("complete", {}), "complete");
});

test("cotação com sucesso grava valores em campos existentes e o número em campo novo", () => {
  const dados = { ...base, suhaiCotacao: cotacao };
  assert.deepEqual(suhai.funnelFieldsExistentes("suhai_quote", dados), {
    cEtapaFunil: "Cálculo concluído",
    cStatusCalculo: "Concluído",
    cValorRecomendado: suhai.moeda(2400),
    cValorAlternativo: suhai.moeda(900.5),
  });
  assert.equal(suhai.etapaFunilNova("suhai_quote", dados), "Cotação Suhai apresentada");
  assert.deepEqual(suhai.camposNovos("suhai_quote", dados), { cNumeroCotacao: "531928" });
  assert.deepEqual(suhai.opportunityFieldsExistentes("suhai_quote"), { cSeguradora: "Suhai" });
});

test("cotação simulada não grava número nem manda WhatsApp", () => {
  const dados = { ...base, suhaiCotacao: { ...cotacao, simulado: true } };
  assert.equal(suhai.camposNovos("suhai_quote", dados), null);
  assert.equal(suhai.octaTemplate("suhai_quote", dados, "Maria"), null);
});

test("cotação com falha vira cálculo manual com Task e calculo_manual", () => {
  const dados = { ...base, suhaiCotacao: { status: "falha", ambiente: "producao", simulado: false, erro: "Modelo fora da tabela", codigoSuhai: "503", geradoEm: "x" } };
  assert.deepEqual(suhai.funnelFieldsExistentes("suhai_quote", dados), {
    cEtapaFunil: "Cálculo manual pendente",
    cStatusCalculo: "Falhou",
  });
  assert.equal(suhai.etapaFunilNova("suhai_quote", dados), null);
  assert.match(suhai.taskSpec("suhai_quote", dados).name, /^Efetuar cotação Suhai manual/);
  const outraFalha = { ...base, suhaiCotacao: { ...dados.suhaiCotacao, geradoEm: "y" } };
  assert.notEqual(suhai.flagKey("suhai_quote", dados), suhai.flagKey("suhai_quote", outraFalha));
  assert.equal(suhai.taskSpec("suhai_quote", dados).chave, suhai.taskSpec("suhai_quote", outraFalha).chave);
  assert.deepEqual(suhai.octaTemplate("suhai_quote", dados, "Maria"), { key: "calculo_manual", variables: ["Maria"] });
  const email = suhai.emailMomento("suhai_quote", dados);
  assert.equal(email.momento, "suhai_erro");
  assert.equal(email.erro.message, "Modelo fora da tabela");
});

test("erro em HTML do Cloud Run vira uma linha na Note, na Task e no e-mail", () => {
  const html =
    'gateway /cotacao respondeu 401: <html><head>\n<meta http-equiv="content-type" content="text/html;charset=utf-8">\n<title>401 Unauthorized</title>\n</head>\n<body><h1>Error: Unauthorized</h1><h2>Your client does not have permission</h2></body></html>';
  const dados = { ...base, suhaiCotacao: { status: "falha", ambiente: "homologacao", simulado: false, erro: html, geradoEm: "x" } };
  assert.equal(suhai.erroLegivel(html), "gateway /cotacao respondeu 401 (401 Unauthorized)");
  assert.match(suhai.buildNote("suhai_quote", dados), /NÃO CONCLUÍDA — gateway \/cotacao respondeu 401 \(401 Unauthorized\)\./);
  assert.doesNotMatch(suhai.buildNote("suhai_quote", dados), /<html|<title/);
  assert.doesNotMatch(suhai.taskSpec("suhai_quote", dados).description, /</);
  assert.equal(suhai.emailMomento("suhai_quote", dados).erro.message, "gateway /cotacao respondeu 401 (401 Unauthorized)");
  assert.equal(suhai.erroLegivel("Modelo fora da tabela"), "Modelo fora da tabela");
  assert.equal(dados.suhaiCotacao.erro, html);
});

test("template da cotação pronta usa o plano recomendado", () => {
  const escolha = suhai.octaTemplate("suhai_quote", { ...base, suhaiCotacao: cotacao }, "Maria");
  assert.equal(escolha.key, "suhai_cotacao_pronta");
  assert.deepEqual(escolha.variables, [
    "Maria",
    "VW GOLF 2020",
    "Completo — assistência 200 km",
    `${suhai.moeda(2400)} à vista ou 10x de ${suhai.moeda(240)}`,
    "531928",
  ]);
});

// Cotação 228592368 / proposta 12490227: a mensagem dizia 12x de R$ 213,03 (à vista ÷ 12).
const completoAnne = {
  protocolo: "228592368",
  cdCobertura: 1009,
  plano: "Completo",
  assistencia: 1,
  premioTotal: 2556.34,
  premioMensalEstimado: 261.91,
  franquia: 10270,
  importanciaSegurada: 44339.4,
  parcelamentoMaximo: 12,
  parcelas: [
    { quantidade: 1, valorParcela: 2556.34, valorTotal: 2556.34 },
    { quantidade: 12, valorParcela: 261.91, valorTotal: 3142.92 },
  ],
};
const cotacaoAnne = {
  ...cotacao,
  ambiente: "producao",
  protocolo: "228592368",
  valorFipe: 44339.4,
  valorFipeTabela: 63342,
  fatorFipe: 70,
  ofertas: [completoAnne],
};
const propostaAnne = { ...proposta, ambiente: "producao", protocolo: "228592368", numeroProposta: "12490227", parcelas: 12, diaVencimento: 15 };

test("valores da cotação e da proposta saem da tabela de parcelas da Suhai", () => {
  const dados = { ...base, suhaiCotacao: cotacaoAnne, suhaiPlano: completoAnne, suhaiProposta: propostaAnne };
  const semNbsp = (texto) => texto.replace(/\u00a0/g, " ");

  const cotacaoPronta = suhai.octaTemplate("suhai_quote", dados, "Ana");
  assert.equal(semNbsp(cotacaoPronta.variables[3]), "R$ 2.556,34 à vista ou 12x de R$ 261,91");

  const enviada = suhai.octaTemplate("suhai_proposal", dados, "Ana");
  assert.equal(semNbsp(enviada.variables[2]), "Boleto em 12x de R$ 261,91 (total R$ 3.142,92), vencimento dia 15");
  assert.doesNotMatch(enviada.variables[2], /213,03/);

  const campos = suhai.camposNovos("suhai_proposal", dados);
  assert.equal(campos.cPagamento, enviada.variables[2]);
  assert.ok(campos.cPagamento.length <= 80);

  const notaProposta = semNbsp(suhai.buildNote("suhai_proposal", dados));
  assert.match(notaProposta, /Indenização: 70% da FIPE \(R\$ 44\.339,40\)/);
  assert.match(notaProposta, /R\$ 2\.556,34 à vista/);

  const notaCotacao = semNbsp(suhai.buildNote("suhai_quote", dados));
  assert.match(notaCotacao, /FIPE R\$ 63\.342,00 · indenização 70% da FIPE \(R\$ 44\.339,40\)/);
  assert.match(notaCotacao, /Completo — assistência 200 km: R\$ 2\.556,34 à vista ou 12x de R\$ 261,91/);

  assert.match(semNbsp(suhai.emailMomento("suhai_proposal", dados).detalhe), /12x de R\$ 261,91/);
});

test("registro antigo, sem a tabela: parcela máxima conhecida, intermediária sem valor, nunca dividida", () => {
  const { parcelas: _parcelas, ...semTabela } = completoAnne;
  const semNbsp = (texto) => texto.replace(/\u00a0/g, " ");
  assert.equal(
    semNbsp(suhai.pagamentoTexto(propostaAnne, semTabela)),
    "Boleto em 12x de R$ 261,91, vencimento dia 15",
  );
  assert.equal(suhai.pagamentoTexto({ ...propostaAnne, parcelas: 10 }, semTabela), "Boleto em 10x, vencimento dia 15");
  assert.equal(
    semNbsp(suhai.pagamentoTexto({ ...propostaAnne, parcelas: 1 }, semTabela)),
    "Boleto à vista, R$ 2.556,34, vencimento dia 15",
  );
  assert.equal(suhai.pagamentoTexto(propostaAnne, null), "Boleto em 12x, vencimento dia 15");
});

test("modelos v3/v4 saem com o ID no secret; sem ID ou sem o fator FIPE, os anteriores", () => {
  const dados = { ...base, suhaiCotacao: cotacaoAnne, suhaiPlano: completoAnne, suhaiProposta: propostaAnne };
  const templates = { suhai_cotacao_pronta_v3: "id-v3", suhai_proposta_enviada_v4: "id-v4" };
  const semNbsp = (lista) => lista.map((texto) => texto.replace(/\u00a0/g, " "));

  const cotacaoV3 = suhai.octaTemplate("suhai_quote", dados, "Ana", templates);
  assert.equal(cotacaoV3.key, "suhai_cotacao_pronta_v3");
  assert.deepEqual(semNbsp(cotacaoV3.variables), [
    "Ana",
    "VW GOLF 2020",
    "Completo — assistência 200 km",
    "70%",
    "R$ 2.556,34",
    "12x de R$ 261,91",
    "228592368",
  ]);

  const propostaV4 = suhai.octaTemplate("suhai_proposal", dados, "Ana", templates);
  assert.equal(propostaV4.key, "suhai_proposta_enviada_v4");
  assert.deepEqual(semNbsp(propostaV4.variables), [
    "Ana",
    "12490227",
    "Completo — assistência 200 km",
    "70%",
    "R$ 44.339,40",
    "Boleto em 12x de R$ 261,91 (total R$ 3.142,92)",
    "15",
  ]);
  assert.ok(propostaV4.variables.every((valor) => valor && !/\n/.test(valor)));

  assert.equal(suhai.octaTemplate("suhai_quote", dados, "Ana", {}).key, "suhai_cotacao_pronta");
  assert.equal(suhai.octaTemplate("suhai_proposal", dados, "Ana").key, "suhai_proposta_enviada");

  const semFator = { ...dados, suhaiCotacao: { ...cotacaoAnne, fatorFipe: undefined } };
  assert.equal(suhai.octaTemplate("suhai_quote", semFator, "Ana", templates).key, "suhai_cotacao_pronta");
  assert.equal(suhai.octaTemplate("suhai_proposal", semFator, "Ana", templates).key, "suhai_proposta_enviada");
});

test("tabela de parcelas lida do RTDB como objeto também vale", () => {
  const comoObjeto = { ...completoAnne, parcelas: { 0: completoAnne.parcelas[0], 1: completoAnne.parcelas[1] } };
  assert.match(suhai.pagamentoTexto(propostaAnne, comoObjeto), /261,91 \(total/);
});

test("note da cotação lista todas as ofertas e marca homologação", () => {
  const nota = suhai.buildNote("suhai_quote", { ...base, suhaiCotacao: cotacao });
  assert.match(nota, /^\[HOMOLOGAÇÃO\] /);
  assert.match(nota, /nº 531928/);
  assert.match(nota, /\[cd 1013\]/);
  assert.match(nota, /\[cd 1009\]/);
  assert.match(nota, /bônus 0/);
});

test("plano escolhido grava plano, prêmio e franquia", () => {
  const dados = { ...base, suhaiCotacao: cotacao, suhaiPlano: ofertas[1] };
  assert.deepEqual(suhai.camposNovos("suhai_plan_selected", dados), {
    cNumeroCotacao: "531928",
    cPlanoEscolhido: "Completo — assistência 200 km (cd 1009)",
    cPremioTotal: 2400,
    cPremioTotalCurrency: "BRL",
    cFranquia: suhai.moeda(3500),
  });
  assert.equal(suhai.etapaFunilNova("suhai_plan_selected", dados), "Plano escolhido");
  assert.equal(suhai.octaTemplate("suhai_plan_selected", dados, "Maria"), null);
  assert.equal(suhai.emailMomento("suhai_plan_selected", dados).momento, "suhai_plano");
});

test("plano de outro nível de assistência usa o protocolo da cotação daquele nível", () => {
  const plano500 = { protocolo: "532159", cdCobertura: 1029, plano: "Completo", assistencia: 2, premioTotal: 1339.38, premioMensalEstimado: 130, franquia: 3500, importanciaSegurada: 50000, parcelamentoMaximo: 12 };
  const somada = { ...cotacao, ofertas: [...ofertas.map((o) => ({ ...o, protocolo: "531928" })), plano500] };
  const dados = { ...base, suhaiCotacao: somada, suhaiPlano: plano500 };

  assert.equal(suhai.camposNovos("suhai_plan_selected", dados).cNumeroCotacao, "532159");
  assert.match(suhai.buildNote("suhai_plan_selected", dados), /Cotação nº 532159\.$/);
  assert.match(suhai.emailMomento("suhai_plan_selected", dados).detalhe, /cotação nº 532159/);

  const nota = suhai.buildNote("suhai_quote", { ...base, suhaiCotacao: somada });
  assert.match(nota, /\[cd 1029\] — cotação nº 532159/);
  assert.doesNotMatch(nota, /\[cd 1009\] — cotação/);
});

test("proposta transmitida grava número, pagamento, Task de emissão e WhatsApp", () => {
  const dados = { ...base, suhaiCotacao: cotacao, suhaiPlano: ofertas[1], suhaiProposta: proposta };
  const campos = suhai.camposNovos("suhai_proposal", dados);
  assert.equal(campos.cNumeroProposta, "9061210");
  assert.match(campos.cPagamento, /^Boleto em 10x de R\$\s240,00, vencimento dia 10$/);
  assert.equal(suhai.etapaFunilNova("suhai_proposal", dados), "Proposta transmitida");
  const tarefa = suhai.taskSpec("suhai_proposal", dados);
  assert.match(tarefa.name, /Acompanhar proposta Suhai nº 9061210 até a emissão da apólice/);
  assert.match(tarefa.description, /cobrança só existe depois da apólice emitida/);
  assert.equal(tarefa.dias, 0);
  const escolha = suhai.octaTemplate("suhai_proposal", dados, "Maria");
  assert.equal(escolha.key, "suhai_proposta_enviada");
  assert.equal(escolha.variables[1], "9061210");
  assert.match(suhai.buildNote("suhai_proposal", dados), /Início da vigência: 16\/10\/2026/);
});

test("proposta com erro vira Task de pendência sem WhatsApp", () => {
  const dados = { ...base, suhaiProposta: { ...proposta, status: "falha", numeroProposta: undefined, erro: "Chassi inválido" } };
  assert.equal(suhai.etapaFunilNova("suhai_proposal", dados), "Proposta com erro");
  assert.match(suhai.taskSpec("suhai_proposal", dados).name, /^\[HOMOLOGAÇÃO\] Concluir proposta Suhai pendente/);
  assert.equal(suhai.octaTemplate("suhai_proposal", dados, "Maria"), null);
  assert.equal(suhai.emailMomento("suhai_proposal", dados).momento, "suhai_erro");
});

test("e-mail das etapas de veículo e CEP", () => {
  assert.equal(suhai.emailMomento("progress", { ...base, suhaiEtapa: "veiculo" }).momento, "suhai_progress");
  assert.match(suhai.emailMomento("progress", { ...base, suhaiEtapa: "cep" }).detalhe, /CEP de pernoite/);
});
