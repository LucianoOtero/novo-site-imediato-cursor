import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { resolveEspoDashConfig } from "@/lib/espo";
import { asOfDateSp, currentMonthKey, lastAggerRun } from "@/lib/production";

export async function GET() {
  try {
    await requireSession();
    const espo = resolveEspoDashConfig();
    const run = await lastAggerRun();
    return NextResponse.json({
      asOfSp: asOfDateSp(),
      currentMonth: currentMonthKey(),
      espo: { baseUrl: espo.baseUrl, source: espo.source },
      aggerRun: run,
      serverTime: new Date().toISOString(),
    });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro" },
      { status },
    );
  }
}
