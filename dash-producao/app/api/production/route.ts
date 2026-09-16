import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { computeProduction, currentMonthKey } from "@/lib/production";

export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || currentMonthKey();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month inválido (YYYY-MM)" }, { status: 400 });
    }
    const data = await computeProduction(month);
    const { rows: _omit, ...summary } = data;
    void _omit;
    return NextResponse.json(summary);
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro" },
      { status },
    );
  }
}
