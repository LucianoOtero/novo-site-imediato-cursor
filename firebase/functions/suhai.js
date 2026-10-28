/**
 * firebase/functions/suhai.js — regras da cotação Suhai na entrega de
 * leads (`captureChannel: "suhai_form"`). Funções puras: o `deliverLead`
 * em index.js decide quando chamar o EspoCRM, o Octadesk e o e-mail
 * admin; aqui fica o que gravar e o que dizer em cada momento.
 *
 * Momentos (estágio no RTDB → efeito):
 * - `initial` → igual ao LeadForm (Lead + Opp, `primeira_etapa`).
 * - `progress` com `suhaiEtapa` "veiculo" | "cep" → atualiza a ficha.
 * - `suhai_quote` → protocolo e ofertas apresentadas; WhatsApp
 *   `suhai_cotacao_pronta` (ou `calculo_manual` + Task se falhou).
 * - `suhai_plan_selected` → plano escolhido e prêmio.
 * - `suhai_proposal` → número da proposta, Task de emissão no Portal do
 *   Cotador; WhatsApp `suhai_proposta_enviada` (ou Task de pendência).
 *
 * Campos novos no Entity Manager (cNumeroCotacao, cNumeroProposta,
 * cPlanoEscolhido, cPremioTotal, cPagamento, cFranquia) e as opções novas
 * de cEtapaFunil vão em PUTs separados e best-effort: enquanto não
 * existirem no CRM, só falham em log. Ver docs/FLUXO_SUHAI_CRM_WHATSAPP.md.
 */

const crypto = require("node:crypto");

const SUHAI_STAGES = ["suhai_quote", "suhai_plan_selected", "suhai_proposal"];

const ASSISTENCIA = { 0: "sem assistência", 1: "assistência 200 km", 2: "assistência 500 km" };

