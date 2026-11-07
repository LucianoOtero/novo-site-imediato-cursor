"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FLAG_ORDER, flagLabel } from "@/lib/flag-labels";
import { brl, dataBr, DashHeader, FlagChip, getJson, linhas, SOURCE_LABEL, useDashParams } from "../components/dash";

type Line = {
  source: string;
  oppId: string | null;
  oppName: string | null;
  vendorKey: string;
  vendorName: string;
  emissionDate: string | null;
  produzido: number;
  emitido: number;
  seguradora: string | null;
  ramo: string | null;
  numeroApolice: string | null;
  numeroProposta: string | null;
  vendedorAgger: string | null;
  matchKind: string | null;
  matchVia: string | null;
  flags: string[];
  espoUrl: string | null;
};

type Totals = { linhas: number; produzido: number; emitido: number };

type LinesResponse = {
  month: string;
  total: number;
  totals: Totals;
  monthTotals: Totals;
  facets: {
    vendors: Array<{ key: string; name: string }>;
    flags: Record<string, number>;
    days: Array<{ day: string; linhas: number }>;
  };
  lines: Line[];
};

const FILTER_KEYS = ["vendorKey", "flag", "source", "day", "q"] as const;

const MATCH_LABEL: Record<string, string> = {
  one: "Casou",
  none: "Sem apólice",
  multi: "Múltiplas",
  agger_only: "Só Agger",
};

export default function AnaliticoPage() {
  return (
    <Suspense fallback={<p className="muted page">Carregando…</p>}>
      <Analitico />
    </Suspense>
  );
}

function Analitico() {
  const { meta, metaError, month, params, setParams } = useDashParams();
  const [data, setData] = useState<LinesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    for (const k of FILTER_KEYS) f[k] = params.get(k) || "";
    return f;
  }, [params]);

  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => setParams({ q }), 400);
    return () => clearTimeout(t);
  }, [q, filters.q, setParams]);

  const load = useCallback(async (m: string, f: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ month: m, pageSize: "5000" });
      for (const k of FILTER_KEYS) if (f[k]) qs.set(k, f[k]);
      setData(await getJson<LinesResponse>(`/api/production/lines?${qs.toString()}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (month) void load(month, filters);
  }, [month, filters, load]);

  const flagOptions = useMemo(() => {
    const present = Object.keys(data?.facets.flags || {});
    return [...FLAG_ORDER.filter((f) => present.includes(f)), ...present.filter((f) => !FLAG_ORDER.includes(f))];
  }, [data]);

  const anyFilter = FILTER_KEYS.some((k) => filters[k]);
  const t = data?.totals;
  const tm = data?.monthTotals;

  return (
    <main className="page">
      <DashHeader
        meta={meta}
        month={month}
        onMonth={(m) => setParams({ month: m, day: null })}
        onRefresh={() => void load(month, filters)}
        loading={loading}
        exportQuery={filters}
      />
      {error || metaError ? <p className="err card">{error || metaError}</p> : null}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="filters">
          <label>
            Vendedor
            <select
              className="input"
              value={filters.vendorKey}
              onChange={(e) => setParams({ vendorKey: e.target.value })}
            >
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
            <select className="input" value={filters.day} onChange={(e) => setParams({ day: e.target.value })}>
              <option value="">Mês inteiro</option>
              {(data?.facets.days || []).map((d) => (
                <option key={d.day} value={d.day}>
                  {dataBr(d.day)} ({d.linhas})
                </option>
              ))}
            </select>
          </label>
          <label>
            Inconsistência
            <select className="input" value={filters.flag} onChange={(e) => setParams({ flag: e.target.value })}>
              <option value="">Todas as linhas</option>
              <option value="__any">Qualquer inconsistência</option>
              {flagOptions.map((f) => (
                <option key={f} value={f}>
                  {flagLabel(f)} ({data?.facets.flags[f]})
                </option>
              ))}
            </select>
          </label>
          <label>
            Fonte
            <select className="input" value={filters.source} onChange={(e) => setParams({ source: e.target.value })}>
              <option value="">Espo e só Agger</option>
              <option value="espo">Espo</option>
              <option value="agger_only">Só Agger</option>
            </select>
          </label>
          <label>
            Busca (cliente, apólice, proposta, seguradora)
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite…" />
          </label>
          {anyFilter ? (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])))}
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        {t && tm ? (
          <div className="kpi-grid">
            <div className="card">
              <div className="kpi-label">Linhas no recorte</div>
              <div className="kpi-value">
                {t.linhas}
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                  de {tm.linhas} no mês
                </span>
              </div>
            </div>
            <div className="card">
              <div className="kpi-label">Produzido no recorte</div>
              <div className="kpi-value">{brl(t.produzido)}</div>
            </div>
            <div className="card">
              <div className="kpi-label">Emitido no recorte</div>
              <div className="kpi-value">{brl(t.emitido)}</div>
            </div>
          </div>
        ) : null}
      </section>

      {loading && !data ? <p className="muted">Carregando…</p> : null}
      {data ? (
        <section className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Fonte</th>
                <th>Cliente / Opp</th>
                <th>Vendedor</th>
                <th>Emissão</th>
                <th className="num">Produzido</th>
                <th className="num">Emitido</th>
                <th>Seguradora</th>
                <th>Ramo</th>
                <th>Apólice / proposta</th>
                <th>Match</th>
                <th>Inconsistências</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((r, i) => (
                <tr key={`${r.oppId || "agger"}-${i}`}>
                  <td>{SOURCE_LABEL[r.source] || r.source}</td>
                  <td>
                    {r.espoUrl ? (
                      <a href={r.espoUrl} target="_blank" rel="noreferrer">
                        {r.oppName || r.oppId}
                      </a>
                    ) : (
                      r.oppName || "—"
                    )}
                  </td>
                  <td>{r.vendorName}</td>
                  <td className="mono">{dataBr(r.emissionDate)}</td>
                  <td className="num">{brl(r.produzido)}</td>
                  <td className="num">{brl(r.emitido)}</td>
                  <td>{r.seguradora || "—"}</td>
                  <td>{r.ramo || "—"}</td>
                  <td className="mono">{r.numeroApolice || r.numeroProposta || "—"}</td>
                  <td>{r.matchKind ? MATCH_LABEL[r.matchKind] || r.matchKind : "—"}</td>
                  <td>
                    {r.flags.map((f) => (
                      <FlagChip key={f} flag={f} label={flagLabel(f)} />
                    ))}
                  </td>
                </tr>
              ))}
              {data.lines.length === 0 ? (
                <tr>
                  <td colSpan={11} className="muted">
                    Nenhuma linha no recorte.
                  </td>
                </tr>
              ) : null}
              {t ? (
                <tr className="total">
                  <td colSpan={4}>Total do recorte · {linhas(t.linhas)}</td>
                  <td className="num">{brl(t.produzido)}</td>
                  <td className="num">{brl(t.emitido)}</td>
                  <td colSpan={5} />
                </tr>
              ) : null}
            </tbody>
          </table>
          {data.total > data.lines.length ? (
            <p className="muted" style={{ fontSize: 12 }}>
              Exibindo {data.lines.length} de {data.total} linhas; o Excel traz todas.
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
