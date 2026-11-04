import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { veiculoPorModelo, veiculoPorPlaca } from "@/lib/suhai/veiculo-placa";
import { isValidPlacaFormat } from "@/lib/validators";

/** POST /api/suhai/veiculo — preenche o formulário a partir da placa ou, sem placa, de marca, modelo e ano. */
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

  const dados = (body ?? {}) as { placa?: string; marca?: string; modelo?: string; anoModelo?: string };
  if (dados.placa === undefined) {
    const marca = String(dados.marca ?? "").trim().slice(0, 40);
    const modelo = String(dados.modelo ?? "").trim().slice(0, 60);
    const anoModelo = String(dados.anoModelo ?? "");
    if (!marca || !modelo || !/^(19|20)\d{2}$/.test(anoModelo)) {
      return NextResponse.json({ ok: false, motivo: "formato" }, { status: 422 });
    }
    const veiculo = await veiculoPorModelo({ marca, modelo, anoModelo });
    if (!veiculo.ok) return NextResponse.json({ ok: false, motivo: "nao_encontrado" });
    return NextResponse.json(veiculo);
  }

  const placa = String(dados.placa)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!isValidPlacaFormat(placa)) {
    return NextResponse.json({ ok: false, motivo: "formato" }, { status: 422 });
  }

  const veiculo = await veiculoPorPlaca(placa);
  if (!veiculo.ok) return NextResponse.json({ ok: false, motivo: "nao_encontrada" });
  return NextResponse.json(veiculo);
}
