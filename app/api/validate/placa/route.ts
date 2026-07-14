import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { isValidPlacaFormat } from "@/lib/validators";
import { validatePlacaViaFipe } from "@/lib/validation/placa-fipe";

/**
 * POST /api/validate/placa — proxy server-side para a Placa Fipe
 * (projeto 2026-07-14, validação de placa em tempo real — réplica de
 * `validarPlacaApi`/`validatePlaca` do site legado). Mantém a URL do
 * proxy Cloud Run só no servidor — diferente do legado, que chama
 * direto do navegador.
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

  const { placa } = (body as { placa?: string }) ?? {};
  const normalizada = (placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!isValidPlacaFormat(normalizada)) {
    return NextResponse.json({ ok: false, reason: "formato" });
  }

  const result = await validatePlacaViaFipe(normalizada);
  return NextResponse.json({
    ok: result.ok,
    reason: result.ok ? "ok" : "nao_encontrada",
    marcaModelo: result.marcaModelo,
    ano: result.ano,
    tipoVeiculo: result.tipoVeiculo,
  });
}
