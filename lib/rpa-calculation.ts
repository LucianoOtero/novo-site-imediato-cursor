import type { RpaProgress } from "@/lib/rpa";

/**
 * lib/rpa-calculation.ts — mecânica de cálculo do RPA (projeto 2026-07-16,
 * "etapa de decisão RPA no formulário").
 *
 * Complementa `lib/rpa.ts` (que fica intocado: `startRpaSession`/
 * `fetchRpaProgress`/`buildRpaPayload` continuam exatamente como estão —
 * o contrato com o backend do RPA não é alterado aqui). Este arquivo só
 * adiciona a camada de interpretação dos dados de progresso — réplica,
 * em TypeScript nativo deste projeto, da lógica das classes
 * `ProgressModalRPA`/`MainPage` do site legado (`webflow_injection_limpo.js`,
 * arquivo só consultado como referência — nunca alterado).
 *
 * Fases (réplica de `phaseMessages`/`phaseSubMessages`/`phasePercentages`
 * do legado — 16 fases, sem emoji para manter o tom do restante do site):
 */
export const RPA_TOTAL_PHASES = 16;

export const RPA_PHASE_LABELS: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Iniciando sistema", subtitle: "Preparando ambiente de cálculo" },
  2: { title: "Fazendo login no sistema", subtitle: "Conectando às seguradoras parceiras" },
  3: { title: "Acessando página de cotação", subtitle: "Abrindo o formulário de cada seguradora" },
  4: { title: "Validando dados pessoais", subtitle: "Confirmando as informações do segurado" },
  5: { title: "Validando informações do veículo", subtitle: "Confirmando dados do veículo" },
  6: { title: "Validando endereço", subtitle: "Confirmando o CEP informado" },
  7: { title: "Identificando perfil de endereço", subtitle: "Analisando a região de circulação" },
  8: { title: "Analisando perfil de risco", subtitle: "Calculando o perfil de risco" },
  9: { title: "Buscando melhores seguradoras", subtitle: "Comparando entre as seguradoras parceiras" },
  10: { title: "Coletando cotações disponíveis", subtitle: "Reunindo as propostas encontradas" },
  11: { title: "Comparando propostas", subtitle: "Avaliando custo-benefício de cada proposta" },
  12: { title: "Selecionando melhor opção", subtitle: "Escolhendo a cotação mais indicada" },
  13: { title: "Gerando proposta final", subtitle: "Montando o resumo da cotação" },
  14: { title: "Validando dados finais", subtitle: "Conferindo os valores encontrados" },
  15: { title: "Finalizando processamento", subtitle: "Últimos ajustes antes do resultado" },
  16: { title: "Cálculo concluído", subtitle: "Sua cotação foi calculada com sucesso" },
};

/** Percentual fixo por fase (fase/16 × 100) — mesmo mapeamento do legado. */
export function rpaPhasePercentage(phase: number): number {
  if (phase <= 0) return 0;
  if (phase >= RPA_TOTAL_PHASES) return 100;
  return (phase / RPA_TOTAL_PHASES) * 100;
}

export function rpaPhaseLabel(phase: number): { title: string; subtitle: string } {
  return RPA_PHASE_LABELS[phase] ?? RPA_PHASE_LABELS[1];
}

/**
 * Um "plano" de cotação — réplica dos campos usados em
 * `updateCardDetails`/`updateCardValue` do legado (plano recomendado e
 * plano alternativo têm o mesmo formato).
 */
export type RpaPlano = {
  valor?: string;
  formaPagamento?: string;
  parcelamento?: string;
  valorMercado?: string;
  valorFranquia?: string;
  tipoFranquia?: string;
  assistencia?: boolean;
  vidros?: boolean;
  carroReserva?: boolean;
  danosMateriais?: string;
  danosCorporais?: string;
  danosMorais?: string;
  morteInvalidez?: string;
};

export type RpaFinalResult = {
  recomendado?: RpaPlano;
  alternativo?: RpaPlano;
};

/** Aceita `"true"`/`true`/`1` como verdadeiro — mesma tolerância do `formatCheck` do legado. */
function toBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function toPlano(raw: unknown): RpaPlano | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  return {
    valor: typeof p.valor === "string" ? p.valor : undefined,
    formaPagamento: typeof p.forma_pagamento === "string" ? p.forma_pagamento : undefined,
    parcelamento: typeof p.parcelamento === "string" ? p.parcelamento : undefined,
    valorMercado: typeof p.valor_mercado === "string" ? p.valor_mercado : undefined,
    valorFranquia: typeof p.valor_franquia === "string" ? p.valor_franquia : undefined,
    tipoFranquia: typeof p.tipo_franquia === "string" ? p.tipo_franquia : undefined,
    assistencia: toBoolean(p.assistencia),
    vidros: toBoolean(p.vidros),
    carroReserva: toBoolean(p.carro_reserva),
    danosMateriais: typeof p.danos_materiais === "string" ? p.danos_materiais : undefined,
    danosCorporais: typeof p.danos_corporais === "string" ? p.danos_corporais : undefined,
    danosMorais: typeof p.danos_morais === "string" ? p.danos_morais : undefined,
    morteInvalidez: typeof p.morte_invalidez === "string" ? p.morte_invalidez : undefined,
  };
}

/**
 * Extrai `plano_recomendado`/`plano_alternativo` do payload de progresso —
 * réplica das 3 estruturas de fallback de `updateResults()` no legado
 * (formatos antigo e novo da API de progresso do RPA, nessa ordem de
 * prioridade).
 */
