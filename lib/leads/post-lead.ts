"use client";

import { publicEnv } from "@/lib/env";

/**
 * lib/leads/post-lead.ts — POST centralizado a `/api/lead` com token do
 * Cloudflare Turnstile (auditoria 2026-08-07).
 *
 * Antes desta issue, o widget do Turnstile nunca tinha sido integrado ao
 * front (a verificação server-side em `lib/leads/security.ts` existia
 * desde a Issue 12, mas rodava em "mock mode" por falta de chave real) —
 * a proteção efetiva era só honeypot + rate limit.
 *
 * Desenho (plano aprovado):
 * - Widget **invisível** (site criado no dashboard do Cloudflare com o
 *   tipo "Invisible") renderizado sob demanda a cada envio — tokens do
 *   Turnstile são de uso único, então cada POST pede o seu.
 * - **Fail-open no cliente**: sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, com
 *   script bloqueado (adblock) ou timeout, o POST segue SEM token — o
 *   servidor só rejeita token PRESENTE e inválido (ver
 *   `verifyTurnstile`). Filosofia do projeto: nunca perder um lead real
 *   por causa do anti-bot.
 * - O script só é carregado no primeiro envio (nada no critical path do
 *   page load; nas chamadas seguintes já está em cache).
 */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string | undefined;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_TIMEOUT_MS = 4000;

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Permite nova tentativa num envio futuro (ex.: rede instável).
      scriptPromise = null;
      reject(new Error("turnstile script failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Obtém um token de uso único do Turnstile, ou `undefined` (fail-open) se
 * o site key não estiver configurado, o script não carregar ou o desafio
 * não resolver dentro do timeout.
 */
export async function getTurnstileToken(): Promise<string | undefined> {
  const siteKey = publicEnv.turnstileSiteKey;
  if (!siteKey || typeof window === "undefined") return undefined;

  try {
    await Promise.race([
      loadTurnstileScript(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TOKEN_TIMEOUT_MS)),
    ]);
  } catch {
    return undefined;
  }

  return new Promise<string | undefined>((resolve) => {
    const container = document.createElement("div");
    // Fora da viewport — widget invisível não mostra UI, mas o container
    // precisa existir no DOM para o render.
    container.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(container);

    let widgetId: string | undefined;
    let settled = false;

    const finish = (token: string | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (widgetId) window.turnstile?.remove(widgetId);
      } catch {
        // remove() de um widget já destruído não pode derrubar o envio.
      }
      container.remove();
      resolve(token);
    };

    const timer = setTimeout(() => finish(undefined), TOKEN_TIMEOUT_MS);

    try {
      widgetId = window.turnstile?.render(container, {
        sitekey: siteKey,
        callback: (token: string) => finish(token),
        "error-callback": () => finish(undefined),
        "unsupported-callback": () => finish(undefined),
      });
      if (!widgetId) finish(undefined);
    } catch {
      finish(undefined);
    }
  });
}

/**
 * POST a `/api/lead` com o token do Turnstile anexado (quando disponível).
 * Substitui os `fetch("/api/lead", …)` espalhados por LeadForm,
 * ContactLeadModal e useSubmitLead — headers e formato idênticos aos
 * originais; o tratamento de erro/resposta continua em cada chamador.
 */
export async function postLead(payload: Record<string, unknown>): Promise<Response> {
  const turnstileToken = await getTurnstileToken();
  return fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(turnstileToken ? { ...payload, turnstileToken } : payload),
  });
}
