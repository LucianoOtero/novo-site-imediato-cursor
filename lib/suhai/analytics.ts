import { trackEvent, type AnalyticsEventName, type AnalyticsEventParams, type SuhaiArm } from "@/lib/analytics";
import { userDataComPrazo, type ContatoConversao } from "@/lib/enhanced-conversions";
import { HOST_SUHAI } from "@/lib/suhai-host";

type SuhaiEventName = Extract<AnalyticsEventName, `suhai_${string}`>;

/**
 * O GTM guarda o último valor de cada chave do dataLayer: sem zerar, o
 * `result` da consulta de placa iria junto no evento de etapa seguinte.
 */
const CHAVES_SUHAI = [
  "step",
  "field",
  "result",
  "http_status",
  "duration_ms",
  "slow",
  "recalc",
  "plans",
  "simulated",
  "level",
  "plan",
  "assist",
  "premium_band",
  "installments",
  "stage",
  "reason",
  "last_step",
  "transaction_id",
  "user_data",
] as const;

const ZERADAS = Object.fromEntries(CHAVES_SUHAI.map((chave) => [chave, undefined]));

/** Braço do experimento pelo host da página. */
export function bracoSuhai(): SuhaiArm {
  if (typeof window === "undefined") return "site";
  return window.location.hostname === HOST_SUHAI ? "subdominio" : "site";
}

/** `trackEvent` dos eventos `suhai_*`, com `form_id` e `arm` preenchidos. */
export function trackSuhai<E extends SuhaiEventName>(
  event: E,
  params: Omit<AnalyticsEventParams<E>, "form_id" | "arm">,
): void {
  trackEvent(event, { ...ZERADAS, form_id: "cotacao_suhai", arm: bracoSuhai(), ...params } as AnalyticsEventParams<E>);
}

/** Proposta transmitida: conversão do Ads, com telefone e e-mail em hash quando o consentimento permite. */
export function trackPropostaSuhai(
  params: Omit<AnalyticsEventParams<"suhai_proposal_sent">, "form_id" | "arm" | "user_data">,
  contato: ContatoConversao,
): void {
  void userDataComPrazo(contato).then((user_data) =>
    trackSuhai("suhai_proposal_sent", user_data ? { ...params, user_data } : params),
  );
}

/** Faixa do prêmio anual, sem expor o valor exato. */
export function faixaPremio(premioAnual: number): string {
  if (!Number.isFinite(premioAnual) || premioAnual <= 0) return "desconhecida";
  if (premioAnual < 1000) return "ate_1000";
  if (premioAnual < 2000) return "1000_2000";
  if (premioAnual < 3000) return "2000_3000";
  if (premioAnual < 5000) return "3000_5000";
  return "5000_mais";
}
