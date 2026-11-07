"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type Meta = {
  asOfSp: string;
  currentMonth: string;
  espo: { baseUrl: string; source: string };
  aggerRun: { id: number; run_date: string | null; finished_at: string | null; status: string | null } | null;
};

export function brl(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function linhas(n: number) {
  return `${n} ${n === 1 ? "linha" : "linhas"}`;
}

export function dataBr(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d ? `${d}/${m}/${y}` : iso;
}

export const SOURCE_LABEL: Record<string, string> = { espo: "Espo", agger_only: "Só Agger" };

/** GET JSON; 401 manda para o login (sessão expirada). */
export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Falha ${url}`);
  return body as T;
}

function monthsBack(cur: string, n: number): string[] {
  const [y, m] = cur.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/**
 * Estado compartilhado pelas telas: meta (asOf/Agger), mês e filtros na URL,
 * para que link copiado, navegação e export reproduzam o mesmo recorte.
 */
export function useDashParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    getJson<Meta>("/api/meta/asof")
      .then(setMeta)
      .catch((e) => setMetaError(e instanceof Error ? e.message : "meta falhou"));
  }, []);

  const month = params.get("month") || meta?.currentMonth || "";

  const setParams = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { meta, metaError, month, params, setParams };
}

const NAV = [
  { href: "/", label: "Resumo" },
  { href: "/vendedores", label: "Vendedores" },
  { href: "/analitico", label: "Analítico" },
  { href: "/inconsistencias", label: "Inconsistências" },
];

export function DashHeader({
  meta,
  month,
  onMonth,
  onRefresh,
  loading,
  exportQuery,
}: {
  meta: Meta | null;
  month: string;
  onMonth: (m: string) => void;
  onRefresh: () => void;
  loading: boolean;
  exportQuery?: Record<string, string | null | undefined>;
}) {
  const pathname = usePathname();
  const months = useMemo(() => (meta?.currentMonth ? monthsBack(meta.currentMonth, 6) : []), [meta]);

  const exportHref = useMemo(() => {
    const q = new URLSearchParams({ month });
    for (const [k, v] of Object.entries(exportQuery || {})) if (v) q.set(k, v);
    return `/api/production/export?${q.toString()}`;
  }, [month, exportQuery]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="dash-header">
      <div className="dash-header-top">
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Produção comercial</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
            Referência SP {dataBr(meta?.asOfSp)} · Espo {meta?.espo?.source || "—"} · Agger run{" "}
            {meta?.aggerRun
              ? `#${meta.aggerRun.id} ${meta.aggerRun.status || ""} ${meta.aggerRun.finished_at || meta.aggerRun.run_date || ""}`
              : "—"}
          </p>
        </div>
        <div className="dash-actions">
          <select className="input" value={month} onChange={(e) => onMonth(e.target.value)} aria-label="Mês">
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? "Carregando…" : "Atualizar"}
          </button>
          <a className="btn btn-ghost" href={month ? exportHref : undefined} aria-disabled={!month}>
            Exportar Excel
          </a>
          <button className="btn btn-ghost" type="button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </div>
      <nav className="dash-nav">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={month ? `${n.href}?month=${month}` : n.href}
            className={pathname === n.href ? "active" : undefined}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function FlagChip({ flag, label }: { flag: string; label: string }) {
  return (
    <span className="flag" title={flag}>
      {label}
    </span>
  );
}
