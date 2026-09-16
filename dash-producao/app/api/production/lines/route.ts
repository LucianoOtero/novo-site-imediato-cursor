import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { computeProduction, currentMonthKey } from "@/lib/production";

export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || currentMonthKey();
    const vendor = url.searchParams.get("vendor") || "";
    const flag = url.searchParams.get("flag") || "";
    const source = url.searchParams.get("source") || "";
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") || 50)));

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month inválido (YYYY-MM)" }, { status: 400 });
    }

    const data = await computeProduction(month);
    let lines = data.rows as Array<{
      source: string;
      vendorId?: string | null;
      vendorName?: string | null;
      flags?: string[];
      oppId?: string | null;
      produzido: number;
      emitido: number;
      emissionDate?: string | null;
      seguradora?: string | null;
      matchKind?: string;
      matchVia?: string;
      oppName?: string | null;
    }>;

    if (vendor) {
      const v = vendor.toLowerCase();
      lines = lines.filter(
        (r) =>
          (r.vendorName || "").toLowerCase().includes(v) ||
          (r.vendorId || "") === vendor,
      );
    }
    if (flag) lines = lines.filter((r) => (r.flags || []).includes(flag));
    if (source) lines = lines.filter((r) => r.source === source);

    const total = lines.length;
    const start = (page - 1) * pageSize;
    const slice = lines.slice(start, start + pageSize).map((r) => ({
      source: r.source,
      oppId: r.oppId,
      oppName: r.oppName,
      vendorId: r.vendorId,
      vendorName: r.vendorName,
      emissionDate: r.emissionDate,
      produzido: r.produzido,
      emitido: r.emitido,
      seguradora: r.seguradora,
      matchKind: r.matchKind,
      matchVia: r.matchVia,
      flags: r.flags || [],
      espoUrl: r.oppId
        ? `${process.env.ESPO_BASE_URL || "https://flyingdonkeys.com.br"}/#Opportunity/view/${r.oppId}`
        : null,
    }));

    return NextResponse.json({
      month: data.month,
      asOf: data.asOf,
      espoFetchedAt: data.espoFetchedAt,
      total,
      page,
      pageSize,
      lines: slice,
    });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro" },
      { status },
    );
  }
}
