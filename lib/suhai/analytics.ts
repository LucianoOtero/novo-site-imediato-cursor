import { trackEvent, type AnalyticsEventName, type AnalyticsEventParams, type SuhaiArm } from "@/lib/analytics";
import { HOST_SUHAI } from "@/lib/suhai-host";

type SuhaiEventName = Extract<AnalyticsEventName, `suhai_${string}`>;

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
  trackEvent(event, { form_id: "cotacao_suhai", arm: bracoSuhai(), ...params } as AnalyticsEventParams<E>);
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
