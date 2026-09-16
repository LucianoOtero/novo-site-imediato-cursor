"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type ProductionSummary = {
  month: string;
  asOf: string;
  espoFetchedAt: string;
  house: {
    produzido: number;
    emitido: number;
    projetadoProduzidoCasa: number;
    projetadoEmitidoCasa: number;
    projetadoProduzidoSomaVendedores: number;
    projetadoEmitidoSomaVendedores: number;
  };
  vendors: Array<{
    vendorKey: string;
    vendorName: string;
    produzido: number;
    emitido: number;
    projetadoProduzido: number;
    projetadoEmitido: number;
    media3mProduzido?: number | null;
    lines: number;
  }>;
  daysMonth: number;
  daysElapsed: number;
  flagSummary: Record<string, number>;
  counts: {
    lines: number;
    espo: number;
    aggerOnly: number;
    oppsFetched: number;
    policiesLoaded: number;
  };
};

type LinesResponse = {
  total: number;
  page: number;
  pageSize: number;
  lines: Array<{
    source: string;
    oppId?: string | null;
    oppName?: string | null;
    vendorName?: string | null;
    emissionDate?: string | null;
    produzido: number;
    emitido: number;
    seguradora?: string | null;
    matchKind?: string;
    flags: string[];
    espoUrl?: string | null;
  }>;
};

type Meta = {
  asOfSp: string;
  currentMonth: string;
  espo: { baseUrl: string; source: string };
  aggerRun: { id: number; run_date: string | null; finished_at: string | null; status: string | null } | null;
};

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function HomePage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [month, setMonth] = useState<string>("");
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [lines, setLines] = useState<LinesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flagFilter, setFlagFilter] = useState("");

  const months = useMemo(() => {
    const cur = meta?.currentMonth;
    if (!cur) return [];
    return [cur, prevMonth(cur)];
  }, [meta]);

  const load = useCallback(async (m: string, flag = "") => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ month: m });
      if (flag) q.set("flag", flag);
      const [sRes, lRes] = await Promise.all([
        fetch(`/api/production?month=${encodeURIComponent(m)}`),
        fetch(`/api/production/lines?${q.toString()}&pageSize=100`),
      ]);
      if (sRes.status === 401 || lRes.status === 401) {
        window.location.href = "/login";
        return;
      }
      const sJson = await sRes.json();
      const lJson = await lRes.json();
      if (!sRes.ok) throw new Error(sJson.error || "Falha /api/production");
      if (!lRes.ok) throw new Error(lJson.error || "Falha /api/production/lines");
      setSummary(sJson as ProductionSummary);
      setLines(lJson as LinesResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/meta/asof");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = (await res.json()) as Meta;
        setMeta(data);
        setMonth(data.currentMonth);
      } catch (e) {
        setError(e instanceof Error ? e.message : "meta falhou");
      }
    })();
  }, []);

  useEffect(() => {
    if (month) void load(month, flagFilter);
  }, [month, flagFilter, load]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main style={{ padding: "16px 20px 40px", maxWidth: 1280, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Produção comercial</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            asOf SP {meta?.asOfSp || "—"} · Espo {meta?.espo?.source || "—"} · Agger run{" "}
            {meta?.aggerRun
              ? `#${meta.aggerRun.id} ${meta.aggerRun.status || ""} ${meta.aggerRun.finished_at || meta.aggerRun.run_date || ""}`
              : "—"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--panel)",
              color: "var(--text)",
            }}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <a className="btn btn-ghost" href={`/api/production/export?month=${encodeURIComponent(month)}`}>
            Export XLSX
          </a>
          <button className="btn btn-ghost" type="button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </header>

      {error ? (
        <p className="err card" style={{ marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      {loading && !summary ? <p className="muted">Carregando…</p> : null}

      {summary ? (
        <>
          <section className="kpi-grid" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="kpi-label">Produzido (casa)</div>
              <div className="kpi-value">{brl(summary.house.produzido)}</div>
            </div>
            <div className="card">
              <div className="kpi-label">Emitido (casa)</div>
              <div className="kpi-value">{brl(summary.house.emitido)}</div>
            </div>
            <div className="card">
              <div className="kpi-label">Projetado produzido (casa)</div>
              <div className="kpi-value">{brl(summary.house.projetadoProduzidoCasa)}</div>
            </div>
            <div className="card">
              <div className="kpi-label">Projetado emitido (casa)</div>
              <div className="kpi-value">{brl(summary.house.projetadoEmitidoCasa)}</div>
            </div>
            <div className="card">
              <div className="kpi-label">Úteis decorridos / mês</div>
              <div className="kpi-value">
                {summary.daysElapsed}/{summary.daysMonth}
              </div>
            </div>
            <div className="card">
              <div className="kpi-label">Linhas</div>
              <div className="kpi-value">
                {summary.counts.lines}
                <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                  Espo {summary.counts.espo} · só Agger {summary.counts.aggerOnly}
                </span>
              </div>
            </div>
          </section>

          <section className="card" style={{ marginBottom: 16, overflowX: "auto" }}>
            <h2 style={{ margin: "0 0 10px", fontSize: 16 }}>Por vendedor</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Produzido</th>
                  <th>Emitido</th>
                  <th>Proj. prod.</th>
                  <th>Proj. emit.</th>
                  <th>Média 3m</th>
                  <th>Linhas</th>
                </tr>
              </thead>
              <tbody>
                {summary.vendors.map((v) => (
                  <tr key={v.vendorKey}>
                    <td>{v.vendorName}</td>
                    <td className="mono">{brl(v.produzido)}</td>
                    <td className="mono">{brl(v.emitido)}</td>
                    <td className="mono">{brl(v.projetadoProduzido)}</td>
                    <td className="mono">{brl(v.projetadoEmitido)}</td>
                    <td className="mono">
                      {v.media3mProduzido != null ? brl(v.media3mProduzido) : "—"}
                    </td>
                    <td className="mono">{v.lines}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 16 }}>
                Linhas {lines ? `(${lines.total})` : ""}
              </h2>
              <select
                value={flagFilter}
                onChange={(e) => setFlagFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--panel-2)",
                  color: "var(--text)",
                }}
              >
                <option value="">Todas as flags</option>
                {Object.keys(summary.flagSummary)
                  .sort()
                  .map((f) => (
                    <option key={f} value={f}>
                      {f} ({summary.flagSummary[f]})
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fonte</th>
                    <th>Cliente / Opp</th>
                    <th>Vendedor</th>
                    <th>Emissão</th>
                    <th>Produzido</th>
                    <th>Emitido</th>
                    <th>Seguradora</th>
                    <th>Match</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {(lines?.lines || []).map((r, i) => (
                    <tr key={`${r.oppId || "a"}-${i}`}>
                      <td>{r.source}</td>
                      <td>
                        {r.espoUrl ? (
                          <a href={r.espoUrl} target="_blank" rel="noreferrer">
                            {r.oppName || r.oppId}
                          </a>
                        ) : (
                          r.oppName || "—"
                        )}
                      </td>
                      <td>{r.vendorName || "—"}</td>
                      <td className="mono">{r.emissionDate || "—"}</td>
                      <td className="mono">{brl(r.produzido)}</td>
                      <td className="mono">{brl(r.emitido)}</td>
                      <td>{r.seguradora || "—"}</td>
                      <td>{r.matchKind || "—"}</td>
                      <td>
                        {(r.flags || []).map((f) => (
                          <span className="flag" key={f}>
                            {f}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
