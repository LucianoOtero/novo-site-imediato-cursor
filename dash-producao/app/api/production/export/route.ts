import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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
    const rows = (data.rows as Array<Record<string, unknown>>).map((r) => ({
      fonte: r.source,
      oppId: r.oppId,
      cliente: r.oppName,
      vendedor: r.vendorName,
      emissao: r.emissionDate,
      produzido: r.produzido,
      emitido: r.emitido,
      seguradora: r.seguradora,
      match: r.matchKind,
      via: r.matchVia,
      flags: Array.isArray(r.flags) ? (r.flags as string[]).join("|") : "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "producao");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="producao_${month}.xlsx"`,
      },
    });
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro" },
      { status },
    );
  }
}
