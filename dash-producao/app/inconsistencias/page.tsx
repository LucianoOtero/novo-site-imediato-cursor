"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FLAG_INFO, FLAG_ORDER, flagLabel } from "@/lib/flag-labels";
import { brl, dataBr, DashHeader, getJson, useDashParams } from "../components/dash";

type Line = {
  vendorKey: string;
  vendorName: string;
  produzido: number;
  emitido: number;
  flags: string[];
};

type LinesResponse = {
  total: number;
  monthTotals: { linhas: number };
  facets: {
    vendors: Array<{ key: string; name: string }>;
    days: Array<{ day: string; linhas: number }>;
  };
  lines: Line[];
};

export default function InconsistenciasPage() {
  return (
    <Suspense fallback={<p className="muted page">Carregando…</p>}>
      <Inconsistencias />
    </Suspense>
  );
}

function Inconsistencias() {
  const { meta, metaError, month, params, setParams } = useDashParams();
  const vendorKey = params.get("vendorKey") || "";
  const day = params.get("day") || "";
  const [data, setData] = useState<LinesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (m: string, vk: string, d: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ month: m, flag: "__any", pageSize: "5000" });
      if (vk) qs.set("vendorKey", vk);
      if (d) qs.set("day", d);
      setData(await getJson<LinesResponse>(`/api/production/lines?${qs.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (month) void load(month, vendorKey, day);
  }, [month, vendorKey, day, load]);

  const groups = useMemo(() => {
    const by = new Map<
      string,
      { linhas: number; produzido: number; emitido: number; vendors: Map<string, { name: string; n: number }> }
    >();
    for (const l of data?.lines || []) {
      for (const f of l.flags) {
        const g = by.get(f) || { linhas: 0, produzido: 0, emitido: 0, vendors: new Map() };
        g.linhas += 1;
        g.produzido += Number(l.produzido) || 0;
        g.emitido += Number(l.emitido) || 0;
        const v = g.vendors.get(l.vendorKey) || { name: l.vendorName, n: 0 };
        v.n += 1;
        g.vendors.set(l.vendorKey, v);
        by.set(f, g);
      }
    }
    const order = [...FLAG_ORDER, ...[...by.keys()].filter((f) => !FLAG_INFO[f])];
    return order
      .filter((f) => by.has(f))
      .map((f) => {
        const g = by.get(f)!;
        return {
          flag: f,
          ...g,
          vendors: [...g.vendors.entries()].sort((a, b) => b[1].n - a[1].n),
        };
      });
  }, [data]);

  const analitico = (extra: Record<string, string>) => {
    const qs = new URLSearchParams({ month });
    if (vendorKey) qs.set("vendorKey", vendorKey);
    if (day) qs.set("day", day);
    for (const [k, v] of Object.entries(extra)) qs.set(k, v);
    return `/analitico?${qs.toString()}`;
  };

  return (
    <main className="page">
      <DashHeader
        meta={meta}
        month={month}
        onMonth={(m) => setParams({ month: m, day: null })}
        onRefresh={() => void load(month, vendorKey, day)}
        loading={loading}
        exportQuery={{ flag: "__any", vendorKey, day }}
      />
      {error || metaError ? <p className="err card">{error || metaError}</p> : null}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="filters" style={{ marginBottom: data ? 12 : 0 }}>
          <label>
            Vendedor
            <select className="input" value={vendorKey} onChange={(e) => setParams({ vendorKey: e.target.value })}>
              <option value="">Todos</option>
              {(data?.facets.vendors || []).map((v) => (
                <option key={v.key} value={v.key}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dia de emissão
            <select className="input" value={day} onChange={(e) => setParams({ day: e.target.value })}>
              <option value="">Mês inteiro</option>
              {(data?.facets.days || []).map((d) => (
                <option key={d.day} value={d.day}>
                  {dataBr(d.day)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {data ? (
          <p style={{ margin: 0 }}>
            <strong>{data.total}</strong> linhas com inconsistência de {data.monthTotals.linhas} no mês.{" "}
            {data.total ? <Link href={analitico({ flag: "__any" })}>Ver todas no Analítico</Link> : null}
          </p>
        ) : null}
      </section>

      {loading && !data ? <p className="muted">Carregando…</p> : null}
      {data && groups.length === 0 ? <p className="card muted">Nenhuma inconsistência no recorte.</p> : null}

      {groups.map((g) => (
        <section key={g.flag} className="card" style={{ marginBottom: 12 }}>
          <div className="dash-header-top">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>
                {flagLabel(g.flag)} <span className="muted mono" style={{ fontSize: 12 }}>{g.flag}</span>
              </h2>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                {FLAG_INFO[g.flag]?.descricao || ""}
              </p>
            </div>
            <Link className="btn btn-ghost" href={analitico({ flag: g.flag })}>
              Ver {g.linhas} linhas
            </Link>
          </div>
          <div className="kpi-grid" style={{ marginTop: 10 }}>
            <div>
              <div className="kpi-label">Linhas</div>
              <div className="kpi-value">{g.linhas}</div>
            </div>
            <div>
              <div className="kpi-label">Produzido</div>
              <div className="kpi-value">{brl(g.produzido)}</div>
            </div>
            <div>
              <div className="kpi-label">Emitido</div>
              <div className="kpi-value">{brl(g.emitido)}</div>
            </div>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 13 }}>
            {g.vendors.map(([key, v], i) => (
              <span key={key}>
                {i ? " · " : ""}
                <Link href={analitico({ flag: g.flag, vendorKey: key })}>{v.name}</Link>{" "}
                <span className="muted">({v.n})</span>
              </span>
            ))}
          </p>
        </section>
      ))}
    </main>
  );
}
