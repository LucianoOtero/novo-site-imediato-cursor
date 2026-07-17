"use client";

import { useRouter } from "next/navigation";

import type { LeadInput } from "@/lib/validators";

/**
 * useSubmitLead — envio de lead para `/api/lead` + redirect (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 44.2 ("duplicado... UX de sucesso
 * normal" — por isso `response.ok` cobre 200 e 201 igualmente).
 *
 * Extraído de `CotacaoForm` (Issue 13) — a Home (Issue 15) embute o
 * mesmo `LeadForm` no Hero e precisa do mesmo comportamento de envio;
 * centralizar aqui evita duplicar a chamada a `/api/lead` numa 2ª cópia.
 *
 * `leadId` (projeto 2026-07-13, captura em 2 fases): quando o `LeadForm`
 * já disparou um contato inicial no passo 1, este envio final usa
 * `stage: "complete"` + o `leadId` recebido, para que `/api/lead`
 * **atualize** o mesmo registro (dados completos, e-mail/nome reais) em
 * vez de criar um lead duplicado. Sem `leadId` (chamador antigo/sem
 * captura em 2 fases), comportamento inalterado: um único envio
 * `stage: "complete"` (padrão), que cria o lead direto.
 *
 * `skipStrictValidation` (projeto 2026-07-14): `true` quando o usuário
 * escolheu "Prosseguir assim mesmo" com CPF/CEP inválidos no diálogo do
 * `LeadForm` — repassado a `/api/lead` (ver `lib/leads/types.ts`) para
 * não rejeitar de novo o mesmo valor.
 *
 * Simplificação 2026-07-16 ("etapa de decisão RPA no formulário"): o
 * disparo automático/cosmético do RPA que existia aqui (sem mostrar
 * nenhum resultado real) foi removido — o `LeadForm` agora orquestra o
 * RPA de verdade só quando o usuário escolhe explicitamente "Aguardar o
 * cálculo" no novo passo 4 (`RpaChoiceStep`/`RpaCalculationScreen`),
 * sem passar por este hook (que faria o redirect indesejado nesse
 * caso). Este hook volta a ser só `POST /api/lead` + redirect — usado
 * pela opção "Prefiro falar com um consultor depois" e por qualquer
 * outro chamador que não precise do RPA (ex.: `ContactLeadModal`, se um
 * dia vier a usar este hook).
 */
export function useSubmitLead(ramo: string) {
  const router = useRouter();

  async function submitLead(lead: LeadInput, leadId?: string, skipStrictValidation?: boolean) {
    const response = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ ...lead, stage: "complete", leadId, skipStrictValidation }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao enviar lead: ${response.status}`);
    }

    router.push(`/obrigado?ramo=${encodeURIComponent(ramo)}`);
  }

  return { submitLead };
}
