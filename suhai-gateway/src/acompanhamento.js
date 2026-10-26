/**
 * Acompanhamento da proposta já transmitida: `ConsultarStatusProposta`,
 * `ConsultarPendencias` e `GerarPDF`. Todas só leem — nada aqui altera a
 * proposta na Suhai.
 *
 * Formatos tirados dos exemplos oficiais do portal SUHAPI (páginas
 * 438861937, 615841800 e 439320637).
 */

import { config } from "./config.js";
import { chamar, envelope, lista, tags, SuhaiSoapError } from "./soap.js";

export class EntradaInvalidaError extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = "EntradaInvalidaError";
    this.entradaInvalida = true;
  }
}

function digitos(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const texto = String(valor).trim();
  if (!/^\d{1,12}$/.test(texto)) throw new EntradaInvalidaError(`Valor inválido: ${texto.slice(0, 20)}`);
  return texto;
}

/** A Suhai exige protocolo e/ou proposta; os dois só com dígitos. */
export function identificacao(payload = {}) {
  const protocolo = digitos(payload.protocolo);
  const proposta = digitos(payload.proposta);
  if (!protocolo && !proposta) throw new EntradaInvalidaError("Informe protocolo ou proposta.");
  return { protocolo, proposta };
}

function texto(valor) {
  if (valor === undefined || valor === null) return "";
  if (typeof valor === "object") return String(valor["#text"] ?? "").trim();
  return String(valor).trim();
}

function textoOuNulo(valor) {
  return texto(valor) || null;
}

/** O retorno usa `Etapa`/`Parecer_texto` e `etapa`/`parecer_texto` conforme a página; aceita os dois. */
function campo(no, nome) {
  if (!no) return undefined;
  if (no[nome] !== undefined) return no[nome];
  const capitalizado = nome.charAt(0).toUpperCase() + nome.slice(1);
  return no[capitalizado];
}

/** Pendências também aceitam placa ou chassi (busca da Suhai), além de protocolo/proposta. */
export function filtroPendencias(payload = {}) {
  const placa = payload.placa ? String(payload.placa).trim().toUpperCase() : null;
  const chassi = payload.chassi ? String(payload.chassi).trim().toUpperCase() : null;
  if (placa && !/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) throw new EntradaInvalidaError("Placa inválida.");
  if (chassi && !/^[A-Z0-9]{17}$/.test(chassi)) throw new EntradaInvalidaError("Chassi inválido.");
  if (placa || chassi) {
    return { protocolo: digitos(payload.protocolo), proposta: digitos(payload.proposta), placa, chassi };
  }
  return { ...identificacao(payload), placa: null, chassi: null };
}

// ---------------------------------------------------------------- status

export function montarEnvelopeStatus(payload, credenciais = config.credenciais) {
  const { protocolo, proposta } = identificacao(payload);
  return envelope(`      <suh:ConsultarStatusProposta>
         <suh:consulta>
${tags({ login: credenciais.login, senha: credenciais.senha, protocolo, proposta })}
         </suh:consulta>
      </suh:ConsultarStatusProposta>`);
}

/**
 * `codMsgRet` traz o código do status (003 = Pendente Análise Nível 2) e
 * `textoMsgRet`, o nome. 503 é erro da consulta.
 */
export function lerRespostaStatus(corpo) {
  const resultado = corpo?.ConsultarStatusPropostaResponse?.ConsultarStatusPropostaResult;
  if (!resultado) throw new SuhaiSoapError("Resposta sem ConsultarStatusPropostaResult");

  const codigo = texto(resultado.codMsgRet);
  if (codigo === "503" || !/^\d+$/.test(codigo)) {
    throw new SuhaiSoapError(texto(resultado.textoMsgRet) || `Suhai retornou ${codigo || "vazio"}`, {
      codigoSuhai: codigo || null,
    });
  }

  const parecerTexto = textoOuNulo(campo(resultado, "parecer_texto"));
  return {
    protocolo: texto(resultado.protocolo),
    proposta: texto(resultado.proposta),
    status: Number(codigo),
    statusTexto: texto(resultado.textoMsgRet),
    dataAtualizacao: textoOuNulo(resultado.data_atualizacao_status),
    recusaReavaliavelAut: textoOuNulo(resultado.recusa_reavaliavel_aut),
    parecer: parecerTexto
      ? {
          autor: textoOuNulo(campo(resultado, "parecer_autor")),
          dataHora: textoOuNulo(campo(resultado, "data_hora_parecer")),
          texto: parecerTexto,
        }
      : null,
  };
}

export async function consultarStatus(payload) {
  const corpo = await chamar({
    url: config.endpoints.multicalculos,
    operacao: "ConsultarStatusProposta",
    xml: montarEnvelopeStatus(payload),
    timeoutMs: config.timeoutMs,
  });
  return lerRespostaStatus(corpo);
}

