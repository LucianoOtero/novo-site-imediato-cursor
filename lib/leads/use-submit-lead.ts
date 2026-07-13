"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { publicEnv } from "@/lib/env";
import { buildRpaPayload, startRpaSession } from "@/lib/rpa";
import type { LeadInput } from "@/lib/validators";

/** Tempo mínimo que o `RPAProgressModal` fica visível antes do redirect — feedback visível sem atrasar a conversão por muito tempo. */
const RPA_MODAL_MIN_DISPLAY_MS = 4000;

/**
 * useSubmitLead — envio de lead para `/api/lead` + redirect (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 44.2 ("duplicado... UX de sucesso
 * normal" — por isso `response.ok` cobre 200 e 201 igualmente).
 *
 * Extraído de `CotacaoForm` (Issue 13) — a Home (Issue 15) embute o
 * mesmo `LeadForm` no Hero e precisa do mesmo comportamento de envio;
 * centralizar aqui evita duplicar a chamada a `/api/lead` numa 2ª cópia.
 *
 * RPA (integrações 2026-07-03, `NEXT_PUBLIC_RPA_ENABLED`): disparado
 * **depois** do `/api/lead` responder com sucesso, nunca antes — a
 * conversão do lead nunca depende do RPA. `rpaSessionId` é exposto para
 * o componente consumidor renderizar `RPAProgressModal`; o redirect para
 * `/obrigado` espera só um tempo mínimo fixo (não o processo completo do
 * RPA, que pode demorar bem mais) — "não bloqueante" conforme o plano de
 * integração.
 *
 * `leadId` (projeto 2026-07-13, captura em 2 fases): quando o `LeadForm`
 * já disparou um contato inicial no passo 1, este envio final usa
 * `stage: "complete"` + o `leadId` recebido, para que `/api/lead`
 * **atualize** o mesmo registro (dados completos, e-mail/nome reais) em
 * vez de criar um lead duplicado. Sem `leadId` (chamador antigo/sem
 * captura em 2 fases), comportamento inalterado: um único envio
 * `stage: "complete"` (padrão), que cria o lead direto.
 */
export function useSubmitLead(ramo: string) {
  const router = useRouter();
  const [rpaSessionId, setRpaSessionId] = useState<string | null>(null);

  async function submitLead(lead: LeadInput, leadId?: string) {
    const response = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ ...lead, stage: "complete", leadId }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao enviar lead: ${response.status}`);
    }

    if (publicEnv.rpaEnabled) {
      try {
        const sessionId = await startRpaSession(
          buildRpaPayload({ ddd: lead.ddd, celular: lead.celular, ramo, cep: lead.cep, nome: lead.nome, cpf: lead.cpf, placa: lead.placa })
        );
        setRpaSessionId(sessionId);
        await new Promise((resolve) => setTimeout(resolve, RPA_MODAL_MIN_DISPLAY_MS));
      } catch (error) {
        // Nunca bloqueia a conversão — RPA é um extra, não o caminho crítico.
        console.error("[useSubmitLead] Falha ao iniciar RPA (não bloqueia a conversão):", error);
      }
    }

    router.push(`/obrigado?ramo=${encodeURIComponent(ramo)}`);
  }

  return { submitLead, rpaSessionId, clearRpaSession: () => setRpaSessionId(null) };
}
