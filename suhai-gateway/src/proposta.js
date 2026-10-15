/**
 * Operação `TransmitirProposta`.
 *
 * Formaliza uma cobertura já cotada. Nesta fase o pagamento é sempre boleto
 * (`tp_pagamento` 2). Cartão (11 e 14) fica de fora: depois da transmissão a
 * documentação exige a API de pagamento, que não entra aqui.
 */

import { config } from "./config.js";
import { chamar, envelope, tags, SuhaiSoapError } from "./soap.js";

export function montarEnvelopeProposta(payload, credenciais = config.credenciais) {
  const { endereco, veiculo } = payload;
  const campos = {
    login: credenciais.login,
    senha: credenciais.senha,
    protocolo: payload.protocolo,
    email: payload.email,
    ddd_cel: payload.dddCel,
    num_cel: payload.numCel,
    end_nom_log: endereco.logradouro,
    end_num: endereco.numero,
    end_compl: endereco.complemento ?? null,
    bairro: endereco.bairro,
    uf: endereco.uf,
    cidade: endereco.cidade,
    cep: endereco.cep,
    chassi: veiculo.chassi,
    placa: veiculo.placa,
    cor: veiculo.cor,
    combustivel: veiculo.combustivel,
    data_vig_ini: payload.vigenciaInicio,
    tp_pagamento: 2,
    // UAT não reconhece `vect_demais_parcelas`; a tag aceita é esta.
    vecto_demais_parcelas: payload.diaVencimento,
    qtd_parcelas: payload.parcelas,
    cdCobertura: payload.cdCobertura,
  };

  return envelope(`      <suh:TransmitirProposta>
         <suh:proposta>
${tags(campos)}
         </suh:proposta>
      </suh:TransmitirProposta>`);
}

/**
 * Lê o `TransmitirPropostaResult`.
 * `codMsgRet` 001 é sucesso e 503 é erro. `Proposta` é o número no Cotador.
 */
export function lerRespostaProposta(corpo) {
  const resultado = corpo?.TransmitirPropostaResponse?.TransmitirPropostaResult;
  if (!resultado) throw new SuhaiSoapError("Resposta sem TransmitirPropostaResult");

  const codigo = String(resultado.codMsgRet ?? "");
  if (codigo !== "001") {
    throw new SuhaiSoapError(resultado.textoMsgRet || `Suhai retornou ${codigo}`, {
      codigoSuhai: codigo,
      protocolo: resultado.protocolo ?? null,
    });
  }

  const numero = resultado.Proposta ?? resultado.proposta ?? "";
  return {
    protocolo: String(resultado.protocolo ?? ""),
    numeroProposta: String(numero),
    codMsgRet: codigo,
    textoMsgRet: resultado.textoMsgRet ?? "",
  };
}

export async function transmitir(payload) {
  const xml = montarEnvelopeProposta(payload);
  const corpo = await chamar({
    url: config.endpoints.multicalculos,
    operacao: "TransmitirProposta",
    xml,
    timeoutMs: config.timeoutMs,
  });
  return lerRespostaProposta(corpo);
}
