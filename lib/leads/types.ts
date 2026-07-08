import { z } from "zod";

import { leadSchema } from "@/lib/validators";

/**
 * lib/leads/types.ts — contrato do payload/registro de lead (Issue 12).
 * Fonte: ESPECIFICACAO v3.md, seção 44 (validação/dedup/fallback) e seção
 * 51 (segurança de `/api/lead`: honeypot, Turnstile).
 *
 * Estende `leadSchema` (Issue 11, `lib/validators.ts`) com os campos que
 * só fazem sentido no limite da API (honeypot, token do Turnstile) — o
 * schema do formulário em si não muda.
 */
export const apiLeadSchema = leadSchema.extend({
  /** Campo-armadilha invisível — se vier preenchido, é bot (seção 51: "descarta silenciosamente"). */
  honeypot: z.string().optional(),
  /** Token do Cloudflare Turnstile — ausente/inválido é tolerado apenas em mock mode (sem chave real configurada). */
  turnstileToken: z.string().optional(),
});

export type ApiLeadPayload = z.infer<typeof apiLeadSchema>;

export type LeadStatus = "received" | "sent" | "pending_crm" | "duplicate";

/**
 * Status de entrega por destino (integrações 2026-07-03, ver
 * `docs/WEBFLOW_CUSTOM_CODE_DEV.md`) — espelha o padrão já observado no
 * `firebase_backup_leads.js` legado (`espocrm_sent`/`octadesk_sent`).
 */
export type DeliveryStatus = "pending" | "sent" | "failed";

export type LeadRecord = {
  id: string;
  ramo: string;
  phoneE164: string;
  cep?: string;
  nome?: string;
  cpf?: string;
  placa?: string;
  /** Preenchidos apenas via `ContactLeadModal` (integrações 2026-07-08) — ver `lib/validators.ts`. */
  email?: string;
  veiculoAno?: string;
  veiculoMarcaModelo?: string;
  utm?: ApiLeadPayload["utm"];
  /** Status agregado (legado — mantido para compatibilidade com o código existente). */
  status: LeadStatus;
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;

  // Status por destino (EspoCRM via proxy "FlyingDonkeys", Octadesk via
  // proxy "Webflow Octa") — ver lib/leads/espocrm.ts e lib/leads/octadesk.ts.
  espocrmStatus: DeliveryStatus;
  espocrmAttempts: number;
  octadeskStatus: DeliveryStatus;
  octadeskAttempts: number;

  /** Enriquecimento opcional via PH3A (server-side, não-bloqueante — ver app/api/lead/route.ts). */
  ph3aSexo?: string;
  ph3aDataNascimento?: string;
  ph3aEstadoCivil?: string;
};
