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
  /**
   * Captura em 2 fases (projeto 2026-07-13, réplica do modal legado):
   * `"initial"` — só DDD+Celular confirmados (ramo/demais campos podem
   * vir vazios), dispara o contato inicial (EspoCRM+Octadesk) e devolve
   * `leadId` para a próxima chamada. `"complete"` (padrão, mantém
   * compatibilidade com o comportamento anterior a esta issue) — envio
   * único ou atualização final com os dados completos.
   */
  stage: z.enum(["initial", "complete"]).optional(),
  /** `id` devolvido por uma chamada `stage: "initial"` anterior — se encontrado, atualiza esse registro em vez de criar um novo. */
  leadId: z.string().optional(),
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
  /**
   * Captura em 2 fases (projeto 2026-07-13): `"initial"` enquanto só o
   * telefone foi confirmado; `"complete"` depois da atualização final
   * com os dados completos (ou desde o início, para envios de uma vez
   * só — comportamento anterior a esta issue, mantido por padrão).
   */
  stage: "initial" | "complete";
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

  /**
   * IDs devolvidos pelo EspoCRM no contato inicial (projeto 2026-07-13,
   * mesmo padrão de `leadIdFlyingDonkeys`/`opportunityIdFlyingDonkeys`
   * no `MODAL_WHATSAPP_DEFINITIVO.js` legado) — usados para que a
   * atualização final referencie o mesmo lead/oportunidade, em vez de
   * criar um registro novo no CRM.
   */
  espocrmLeadId?: string;
  espocrmOpportunityId?: string;

  /** Enriquecimento opcional via PH3A (server-side, não-bloqueante — ver app/api/lead/route.ts). */
  ph3aSexo?: string;
  ph3aDataNascimento?: string;
  ph3aEstadoCivil?: string;
};
