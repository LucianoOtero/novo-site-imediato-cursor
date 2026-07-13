import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { validateEmailViaSafetyMails } from "@/lib/validation/email-safetymails";

/**
 * POST /api/validate/email — proxy server-side para o SafetyMails
 * (projeto 2026-07-13, validação de e-mail em tempo real). Mantém
 * `SAFETY_API_KEY` só no servidor — diferente do site legado, que chama
 * o SafetyMails direto do navegador.
 *
 * Ver `lib/validation/email-safetymails.ts` para o achado de que o
 * SafetyMails parece fora do ar hoje (best-effort, nunca bloqueia).
 */
export const runtime = "nodejs";

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export async function POST(request: NextRequest) {
  const ipHash = hashIp(getClientIp(request.headers));
  const rateLimit = checkRateLimit(ipHash);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429, headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 422 });
  }

  const { email } = (body as { email?: string }) ?? {};
  const trimmed = (email ?? "").trim();

  if (!EMAIL_FORMAT.test(trimmed)) {
    return NextResponse.json({ ok: false, reason: "formato" });
  }

  const result = await validateEmailViaSafetyMails(trimmed);
  return NextResponse.json({ ok: result.ok, reason: result.ok ? "ok" : "safety_mails" });
}
