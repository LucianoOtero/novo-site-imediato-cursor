/**
 * Testes de `ConsultarStatusProposta`, `ConsultarPendencias` e `GerarPDF`
 * contra os exemplos oficiais do portal SUHAPI.
 *
 * Executar: node --test  (a partir de suhai-gateway/)
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { XMLParser } from "fast-xml-parser";

import {
  identificacao,
  lerRespostaPdf,
  lerRespostaPendencias,
  lerRespostaStatus,
  montarEnvelopePdf,
  montarEnvelopePendencias,
  montarEnvelopeStatus,
} from "../src/acompanhamento.js";

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
  return parser.parse(readFileSync(join(aqui, "fixtures", nome), "utf8")).Envelope.Body;
}

const credenciais = { login: "login1234", senha: "senha1234" };

test("identificação exige protocolo ou proposta, só com dígitos", () => {
  assert.deepEqual(identificacao({ proposta: 12350578 }), { protocolo: null, proposta: "12350578" });
  assert.deepEqual(identificacao({ protocolo: "28370" }), { protocolo: "28370", proposta: null });
  assert.throws(() => identificacao({}), (erro) => erro.entradaInvalida === true);
  assert.throws(() => identificacao({ proposta: "123<x>" }), (erro) => erro.entradaInvalida === true);
});

test("envelope de status usa o wrapper consulta", () => {
  const xml = montarEnvelopeStatus({ proposta: "30765" }, credenciais);

  assert.match(xml, /<suh:ConsultarStatusProposta>\s*<suh:consulta>/);
  assert.match(xml, /<suh:login>login1234<\/suh:login>/);
  assert.match(xml, /<suh:proposta>30765<\/suh:proposta>/);
  assert.match(xml, /<suh:protocolo\/>/);
});

test("status vem no codMsgRet: 003 é Pendente Análise Nível 2", () => {
  const status = lerRespostaStatus(corpoDoFixture("status-proposta.xml"));

  assert.equal(status.status, 3);
  assert.equal(status.statusTexto, "Pendente Análise Nível 2");
  assert.equal(status.protocolo, "28370");
  assert.equal(status.proposta, "30765");
  assert.equal(status.parecer, null);
});

test("status de recusa reavaliável traz parecer e fator FIPE sugerido", () => {
  const status = lerRespostaStatus({
    ConsultarStatusPropostaResponse: {
      ConsultarStatusPropostaResult: {
        protocolo: "28370",
        codMsgRet: "016",
        textoMsgRet: "Recusa Reavaliável (MAN)",
        data_atualizacao_status: "2026-10-20 10:00:00",
        proposta: "30765",
        recusa_reavaliavel_aut: "",
        parecer_autor: "Analista",
        data_hora_parecer: "2026-10-20 09:58:00",
        parecer_texto: "Enviar CRLV do veículo",
      },
    },
  });

  assert.equal(status.status, 16);
  assert.equal(status.dataAtualizacao, "2026-10-20 10:00:00");
  assert.equal(status.recusaReavaliavelAut, null);
  assert.deepEqual(status.parecer, { autor: "Analista", dataHora: "2026-10-20 09:58:00", texto: "Enviar CRLV do veículo" });
});

test("erro 503 no status vira exceção com o código da Suhai", () => {
  assert.throws(
    () =>
      lerRespostaStatus({
        ConsultarStatusPropostaResponse: {
          ConsultarStatusPropostaResult: { codMsgRet: "503", textoMsgRet: "Proposta não encontrada" },
        },
      }),
    (erro) => erro.codigoSuhai === "503" && /não encontrada/.test(erro.message),
  );
});

test("envelope de pendências usa o wrapper pendencia", () => {
  const xml = montarEnvelopePendencias({ proposta: "999999" }, credenciais);

  assert.match(xml, /<suh:ConsultarPendencias>\s*<suh:pendencia>/);
  assert.match(xml, /<suh:proposta>999999<\/suh:proposta>/);
});

test("pendências trazem os painéis com link do prestador e o parecer", () => {
  const { propostas, semRegistro } = lerRespostaPendencias(corpoDoFixture("pendencias-sucesso.xml"));

  assert.equal(semRegistro, false);
  assert.equal(propostas.length, 1);
  const [proposta] = propostas;
  assert.equal(proposta.proposta, "9026075");
  assert.equal(proposta.statusProposta, "Pendências para Emissão");
  assert.equal(proposta.pendencias.length, 2);
  assert.deepEqual(proposta.pendencias[0], {
    numero: 1,
    pendencia: "Vistoria Prévia",
    prestador: "Vistoria",
    etapa: "Solicitação",
    status: "OS Criada",
    ultimaAtualizacao: "2022-11-21 05:09:56",
    linkPrestador: "https://vistoria_rastreador.com",
  });
  assert.equal(proposta.pendencias[1].linkPrestador, null);
  assert.equal(proposta.pendencias[1].status, null);
  assert.deepEqual(proposta.pareceres, [
    { autor: "Nonononononono", dataHora: "2022-12-16 03:17:07", texto: "Validação de Parecer" },
  ]);
});

test("pendências sem registro viram lista vazia, não erro", () => {
  assert.deepEqual(lerRespostaPendencias(corpoDoFixture("pendencias-sem-registro.xml")), {
    propostas: [],
    semRegistro: true,
  });
});

test("outro 503 nas pendências continua sendo erro", () => {
  assert.throws(
    () =>
      lerRespostaPendencias({
        ConsultarPendenciasResponse: {
          ConsultarPendenciasResult: {
            codMsgRet: "503",
            textoMsgRet: "Pelo menos um parâmetro de pesquisa deve ser preenchido.",
          },
        },
      }),
    (erro) => erro.codigoSuhai === "503",
  );
});

test("PDF não manda e-mail ao proponente por padrão", () => {
  assert.match(montarEnvelopePdf({ proposta: "30765" }, credenciais), /<suh:envia_email>N<\/suh:envia_email>/);
  assert.match(
    montarEnvelopePdf({ proposta: "30765", enviaEmail: true }, credenciais),
    /<suh:envia_email>S<\/suh:envia_email>/,
  );
  assert.match(montarEnvelopePdf({ proposta: "30765" }, credenciais), /<suh:GerarPDF>\s*<suh:impressao>/);
});

test("PDF devolve o arquivo em base64", () => {
  const pdf = lerRespostaPdf({
    GerarPDFResponse: { GerarPDFResult: { protocolo: "28370", proposta: "30765", arquivo: "JVBERi0xLjMN" } },
  });

  assert.deepEqual(pdf, { protocolo: "28370", proposta: "30765", pdfBase64: "JVBERi0xLjMN" });
  assert.throws(() => lerRespostaPdf({ GerarPDFResponse: { GerarPDFResult: { protocolo: "28370" } } }));
});
