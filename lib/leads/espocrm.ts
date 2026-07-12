import { env } from "@/lib/env";
import { sendToLegacyProxy, type DestinationResult } from "@/lib/leads/proxy-sender";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/espocrm.ts — envio de lead ao EspoCRM (integrações 2026-07-03).
 * Fonte: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 8) e confirmação direta
 * do usuário: "EspoCRM está instalado no domínio flyingdonkeys e é o CRM
 * real". Acessado via proxy Cloud Run (`ADD_FLYINGDONKEYS_URL` no site
 * legado) — a URL exata (`LEAD_ESPOCRM_WEBHOOK_URL_DEV` ou `_PROD`) é
 * resolvida por ambiente em `env.leadEspocrmWebhookUrl` (lib/env.ts,
 * 2026-07-12): dev/staging apontam para `dev.flyingdonkeys.com.br`.
 */
export function sendToEspoCrm(lead: LeadRecord): Promise<DestinationResult> {
  return sendToLegacyProxy("espocrm", env.leadEspocrmWebhookUrl, lead, "Novo Site — Lead EspoCRM");
}
