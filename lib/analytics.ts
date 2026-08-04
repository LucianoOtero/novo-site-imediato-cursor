/**
 * lib/analytics.ts — contrato mínimo de eventos (Issue 03B).
 *
 * Fonte: ESPECIFICACAO v3.md, seção 20 (Eventos do GTM / dataLayer).
 *
 * Esta é a "1ª etapa" do analytics (rev. 4.1 do PLANO_IMPLEMENTACAO.md):
 * um `trackEvent()` tipado e seguro que já pode ser usado por LeadForm,
 * FAQ, WhatsAppFAB e CallButton (Issues 11/17/19) **sem depender** da
 * integração real com GTM/GA4/Ads. A Issue 18 completa a integração
 * (validação no GTM Preview/DebugView, tags reais) sobre esta mesma base.
 *
 * Nunca envia PII (nome, e-mail, telefone, CPF etc.) em claro — os
 * eventos abaixo, tipados a partir da seção 20, não têm esses campos.
 * Enhanced Conversions (dados hasheados) é tratado separadamente, no
 * servidor, na Issue 12 (`/api/lead`) — não faz parte deste contrato de
 * eventos client-side.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Ramo é tipado como `string` nesta issue — a fonte canônica do enum de
 * ramos será `lib/ramos.ts` (Issue 05, ainda não implementada nesta ordem
 * de execução). Não duplicamos aqui a lista de ramos para evitar duas
 * fontes divergentes; quando `lib/ramos.ts` existir, os componentes podem
 * passar o `slug`/tipo `Ramo` de lá — a assinatura de `trackEvent` já
 * aceita `string` e continuará compatível.
 */
type RamoSlug = string;

/**
 * Contrato de eventos (seção 20 da especificação). Nomes em `snake_case`,
 * conforme o contrato: "o app empurra eventos; o GTM mapeia p/ GA4/Ads".
 */
