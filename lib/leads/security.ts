import { createHash, createHmac } from "node:crypto";

import { env } from "@/lib/env";

/**
 * lib/leads/security.ts — camadas de segurança de `/api/lead` (Issue 12).
 * Fonte: ESPECIFICACAO v3.md, seção 51 ("Segurança de /api/lead"): rate
 * limiting por IP-hash, Turnstile, assinatura HMAC do webhook.
 */

const DEV_FALLBACK_SALT = "dev-only-salt-nao-usar-em-producao";

/** IP nunca é armazenado em claro (seção 51: "IP em hash"). */
export function hashIp(ip: string): string {
  const salt = env.ipHashSalt || DEV_FALLBACK_SALT;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Extrai o IP do cliente a partir dos headers padrão de proxy/CDN.
 * `request.ip` não existe em `Request`/`NextRequest` no runtime Node
 * usado aqui — depende de `x-forwarded-for` (Vercel e a maioria dos
 * proxies preenchem isso automaticamente).
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** Janela deslizante em memória (seção 51: "5/min, 30/h"). Reinicia a cada cold start — aceitável para rate limit best-effort. */
const requestLog = new Map<string, number[]>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

export function checkRateLimit(ipHash: string, now: number = Date.now()): RateLimitResult {
  const ONE_MINUTE = 60_000;
  const ONE_HOUR = 60 * ONE_MINUTE;
  const timestamps = (requestLog.get(ipHash) ?? []).filter((ts) => now - ts < ONE_HOUR);

  const lastMinute = timestamps.filter((ts) => now - ts < ONE_MINUTE);
  const lastHour = timestamps;

  if (lastMinute.length >= 5) {
    return { allowed: false, retryAfterSeconds: 60 };
  }
  if (lastHour.length >= 30) {
    return { allowed: false, retryAfterSeconds: 3600 };
  }

  timestamps.push(now);
  requestLog.set(ipHash, timestamps);
  return { allowed: true };
}

/**
 * Verifica o token do Cloudflare Turnstile (seção 51: "Challenge").
 *
 * Em mock mode (sem `TURNSTILE_SECRET_KEY` real configurada — placeholder
 * do `.env.example`), a verificação é pulada com aviso: o widget do
 * Turnstile ainda não foi integrado ao `LeadForm` (fora do escopo da
 * Issue 11), então exigir um token real bloquearia todo envio local.
 */
const PLACEHOLDER_TURNSTILE_SECRET = "0x0000000000000000000000_secret_placeholder";

export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const hasRealSecret = Boolean(env.turnstileSecretKey) && env.turnstileSecretKey !== PLACEHOLDER_TURNSTILE_SECRET;

  if (!hasRealSecret) {
    console.warn(
      "[lib/leads/security] TURNSTILE_SECRET_KEY não configurada (ou é o placeholder) — verificação pulada (mock mode). Não usar em produção sem o widget real integrado ao LeadForm."
    );
    return true;
  }

  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.turnstileSecretKey!, response: token }),
    });
    const result = (await response.json()) as { success: boolean };
    return result.success;
  } catch (error) {
    console.error("[lib/leads/security] Falha ao verificar Turnstile:", error);
    return false;
  }
}

/** Assinatura HMAC do payload enviado ao webhook do CRM (seção 51: "Assinatura"). */
export function signWebhookPayload(payload: string): string {
  const secret = env.leadWebhookSecret || DEV_FALLBACK_SALT;
  return createHmac("sha256", secret).update(payload).digest("hex");
}
