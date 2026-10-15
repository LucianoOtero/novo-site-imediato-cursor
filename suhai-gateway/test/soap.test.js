/**
 * Testes do cliente SOAP contra os exemplos oficiais da Suhai.
 *
 * Enquanto não há credencial de homologação, estes fixtures são a única
 * fonte de verdade sobre o formato real de request e response.
 *
 * Executar: node --test  (a partir de suhai-gateway/)
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { XMLParser } from "fast-xml-parser";

import { lerRespostaCotacao, montarEnvelopeCotacao } from "../src/cotacao.js";
import { lerRespostaFipe, montarEnvelopeFipe } from "../src/fipe.js";
import { lerRespostaProposta, montarEnvelopeProposta } from "../src/proposta.js";

const aqui = dirname(fileURLToPath(import.meta.url));
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
});

function corpoDoFixture(nome) {
  const xml = readFileSync(join(aqui, "fixtures", nome), "utf8");
  return parser.parse(xml).Envelope.Body;
}

const credenciais = { login: "login1234", senha: "senha1234" };

const payload = {
  proponente: {
    cpf: "50131509810",
    nome: "Gustavo Alencar Giaciani",
    dataNascimento: "2001-03-27",
    sexo: 2,
    estadoCivil: 1,
    email: "gustavo@exemplo.com.br",
  },
  condutorPrincipal: {
    cpf: "50131509810",
    nome: "Gustavo Alencar Giaciani",
    dataNascimento: "2001-03-27",
    sexo: 2,
    estadoCivil: 1,
  },
  veiculo: {
    categoria: "auto",
    marca: "Citroën",
    modelo: "C3 Excl. 1.6 VTi Flex Start 16V 5p Aut.",
    codFipe: "011119-8",
    anoModelo: 2014,
    anoFabricacao: 2014,
    zeroKm: false,
    placa: "ABC1D23",
  },
  uso: {
    utilizacao: "particular",
    tipoUtilizacao: 1,
    cepPernoite: "80010000",
    garagem: { residencia: true, trabalho: false, escola: true },
  },
  contrato: { tipoContratacao: 1, classeBonus: 0, tabelaComissao: "tab 1" },
};

test("envelope de cotação usa a operação e o wrapper documentados", () => {
  const xml = montarEnvelopeCotacao(payload, credenciais);

  assert.match(xml, /<suh:IncluirCotacaoSuhai>/);
  assert.match(xml, /<suh:cotacao>/);
  assert.match(xml, /xmlns:suh="suhaiseguradoracotacao\.com\.br:5155"/);
  assert.match(xml, /<suh:login>login1234<\/suh:login>/);
  assert.match(xml, /<suh:marca>Citroën<\/suh:marca>/);
  assert.match(xml, /<suh:anoModelo>2014<\/suh:anoModelo>/);
});

test("perguntas de garagem seguem o domínio 1 sim / 3 não", () => {
  const xml = montarEnvelopeCotacao(payload, credenciais);

  assert.match(xml, /<suh:pergunta1>1<\/suh:pergunta1>/);
  assert.match(xml, /<suh:pergunta2>3<\/suh:pergunta2>/);
  assert.match(xml, /<suh:pergunta3>1<\/suh:pergunta3>/);
  // Pergunta 4 é exclusiva de caminhão e van.
  assert.match(xml, /<suh:pergunta4\/>/);
});

test("caminhão responde só a pergunta 4", () => {
  const xml = montarEnvelopeCotacao(
    { ...payload, veiculo: { ...payload.veiculo, categoria: "caminhao" }, uso: { ...payload.uso, garagem: { residencia: false, trabalho: false, escola: false, patio: true } } },
    credenciais,
  );

  assert.match(xml, /<suh:pergunta1\/>/);
  assert.match(xml, /<suh:pergunta4>1<\/suh:pergunta4>/);
});

test("cotação sem cdCobertura para receber todas as coberturas", () => {
  assert.match(montarEnvelopeCotacao(payload, credenciais), /<suh:cdCobertura\/>/);
});

test("veículo 0 km usa a placa convencional YYY9999", () => {
  const xml = montarEnvelopeCotacao(
    { ...payload, veiculo: { ...payload.veiculo, zeroKm: true, placa: undefined } },
    credenciais,
  );

  assert.match(xml, /<suh:zeroKm>S<\/suh:zeroKm>/);
  assert.match(xml, /<suh:placa>YYY9999<\/suh:placa>/);
});

test("caracteres especiais são escapados no XML", () => {
  const xml = montarEnvelopeCotacao(
    { ...payload, proponente: { ...payload.proponente, nome: "Silva & Filhos <teste>" } },
    credenciais,
  );

  assert.match(xml, /<suh:nome>Silva &amp; Filhos &lt;teste&gt;<\/suh:nome>/);
});

test("resposta de sucesso vira protocolo, veículo e coberturas", () => {
  const cotacao = lerRespostaCotacao(corpoDoFixture("cotacao-sucesso.xml"));

  assert.equal(cotacao.protocolo, "414324");
  assert.equal(cotacao.codMsgRet, "001");
  // Separador de milhar do XML não pode virar NaN nem truncar o valor.
  assert.equal(cotacao.veiculo.valorFipe, 40222);
  assert.equal(cotacao.veiculo.importanciaSegurada, 40222);
  assert.equal(cotacao.franquia.valor, 7241.58);
  assert.equal(cotacao.coberturas.length, 3);

  const essencial = cotacao.coberturas.find((c) => c.id === 1003);
  assert.equal(essencial.premioLiquido, 733.35);
  assert.equal(essencial.parcelas.length, 2);

  const aVista = essencial.parcelas.find((p) => p.quantidade === 1);
  assert.equal(aVista.valorTotal, 787.47);
  assert.equal(aVista.valorParcela, 787.47);

  const em12 = essencial.parcelas.find((p) => p.quantidade === 12);
  assert.equal(em12.valorParcela, 84.62);
  assert.equal(em12.valorTotal, 1015.39);
});

test("erro da Suhai vira exceção com o código e o texto originais", () => {
  const corpo = {
    IncluirCotacaoSuhaiResponse: {
      IncluirCotacaoSuhaiResult: {
        protocolo: "0",
        codMsgRet: "503",
        textoMsgRet: "Modelo não encontrado na tabela FIPE Suhai",
      },
    },
  };

  assert.throws(() => lerRespostaCotacao(corpo), (erro) => {
    assert.equal(erro.codigoSuhai, "503");
    assert.match(erro.message, /Modelo não encontrado/);
    return true;
  });
});

const proposta = {
  protocolo: "414324",
  cdCobertura: 1003,
  email: "luciano@exemplo.com.br",
  dddCel: "11",
  numCel: "976687668",
  endereco: {
    logradouro: "Rua Exemplo",
    numero: "100",
    complemento: "ap 2",
    bairro: "Centro",
    uf: "SP",
    cidade: "Sao Paulo",
    cep: "03317000",
  },
  veiculo: { chassi: "9BWZZZ377VT004251", placa: "DBO7B72", cor: 11, combustivel: 4 },
  vigenciaInicio: "2026-10-16",
  diaVencimento: 10,
  parcelas: 6,
};

test("proposta sai com boleto e sem cartão", () => {
  const xml = montarEnvelopeProposta(proposta, credenciais);

  assert.match(xml, /<suh:TransmitirProposta>/);
  assert.match(xml, /<suh:proposta>/);
  assert.match(xml, /<suh:protocolo>414324<\/suh:protocolo>/);
  assert.match(xml, /<suh:cdCobertura>1003<\/suh:cdCobertura>/);
  assert.match(xml, /<suh:tp_pagamento>2<\/suh:tp_pagamento>/);
  assert.match(xml, /<suh:vecto_demais_parcelas>10<\/suh:vecto_demais_parcelas>/);
  assert.match(xml, /<suh:qtd_parcelas>6<\/suh:qtd_parcelas>/);
  assert.doesNotMatch(xml, /<suh:tp_pagamento>11<\/suh:tp_pagamento>/);
  assert.doesNotMatch(xml, /<suh:tp_pagamento>14<\/suh:tp_pagamento>/);
});

test("resposta de proposta devolve o número do Cotador", () => {
  const resultado = lerRespostaProposta(corpoDoFixture("proposta-sucesso.xml"));

  assert.equal(resultado.protocolo, "414324");
  assert.equal(resultado.numeroProposta, "987654");
  assert.equal(resultado.codMsgRet, "001");
});

test("erro na proposta preserva o código da Suhai", () => {
  assert.throws(
    () =>
      lerRespostaProposta({
        TransmitirPropostaResponse: {
          TransmitirPropostaResult: { protocolo: "414324", codMsgRet: "503", textoMsgRet: "Chassi inválido" },
        },
      }),
    (erro) => {
      assert.equal(erro.codigoSuhai, "503");
      assert.match(erro.message, /Chassi inválido/);
      return true;
    },
  );
});

test("consulta FIPE sem parâmetros pede a base inteira", () => {
  const xml = montarEnvelopeFipe({}, credenciais);

  assert.match(xml, /<suh:ConsultaVeiculos>/);
  assert.match(xml, /<suh:cod_fipe\/>/);
  assert.match(xml, /<suh:cod_categoria_suhai\/>/);
});

test("retorno FIPE traz a grafia exata aceita na cotação", () => {
  const veiculos = lerRespostaFipe(corpoDoFixture("fipe-especifica.xml"));

  assert.equal(veiculos.length, 1);
  assert.deepEqual(veiculos[0], {
    codFipe: "886002-5",
    numPassageiros: 2,
    codMarca: 133,
    marca: "BAJAJ",
    codModelo: 1035210,
    modelo: "BEE 125cv Monaco",
    codCategoria: 2,
    categoria: "Moto",
    codCategoriaTarifaria: 31,
  });
});
