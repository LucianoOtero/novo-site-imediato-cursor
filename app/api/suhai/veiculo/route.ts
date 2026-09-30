import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { veiculoPorPlaca } from "@/lib/suhai/veiculo-placa";
import { isValidPlacaFormat } from "@/lib/validators";

/** POST /api/suhai/veiculo — preenche o formulário a partir da placa. */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ipHash = hashIp(getClientIp(request.headers));
  const rateLimit = checkRateLimit(ipHash, { bucket: "validate" });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false, motivo: "limite" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, motivo: "json" }, { status: 422 });
  }

  const placa = String((body as { placa?: string })?.placa ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!isValidPlacaFormat(placa)) {
    return NextResponse.json({ ok: false, motivo: "formato" }, { status: 422 });
  }

  const veiculo = await veiculoPorPlaca(placa);
  if (!veiculo.ok) return NextResponse.json({ ok: false, motivo: "nao_encontrada" });
  return NextResponse.json(veiculo);
}
