import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { validateCepViaViaCep } from "@/lib/validation/cep-viacep";

/**
 * POST /api/validate/cep — proxy server-side para o ViaCEP (projeto
 * 2026-07-14, validação de CEP em tempo real — réplica de
 * `validarCepViaCep`/`validateCEP` do site legado). ViaCEP é uma API
 * pública, sem chave — o proxy existe por consistência com o padrão
 * já usado pelas outras validações deste projeto.
 */
export const runtime = "nodejs";

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

  const { cep } = (body as { cep?: string }) ?? {};
  const digits = (cep ?? "").replace(/\D/g, "");

  if (digits.length !== 8) {
    return NextResponse.json({ ok: false, reason: "formato" });
  }

  const result = await validateCepViaViaCep(digits);
  return NextResponse.json({ ok: result.ok, reason: result.ok ? "ok" : "nao_encontrado", cidade: result.cidade, estado: result.estado });
}
