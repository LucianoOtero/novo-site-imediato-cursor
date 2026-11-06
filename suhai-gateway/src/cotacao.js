/**
 * Operação `IncluirCotacaoSuhai` — o "Realizar Cotação" da documentação.
 *
 * O gateway devolve a cotação em forma bruta porém normalizada: protocolo,
 * valores do veículo e a lista de coberturas com seu parcelamento. Quem
 * traduz `cdCobertura` nos planos do site é o front (lib/suhai/planos.ts),
 * para que a regra de produto viva num lugar só.
 */

import { config } from "./config.js";
import { chamar, envelope, lista, numero, tags, SuhaiSoapError } from "./soap.js";

const UTILIZACAO_DUT = {
  particular: 1,
  locacaoAnual: 2,
  taxi: 7,
  escolar: 8,
  alimentacao: 10,
  motoTaxi: 17,
  aplicativo: 19,
  entregador: 21,
  locacaoApp: 22,
};

/**
 * Domínios das perguntas de garagem ("Realizar Cotação", Portal SUHAPI).
 * O site manda os códigos por nome; booleano é o contrato anterior
 * (checkbox "garagem em casa / no trabalho / na escola").
 */
const PERGUNTA1_RESIDENCIA = { garagem: 1, condominio: 2, estacionamento: 3, nao: 4 };
/** Perguntas 2 (trabalho) e 3 (escola). */
const PERGUNTA_USO = { naoUsa: 1, usaGuarda: 2, usaNaoGuarda: 3 };
const PERGUNTA4_PATIO = { sim: 1, nao: 2 };

export function respostaResidencia(valor) {
  if (typeof valor === "boolean") return valor ? PERGUNTA1_RESIDENCIA.garagem : PERGUNTA1_RESIDENCIA.nao;
  return PERGUNTA1_RESIDENCIA[valor] ?? PERGUNTA1_RESIDENCIA.garagem;
}

export function respostaUso(valor) {
  if (typeof valor === "boolean") return valor ? PERGUNTA_USO.usaGuarda : PERGUNTA_USO.naoUsa;
  return PERGUNTA_USO[valor] ?? PERGUNTA_USO.naoUsa;
}

export function respostaPatio(valor) {
  return valor === false ? PERGUNTA4_PATIO.nao : PERGUNTA4_PATIO.sim;
}

/** A Suhai aceita `S`/`N` ou `1`/`0` em `zeroKm`; os exemplos usam letras. */
function simNao(booleano) {
  return booleano ? "S" : "N";
}

/**
 * A Suhai recusa fabricação posterior ao ano corrente. Sem fabricação válida
 * (ano-modelo ou o anterior), vai o ano-modelo limitado ao ano corrente:
 * um 0 km 2026/2027 cotado em 2026 sai com fabricação 2026.
 */
export function anoFabricacaoPara(anoModelo, anoFabricacao, hoje = new Date()) {
  const anoAtual = hoje.getFullYear();
  const informado = Number(anoFabricacao);
  if (
    anoFabricacao != null &&
    Number.isInteger(informado) &&
    informado >= anoModelo - 1 &&
    informado <= anoModelo &&
    informado <= anoAtual
  ) {
    return informado;
  }
  return Math.min(anoModelo, anoAtual);
}

