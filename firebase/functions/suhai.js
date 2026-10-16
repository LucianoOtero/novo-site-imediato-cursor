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

function cotacaoDe(leadData) {
  return leadData.suhaiCotacao || {};
}

function propostaDe(leadData) {
  return leadData.suhaiProposta || {};
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
      "Próximo passo: no Portal do Cotador Suhai, acompanhar a proposta, emitir a apólice e enviar o boleto da 1ª parcela ao cliente.",
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
      name: `${prefixo}Emitir apólice Suhai e enviar boleto — proposta nº ${proposta.numeroProposta}`,
      dias: 0,
      description:
        `Proposta nº ${proposta.numeroProposta} (cotação nº ${proposta.protocolo}) transmitida pelo site com boleto. ` +
        "Acompanhar no Portal do Cotador Suhai, emitir a apólice e enviar o boleto da 1ª parcela ao cliente.",
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
      detalhe: `${prefixoAmbiente(proposta.ambiente)}Proposta Suhai nº ${proposta.numeroProposta} transmitida — emitir apólice e enviar boleto`,
    };
  }
  return null;
}

module.exports = {
  SUHAI_STAGES,
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
};
