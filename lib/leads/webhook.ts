import { env } from "@/lib/env";
import { sendToEspoCrm } from "@/lib/leads/espocrm";
import { sendToOctadesk } from "@/lib/leads/octadesk";
import type { DestinationResult } from "@/lib/leads/proxy-sender";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/webhook.ts — orquestra o envio do lead aos destinos reais
 * (Issue 12; reestruturado em 2026-07-03 com os destinos confirmados).
 * Fonte: ESPECIFICACAO v3.md, seção 44.3 ("CRM com retry exponencial 3×
 * (1s/4s/9s); falha → fallback e-mail + persistência status:'pending_crm'
 * (fila). Falha total: ainda persiste e responde sucesso... + alerta").
 *
 * Antes desta rodada, o destino real do lead era `A_CONFIRMAR —
 * BLOQUEANTE` e este arquivo assinava (HMAC) um payload genérico
 * inventado para um único `LEAD_WEBHOOK_URL` placeholder. Agora os dois
 * destinos reais estão confirmados (usuário, 2026-07-03; ver
 * `docs/WEBFLOW_CUSTOM_CODE_DEV.md`) e são chamados **em paralelo**:
 * - **EspoCRM** (`lib/leads/espocrm.ts`) — o CRM real, sistema de
 *   registro. Se falhar, o lead entra em `pending_crm` e dispara o
 *   fallback por e-mail (mesma semântica de antes).
 * - **Octadesk** (`lib/leads/octadesk.ts`) — comunicação com o cliente
 *   via WhatsApp. Se falhar mas o EspoCRM tiver sucesso, o lead **não**
 *   é considerado perdido (já está no CRM) — só um alerta é registrado.
 */
export type WebhookResult = {
  /** `true` se o EspoCRM (sistema de registro) recebeu o lead — Octadesk é secundário. */
  delivered: boolean;
  attempts: number;
  espocrm: DestinationResult;
  octadesk: DestinationResult;
};

/** Tenta entregar o lead a EspoCRM e Octadesk em paralelo, cada um com seu próprio retry exponencial (seção 44.3). */
export async function sendLeadWebhook(lead: LeadRecord): Promise<WebhookResult> {
  const [espocrm, octadesk] = await Promise.all([sendToEspoCrm(lead), sendToOctadesk(lead)]);

  if (espocrm.delivered && !octadesk.delivered) {
    console.error(
      `[lib/leads/webhook] Lead ${lead.id} entregue ao EspoCRM, mas falhou no Octadesk após ${octadesk.attempts} tentativa(s) — comunicação via WhatsApp pode não ter sido disparada.`
    );
  }

  return { delivered: espocrm.delivered, attempts: espocrm.attempts, espocrm, octadesk };
}

/**
 * Fallback por e-mail quando o CRM falha (seção 44.3). Sem
 * `EMAIL_API_KEY` real configurada, apenas registra em log — nenhum
 * serviço de e-mail foi integrado ainda (fora do escopo desta issue).
 */
export async function sendFallbackEmail(lead: LeadRecord): Promise<void> {
  console.warn(
    `[lib/leads/webhook] Fallback de e-mail para ${env.leadFallbackEmail ?? "(LEAD_FALLBACK_EMAIL não configurado)"}: lead ${lead.id} (ramo ${lead.ramo}) não pôde ser entregue ao CRM. Alerta: revisar fila 'pending_crm'.`
  );
}
