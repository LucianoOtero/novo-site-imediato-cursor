import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { perfilPorCpf } from "@/lib/suhai/perfil";
import { isValidCpf, onlyDigits } from "@/lib/validators";

/**
 * POST /api/suhai/perfil — nascimento, sexo e estado civil pelo mesmo
 * caminho do RPA (PH3A + idade). Não grava o CPF.
 */
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

  const cpf = onlyDigits(String((body as { cpf?: string })?.cpf ?? ""));
  if (!isValidCpf(cpf)) {
    return NextResponse.json({ ok: false, motivo: "cpf" }, { status: 422 });
  }

  const perfil = await perfilPorCpf(cpf);
  if (!perfil) return NextResponse.json({ ok: false, motivo: "sem_perfil" });
  return NextResponse.json({ ok: true, ...perfil });
}
