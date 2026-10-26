/**
 * Testes da pós-venda REST (Digibee) contra os exemplos do portal SUHAPI.
 *
 * Executar: node --test  (a partir de suhai-gateway/)
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "../src/config.js";
import {
  apoliceDaProposta,
  chamarRest,
  consultarComissao,
  lerApolice,
  lerEnvelope,
  lerParcelas,
  parametrosPesquisa,
  SuhaiRestError,
} from "../src/posvenda.js";

config.apiKey = "chave-de-teste";

const ok = (dados) => ({ status: { cod_status: 200, tipo_status: "SUCESSO", desc_status: "Ação realizada com sucesso.", msg_excecao: "" }, dados });

const CONSULTA = {
  Apolice: {
    cod_susep: 4952,
    cod_apolice: 1003106306367,
    status: "Emitida",
    tipo_endosso: "Apólice",
    nr_endosso: 0,
    data_inicio_vigencia_apolice: "2026-10-24",
    data_fim_vigencia_apolice: "2027-10-24",
    data_proposta: "2026-10-20",
    proposta: "10760035",
    data_emissao: "2026-10-24",
    valor_premio_pago: 1243.06,
    qtde_parcelas: 4,
    venc_primeiraparcela: "2026-11-03",
    link_apolice: "http://i4prohomo.suhaiseguradora.com.br/pdf.aspx?eng_idrelatorio=615",
    link_boleto: "http://i4prohomo.suhaiseguradora.com.br/pdf.aspx?eng_idrelatorio=20",
  },
  Corretor: { razao_social: "Corretor Teste", perc_comissao: 20, valor_total_comissao_corretor: 248.61 },
  Segurado: { nome_pessoa: "Fulano", cnpj_cpf_segurado: 22812911767, email: "x@y.z" },
  Veiculo: { placa: "ABC1D23", marca: "Toyota", modelo: "Corolla XEi" },
};

const PARCELAS = {
  Endossos: [
    {
      nr_endosso: 0,
      data_emissao: "2026-10-24",
      tipo_endosso: "Apólice",
      link_boletos: "http://i4prohomo/boletos",
      Parcelas: [
        { parcela: 2, valor_total_parcela: 310.5, situacao: "Pendente", data_ultimo_vencimento: "2026-12-03", cod_forma_pagamento: 1000009, link_boleto: "http://b/2", cod_pagamento: "237..2" },
        { parcela: 1, valor_total_parcela: 312.56, situacao: "Pendente", data_ultimo_vencimento: "2026-11-03", cod_forma_pagamento: 1000009, link_boleto: "http://b/1", cod_pagamento: "237..1" },
      ],
    },
  ],
};

function fetchFalso(rotas, chamadas = []) {
  return async (url, init) => {
    const u = new URL(url);
    chamadas.push({ caminho: u.pathname.replace(/^.*\/v1/, ""), query: Object.fromEntries(u.searchParams), headers: init.headers });
    const resposta = rotas(u.pathname.replace(/^.*\/v1/, ""), u.searchParams);
    return {
      status: resposta.http ?? 200,
      text: async () => (resposta.corpo === undefined ? "" : JSON.stringify(resposta.corpo)),
    };
  };
}

test("envelope: 200 devolve dados, 204 vira null, erro carrega o código", () => {
  assert.deepEqual(lerEnvelope(200, ok({ a: 1 }), "/x"), { a: 1 });
  assert.equal(lerEnvelope(200, { status: { cod_status: 204 }, dados: {} }, "/x"), null);
  assert.equal(lerEnvelope(204, null, "/x"), null);
  assert.throws(
    () => lerEnvelope(401, { status: { cod_status: 401, desc_status: "Acesso não autorizado.", msg_excecao: "restrição de segurança" } }, "/x"),
    (e) => e instanceof SuhaiRestError && e.codigoSuhai === "401" && e.message === "Acesso não autorizado.",
  );
});

test("chamarRest manda apikey e omite parâmetros vazios", async () => {
  const chamadas = [];
  await chamarRest("/apolice/pesquisa", { a: "1", b: null, c: "" }, { fetchImpl: fetchFalso(() => ({ corpo: ok({}) }), chamadas) });
  assert.equal(chamadas[0].headers.apikey, "chave-de-teste");
  assert.deepEqual(chamadas[0].query, { a: "1" });
});

test("pesquisa exige filtro além do corretor e sempre manda o CNPJ da corretora", () => {
  assert.throws(() => parametrosPesquisa({}), /placa, chassi ou emissaoDesde/);
  assert.throws(() => parametrosPesquisa({ placa: "XX" }), /Placa inválida/);
  assert.throws(() => parametrosPesquisa({ emissaoDesde: "24/10/2026" }), /AAAA-MM-DD/);
  const p = parametrosPesquisa({ placa: "abc-1d23", cnpj_cpf_corretor: "00000000000000" });
  assert.equal(p.placa, "ABC1D23");
  assert.equal(p.cnpj_cpf_corretor, "33216054000148");
});

test("consulta de apólice: links, prêmio e comissão, sem dados pessoais do segurado", () => {
  const a = lerApolice(CONSULTA);
  assert.equal(a.codApolice, "1003106306367");
  assert.equal(a.proposta, "10760035");
  assert.match(a.linkApolice, /idrelatorio=615/);
  assert.match(a.linkBoleto, /idrelatorio=20/);
  assert.equal(a.qtdeParcelas, 4);
  assert.deepEqual(a.comissao, { percentual: 20, valorTotal: 248.61 });
  assert.equal(JSON.stringify(a).includes("22812911767"), false);
  assert.equal(JSON.stringify(a).includes("Fulano"), false);
  assert.equal(lerApolice(null), null);
});

test("parcelas: a próxima pendente é a de vencimento mais cedo", () => {
  const r = lerParcelas(PARCELAS);
  assert.equal(r.endossos[0].parcelas.length, 2);
  assert.equal(r.proximaPendente.parcela, 1);
  assert.equal(r.proximaPendente.formaPagamento, "Boleto Bradesco");
  assert.equal(r.proximaPendente.linkBoleto, "http://b/1");
  assert.deepEqual(lerParcelas(null), { endossos: [], proximaPendente: null });
});

test("parcelas no nível de dados (formato da tabela) também são lidas", () => {
  const r = lerParcelas({ Endossos: [{ nr_endosso: 0 }], Parcelas: [{ parcela: 1, situacao: "Quitada" }] });
  assert.equal(r.endossos[0].parcelas[0].situacao, "Quitada");
  assert.equal(r.proximaPendente, null);
});

test("apoliceDaProposta acha a apólice certa entre os códigos da placa", async () => {
  const chamadas = [];
  const fetchImpl = fetchFalso((caminho, qs) => {
    if (caminho === "/apolice/pesquisa") return { corpo: ok({ cod_apolice: [1003106306300, 1003106306367] }) };
    if (caminho === "/apolice/consulta") {
      const cod = qs.get("cod_apolice");
      const proposta = cod === "1003106306367" ? "0010760035" : "99999";
      return { corpo: ok({ ...CONSULTA, Apolice: { ...CONSULTA.Apolice, cod_apolice: Number(cod), proposta } }) };
    }
    if (caminho === "/apolice/parcela") return { corpo: ok(PARCELAS) };
    return { http: 404, corpo: { status: { cod_status: 404 } } };
  }, chamadas);

  const r = await apoliceDaProposta(
    { proposta: "10760035", placa: "ABC1D23", emissaoDesde: "2026-10-20" },
    { fetchImpl, agora: Date.parse("2026-10-25T12:00:00Z") },
  );
  assert.equal(r.encontrada, true);
  assert.equal(r.apolice.codApolice, "1003106306367");
  assert.equal(r.parcelas.proximaPendente.parcela, 1);
  assert.deepEqual(chamadas[0].query, {
    cnpj_cpf_corretor: "33216054000148",
    placa: "ABC1D23",
    data_emissao_desde: "2026-10-20",
    data_emissao_ate: "2026-10-25",
  });
  assert.equal(chamadas[1].query.cod_apolice, "1003106306367", "consulta o código mais novo primeiro");
});

test("apoliceDaProposta sem apólice ainda (204) responde encontrada=false", async () => {
  const fetchImpl = fetchFalso(() => ({ corpo: { status: { cod_status: 204 }, dados: {} } }));
  const r = await apoliceDaProposta({ proposta: "10760035", placa: "ABC1D23" }, { fetchImpl, agora: Date.parse("2026-10-25T12:00:00Z") });
  assert.equal(r.encontrada, false);
  assert.equal(r.consultadas, 0);
});

test("comissão: período de até 31 dias e CNPJ da corretora", async () => {
  await assert.rejects(() => consultarComissao({ desde: "2026-09-01", ate: "2026-10-25" }), /0 a 31 dias/);
  const chamadas = [];
  const fetchImpl = fetchFalso(
    () => ({
      corpo: ok({
        corretor: "Imediato",
        Comissoes: [{ cod_apolice: 1003106306352, nr_parcela: 1, valor_pagamento: 89.44, perc_comissao: 10, status_pagamento: "Pendente" }],
        Resumo_Diario: [{ data_pagamento: "2026-10-24", valor_bruto: 89.44, valor_liquido: 88.1 }],
      }),
    }),
    chamadas,
  );
  const r = await consultarComissao({ desde: "2026-10-01", ate: "2026-10-25" }, { fetchImpl });
  assert.equal(chamadas[0].query.cnpj_cpf_corretor, "33216054000148");
  assert.equal(r.comissoes[0].codApolice, "1003106306352");
  assert.equal(r.resumoDiario[0].liquido, 88.1);
});
