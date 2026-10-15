/**
 * Operação `ConsultaVeiculos` do WebService FIPE Suhai.
 *
 * A grafia de marca e modelo aceita na cotação é a que este serviço devolve,
 * não a da FIPE pública. A Suhai recomenda carregar a base inteira uma vez
 * por dia (chamada sem parâmetros) em vez de consultar a cada cotação.
 */

import { config } from "./config.js";
import { chamar, envelope, lista, tags, SuhaiSoapError } from "./soap.js";

export function montarEnvelopeFipe({ codFipe, codCategoria } = {}, credenciais = config.credenciais) {
  const campos = {
    login: credenciais.login,
    senha: credenciais.senha,
    cod_fipe: codFipe ?? null,
    cod_categoria_suhai: codCategoria ?? null,
  };

  return envelope(`      <suh:ConsultaVeiculos>
         <suh:parametro>
${tags(campos)}
         </suh:parametro>
      </suh:ConsultaVeiculos>`);
}

export function lerRespostaFipe(corpo) {
  const resultado = corpo?.ConsultaVeiculosResponse?.ConsultaVeiculosResult;
  if (resultado === undefined) throw new SuhaiSoapError("Resposta sem ConsultaVeiculosResult");

  const veiculos = lista(resultado.TabelaFipe).map((item) => ({
    codFipe: item.cod_fipe ?? null,
    numPassageiros: item.num_passageiros ? Number(item.num_passageiros) : null,
    codMarca: item.cod_marca ? Number(item.cod_marca) : null,
    marca: item.marca ?? "",
    codModelo: item.cod_modelo ? Number(item.cod_modelo) : null,
    modelo: item.modelo ?? "",
    codCategoria: item.cod_categoria_suhai ? Number(item.cod_categoria_suhai) : null,
    categoria: item.categoria_suhai ?? "",
    codCategoriaTarifaria: item.cod_categoria_tarifaria ? Number(item.cod_categoria_tarifaria) : null,
  }));

  // Login inválido volta TabelaFipe com textoMsgRet e sem marca/modelo.
  const critica = lista(resultado.TabelaFipe).find((item) => item?.textoMsgRet && !item?.marca);
  if (critica) {
    throw new SuhaiSoapError(String(critica.textoMsgRet), {
      codigoSuhai: String(critica.codMsgRet ?? resultado.codMsgRet ?? "503"),
    });
  }

  return veiculos;
}

export async function consultarVeiculos(parametros = {}) {
  const xml = montarEnvelopeFipe(parametros);
  const corpo = await chamar({
    url: config.endpoints.fipe,
    operacao: "ConsultaVeiculos",
    contrato: "VeiculosFipe",
    xml,
    // A carga completa é grande; o timeout padrão da cotação não serve.
    timeoutMs: parametros.codFipe ? config.timeoutMs : 300000,
  });
  return lerRespostaFipe(corpo);
}
