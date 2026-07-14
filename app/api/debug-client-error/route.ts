import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/debug-client-error — instrumentação TEMPORÁRIA (2026-07-14)
 * para diagnosticar o "Application error" persistente relatado em
 * `/obrigado` em produção. Só loga no console do servidor (visível via
 * `vercel logs`) — nunca grava nada, nunca bloqueia nada no client.
 *
 * REMOVER depois de identificado o erro real — ver
 * `components/analytics/PageAnalytics.tsx` (listener que chama isto) e
 * este arquivo.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.error("[DEBUG-CLIENT-ERROR]", JSON.stringify(body));
  } catch {
    // ignora
  }
  return NextResponse.json({ ok: true });
}
