import { env } from "@/lib/env";
import { sendToLegacyProxy, type DestinationResult } from "@/lib/leads/proxy-sender";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/octadesk.ts — envio de lead ao Octadesk (integrações 2026-07-03).
 * Fonte: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 8) e confirmação direta
 * do usuário: "Octadesk é o sistema de comunicação com o cliente pelo
 * WhatsApp e também está integrado". Acessado via proxy Cloud Run
 * `LEAD_OCTADESK_WEBHOOK_URL` (`ADD_WEBFLOW_OCTA_URL` no site legado).
 *
 * Diferente do EspoCRM: **sem ambiente de dev** — o usuário confirmou que
 * se usa produção mesmo durante testes ("Como o Octadesk não tem
 * ambiente de desenvolvimento, é utilizado o de produção, mesmo"). Ou
 * seja, qualquer teste que dispare este envio atinge o Octadesk real.
 */
export function sendToOctadesk(lead: LeadRecord): Promise<DestinationResult> {
  return sendToLegacyProxy("octadesk", env.leadOctadeskWebhookUrl, lead, "Novo Site — Lead Octadesk");
}
