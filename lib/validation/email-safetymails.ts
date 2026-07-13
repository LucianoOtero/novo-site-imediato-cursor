import { createHash, createHmac } from "node:crypto";

import { env } from "@/lib/env";

/**
 * lib/validation/email-safetymails.ts — validação de e-mail via
 * SafetyMails (projeto 2026-07-13, réplica de `validarEmailSafetyMails`
 * em `FooterCodeSiteDefinitivoCompleto.js` do site legado — variante
 * autenticada por HMAC, distinta da variante GET+base64 usada em
 * `webflow_injection_limpo.js`).
 *
 * ⚠️ Achado (2026-07-13): testei as 2 variantes conhecidas com as
 * credenciais reais do site legado (DEV e PROD) e nenhuma respondeu:
 * - GET + base64 (`optin.safetymails.com/.../{base64(email)}`): HTTP 400
 *   `{"MsgErro":"Função descontinuada - Procure o Suporte"}`.
 * - POST + HMAC (`https://{ticket}.safetymails.com/api/{sha1(ticket)}`):
 *   erro de DNS (`ENOTFOUND`), com o ticket de DEV e também o de PRODUÇÃO
 *   (confirmado lendo `VERIFICACAO_SAFETYMAILS_PROD_ATUALIZADO_20251123.md`
 *   no projeto legado).
 * Esse problema já está documentado como não resolvido no próprio
 * projeto legado (`INVESTIGACAO_ERRO_403_SAFETYMAILS.md`) — não é
 * específico deste site. Implementado aqui mesmo assim (decisão do
 * cliente, 2026-07-13): tenta a chamada real, mas **nunca bloqueia** o
 * usuário se ela falhar — mesmo comportamento de "falha aberta" do
 * `validateEmail` legado (`catch` silencioso → e-mail considerado válido).
 *
 * Diferente do legado (que chama isso direto do navegador, expondo
 * `SAFETY_API_KEY`), esta função só roda server-side — ver
 * `app/api/validate/email/route.ts`.
 */
export type EmailApiResult = { ok: boolean };

export async function validateEmailViaSafetyMails(email: string): Promise<EmailApiResult> {
  if (!env.safetyTicket || !env.safetyApiKey) {
    // Modo mock — sem credenciais configuradas, não bloqueia.
    return { ok: true };
  }

  try {
    const code = createHash("sha1").update(env.safetyTicket).digest("hex");
    const hmac = createHmac("sha256", env.safetyApiKey).update(email).digest("hex");
    const url = `https://${env.safetyTicket}.${env.safetymailsBaseDomain}/api/${code}`;

    const form = new URLSearchParams();
    form.set("email", email);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Sf-Hmac": hmac },
      body: form,
    });

    if (!response.ok) {
      console.warn(`[lib/validation/email-safetymails] Resposta não-OK (status ${response.status}) — não bloqueante, considerando válido.`);
      return { ok: true };
    }

    const data = await response.json();
    if (data && data.StatusEmail && data.StatusEmail !== "VALIDO") {
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.warn("[lib/validation/email-safetymails] Falha ao consultar o SafetyMails (não bloqueante, considerando válido):", error);
    // Falha externa não bloqueia — mesmo comportamento do legado.
    return { ok: true };
  }
}
