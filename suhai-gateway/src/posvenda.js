/**
 * Pós-venda Suhai (REST/Digibee): pesquisa e consulta de apólice, parcelas
 * e comissão. Tudo só lê.
 *
 * Header `apikey` (homologação ≠ produção) e IP de origem na whitelist da
 * Suhai — por isso passa pelo gateway. Envelope de resposta:
 * `{ status: { cod_status, tipo_status, desc_status, msg_excecao }, dados }`;
 * 204 = sem dados. Formatos tirados das páginas SUHAPI 437322258 (pesquisa),
 * 437256401 (consulta), 467699223 (parcelas) e 437322150 (comissão).
 *
 * O retorno é enxuto de propósito: nada de dados pessoais do segurado.
 */

import { EntradaInvalidaError } from "./acompanhamento.js";
import { config } from "./config.js";

export class SuhaiRestError extends Error {
  constructor(mensagem, detalhes = {}) {
    super(mensagem);
    this.name = "SuhaiRestError";
    Object.assign(this, detalhes);
  }
}

const TIMEOUT_MS = 120000;
const MAX_CONSULTAS = 10;
const FORMA_PAGAMENTO = {
  1000006: "Boleto CEF",
  1000008: "Boleto Itaú",
  1000009: "Boleto Bradesco",
  1100009: "Cartão de crédito",
};

function dataIso(valor, nome) {
  if (valor === undefined || valor === null || valor === "") return null;
  const texto = String(valor).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(Date.parse(texto))) {
    throw new EntradaInvalidaError(`${nome} inválida (use AAAA-MM-DD).`);
  }
  return texto;
}

function codigo(valor, nome) {
  const texto = String(valor ?? "").trim();
  if (!/^\d{1,20}$/.test(texto)) throw new EntradaInvalidaError(`${nome} inválido.`);
  return texto;
}

function placaOuNulo(valor) {
  if (!valor) return null;
  const placa = String(valor).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) throw new EntradaInvalidaError("Placa inválida.");
  return placa;
}

function diasEntre(desde, ate) {
  return (Date.parse(ate) - Date.parse(desde)) / 86400000;
}

function hojeIso(agora = Date.now()) {
  return new Date(agora).toISOString().slice(0, 10);
}

function menosDias(iso, dias) {
  return new Date(Date.parse(iso) - dias * 86400000).toISOString().slice(0, 10);
}

function textoOuNulo(valor) {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto || null;
}

