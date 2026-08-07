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

/**
 * Janela deslizante em memória (seção 51). Buckets separados para
 * `/api/lead` vs `/api/validate/*` — validação de placa/CEP/telefone/e-mail
 * no formulário não consome a cota de envio do lead (e vice-versa).
 * Reinicia a cada cold start — aceitável para rate limit best-effort.
 *
 * Limites (aumentados em relação aos 5/min·30/h originais):
 * - lead: 20/min, 120/h
 * - validate: 60/min, 500/h (várias chamadas por digitação/blur + E2E)
 */
const requestLog = new Map<string, number[]>();

export type RateLimitBucket = "lead" | "validate" | "contact";
export type RateLimitResult = { allowed: boolean; retryAfterSeconds?: number };

const RATE_LIMITS: Record<RateLimitBucket, { perMinute: number; perHour: number }> = {
  lead: { perMinute: 20, perHour: 120 },
  validate: { perMinute: 60, perHour: 500 },
  contact: { perMinute: 8, perHour: 40 },
};

export function checkRateLimit(
  ipHash: string,
  options: { now?: number; bucket?: RateLimitBucket } = {}
): RateLimitResult {
  const now = options.now ?? Date.now();
  const bucket = options.bucket ?? "lead";
  const limits = RATE_LIMITS[bucket];
  const key = `${bucket}:${ipHash}`;

  const ONE_MINUTE = 60_000;
  const ONE_HOUR = 60 * ONE_MINUTE;
  const timestamps = (requestLog.get(key) ?? []).filter((ts) => now - ts < ONE_HOUR);

  const lastMinute = timestamps.filter((ts) => now - ts < ONE_MINUTE);
  const lastHour = timestamps;

  if (lastMinute.length >= limits.perMinute) {
    return { allowed: false, retryAfterSeconds: 60 };
  }
  if (lastHour.length >= limits.perHour) {
    return { allowed: false, retryAfterSeconds: 3600 };
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
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

  // Fail-open deliberado (auditoria 2026-08-07, plano aprovado): token
  // AUSENTE passa com aviso — cobre widget bloqueado por adblock, timeout
  // de rede e os fluxos legados sem token. Só rejeitamos token PRESENTE e
  // inválido (bot que tentou forjar/reusar — tokens são de uso único).
  // Filosofia do funil: nunca perder um lead real por causa do anti-bot.
  if (!token) {
    console.warn("[lib/leads/security] Lead sem turnstileToken (widget indisponível?) — aceito por fail-open.");
    return true;
  }

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