// ------------------------------------------------------------ pendências

export function montarEnvelopePendencias(payload, credenciais = config.credenciais) {
  const { protocolo, proposta, placa, chassi } = filtroPendencias(payload);
  return envelope(`      <suh:ConsultarPendencias>
         <suh:pendencia>
${tags({ login: credenciais.login, senha: credenciais.senha, protocolo, proposta, placa, chassi })}
         </suh:pendencia>
      </suh:ConsultarPendencias>`);
}

const SEM_REGISTRO = /nenhum registro/i;

function lerPainel(painel) {
  return {
    numero: Number(painel?.["@num_pendencia"]) || null,
    pendencia: texto(campo(painel, "pendencia")),
    prestador: textoOuNulo(campo(painel, "prestador")),
    etapa: textoOuNulo(campo(painel, "etapa")),
    status: textoOuNulo(campo(painel, "status")),
    ultimaAtualizacao: textoOuNulo(campo(painel, "ultima_atualizacao")),
    linkPrestador: textoOuNulo(campo(painel, "link_prestador")),
  };
}

function lerParecer(parecer) {
  return {
    autor: textoOuNulo(campo(parecer, "parecer_autor")),
    dataHora: textoOuNulo(campo(parecer, "data_hora_parecer")),
    texto: textoOuNulo(campo(parecer, "parecer_texto")),
  };
}

/**
 * "Nenhum registro para os critérios" vem como 503, mas para nós significa
 * proposta sem pendência: devolve lista vazia em vez de erro.
 */
export function lerRespostaPendencias(corpo) {
  const resultado = corpo?.ConsultarPendenciasResponse?.ConsultarPendenciasResult;
  if (!resultado) throw new SuhaiSoapError("Resposta sem ConsultarPendenciasResult");

  const codigo = texto(campo(resultado, "codMsgRet"));
  const mensagem = texto(campo(resultado, "textoMsgRet"));
  if (codigo !== "001") {
    if (SEM_REGISTRO.test(mensagem)) return { propostas: [], semRegistro: true };
    throw new SuhaiSoapError(mensagem || `Suhai retornou ${codigo || "vazio"}`, { codigoSuhai: codigo || null });
  }

  const propostas = lista(resultado.PropostaResult).map((item) => ({
    proposta: texto(item.proposta),
    protocolo: texto(item.protocolo),
    dataProposta: textoOuNulo(item.data_proposta),
    placa: textoOuNulo(item.placa),
    marca: textoOuNulo(item.marca),
    modelo: textoOuNulo(item.modelo),
    statusProposta: textoOuNulo(item.status_proposta),
    pendencias: lista(item.painel_pendencia).map(lerPainel),
    pareceres: lista(campo(item, "parecer")).map(lerParecer).filter((p) => p.texto),
  }));

  return { propostas, semRegistro: false };
}

export async function consultarPendencias(payload) {
  const corpo = await chamar({
    url: config.endpoints.multicalculos,
    operacao: "ConsultarPendencias",
    xml: montarEnvelopePendencias(payload),
    timeoutMs: config.timeoutMs,
  });
  return lerRespostaPendencias(corpo);
}

// ------------------------------------------------------------------- PDF

/** `envia_email` S faz a Suhai mandar o PDF ao proponente; o padrão é não mandar. */
export function montarEnvelopePdf(payload, credenciais = config.credenciais) {
  const { protocolo, proposta } = identificacao(payload);
  return envelope(`      <suh:GerarPDF>
         <suh:impressao>
${tags({
  login: credenciais.login,
  senha: credenciais.senha,
  protocolo,
  proposta,
  envia_email: payload.enviaEmail === true ? "S" : "N",
})}
         </suh:impressao>
      </suh:GerarPDF>`);
}

export function lerRespostaPdf(corpo) {
  const resultado = corpo?.GerarPDFResponse?.GerarPDFResult;
  if (!resultado) throw new SuhaiSoapError("Resposta sem GerarPDFResult");

  const arquivo = texto(resultado.arquivo);
  if (!arquivo) {
    const codigo = texto(resultado.codMsgRet);
    throw new SuhaiSoapError(texto(resultado.textoMsgRet) || "PDF não retornado", { codigoSuhai: codigo || "sem_pdf" });
  }
  return { protocolo: texto(resultado.protocolo), proposta: texto(resultado.proposta), pdfBase64: arquivo };
}

export async function gerarPdf(payload) {
  const corpo = await chamar({
    url: config.endpoints.multicalculos,
    operacao: "GerarPDF",
    xml: montarEnvelopePdf(payload),
    timeoutMs: config.timeoutMs,
  });
  return lerRespostaPdf(corpo);
}
