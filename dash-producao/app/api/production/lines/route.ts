import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import {
  computeProduction,
  currentMonthKey,
  filterLines,
  lineFacets,
  lineFiltersFrom,
  sumLines,
  toLine,
} from "@/lib/production";

export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || currentMonthKey();
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(5000, Math.max(1, Number(url.searchParams.get("pageSize") || 50)));

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month inválido (YYYY-MM)" }, { status: 400 });
    }

    const data = await computeProduction(month, { history: false });
    const all = data.rows.map(toLine);
    const filters = lineFiltersFrom(url.searchParams);
    const lines = filterLines(all, filters);

    const start = (page - 1) * pageSize;
    return NextResponse.json({
      month: data.month,
      asOf: data.asOf,
      espoFetchedAt: data.espoFetchedAt,
      filters,
      total: lines.length,
      totals: sumLines(lines),
      monthTotals: sumLines(all),
      facets: lineFacets(all),
      page,
      pageSize,
      lines: lines.slice(start, start + pageSize),
    });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro" },
      { status },
    );
  }
}
