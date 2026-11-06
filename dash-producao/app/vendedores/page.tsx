"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { brl, DashHeader, getJson, useDashParams } from "../components/dash";

type Vendor = {
  vendorKey: string;
  vendorName: string;
  produzido: number;
  emitido: number;
  projetadoProduzido: number;
  projetadoEmitido: number;
  media3mProduzido?: number | null;
  lines: number;
  flagTotal: number;
};

type Summary = {
  month: string;
  house: {
    produzido: number;
    emitido: number;
    projetadoProduzidoCasa: number;
    projetadoEmitidoCasa: number;
    projetadoProduzidoSomaVendedores: number;
    projetadoEmitidoSomaVendedores: number;
    lines: number;
    flagLines: number;
  };
  vendors: Vendor[];
  daysMonth: number;
  daysElapsed: number;
};

export default function VendedoresPage() {
  return (
    <Suspense fallback={<p className="muted page">Carregando…</p>}>
      <Vendedores />
    </Suspense>
  );
}

function Vendedores() {
  const router = useRouter();
  const { meta, metaError, month, setParams } = useDashParams();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<Summary>(`/api/production?month=${encodeURIComponent(m)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (month) void load(month);
  }, [month, load]);

  const analitico = (vendorKey: string, extra = "") =>
    `/analitico?month=${month}&vendorKey=${encodeURIComponent(vendorKey)}${extra}`;

  const h = data?.house;
  return (
    <main className="page">
      <DashHeader
        meta={meta}
        month={month}
        onMonth={(m) => setParams({ month: m })}
        onRefresh={() => void load(month)}
        loading={loading}
      />
      {error || metaError ? <p className="err card">{error || metaError}</p> : null}
      {loading && !data ? <p className="muted">Carregando…</p> : null}

      {data && h ? (
        <section className="card" style={{ overflowX: "auto" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>Produção por vendedor · {data.month}</h2>
          <p className="muted" style={{ margin: "0 0 10px", fontSize: 12 }}>
            Projeção = realizado ÷ dias úteis decorridos ({data.daysElapsed}) × dias úteis do mês (
            {data.daysMonth}). Clique no vendedor para ver as linhas no Analítico.
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th className="num">Produzido</th>
                <th className="num">Emitido</th>
                <th className="num">Proj. produzido</th>
                <th className="num">Proj. emitido</th>
                <th className="num">Média 3m prod.</th>
                <th className="num">Linhas</th>
                <th className="num">Inconsistências</th>
              </tr>
            </thead>
            <tbody>
              {data.vendors.map((v) => (
                <tr key={v.vendorKey} className="clickable" onClick={() => router.push(analitico(v.vendorKey))}>
                  <td>{v.vendorName}</td>
                  <td className="num">{brl(v.produzido)}</td>
                  <td className="num">{brl(v.emitido)}</td>
                  <td className="num">{brl(v.projetadoProduzido)}</td>
                  <td className="num">{brl(v.projetadoEmitido)}</td>
                  <td className="num">{v.media3mProduzido != null ? brl(v.media3mProduzido) : "—"}</td>
                  <td className="num">{v.lines}</td>
                  <td className="num">
                    {v.flagTotal ? (
                      <a href={analitico(v.vendorKey, "&flag=__any")} onClick={(e) => e.stopPropagation()}>
                        {v.flagTotal}
                      </a>
                    ) : (
                      0
                    )}
                  </td>
                </tr>
              ))}
              <tr className="total">
                <td>Casa · soma dos vendedores</td>
                <td className="num">{brl(h.produzido)}</td>
                <td className="num">{brl(h.emitido)}</td>
                <td className="num">{brl(h.projetadoProduzidoSomaVendedores)}</td>
                <td className="num">{brl(h.projetadoEmitidoSomaVendedores)}</td>
                <td className="num">—</td>
                <td className="num">{h.lines}</td>
                <td className="num">
                  <a href={`/analitico?month=${month}&flag=__any`}>{h.flagLines} linhas</a>
                </td>
              </tr>
              <tr className="total">
                <td>Casa · projeção do total</td>
                <td className="num">{brl(h.produzido)}</td>
                <td className="num">{brl(h.emitido)}</td>
                <td className="num">{brl(h.projetadoProduzidoCasa)}</td>
                <td className="num">{brl(h.projetadoEmitidoCasa)}</td>
                <td className="num">—</td>
                <td className="num">{h.lines}</td>
                <td className="num" />
              </tr>
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  );
}
