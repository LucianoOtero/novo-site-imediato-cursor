import { env } from "@/lib/env";
import { sendToLegacyProxy, type DestinationResult } from "@/lib/leads/proxy-sender";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/espocrm.ts — envio de lead ao EspoCRM (integrações 2026-07-03).
 * Fonte: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 8) e confirmação direta
 * do usuário: "EspoCRM está instalado no domínio flyingdonkeys e é o CRM
 * real". Acessado via proxy Cloud Run `LEAD_ESPOCRM_WEBHOOK_URL`
 * (`ADD_FLYINGDONKEYS_URL` no site legado) — dev aponta para
 * `dev.flyingdonkeys.com.br`, conforme decisão do usuário.
 */
export function sendToEspoCrm(lead: LeadRecord): Promise<DestinationResult> {
  return sendToLegacyProxy("espocrm", env.leadEspocrmWebhookUrl, lead, "Novo Site — Lead EspoCRM");
}