export function montarEnvelopeCotacao(payload, credenciais = config.credenciais) {
  const { proponente, condutorPrincipal, veiculo, uso, contrato } = payload;
  const caminhaoOuVan = veiculo.categoria === "caminhao" || veiculo.categoria === "van";

  const campos = {
    login: credenciais.login,
    senha: credenciais.senha,
    protocolo: payload.protocolo ?? null,
    proposta: null,
    cpfCnpj: proponente.cpf,
    nome: proponente.nome,
    nome_social: null,
    dtNascimento: proponente.dataNascimento,
    sexo: proponente.sexo,
    estadoCivil: proponente.estadoCivil,
    cepPernoite: uso.cepPernoite,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    codFipe: veiculo.codFipe ?? null,
    anoModelo: veiculo.anoModelo,
    anoFabricacao: anoFabricacaoPara(veiculo.anoModelo, veiculo.anoFabricacao),
    zeroKm: simNao(veiculo.zeroKm),
    // Veículo 0 km sem placa definitiva usa a placa convencional YYY9999.
    placa: veiculo.zeroKm ? veiculo.placa ?? "YYY9999" : veiculo.placa ?? null,
    chassi: veiculo.chassi ?? null,
    utilizacaoDut: UTILIZACAO_DUT[uso.utilizacao] ?? UTILIZACAO_DUT.particular,
    tipoUtilizacao: uso.utilizacao === "particular" ? uso.tipoUtilizacao ?? 1 : null,
    possuiOutroVeic: null,
    tipoContratacao: contrato.tipoContratacao,
    tabelaComissao: contrato.tabelaComissao ?? config.tabelaComissao,
    classeBonus: contrato.classeBonus,
    cpfCnpjPrincipalCondutor: condutorPrincipal.cpf,
    nomePrincipalCondutor: condutorPrincipal.nome,
    dtNascimentoPrincipalCondutor: condutorPrincipal.dataNascimento,
    sexoPrincipalCondutor: condutorPrincipal.sexo,
    estadoCivilPrincipalCondutor: condutorPrincipal.estadoCivil,
    // Perguntas 1 a 3 valem para auto e moto; caminhão e van respondem só a 4.
    pergunta1: caminhaoOuVan ? null : respostaResidencia(uso.garagem.residencia),
    pergunta2: caminhaoOuVan ? null : respostaUso(uso.garagem.trabalho),
    pergunta3: caminhaoOuVan ? null : respostaUso(uso.garagem.escola),
    pergunta4: caminhaoOuVan ? respostaPatio(uso.garagem.patio) : null,
    vlr_desconto: "0.00",
    // Sem `cdCobertura` a Suhai devolve o bloco com todas as coberturas,
    // que é justamente o que a tela de planos precisa.
    cdCobertura: null,
    nro_apolice_ant: contrato.apoliceAnterior ?? null,
    vlr_DanosMateriais: "100000.00",
    vlr_DanosCorporais: "100000.00",
    vlr_DanosMorais: "10000.00",
    cdWorksite: null,
    fator_FipeAjuste: null,
    // Sem `planoAssistencia` a Suhai devolve só as coberturas com guincho de
    // 200 km. Cada outro nível é uma cotação nova, com protocolo próprio:
    // reenviar o protocolo com `planoAssistencia` a Suhai recusa (422).
    planoAssistencia: contrato.planoAssistencia ?? null,
    planoPerdaParcial: 1,
    ddd_cel: payload.contato?.ddd ?? null,
    num_cel: payload.contato?.celular ?? null,
    ddd_res: null,
    num_res: null,
    email: proponente.email ?? null,
  };

  return envelope(`      <suh:IncluirCotacaoSuhai>
         <suh:cotacao>
${tags(campos)}
         </suh:cotacao>
      </suh:IncluirCotacaoSuhai>`);
}

/**
 * Lê o `IncluirCotacaoSuhaiResult`.
 *
 * `codMsgRet` 001 é sucesso e 503 é erro, com o texto em `textoMsgRet`.
 */
export function lerRespostaCotacao(corpo) {
  const resultado = corpo?.IncluirCotacaoSuhaiResponse?.IncluirCotacaoSuhaiResult;
  if (!resultado) throw new SuhaiSoapError("Resposta sem IncluirCotacaoSuhaiResult");

  const codigo = String(resultado.codMsgRet ?? "");
  if (codigo !== "001") {
    throw new SuhaiSoapError(resultado.textoMsgRet || `Suhai retornou ${codigo}`, {
      codigoSuhai: codigo,
      protocolo: resultado.protocolo ?? null,
    });
  }

  const calculo = resultado.Calculo ?? {};
  const automovel = calculo.Automovel ?? {};
  const franquia = calculo.Franquia ?? null;

  const coberturas = lista(calculo.PremioCoberturas?.Cobertura).map((cobertura) => ({
    id: Number(cobertura["@id"]),
    nome: cobertura["@nome"] ?? "",
    premioLiquido: numero(cobertura["@premioLiquido"]),
    parcelas: lista(cobertura.Parcelamento?.Parcela).map((parcela) => ({
      quantidade: Number(parcela["@quantidade"]),
      valorTotal: numero(parcela["@valorTotal"]),
      valorParcela: numero(parcela["#text"]),
      juros: numero(parcela["@valorJuros"]),
      iof: numero(parcela["@valorIOF"]),
      percentualJuros: numero(parcela["@percentualJuros"]),
    })),
  }));

  return {
    protocolo: String(resultado.protocolo ?? ""),
    codMsgRet: codigo,
    textoMsgRet: resultado.textoMsgRet ?? "",
    veiculo: {
      valorFipe: numero(resultado.valorFipe),
      fatorFipe: numero(resultado.fatorFipe),
      valorFipeComFator: numero(resultado.valorFipexFator),
      importanciaSegurada: numero(automovel["@valorIS"]),
    },
    franquia: franquia
      ? { plano: franquia["@planoFranquia"] ?? null, valor: numero(franquia["@valorFranquia"]) }
      : null,
    coberturas,
  };
}

export async function cotar(payload) {
  const xml = montarEnvelopeCotacao(payload);
  const corpo = await chamar({
    url: config.endpoints.multicalculos,
    operacao: "IncluirCotacaoSuhai",
    xml,
    timeoutMs: config.timeoutMs,
  });
  return lerRespostaCotacao(corpo);
}