type AnalyticsEventMap = {
  page_view: { page_path: string; page_title: string; ramo?: RamoSlug };
  form_start: { form_id: string; ramo?: RamoSlug };
  form_step: { step: 1 | 2 | 3 | 4; ramo?: RamoSlug };
  generate_lead: { ramo: RamoSlug; value?: number; method: "form" };
  /**
   * Escolha do cálculo no passo 4 (`aguardar` = automático,
   * `consultor` = assistido). Era a conversão Ads do formulário até
   * 2026-08-04; desde então as tags Ads da etapa 4 estão pausadas
   * (GTM v44) e a conversão acontece em `form_initial_contact` — este
   * evento segue disponível para GA4/funil.
   */
  form_quote_choice: {
    ramo: RamoSlug;
    choice: "aguardar" | "consultor";
    method: "form";
  };
  /**
   * Conversão Ads do formulário (decisão do cliente, 2026-08-04):
   * disparado 1× ao confirmar o passo 1 (DDD+Celular validados),
   * no mesmo instante em que o lead `initial` é criado — o Ads passa
   * a contar no mesmo momento em que EspoCRM/Octadesk são
   * sensibilizados, espelhando os modais (`*_initial_contact`).
   * Tag `[NovoSite] Ads - form initial contact` (label da action de
   * formulário, sem valor) — ver `docs/FASE_A_GTM_ESPOCRM_OPS.md`.
   */
  form_initial_contact: { ramo: RamoSlug; method: "form" };
  whatsapp_click: { location: "hero" | "sticky" | "fab" | string; ramo?: RamoSlug };
  call_click: { location: string; ramo?: RamoSlug };
  scroll_depth: { percent: 25 | 50 | 75 | 90; page_path: string };
  engaged_time: { seconds: 30 | 60; page_path: string };
  cta_click: { cta_id: string; location: string };
  faq_open: { question: string };
  /**
   * Disparado ao enviar o `ContactLeadModal` (integrações 2026-07-08),
   * antes de redirecionar para WhatsApp/telefone — nome do evento
   * ("whatsapp_modal_submit") e campos ("form_type"/"modal_channel")
   * confirmados lendo o código do modal equivalente do site legado
   * (`docs/LEGACY_JS_AUDIT.md`). Era conversão Ads até o GTM v43;
   * desde então é telemetria de funil (GA4, v45). `submit_mode`
   * (2026-08-04): distingue o envio completo (`full`) do link
   * "Prosseguir sem preencher o resto" (`skip`).
   */
  whatsapp_modal_submit: {
    form_type: "whatsapp_modal";
    modal_channel: "whatsapp" | "phone";
    location: string;
    ramo?: RamoSlug;
    submit_mode: "full" | "skip";
  };
  /**
   * Contato inicial nos modais (paridade com o legado, 2026-08-04):
   * disparados no blur do telefone validado do `ContactLeadModal` —
   * mesmos nomes de evento do site legado (`registrarConversaoGoogleAds`,
   * ver `docs/LEGACY_JS_AUDIT.md`), para que as **tags Ads legadas**
   * (`Modal WhatsApp - Initial Contact` / `CE - phone_modal_initial_contact`)
   * disparem identicamente nos dois braços do experimento — mesmo
   * momento, mesma action, mesmo (nenhum) valor. Sem `user_data`
   * (contrato client-side não envia PII; os acionadores não dependem).
   */
  whatsapp_modal_initial_contact: { form_type: "whatsapp_modal"; modal_channel: "whatsapp"; location: string; ramo?: RamoSlug };
  phone_modal_initial_contact: { form_type: "whatsapp_modal"; modal_channel: "phone"; location: string; ramo?: RamoSlug };
  /**
   * Dispensa do `ContactLeadModal` sem enviar (×, Esc, clique fora) —
   * a navegação ao destino ainda acontece, mas sem lead (decisão
   * 2026-08-03: medir o abandono que antes era invisível).
   * `modal_step`: 1 = telefone ainda não preenchido; 2 = telefone já
   * capturado (lead `initial` existe). Nome deliberadamente sem
   * "phone" para não colidir com a guarda de PII abaixo.
   */
  whatsapp_modal_dismiss: {
    form_type: "whatsapp_modal";
    modal_channel: "whatsapp" | "phone";
    location: string;
    ramo?: RamoSlug;
    modal_step: 1 | 2;
  };
  /** Envio bem-sucedido do formulário da página `/contato`. */
  contact_form_submit: { location: "contato" };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;
export type AnalyticsEventParams<E extends AnalyticsEventName> = AnalyticsEventMap[E];

/** Chaves que, se aparecessem em um payload, indicariam PII escapando do contrato tipado. */
const SUSPICIOUS_PII_KEYS = ["email", "telefone", "phone", "celular", "cpf", "nome", "name", "placa"] as const;

function findSuspiciousKeys(payload: Record<string, unknown>): string[] {
  return Object.keys(payload).filter((key) =>
    SUSPICIOUS_PII_KEYS.some((piiKey) => key.toLowerCase().includes(piiKey))
  );
}

/**
 * Envia um evento tipado para o `dataLayer`.
 *
 * - Nunca quebra em Server Components/SSR (sem `window`): apenas não envia.
 * - Nunca quebra se `window.dataLayer` ainda não existir: inicializa antes.
 * - Em desenvolvimento, loga o evento no console e avisa se alguma chave
 *   do payload parecer PII (defesa extra, além da tipagem).
 *
 * @example
 * trackEvent('generate_lead', { ramo: 'auto', method: 'form', value: 1 })
 * // → window.dataLayer.push({ event: 'generate_lead', ramo: 'auto', ... })
 */
export function trackEvent<E extends AnalyticsEventName>(event: E, params: AnalyticsEventParams<E>): void {
  const payload: Record<string, unknown> = { event, ...params };

  if (process.env.NODE_ENV === "development") {
    const suspiciousKeys = findSuspiciousKeys(payload);
    if (suspiciousKeys.length > 0) {
      console.warn(
        `[lib/analytics] trackEvent("${event}"): chave(s) suspeita(s) de PII no payload — não deveriam ir para o dataLayer em claro: ${suspiciousKeys.join(", ")}`
      );
    }
    console.info("[lib/analytics] trackEvent:", payload);
  }

  if (typeof window === "undefined") {
    // Server Component / SSR: sem dataLayer no servidor. Não é erro —
    // apenas não há o que enviar aqui (integração server-side de
    // conversão é tratada separadamente na Issue 12).
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}
