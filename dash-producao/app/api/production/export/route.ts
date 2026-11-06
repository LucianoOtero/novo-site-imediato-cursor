import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireSession } from "@/lib/auth";
import { FLAG_INFO, FLAG_ORDER, flagLabel } from "@/lib/flag-labels";
import {
  computeProduction,
  currentMonthKey,
  filterLines,
  lineFiltersFrom,
  sumLines,
  toLine,
  type Line,
  type LineFilters,
} from "@/lib/production";

const SOURCE_LABEL: Record<string, string> = { espo: "Espo", agger_only: "Só Agger" };

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

function hasFilters(f: LineFilters): boolean {
  return Boolean(f.vendorKey || f.vendor || f.flag || f.source || f.day || f.q);
}

function analiticoSheet(lines: Line[]) {
  return lines.map((l) => ({
    fonte: SOURCE_LABEL[l.source] || l.source,
    opp_id: l.oppId || "",
    cliente: l.oppName || "",
    vendedor: l.vendorName,
    data_emissao: l.emissionDate || "",
    produzido: l.produzido,
    emitido: l.emitido,
    seguradora: l.seguradora || "",
    ramo: l.ramo || "",
    numero_apolice: l.numeroApolice || "",
    numero_proposta: l.numeroProposta || "",
    vendedor_agger: l.vendedorAgger || "",
    status_match: l.matchKind || "",
    via: l.matchVia || "",
    flags: l.flags.map(flagLabel).join(" | "),
    link_espo: l.espoUrl || "",
  }));
}

export async function GET(req: Request) {
  try {
    await requireSession();
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || currentMonthKey();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month inválido (YYYY-MM)" }, { status: 400 });
    }
    const filters = lineFiltersFrom(url.searchParams);
    const filtered = hasFilters(filters);
    const data = await computeProduction(month);
    const all = data.rows.map(toLine);
    const lines = filterLines(all, filters);
    const tot = sumLines(lines);
    const totMes = sumLines(all);

    const byVendor = new Map<
      string,
      { vendedor: string; linhas: number; produzido: number; emitido: number; comFlag: number }
    >();
    for (const l of lines) {
      const g = byVendor.get(l.vendorKey) || {
        vendedor: l.vendorName,
        linhas: 0,
        produzido: 0,
        emitido: 0,
        comFlag: 0,
      };
      g.linhas += 1;
      g.produzido += Number(l.produzido) || 0;
      g.emitido += Number(l.emitido) || 0;
      if (l.flags.length) g.comFlag += 1;
      byVendor.set(l.vendorKey, g);
    }
    const consolidated = new Map(
      (data.vendors as Array<Record<string, unknown>>).map((v) => [String(v.vendorKey), v]),
    );
    const vendedores = [...byVendor.entries()]
      .sort((a, b) => b[1].produzido - a[1].produzido)
      .map(([key, g]) => {
        const v = consolidated.get(key);
        const base = {
          vendedor: g.vendedor,
          linhas: g.linhas,
          produzido: g.produzido,
          emitido: g.emitido,
          linhas_com_flag: g.comFlag,
        };
        if (filtered || !v) return base;
        return {
          ...base,
          projetado_produzido: Number(v.projetadoProduzido) || 0,
          projetado_emitido: Number(v.projetadoEmitido) || 0,
          media_3m_produzido: v.media3mProduzido == null ? "" : Number(v.media3mProduzido),
        };
      });
    vendedores.push({
      vendedor: "TOTAL",
      linhas: tot.linhas,
      produzido: tot.produzido,
      emitido: tot.emitido,
      linhas_com_flag: lines.filter((l) => l.flags.length).length,
      ...(filtered
        ? {}
        : {
            projetado_produzido: Number(data.house.projetadoProduzidoCasa) || 0,
            projetado_emitido: Number(data.house.projetadoEmitidoCasa) || 0,
            media_3m_produzido: "",
          }),
    });

    const flagsPresentes = [
      ...FLAG_ORDER,
      ...new Set(lines.flatMap((l) => l.flags).filter((f) => !FLAG_INFO[f])),
    ];
    const inconsistencias = flagsPresentes
      .map((f) => {
        const com = lines.filter((l) => l.flags.includes(f));
        const s = sumLines(com);
        return {
          flag: f,
          inconsistencia: flagLabel(f),
          descricao: FLAG_INFO[f]?.descricao || "",
          linhas: s.linhas,
          produzido: s.produzido,
          emitido: s.emitido,
        };
      })
      .filter((r) => r.linhas > 0);

    const resumo = [
      ["Mês", month],
      ["Data de referência (dias úteis)", data.asOf],
      ["Espo consultado em", data.espoFetchedAt || ""],
      ["Filtro vendedor", filters.vendorKey ? lines[0]?.vendorName || filters.vendorKey : filters.vendor || "todos"],
      ["Filtro inconsistência", filters.flag ? (filters.flag === "__any" ? "qualquer" : flagLabel(filters.flag)) : "todas"],
      ["Filtro fonte", filters.source ? SOURCE_LABEL[filters.source] || filters.source : "todas"],
      ["Filtro dia de emissão", filters.day || "mês inteiro"],
      ["Busca", filters.q || ""],
      [],
      ["", "Recorte", "Mês inteiro"],
      ["Linhas", tot.linhas, totMes.linhas],
      ["Produzido (Espo)", tot.produzido, totMes.produzido],
      ["Emitido (Agger)", tot.emitido, totMes.emitido],
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), "resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analiticoSheet(lines)), "analitico");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vendedores), "vendedores");
    XLSX.utils.book_append_sheet(
      wb,
      inconsistencias.length
        ? XLSX.utils.json_to_sheet(inconsistencias)
        : XLSX.utils.aoa_to_sheet([["Nenhuma inconsistência no recorte."]]),
      "inconsistencias",
    );
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const nome = [
      "producao",
      month,
      filters.day,
      filters.vendorKey ? slug(lines[0]?.vendorName || "vendedor") : filters.vendor ? slug(filters.vendor) : "",
      filters.flag && filters.flag !== "__any" ? filters.flag : filters.flag ? "inconsistencias" : "",
      filters.source,
    ]
      .filter(Boolean)
      .join("_");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nome}.xlsx"`,
        "Cache-Control": "no-store",
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