const UTILIZACAO = {
  particular: "Particular",
  locacaoAnual: "Locação anual",
  taxi: "Táxi",
  escolar: "Escolar",
  alimentacao: "Alimentação",
  motoTaxi: "Moto táxi",
  aplicativo: "Aplicativo",
  entregador: "Entregador",
  locacaoApp: "Locação para app",
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function moeda(valor) {
  return typeof valor === "number" && Number.isFinite(valor) ? brl.format(valor) : "";
}

function isSuhai(leadData) {
  return Boolean(leadData && leadData.captureChannel === "suhai_form");
}

/**
 * O erro chega como o site gravou; um 401/403 do Cloud Run vinha com a página HTML inteira,
 * que ia parar na Note, na Task e na description do Lead. Fica o título, em uma linha.
 */
function erroLegivel(erro) {
  if (typeof erro !== "string" || !/<[a-z!][^>]*>/i.test(erro)) return erro;
  const inicio = erro.search(/<[a-z!][^>]*>/i);
  const antes = erro.slice(0, inicio).replace(/[\s:]+$/, "");
  const titulo = (erro.match(/<title>([^<]*)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
  const texto = [antes, titulo && `(${titulo})`].filter(Boolean).join(" ") || "erro em HTML sem título";
  return texto.length > 200 ? `${texto.slice(0, 199)}…` : texto;
}

function comErroLegivel(registro) {
  if (!registro) return {};
  return registro.erro ? { ...registro, erro: erroLegivel(registro.erro) } : registro;
}

function cotacaoDe(leadData) {
  return comErroLegivel(leadData.suhaiCotacao);
}

function propostaDe(leadData) {
  return comErroLegivel(leadData.suhaiProposta);
}

function cotacaoReal(cotacao) {
  return cotacao.status === "sucesso" && !cotacao.simulado && Boolean(cotacao.protocolo);
}

function prefixoAmbiente(ambiente) {
  return ambiente === "producao" ? "" : "[HOMOLOGAÇÃO] ";
}

function rotuloPlano(oferta) {
  if (!oferta) return "";
  return `${oferta.plano} — ${ASSISTENCIA[oferta.assistencia] || `assistência ${oferta.assistencia}`}`;
}

/** Plano recomendado: o "Completo" com assistência 200 km (destaque da tela); senão o primeiro. */
function ofertaRecomendada(ofertas) {
  if (!Array.isArray(ofertas) || ofertas.length === 0) return null;
  return (
    ofertas.find((o) => o.plano === "Completo" && o.assistencia === 1) ||
    ofertas.find((o) => o.plano === "Completo") ||
    ofertas[0]
  );
}

function ofertaMaisBarata(ofertas) {
  if (!Array.isArray(ofertas) || ofertas.length === 0) return null;
  return ofertas.reduce((menor, o) => (o.premioTotal < menor.premioTotal ? o : menor), ofertas[0]);
}

function pagamentoTexto(proposta, plano) {
  if (!proposta || !proposta.parcelas) return "";
  const parcela = plano && plano.premioTotal ? ` (≈ ${moeda(plano.premioTotal / proposta.parcelas)})` : "";
  return `Boleto em ${proposta.parcelas}x${parcela}, vencimento dia ${proposta.diaVencimento}`;
}

function dataBr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "";
}

/**
 * Sufixo das flags de dedupe no RTDB. Estágios que se repetem na mesma
 * jornada (dois `progress`, recálculo da cotação, troca de plano, nova
 * tentativa de proposta) precisam de uma flag por ocorrência.
 */
function flagKey(stage, leadData) {
  if (stage === "progress") {
    if (leadData.suhaiEtapa) return `progress_${leadData.suhaiEtapa}`;
    const temVeiculo = Boolean(leadData.placa || leadData.veiculoMarcaModelo || leadData.veiculoAno);
    return temVeiculo ? "progress_veiculo" : "progress_pessoais";
  }
  if (stage === "suhai_quote") {
    const cotacao = cotacaoDe(leadData);
    return `suhai_quote_${cotacao.protocolo || `falha_${cotacao.geradoEm || ""}`}`.replace(/[.#$/[\]:]/g, "_");
  }
  if (stage === "suhai_plan_selected") {
    const plano = leadData.suhaiPlano || {};
    return `suhai_plan_${plano.cdCobertura || ""}_${plano.protocolo || cotacaoDe(leadData).protocolo || ""}`;
  }
  if (stage === "suhai_proposal") {
    const proposta = propostaDe(leadData);
    return `suhai_proposal_${proposta.numeroProposta || `falha_${proposta.geradoEm || ""}`}`.replace(/[.#$/[\]:]/g, "_");
  }
  return stage;
}

/**
 * Campos com opções/atributos que já existem no CRM (painel "Cotação do
 * Site" + `cSeguradora` da Opp). Vão no PUT principal do funil.
 */
function funnelFieldsExistentes(stage, leadData) {
  if (stage === "suhai_quote") {
    const cotacao = cotacaoDe(leadData);
    if (cotacao.status !== "sucesso") {
      return { cEtapaFunil: "Cálculo manual pendente", cStatusCalculo: "Falhou" };
    }
    const recomendada = ofertaRecomendada(cotacao.ofertas);
    const barata = ofertaMaisBarata(cotacao.ofertas);
    // "Cálculo concluído" já existe no enum; `etapaFunilNova` promove para
    // "Cotação Suhai apresentada" quando a opção for criada.
    return {
      cEtapaFunil: "Cálculo concluído",
      cStatusCalculo: "Concluído",
      ...(recomendada ? { cValorRecomendado: moeda(recomendada.premioTotal) } : {}),
      ...(barata && barata !== recomendada ? { cValorAlternativo: moeda(barata.premioTotal) } : {}),
    };
  }
  return null;
}

/** Só na Opportunity: a seguradora da jornada. */
function opportunityFieldsExistentes(stage) {
  return SUHAI_STAGES.includes(stage) ? { cSeguradora: "Suhai" } : null;
}

/** Opções novas de `cEtapaFunil` — PUT separado até o Entity Manager ter as opções. */
function etapaFunilNova(stage, leadData) {
  if (stage === "suhai_quote" && cotacaoDe(leadData).status === "sucesso") return "Cotação Suhai apresentada";
  if (stage === "suhai_plan_selected") return "Plano escolhido";
  if (stage === "suhai_proposal") {
    return propostaDe(leadData).status === "sucesso" ? "Proposta transmitida" : "Proposta com erro";
  }
  return null;
}

/** Campos novos (Lead e Opportunity) — PUT separado e best-effort. */
function camposNovos(stage, leadData) {
  const cotacao = cotacaoDe(leadData);
  const proposta = propostaDe(leadData);
  const plano = leadData.suhaiPlano;
  const campos = {};

  const etapaDoPlano = (stage === "suhai_plan_selected" || stage === "suhai_proposal") && plano;
  if (cotacaoReal(cotacao)) campos.cNumeroCotacao = etapaDoPlano ? protocoloDoPlano(plano, cotacao) : cotacao.protocolo;

  if (etapaDoPlano) {
    campos.cPlanoEscolhido = `${rotuloPlano(plano)} (cd ${plano.cdCobertura})`.slice(0, 120);
    if (plano.premioTotal > 0) {
      campos.cPremioTotal = Math.round(plano.premioTotal * 100) / 100;
      campos.cPremioTotalCurrency = "BRL";
    }
    if (plano.franquia) campos.cFranquia = moeda(plano.franquia);
  }

  if (stage === "suhai_proposal" && proposta.status === "sucesso") {
    if (proposta.numeroProposta) campos.cNumeroProposta = String(proposta.numeroProposta);
    const pagamento = pagamentoTexto(proposta, plano);
    if (pagamento) campos.cPagamento = pagamento.slice(0, 80);
  }

  return Object.keys(campos).length > 0 ? campos : null;
}

function linhaOferta(oferta, protocoloDaNota) {
  const partes = [`• ${rotuloPlano(oferta)}: ${moeda(oferta.premioTotal)} no ano`];
  if (oferta.premioMensalEstimado) {
    partes.push(`(≈ ${moeda(oferta.premioMensalEstimado)}/mês em até ${oferta.parcelamentoMaximo || "?"}x)`);
  }
  if (oferta.franquia) partes.push(`— franquia ${moeda(oferta.franquia)}`);
  if (oferta.importanciaSegurada) partes.push(`— IS ${moeda(oferta.importanciaSegurada)}`);
  partes.push(`[cd ${oferta.cdCobertura}]`);
  // Outro nível de assistência é outra cotação na Suhai.
  if (oferta.protocolo && oferta.protocolo !== protocoloDaNota) partes.push(`— cotação nº ${oferta.protocolo}`);
  return partes.join(" ");
}

/** Protocolo da cotação do nível de assistência do plano escolhido. */
function protocoloDoPlano(plano, cotacao) {
  return (plano && plano.protocolo) || cotacao.protocolo;
}

function linhaPremissas(premissas) {
  if (!premissas) return null;
  const garagens = [
    premissas.garagemResidencia ? "casa" : null,
    premissas.garagemTrabalho ? "trabalho" : null,
    premissas.garagemEscola ? "escola" : null,
  ].filter(Boolean);
  return (
    `Premissas: uso ${UTILIZACAO[premissas.utilizacao] || premissas.utilizacao}, ` +
    `garagem ${garagens.length ? garagens.join("/") : "não"}, bônus ${premissas.classeBonus}, ` +
    `CEP pernoite ${premissas.cepPernoite}`
  );
}

/** Texto da Note no Stream do Lead — o que o vendedor precisa para seguir no Portal do Cotador. */
function buildNote(stage, leadData) {
  const cotacao = cotacaoDe(leadData);
  const proposta = propostaDe(leadData);
  const plano = leadData.suhaiPlano;

  if (stage === "suhai_quote") {
    const prefixo = prefixoAmbiente(cotacao.ambiente);
    if (cotacao.status !== "sucesso") {
      return (
        `${prefixo}⚠️ COTAÇÃO SUHAI NÃO CONCLUÍDA — ${cotacao.erro || "erro não informado"}` +
        `${cotacao.codigoSuhai ? ` (código Suhai ${cotacao.codigoSuhai})` : ""}.\n` +
        `Veículo: ${cotacao.veiculo || leadData.veiculoMarcaModelo || "?"}.\n` +
        "Fazer a cotação manual e retornar ao cliente (ele viu a mensagem de erro no site)."
      );
    }
    const linhas = [
      `${prefixo}🛡️ COTAÇÃO SUHAI APRESENTADA AO CLIENTE — nº ${cotacao.protocolo}${cotacao.simulado ? " (SIMULADA, sem valor real)" : ""}`,
      `Veículo: ${cotacao.veiculo || leadData.veiculoMarcaModelo || "?"}${cotacao.valorFipe ? ` · FIPE ${moeda(cotacao.valorFipe)}` : ""}`,
    ];
    const premissas = linhaPremissas(cotacao.premissas);
    if (premissas) linhas.push(premissas);
    linhas.push("Valores apresentados:");
    for (const oferta of cotacao.ofertas || []) linhas.push(linhaOferta(oferta, cotacao.protocolo));
    linhas.push(
      `Se o cliente parar aqui: ligar e retomar a cotação nº ${cotacao.protocolo} no Portal do Cotador Suhai.`
    );
    return linhas.join("\n");
  }

  if (stage === "suhai_plan_selected" && plano) {
    return (
      `${prefixoAmbiente(cotacao.ambiente)}✅ CLIENTE ESCOLHEU O PLANO SUHAI — ${rotuloPlano(plano)} [cd ${plano.cdCobertura}]: ` +
      `${moeda(plano.premioTotal)} no ano${plano.franquia ? `, franquia ${moeda(plano.franquia)}` : ""}. ` +
      `Cotação nº ${protocoloDoPlano(plano, cotacao) || "?"}.`
    );
  }

  if (stage === "suhai_proposal") {
    const prefixo = prefixoAmbiente(proposta.ambiente);
    if (proposta.status !== "sucesso") {
      return (
        `${prefixo}⚠️ PROPOSTA SUHAI NÃO TRANSMITIDA — cotação nº ${proposta.protocolo || "?"}: ` +
        `${proposta.erro || "erro não informado"}${proposta.codigoSuhai ? ` (código Suhai ${proposta.codigoSuhai})` : ""}.\n` +
        "Retomar a cotação no Portal do Cotador Suhai e concluir a proposta com o cliente."
      );
    }
    return [
      `${prefixo}📄 PROPOSTA SUHAI TRANSMITIDA — nº ${proposta.numeroProposta} (cotação nº ${proposta.protocolo})`,
      plano ? `Plano: ${rotuloPlano(plano)} [cd ${plano.cdCobertura}] — ${moeda(plano.premioTotal)} no ano` : null,
      `Pagamento: ${pagamentoTexto(proposta, plano)}`,
      `Início da vigência: ${dataBr(proposta.vigenciaInicio)}`,
      "Próximo passo: acompanhar a proposta até a emissão da apólice. Status e pendências (vistoria, rastreador) chegam aqui como Notes e Tasks. O boleto da 1ª parcela só existe depois da apólice emitida.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return null;
}

/**
 * Task acionável no CRM (Atividades do vendedor) ou `null`. `dias` = prazo
 * a partir de hoje. `chave` dedupe a Task: falhas repetidas do mesmo lead
 * (cliente tentando de novo) abrem uma Task só.
 */
function taskSpec(stage, leadData) {
  const cotacao = cotacaoDe(leadData);
  const proposta = propostaDe(leadData);
  const prefixo = prefixoAmbiente((stage === "suhai_proposal" ? proposta : cotacao).ambiente);

  if (stage === "suhai_quote" && cotacao.status !== "sucesso") {
    return {
      chave: "suhai_quote_falha",
      name: `${prefixo}Efetuar cotação Suhai manual e enviar ao cliente`,
      dias: 1,
      description: `A cotação automática da Suhai falhou (${cotacao.erro || "sem detalhe"}). Cotar no Portal do Cotador e retornar pelo WhatsApp.`,
    };
  }
  if (stage === "suhai_proposal" && proposta.status === "sucesso") {
    return {
      chave: flagKey(stage, leadData),
      name: `${prefixo}Acompanhar proposta Suhai nº ${proposta.numeroProposta} até a emissão da apólice`,
      dias: 0,
      description:
        `Proposta nº ${proposta.numeroProposta} (cotação nº ${proposta.protocolo}) transmitida pelo site com boleto. ` +
        "Acompanhar no Portal do Cotador Suhai e resolver as pendências com o cliente. " +
        "A cobrança só existe depois da apólice emitida: o boleto da 1ª parcela vem depois da emissão.",
    };
  }
  if (stage === "suhai_proposal" && proposta.status !== "sucesso") {
    return {
      chave: "suhai_proposal_falha",
      name: `${prefixo}Concluir proposta Suhai pendente — cotação nº ${proposta.protocolo || "?"}`,
      dias: 0,
      description: `A transmissão da proposta pelo site falhou (${proposta.erro || "sem detalhe"}). Retomar com o cliente no Portal do Cotador Suhai.`,
    };
  }
  return null;
}

/**
 * Template WhatsApp ao cliente, ou `null`. Cotação simulada nunca vira
 * mensagem. Variáveis na ordem do template aprovado ({{var-1}}…).
 */
function octaTemplate(stage, leadData, nome) {
  const cotacao = cotacaoDe(leadData);
  const proposta = propostaDe(leadData);
  const veiculo = cotacao.veiculo || leadData.veiculoMarcaModelo || "veículo";

  if (stage === "suhai_quote") {
    if (cotacao.status !== "sucesso") return { key: "calculo_manual", variables: [nome] };
    if (!cotacaoReal(cotacao)) return null;
    const recomendada = ofertaRecomendada(cotacao.ofertas);
    if (!recomendada) return null;
    return {
      key: "suhai_cotacao_pronta",
      variables: [nome, veiculo, rotuloPlano(recomendada), moeda(recomendada.premioTotal), String(cotacao.protocolo)],
    };
  }
  if (stage === "suhai_proposal" && proposta.status === "sucesso" && proposta.numeroProposta) {
    return {
      key: "suhai_proposta_enviada",
      variables: [nome, String(proposta.numeroProposta), pagamentoTexto(proposta, leadData.suhaiPlano)],
    };
  }
  return null;
}

/** Momento do e-mail admin desta etapa Suhai (o `initial` segue o fluxo comum). */
function emailMomento(stage, leadData) {
  const cotacao = cotacaoDe(leadData);
  const proposta = propostaDe(leadData);
  const plano = leadData.suhaiPlano;

  if (stage === "progress") {
    const etapa = leadData.suhaiEtapa === "cep" ? "CEP de pernoite" : "Placa e veículo";
    const veiculo = leadData.veiculoMarcaModelo ? ` — ${leadData.veiculoMarcaModelo}` : "";
    return { momento: "suhai_progress", detalhe: `Cotação Suhai: etapa ${etapa} concluída${veiculo}` };
  }
  if (stage === "suhai_quote") {
    if (cotacao.status !== "sucesso") {
      return {
        momento: "suhai_erro",
        detalhe: `${prefixoAmbiente(cotacao.ambiente)}Cotação Suhai falhou`,
        erro: { message: cotacao.erro || "erro", status: null, code: cotacao.codigoSuhai || null, response_data: null },
      };
    }
    const recomendada = ofertaRecomendada(cotacao.ofertas);
    return {
      momento: "suhai_cotacao",
      detalhe:
        `${prefixoAmbiente(cotacao.ambiente)}Cotação Suhai nº ${cotacao.protocolo} apresentada` +
        (recomendada ? ` — ${rotuloPlano(recomendada)} ${moeda(recomendada.premioTotal)}` : "") +
        (cotacao.simulado ? " (simulada)" : ""),
    };
  }
  if (stage === "suhai_plan_selected" && plano) {
    return {
      momento: "suhai_plano",
      detalhe: `${prefixoAmbiente(cotacao.ambiente)}Plano Suhai escolhido — ${rotuloPlano(plano)} ${moeda(plano.premioTotal)} (cotação nº ${protocoloDoPlano(plano, cotacao) || "?"})`,
    };
  }
  if (stage === "suhai_proposal") {
    if (proposta.status !== "sucesso") {
      return {
        momento: "suhai_erro",
        detalhe: `${prefixoAmbiente(proposta.ambiente)}Proposta Suhai falhou (cotação nº ${proposta.protocolo || "?"})`,
        erro: { message: proposta.erro || "erro", status: null, code: proposta.codigoSuhai || null, response_data: null },
      };
    }
    return {
      momento: "suhai_proposta",
      detalhe: `${prefixoAmbiente(proposta.ambiente)}Proposta Suhai nº ${proposta.numeroProposta} transmitida — acompanhar até a emissão da apólice`,
    };
  }
  return null;
}

// ——— Acompanhamento da proposta transmitida (2026-10-25) ———
// A rotina agendada `acompanharPropostasSuhai` (suhai-acompanhamento.js)
// consulta status e pendências pelo gateway e usa as regras abaixo para
// decidir Note, Task, campos e e-mail. A cobrança só existe depois da
// apólice emitida (Suhai, 24/10/2026): o boleto entra no status Emitida.

/** `tipo` decide o efeito: andamento | pendencias | emitida | recusa | cancelada | endosso. */
const STATUS_PROPOSTA = {
  1: { rotulo: "Salva, não transmitida", tipo: "andamento", final: false },
  2: { rotulo: "Pendente de análise nível 1", tipo: "andamento", final: false },
  3: { rotulo: "Pendente de análise nível 2", tipo: "andamento", final: false },
  4: { rotulo: "Recusa operacional", tipo: "recusa", final: true },
  5: { rotulo: "Recusa reavaliável (automática)", tipo: "recusa", final: true },
  6: { rotulo: "Aguardando emissão", tipo: "andamento", final: false },
  7: { rotulo: "Cancelada a pedido", tipo: "cancelada", final: true },
  9: { rotulo: "Aprovada", tipo: "andamento", final: false },
  10: { rotulo: "Em processo de emissão", tipo: "andamento", final: false },
  11: { rotulo: "Aguardando emissão automática", tipo: "andamento", final: false },
  12: { rotulo: "Pendências para emissão", tipo: "pendencias", final: false },
  13: { rotulo: "Emitida", tipo: "emitida", final: true },
  14: { rotulo: "Recusa técnica", tipo: "recusa", final: true },
  15: { rotulo: "Emissão manual", tipo: "emitida", final: true },
  16: { rotulo: "Recusa reavaliável (manual)", tipo: "recusa", final: true },
  17: { rotulo: "Emissão manual de endosso", tipo: "endosso", final: true },
  18: { rotulo: "Apólice emitida manualmente", tipo: "emitida", final: true },
  19: { rotulo: "Endosso emitido manualmente", tipo: "endosso", final: true },
};

/** Status da pendência que pedem ação do vendedor (vistoria ou instalação com problema). */
const PENDENCIA_COM_PROBLEMA = /frustrad|recusad|cancelad|suspens|novas fotos|parcialmente/i;

function infoStatus(codigo, textoSuhai) {
  return STATUS_PROPOSTA[codigo] || { rotulo: textoSuhai || `Status ${codigo}`, tipo: "andamento", final: false };
}

function slug(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

/**
 * Entrada de `suhai_acompanhamento/{leadId}` para uma proposta transmitida
 * com sucesso, ou `null`. Gravada pela `deliverLead` no `suhai_proposal`.
 */
function registroAcompanhamento(leadData, environment, agoraIso) {
  const proposta = propostaDe(leadData);
  if (proposta.status !== "sucesso" || !proposta.numeroProposta) return null;
  return {
    proposta: String(proposta.numeroProposta),
    protocolo: proposta.protocolo ? String(proposta.protocolo) : null,
    ambiente: proposta.ambiente === "producao" ? "producao" : "homologacao",
    environment: environment || "development",
    transmitidaEm: proposta.geradoEm || agoraIso,
    registradoEm: agoraIso,
    final: false,
  };
}

/**
 * A data da Suhai vem em horário de Brasília ("2026-10-20 10:00:00"); o
 * Espo grava datetime em UTC.
 */
function dataSuhaiParaEspo(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(texto || "");
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0) + 3, +(m[5] || 0), +(m[6] || 0));
  return new Date(utc).toISOString().slice(0, 19).replace("T", " ");
}

function dataHoraBr(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(texto || "");
  if (!m) return texto || "";
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ""}`;
}

/** Retrato das pendências para saber se mudaram desde a última consulta. */
function assinaturaPendencias(pendencias) {
  return (pendencias || [])
    .map((p) => [p.pendencia, p.prestador, p.etapa, p.status, p.linkPrestador].map((v) => v || "").join("|"))
    .sort()
    .join("¦");
}

function linhaPendencia(p) {
  const partes = [`• ${p.pendencia || "Pendência"}`];
  if (p.prestador) partes.push(`(${p.prestador})`);
  const situacao = [p.etapa, p.status].filter(Boolean).join(" — ");
  if (situacao) partes.push(`: ${situacao}`);
  if (p.ultimaAtualizacao) partes.push(`[${dataHoraBr(p.ultimaAtualizacao)}]`);
  const linha = partes.join(" ").replace(" :", ":");
  return p.linkPrestador ? `${linha}\n  Link para o cliente: ${p.linkPrestador}` : linha;
}

/**
 * Texto do `{{3}}` do template da pendência ("falta {{3}}"). Só vistoria e
 * rastreador têm mensagem ao cliente; o resto fica na Task do vendedor.
 */
function pendenciaParaCliente(p) {
  if (/vistoria/i.test(p.pendencia || "")) return "agendar a vistoria do veículo";
  if (/rastreador/i.test(p.pendencia || "")) return "agendar a instalação do rastreador";
  return null;
}

function linhasParecer(status) {
  const linhas = [];
  if (status.recusaReavaliavelAut) linhas.push(`Suhai: ${status.recusaReavaliavelAut}`);
  if (status.parecer && status.parecer.texto) {
    const autor = [status.parecer.autor, dataHoraBr(status.parecer.dataHora)].filter(Boolean).join(", ");
    linhas.push(`Parecer${autor ? ` (${autor})` : ""}: ${status.parecer.texto}`);
  }
  return linhas;
}

function reais(valor) {
  return typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
}

/**
 * Resumo da apólice achada na pós-venda (`/posvenda/apolice-da-proposta`):
 * linhas da Note e o boleto a mandar ao cliente. `null` se não achou.
 */
function resumoApolice(posVenda) {
  if (!posVenda || !posVenda.encontrada || !posVenda.apolice) return null;
  const a = posVenda.apolice;
  const parcela = (posVenda.parcelas && posVenda.parcelas.proximaPendente) || null;
  const linhas = [`Apólice nº ${a.codApolice}${a.dataEmissao ? ` emitida em ${dataHoraBr(a.dataEmissao)}` : ""}.`];
  if (a.inicioVigencia && a.fimVigencia) linhas.push(`Vigência: ${dataHoraBr(a.inicioVigencia)} a ${dataHoraBr(a.fimVigencia)}.`);
  if (reais(a.premioTotal)) linhas.push(`Prêmio: ${reais(a.premioTotal)}${a.qtdeParcelas ? ` em ${a.qtdeParcelas}x` : ""}.`);
  if (a.linkApolice) linhas.push(`PDF da apólice: ${a.linkApolice}`);

  let boleto = null;
  if (parcela && parcela.linkBoleto) {
    const detalhes = [parcela.vencimento && `vence ${dataHoraBr(parcela.vencimento)}`, reais(parcela.valor)].filter(Boolean).join(", ");
    boleto = { texto: `boleto da ${parcela.parcela || 1}ª parcela${detalhes ? ` (${detalhes})` : ""}`, link: parcela.linkBoleto };
  } else if (a.linkBoleto) {
    boleto = { texto: "boleto da apólice", link: a.linkBoleto };
  }
  if (boleto) linhas.push(`${boleto.texto.charAt(0).toUpperCase()}${boleto.texto.slice(1)}: ${boleto.link}`);
  const cartao = parcela ? /cart/i.test(parcela.formaPagamento || "") : false;
  if (!boleto) linhas.push(cartao ? "Pagamento no cartão: não há boleto." : "Boleto ainda não disponível na pós-venda: conferir no Portal do Cotador.");
  return { codApolice: a.codApolice, linkApolice: a.linkApolice || null, boleto, cartao, linhas };
}

/**
 * Decide os efeitos de uma consulta. Entradas:
 * - `item`: entrada atual de `suhai_acompanhamento/{leadId}`;
 * - `status`: retorno do gateway em `/proposta/status`;
 * - `pendencias`: lista de pendências da proposta (pode ser vazia);
 * - `extras.posVenda`: retorno de `/posvenda/apolice-da-proposta` na emissão (opcional).
 *
 * Devolve `{ atualizacao, nota, campos, tarefas, whatsapps, email }`. Cada
 * tarefa, mensagem e o e-mail têm `chave`; o chamador só executa o que
 * ainda não está em `item.efeitos`.
 */
function planoAcompanhamento(item, status, pendencias, agoraIso, extras = {}) {
  const prefixo = prefixoAmbiente(item.ambiente);
  const info = infoStatus(status.status, status.statusTexto);
  const apolice = info.tipo === "emitida" ? resumoApolice(extras.posVenda) : null;
  const mudouStatus = item.status !== status.status;
  const assinatura = assinaturaPendencias(pendencias);
  const mudouPendencias = (pendencias || []).length > 0 && assinatura !== (item.assinaturaPendencias || "");
  const numero = item.proposta;
  const quando = status.dataAtualizacao ? ` em ${dataHoraBr(status.dataAtualizacao)}` : "";

  const atualizacao = {
    status: status.status,
    statusTexto: info.rotulo,
    dataAtualizacao: status.dataAtualizacao || null,
    assinaturaPendencias: assinatura,
    ultimaConsulta: agoraIso,
    errosSeguidos: 0,
    ultimoErro: null,
    final: info.final,
    ...(info.final ? { finalizadoEm: agoraIso, motivoFinal: info.tipo } : {}),
    ...(apolice ? { apolice: apolice.codApolice } : {}),
  };

  if (!mudouStatus && !mudouPendencias) {
    return { atualizacao, nota: null, campos: null, tarefas: [], whatsapps: [], email: null };
  }

  const emoji = { emitida: "✅", recusa: "⛔", cancelada: "🚫", pendencias: "⚠️", endosso: "📝" }[info.tipo] || "🔎";
  const linhas = [`${prefixo}${emoji} PROPOSTA SUHAI nº ${numero} — ${info.rotulo}${quando}`];
  if (status.statusTexto && slug(status.statusTexto) !== slug(info.rotulo)) linhas.push(`Texto da Suhai: ${status.statusTexto}`);
  linhas.push(...linhasParecer(status));
  if ((pendencias || []).length > 0) {
    linhas.push("Pendências para a emissão:");
    for (const p of pendencias) linhas.push(linhaPendencia(p));
  }
  if (info.tipo === "emitida" && apolice) {
    linhas.push(...apolice.linhas);
  } else if (info.tipo === "emitida") {
    linhas.push(
      "Apólice emitida. A cobrança da 1ª parcela só existe a partir de agora: buscar o boleto no Portal do Cotador Suhai e enviar ao cliente."
    );
  }

  const tarefas = [];
  const whatsapps = [];
  for (const p of pendencias || []) {
    const base = slug(p.pendencia) || "pendencia";
    const paraCliente = pendenciaParaCliente(p);
    if (p.linkPrestador && paraCliente && !(p.status && PENDENCIA_COM_PROBLEMA.test(p.status))) {
      whatsapps.push({ chave: `wa_pend_${base}`, key: "suhai_pendencia", pendencia: paraCliente, link: p.linkPrestador });
    }
    if (p.linkPrestador) {
      tarefas.push({
        chave: `task_pend_${base}`,
        name: `${prefixo}Enviar ao cliente o link de ${p.pendencia || "pendência"} — proposta Suhai nº ${numero}`,
        dias: 0,
        description:
          `A Suhai pede ${p.pendencia || "uma pendência"}${p.prestador ? ` (${p.prestador})` : ""} antes de emitir a apólice da proposta nº ${numero}. ` +
          `Enviar o link ao cliente pelo WhatsApp e acompanhar: ${p.linkPrestador}`,
      });
    }
    if (p.status && PENDENCIA_COM_PROBLEMA.test(p.status)) {
      tarefas.push({
        chave: `task_pend_${base}_${slug(p.status)}`,
        name: `${prefixo}${p.pendencia || "Pendência"} com problema (${p.status}) — proposta Suhai nº ${numero}`,
        dias: 0,
        description: `Situação na Suhai: ${[p.etapa, p.status].filter(Boolean).join(" — ")}. Falar com o cliente e resolver no Portal do Cotador.${p.linkPrestador ? ` Link: ${p.linkPrestador}` : ""}`,
      });
    }
  }

  if (mudouStatus && info.tipo === "emitida") {
    const doc = apolice && apolice.linkApolice ? ` PDF da apólice: ${apolice.linkApolice}` : "";
    let description =
      `A Suhai emitiu a apólice da proposta nº ${numero}${quando}. A cobrança só existe depois da emissão: ` +
      "buscar o boleto da 1ª parcela no Portal do Cotador Suhai e enviar ao cliente pelo WhatsApp.";
    if (apolice && apolice.boleto) {
      description =
        `A Suhai emitiu a apólice nº ${apolice.codApolice} da proposta nº ${numero}${quando}. ` +
        `Enviar ao cliente pelo WhatsApp o ${apolice.boleto.texto}: ${apolice.boleto.link}.${doc}`;
    } else if (apolice && apolice.cartao) {
      description =
        `A Suhai emitiu a apólice nº ${apolice.codApolice} da proposta nº ${numero}${quando}. Pagamento no cartão, sem boleto: ` +
        `enviar ao cliente a confirmação e a apólice.${doc}`;
    } else if (apolice) {
      description += doc;
    }
    tarefas.push({
      chave: "task_emitida",
      name:
        apolice && apolice.cartao && !apolice.boleto
          ? `${prefixo}Enviar apólice Suhai ao cliente — proposta nº ${numero}`
          : `${prefixo}Enviar boleto da 1ª parcela ao cliente — apólice Suhai da proposta nº ${numero}`,
      dias: 0,
      description,
    });
  }
  if (mudouStatus && info.tipo === "recusa") {
    tarefas.push({
      chave: "task_recusa",
      name: `${prefixo}Proposta Suhai nº ${numero} recusada (${info.rotulo}) — falar com o cliente`,
      dias: 0,
      description: [
        `A Suhai recusou a proposta nº ${numero}${quando}.`,
        ...linhasParecer(status),
        status.status === 5 || status.status === 16
          ? "Recusa reavaliável: dá para seguir com um novo cálculo e uma nova proposta nas condições da Suhai, no Portal do Cotador."
          : "Oferecer outra seguradora ao cliente.",
      ].join(" "),
    });
  }

  const momento =
    { emitida: "suhai_emitida", recusa: "suhai_recusa", pendencias: "suhai_pendencia" }[info.tipo] ||
    ((pendencias || []).length > 0 ? "suhai_pendencia" : "suhai_status");
  const email = {
    chave: `email_${status.status}_${assinatura ? crypto.createHash("sha1").update(assinatura).digest("hex").slice(0, 10) : "sem_pend"}`,
    momento,
    detalhe: `${prefixo}Proposta Suhai nº ${numero}: ${info.rotulo}${apolice ? ` — apólice nº ${apolice.codApolice}` : ""}${(pendencias || []).length ? ` — ${pendencias.map((p) => [p.pendencia, p.status].filter(Boolean).join(" ")).join("; ")}` : ""}`,
  };

  const campos = mudouStatus
    ? {
        cStatusProposta: info.rotulo.slice(0, 60),
        ...(dataSuhaiParaEspo(status.dataAtualizacao) ? { cDataStatusProposta: dataSuhaiParaEspo(status.dataAtualizacao) } : {}),
      }
    : null;

  const unicas = [...new Map(tarefas.map((t) => [t.chave, t])).values()];
  const mensagens = [...new Map(whatsapps.map((w) => [w.chave, w])).values()];
  return { atualizacao, nota: linhas.join("\n"), campos, tarefas: unicas, whatsapps: mensagens, email };
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Proposta sem desfecho depois de `maxDias`: a rotina para e pede conferência manual. */
function acompanhamentoExpirado(item, agora, maxDias) {
  const desde = Date.parse(item.transmitidaEm || item.registradoEm || "");
  return Number.isFinite(desde) && agora - desde > maxDias * DIA_MS;
}

function tarefaExpirada(item, maxDias) {
  const prefixo = prefixoAmbiente(item.ambiente);
  return {
    chave: "task_expirada",
    name: `${prefixo}Conferir proposta Suhai nº ${item.proposta} no Portal do Cotador — sem desfecho em ${maxDias} dias`,
    dias: 0,
    description:
      `O acompanhamento automático parou: a proposta nº ${item.proposta} está em "${item.statusTexto || "status desconhecido"}" ` +
      `há mais de ${maxDias} dias desde a transmissão. Conferir no Portal do Cotador Suhai.`,
  };
}

module.exports = {
  SUHAI_STAGES,
  STATUS_PROPOSTA,
  registroAcompanhamento,
  planoAcompanhamento,
  assinaturaPendencias,
  dataSuhaiParaEspo,
  acompanhamentoExpirado,
  tarefaExpirada,
  isSuhai,
  flagKey,
  funnelFieldsExistentes,
  opportunityFieldsExistentes,
  etapaFunilNova,
  camposNovos,
  buildNote,
  taskSpec,
  octaTemplate,
  emailMomento,
  moeda,
  erroLegivel,
};
