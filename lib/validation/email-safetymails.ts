import { createHash, createHmac } from "node:crypto";

import { env } from "@/lib/env";

/**
 * lib/validation/email-safetymails.ts — validação de e-mail via
 * SafetyMails (réplica de `validarEmailSafetyMails` em
 * `FooterCodeSiteDefinitivoCompleto.js` do site legado — variante
 * autenticada por HMAC, distinta da variante GET+base64 usada em
 * `webflow_injection_limpo.js`).
 *
 * Achado 2026-10-22: assinatura/DNS do ticket voltaram a responder.
 * A API exige `Referer`/`Origin` de um domínio cadastrado
 * (`https://imediatoseguros.com.br/`) e devolve o campo `Status`
 * (`VALIDO` | `INCERTO` | `INVALIDO`) — não mais `StatusEmail`.
 * Sem Referer a API responde 403 "Origem diferente".
 *
 * Regra de negócio (2026-10-22): avisar só quando `Status === "INVALIDO"`.
 * `VALIDO` e `INCERTO` passam sem aviso (ex.: caixas catch-all / caixas
 * ausentes no MX costumam vir como INCERTO).
 *
 * Diferente do legado (que chama isso direto do navegador, expondo
 * `SAFETY_API_KEY`), esta função só roda server-side — ver
 * `app/api/validate/email/route.ts`.
 *
 * Filosofia: tenta a chamada real, mas **nunca bloqueia** o usuário se
 * ela falhar (HTTP não-OK / rede) — "falha aberta", igual ao
 * `validateEmail` legado (`catch` silencioso → e-mail considerado válido).
 */
export type EmailApiResult = { ok: boolean };

const SAFETY_ORIGIN = "https://imediatoseguros.com.br";
const SAFETY_REFERER = "https://imediatoseguros.com.br/";

function isInvalidStatus(data: Record<string, unknown>): boolean {
  // API atual (2026-10): campo `Status`.
  if (typeof data.Status === "string") {
    return data.Status === "INVALIDO";
  }
  // Fallback legado: `StatusEmail` (só VALIDO era aceito).
  if (typeof data.StatusEmail === "string") {
    return data.StatusEmail !== "VALIDO";
  }
  return false;
}

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
      headers: {
        "Sf-Hmac": hmac,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: SAFETY_ORIGIN,
        Referer: SAFETY_REFERER,
      },
      body: form.toString(),
    });

    if (!response.ok) {
      console.warn(`[lib/validation/email-safetymails] Resposta não-OK (status ${response.status}) — não bloqueante, considerando válido.`);
      return { ok: true };
    }

    const data = (await response.json()) as Record<string, unknown>;
    if (data && isInvalidStatus(data)) {
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.warn("[lib/validation/email-safetymails] Falha ao consultar o SafetyMails (não bloqueante, considerando válido):", error);
    // Falha externa não bloqueia — mesmo comportamento do legado.
    return { ok: true };
  }
}