export function parseRpaFinalResult(progress: RpaProgress & Record<string, unknown>): RpaFinalResult {
  const p = progress as Record<string, unknown>;

  // Estrutura 1: resultados_finais.dados.dados_finais
  const resultadosFinais = p.resultados_finais as Record<string, unknown> | undefined;
  const dadosFinais = (resultadosFinais?.dados as Record<string, unknown> | undefined)?.dados_finais as
    | Record<string, unknown>
    | undefined;
  if (dadosFinais?.plano_recomendado || dadosFinais?.plano_alternativo) {
    return { recomendado: toPlano(dadosFinais.plano_recomendado), alternativo: toPlano(dadosFinais.plano_alternativo) };
  }

  // Estrutura 2: timeline[etapa === 'final'].dados_extra
  const timeline = p.timeline;
  if (Array.isArray(timeline)) {
    const finalEntry = timeline.find((entry) => (entry as Record<string, unknown>)?.etapa === "final") as
      | Record<string, unknown>
      | undefined;
    const dadosExtra = finalEntry?.dados_extra as Record<string, unknown> | undefined;
    if (dadosExtra?.plano_recomendado || dadosExtra?.plano_alternativo) {
      return { recomendado: toPlano(dadosExtra.plano_recomendado), alternativo: toPlano(dadosExtra.plano_alternativo) };
    }
  }

  // Estrutura 3: dados_extra direto (formato antigo)
  const dadosExtraDireto = p.dados_extra as Record<string, unknown> | undefined;
  if (dadosExtraDireto?.plano_recomendado || dadosExtraDireto?.plano_alternativo) {
    return { recomendado: toPlano(dadosExtraDireto.plano_recomendado), alternativo: toPlano(dadosExtraDireto.plano_alternativo) };
  }

  return {};
}

/**
 * Detecção de erro — versão simplificada de `isErrorStatus()` do legado
 * (sem a tabela interna de códigos 1000–9999: nenhuma dessas mensagens
 * específicas chega a ser mostrada ao usuário nem no site legado, que
 * sempre cai na mesma mensagem genérica de "Cotação Manual Necessária"
 * — ver relatório da investigação).
 */
const ERROR_STATUSES = ["error", "failed", "failure", "exception", "timeout", "denied", "invalid", "blocked", "cancelled", "aborted"];
const ERROR_KEYWORDS = ["falhou", "erro", "failed", "error", "exception", "timeout", "denied", "invalid", "blocked", "cancelled"];
const ERROR_HTTP_CODES = ["400", "401", "403", "404", "405", "408", "409", "410", "422", "429", "500", "501", "502", "503", "504"];

export function isRpaErrorStatus(status?: string, mensagem?: string, errorCode?: string | number): boolean {
  const statusLower = (status ?? "").toLowerCase();
  const mensagemLower = (mensagem ?? "").toLowerCase();

  if (errorCode) {
    const codeStr = String(errorCode);
    if (ERROR_HTTP_CODES.some((code) => codeStr.includes(code))) return true;
  }
  if (ERROR_STATUSES.some((errorStatus) => statusLower.includes(errorStatus))) return true;
  if (ERROR_KEYWORDS.some((keyword) => mensagemLower.includes(keyword))) return true;

  return false;
}

/** `true` quando a fase reportada já é a última (16) e o status indica sucesso. */
export function isRpaSuccessStatus(status?: string): boolean {
  return (status ?? "").toLowerCase() === "success";
}

/** Mensagem única de fallback (réplica de `showErrorAlert`/`handleRPAError` do legado — sempre a mesma, qualquer que seja a causa). */
export const RPA_MANUAL_QUOTE_TITLE = "Vamos calcular manualmente para você";
export const RPA_MANUAL_QUOTE_MESSAGE =
  "Não conseguimos concluir o cálculo automático agora. Um especialista da Imediato Seguros vai calcular manualmente e te chamar em breve com as melhores condições.";

/** Réplica de `updateSuccessHeader()` do legado. */
export const RPA_SUCCESS_NOTICE = "Um especialista da Imediato Seguros vai te chamar em instantes para revisar os detalhes.";

/**
 * Disclosure exibido no passo 4 (antes de "Aguardar o cálculo"): parte do
 * perfil (composição familiar, estado civil, guarda do veículo, etc.) é
 * estimada automaticamente pelo sistema pela média — confirmada só na
 * formalização da proposta, quando o valor pode mudar. Pedido do cliente
 * (2026-07-17), após confirmarmos que o cálculo automático usa esses dados
 * estimados quando ainda não foram coletados.
 */
export const RPA_PROFILE_ESTIMATE_NOTICE =
  "Para agilizar o cálculo, alguns dados do seu perfil — como composição familiar, estado civil e a forma de guarda do veículo — são estimados automaticamente pelo sistema com base na média. Na formalização da proposta com a seguradora, esses dados serão confirmados e o valor final pode mudar.";

/**
 * Motivos pelos quais o cálculo automático (RPA) pode ficar indisponível no
 * passo 4 (projeto 2026-07-17):
 * - `caminhao`: categoria não é cotada automaticamente (exige especialista);
 * - `dados_incompletos`: faltam dados obrigatórios preenchidos/validados
 *   (nome, e-mail, CPF, CEP e placa com veículo identificado).
 */
export type RpaDisabledReason = "caminhao" | "dados_incompletos";

export const RPA_DISABLED_CAMINHAO_MESSAGE =
  "Seguro de caminhão é cotado por um especialista da Imediato Seguros — o cálculo automático não se aplica a essa categoria. Toque em “Falar com um consultor” e cuidamos de tudo para você.";

export const RPA_DISABLED_INCOMPLETE_MESSAGE =
  "O cálculo automático precisa de todos os dados preenchidos e validados: nome, e-mail, CPF, CEP e placa com o veículo identificado. Complete os campos anteriores ou fale com um consultor para calcularmos para você.";
