import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { validatePhoneViaApiLayer } from "@/lib/validation/phone-apilayer";

/**
 * POST /api/validate/phone — proxy server-side para a APILayer (projeto
 * 2026-07-13, validação de celular em tempo real). Mantém `APILAYER_KEY`
 * só no servidor — diferente do site legado, que chama a APILayer direto
 * do navegador, expondo a chave no JS público.
 *
 * Runtime Node (não edge): reaproveita `checkRateLimit`/`hashIp` de
 * `lib/leads/security.ts` (mesma proteção de `/api/lead`) para não deixar
 * esse proxy virar uma forma barata de esgotar a cota da APILayer.
 */
export const runtime = "nodejs";

function onlyDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

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

  const { ddd, celular } = (body as { ddd?: string; celular?: string }) ?? {};
  const dddDigits = onlyDigits(ddd ?? "");
  const celularDigits = onlyDigits(celular ?? "");

  // Formato local primeiro (mesma regra de `validarCelularLocal` do
  // legado) — só chama a APILayer se o formato já estiver correto.
  if (dddDigits.length !== 2 || celularDigits.length !== 9 || celularDigits[0] !== "9") {
    return NextResponse.json({ ok: false, reason: "formato" });
  }

  const result = await validatePhoneViaApiLayer(dddDigits + celularDigits);
  return NextResponse.json({ ok: result.ok, reason: result.ok ? "ok" : "api" });
}
