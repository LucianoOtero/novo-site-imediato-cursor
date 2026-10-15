/**
 * Camada SOAP: monta o envelope, envia e devolve o XML já parseado.
 *
 * O namespace `suhaiseguradoracotacao.com.br:5155` e o formato do envelope
 * vêm dos exemplos oficiais do portal SUHAPI — ver
 * docs/suhai-integracao/02-WS-COTACAO-PROPOSTA.md.
 */

import { XMLParser } from "fast-xml-parser";

export const NAMESPACE = "suhaiseguradoracotacao.com.br:5155";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
});

/** Escapa os cinco caracteres que não podem aparecer cru em XML. */
export function escapar(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Converte um objeto plano em tags `<suh:campo>valor</suh:campo>`.
 * Campos `undefined` e `null` viram tag vazia — a Suhai trata tag vazia como
 * "não informado", e omitir tags previstas causa crítica em alguns métodos.
 */
export function tags(campos, indentacao = "            ") {
  return Object.entries(campos)
    .map(([chave, valor]) =>
      valor === undefined || valor === null || valor === ""
        ? `${indentacao}<suh:${chave}/>`
        : `${indentacao}<suh:${chave}>${escapar(valor)}</suh:${chave}>`,
    )
    .join("\n");
}

export function envelope(corpo) {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:suh="${NAMESPACE}">
   <soapenv:Header/>
   <soapenv:Body>
${corpo}
   </soapenv:Body>
</soapenv:Envelope>`;
}

export class SuhaiSoapError extends Error {
  constructor(mensagem, detalhes = {}) {
    super(mensagem);
    this.name = "SuhaiSoapError";
    Object.assign(this, detalhes);
  }
}

/**
 * Envia o envelope e devolve o corpo da resposta já parseado.
 * `contrato` é o nome do serviço no WSDL de homologação:
 * MultiCalculos ou VeiculosFipe. O SOAPAction não leva o prefixo `I`.
 */
export async function chamar({ url, operacao, xml, timeoutMs = 45000, contrato = "MultiCalculos" }) {
  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "text/xml; charset=utf-8",
      soapaction: `${NAMESPACE}/${contrato}/${operacao}`,
    },
    body: xml,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const texto = await resposta.text();

  if (!resposta.ok) {
    throw new SuhaiSoapError(`HTTP ${resposta.status} em ${operacao}`, {
      status: resposta.status,
      corpo: texto.slice(0, 1000),
    });
  }

  const parseado = parser.parse(texto);
  const corpo = parseado?.Envelope?.Body;

  if (corpo?.Fault) {
    const falha = corpo.Fault;
    throw new SuhaiSoapError(falha?.faultstring || falha?.Reason?.Text || "SOAP Fault", { fault: falha });
  }

  return corpo;
}

/** Garante array mesmo quando o parser colapsa um único elemento repetido. */
export function lista(valor) {
  if (valor === undefined || valor === null) return [];
  return Array.isArray(valor) ? valor : [valor];
}

/**
 * Converte número no formato da Suhai para `Number`.
 * Os campos escalares vêm com separador de milhar ("1,670.18") e os
 * atributos vêm sem ("40222.00") — ambos com ponto decimal.
 */
export function numero(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const limpo = String(valor).replace(/,/g, "");
  const convertido = Number(limpo);
  return Number.isFinite(convertido) ? convertido : null;
}