function numeroOuNulo(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** Proposta "0010760035" e 10760035 são a mesma. */
function mesmaProposta(a, b) {
  const limpa = (v) => String(v ?? "").replace(/\D/g, "").replace(/^0+/, "");
  return limpa(a) !== "" && limpa(a) === limpa(b);
}

/** Interpreta o envelope da Digibee. Devolve `dados` ou `null` (204). */
export function lerEnvelope(httpStatus, corpo, caminho) {
  const cod = Number(corpo?.status?.cod_status ?? httpStatus);
  if (httpStatus === 204 || cod === 204) return null;
  if (httpStatus >= 200 && httpStatus < 300 && cod >= 200 && cod < 300) return corpo?.dados ?? null;
  throw new SuhaiRestError(corpo?.status?.desc_status || `HTTP ${httpStatus} em ${caminho}`, {
    status: httpStatus,
    codigoSuhai: String(cod),
    detalhe: textoOuNulo(corpo?.status?.msg_excecao),
  });
}

export async function chamarRest(caminho, parametros, { fetchImpl = fetch } = {}) {
  if (!config.apiKey) throw new SuhaiRestError("API Key de pós-venda não configurada.");
  const qs = new URLSearchParams(
    Object.entries(parametros).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  const resposta = await fetchImpl(`${config.endpoints.posVenda}${caminho}?${qs}`, {
    headers: { apikey: config.apiKey, accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const texto = await resposta.text();
  let corpo = null;
  if (texto) {
    try {
      corpo = JSON.parse(texto);
    } catch {
      throw new SuhaiRestError(`HTTP ${resposta.status} sem JSON em ${caminho}`, { status: resposta.status });
    }
  }
  return lerEnvelope(resposta.status, corpo, caminho);
}

/** Parâmetros da pesquisa: CNPJ da corretora sempre; placa, chassi ou período de emissão. */
export function parametrosPesquisa(payload = {}) {
  const placa = placaOuNulo(payload.placa);
  const chassi = payload.chassi ? String(payload.chassi).trim().toUpperCase() : null;
  if (chassi && !/^[A-Z0-9]{4,17}$/.test(chassi)) throw new EntradaInvalidaError("Chassi inválido.");
  const desde = dataIso(payload.emissaoDesde, "emissaoDesde");
  const ate = dataIso(payload.emissaoAte, "emissaoAte");
  if (!placa && !chassi && !desde) throw new EntradaInvalidaError("Informe placa, chassi ou emissaoDesde.");
  return {
    cnpj_cpf_corretor: config.cnpjCorretor,
    placa,
    chassi,
    data_emissao_desde: desde,
    data_emissao_ate: ate,
  };
}

export async function pesquisarApolices(payload, opcoes) {
  const dados = await chamarRest("/apolice/pesquisa", parametrosPesquisa(payload), opcoes);
  const codigos = (dados?.cod_apolice || []).map(String);
  return { codApolices: codigos };
}

/** Recorte da consulta de apólice que interessa ao CRM. */
export function lerApolice(dados) {
  if (!dados || !dados.Apolice) return null;
  const a = dados.Apolice;
  const c = dados.Corretor || {};
  const v = dados.Veiculo || {};
  return {
    codApolice: String(a.cod_apolice),
    status: textoOuNulo(a.status),
    proposta: textoOuNulo(a.proposta),
    tipoEndosso: textoOuNulo(a.tipo_endosso),
    nrEndosso: numeroOuNulo(a.nr_endosso),
    dataProposta: textoOuNulo(a.data_proposta),
    dataEmissao: textoOuNulo(a.data_emissao),
    inicioVigencia: textoOuNulo(a.data_inicio_vigencia_apolice ?? a.data_inicio_vigencia),
    fimVigencia: textoOuNulo(a.data_fim_vigencia_apolice ?? a.data_fim_vigencia),
    premioTotal: numeroOuNulo(a.valor_premio_pago),
    qtdeParcelas: numeroOuNulo(a.qtde_parcelas),
    vencPrimeiraParcela: textoOuNulo(a.venc_primeiraparcela),
    linkApolice: textoOuNulo(a.link_apolice),
    linkBoleto: textoOuNulo(a.link_boleto),
    comissao: {
      percentual: numeroOuNulo(c.perc_comissao),
      valorTotal: numeroOuNulo(c.valor_total_comissao_corretor),
    },
    veiculo: { placa: textoOuNulo(v.placa), marca: textoOuNulo(v.marca), modelo: textoOuNulo(v.modelo) },
  };
}

export async function consultarApolice(payload = {}, opcoes) {
  const codApolice = codigo(payload.codApolice, "codApolice");
  return { apolice: lerApolice(await chamarRest("/apolice/consulta", { cod_apolice: codApolice }, opcoes)) };
}

function lerParcela(p) {
  const forma = numeroOuNulo(p.cod_forma_pagamento);
  return {
    parcela: numeroOuNulo(p.parcela),
    valor: numeroOuNulo(p.valor_total_parcela),
    situacao: textoOuNulo(p.situacao),
    vencimento: textoOuNulo(p.data_ultimo_vencimento),
    formaPagamento: forma === null ? null : FORMA_PAGAMENTO[forma] || String(forma),
    linkBoleto: textoOuNulo(p.link_boleto),
    codPagamento: textoOuNulo(p.cod_pagamento),
  };
}

/**
 * A página mostra `Parcelas` dentro de cada endosso no exemplo e no nível
 * de `dados` na tabela; aceita os dois.
 */
export function lerParcelas(dados) {
  if (!dados) return { endossos: [], proximaPendente: null };
  const endossos = (dados.Endossos || []).map((e) => ({
    nrEndosso: numeroOuNulo(e.nr_endosso),
    dataEmissao: textoOuNulo(e.data_emissao),
    tipoEndosso: textoOuNulo(e.tipo_endosso),
    linkBoletos: textoOuNulo(e.link_boletos),
    parcelas: (e.Parcelas || []).map(lerParcela),
  }));
  if (Array.isArray(dados.Parcelas) && dados.Parcelas.length && endossos.length === 1 && !endossos[0].parcelas.length) {
    endossos[0].parcelas = dados.Parcelas.map(lerParcela);
  }
  const pendentes = endossos
    .flatMap((e) => e.parcelas)
    .filter((p) => /pendente/i.test(p.situacao || ""))
    .sort((x, y) => String(x.vencimento).localeCompare(String(y.vencimento)));
  return { endossos, proximaPendente: pendentes[0] || null };
}

export async function consultarParcelas(payload = {}, opcoes) {
  const codApolice = codigo(payload.codApolice, "codApolice");
  return lerParcelas(await chamarRest("/apolice/parcela", { cod_apolice: codApolice }, opcoes));
}

/**
 * Acha a apólice emitida de uma proposta: pesquisa pela placa (ou chassi)
 * e período de emissão, consulta cada código e compara `Apolice.proposta`.
 * Sem placa/chassi, só o período (padrão: últimos 30 dias).
 */
export async function apoliceDaProposta(payload = {}, opcoes = {}) {
  const proposta = codigo(payload.proposta, "proposta");
  const ate = dataIso(payload.emissaoAte, "emissaoAte") || hojeIso(opcoes.agora);
  const desde = dataIso(payload.emissaoDesde, "emissaoDesde") || menosDias(ate, 30);
  if (diasEntre(desde, ate) < 0) throw new EntradaInvalidaError("emissaoDesde depois de emissaoAte.");

  const { codApolices } = await pesquisarApolices(
    { placa: payload.placa, chassi: payload.chassi, emissaoDesde: desde, emissaoAte: ate },
    opcoes,
  );
  const candidatos = [...codApolices].sort((a, b) => b.localeCompare(a, "en", { numeric: true })).slice(0, MAX_CONSULTAS);

  for (const codApolice of candidatos) {
    const { apolice } = await consultarApolice({ codApolice }, opcoes);
    if (!apolice || !mesmaProposta(apolice.proposta, proposta)) continue;
    let parcelas = null;
    try {
      parcelas = await consultarParcelas({ codApolice }, opcoes);
    } catch (erro) {
      parcelas = { erro: erro.message };
    }
    return { encontrada: true, consultadas: candidatos.indexOf(codApolice) + 1, apolice, parcelas };
  }
  return { encontrada: false, consultadas: candidatos.length, totalPesquisa: codApolices.length, apolice: null, parcelas: null };
}

/** Comissões por data de pagamento; a Suhai limita o período a 31 dias. */
export function lerComissao(dados) {
  if (!dados) return { corretor: null, comissoes: [], resumoDiario: [] };
  return {
    corretor: textoOuNulo(dados.corretor),
    comissoes: (dados.Comissoes || []).map((c) => ({
      codApolice: String(c.cod_apolice),
      nrEndosso: numeroOuNulo(c.nr_endosso),
      recibo: textoOuNulo(c.nr_recibo),
      dataPagamento: textoOuNulo(c.data_pagamento),
      parcela: numeroOuNulo(c.nr_parcela),
      valorParcela: numeroOuNulo(c.valor_parcela),
      percentual: numeroOuNulo(c.perc_comissao),
      valor: numeroOuNulo(c.valor_pagamento),
      situacao: textoOuNulo(c.status_pagamento),
    })),
    resumoDiario: (dados.Resumo_Diario || []).map((r) => ({
      dataPagamento: textoOuNulo(r.data_pagamento),
      bruto: numeroOuNulo(r.valor_bruto),
      liquido: numeroOuNulo(r.valor_liquido),
    })),
  };
}

export async function consultarComissao(payload = {}, opcoes) {
  const desde = dataIso(payload.desde, "desde");
  const ate = dataIso(payload.ate, "ate");
  if (!desde || !ate) throw new EntradaInvalidaError("Informe desde e ate.");
  const dias = diasEntre(desde, ate);
  if (dias < 0 || dias > 31) throw new EntradaInvalidaError("O período da comissão vai de 0 a 31 dias.");
  const situacao = payload.codStatusPagamento ? codigo(payload.codStatusPagamento, "codStatusPagamento") : null;
  return lerComissao(
    await chamarRest(
      "/comissao",
      {
        data_pagamento_inicial: desde,
        data_pagamento_final: ate,
        cnpj_cpf_corretor: config.cnpjCorretor,
        cod_status_pagamento: situacao,
      },
      opcoes,
    ),
  );
}
