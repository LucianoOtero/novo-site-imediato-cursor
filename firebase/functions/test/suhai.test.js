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

test("template da cotação pronta usa o plano recomendado", () => {
  const escolha = suhai.octaTemplate("suhai_quote", { ...base, suhaiCotacao: cotacao }, "Maria");
  assert.equal(escolha.key, "suhai_cotacao_pronta");
  assert.deepEqual(escolha.variables, ["Maria", "VW GOLF 2020", "Completo — assistência 200 km", suhai.moeda(2400), "531928"]);
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
  assert.match(campos.cPagamento, /^Boleto em 10x/);
  assert.equal(suhai.etapaFunilNova("suhai_proposal", dados), "Proposta transmitida");
  const tarefa = suhai.taskSpec("suhai_proposal", dados);
  assert.match(tarefa.name, /Emitir apólice Suhai e enviar boleto — proposta nº 9061210/);
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
