"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackEvent } from "@/lib/analytics";

/**
 * PageAnalytics — dispara `scroll_depth` e `engaged_time` (Issue 18).
 * Fonte: ESPECIFICACAO v3.md, seção 20 ("scroll_depth | 25/50/75/90% |
 * percent, page_path" e "engaged_time | 30s / 60s | seconds, page_path").
 *
 * Contexto: esses dois eventos já existiam no contrato tipado desde a
 * Issue 03B (`lib/analytics.ts`), mas nenhum componente os disparava
 * ainda — `docs/DATA_LAYER_ATUAL.md` (Issue P-09) confirma que isso
 * também não existe hoje no site atual com esses nomes ("requer acesso
 * ao workspace do GTM para confirmar" triggers nativos equivalentes).
 * Esta é a parte do objetivo da Issue 18 que é puramente código
 * ("confirmar push ao dataLayer com todos os eventos da seção 20") —
 * ver nota mais abaixo sobre a parte que NÃO pôde ser feita nesta issue.
 *
 * Renderizado uma vez no layout `(marketing)`, junto de `WhatsAppFAB`/
 * `StickyCTA` (Issue 19) — não renderiza nada visualmente.
 *
 * Reinicia a cada troca de rota (`pathname` como dependência do efeito),
 * já que os limiares são por page view, não cumulativos entre páginas.
 * `engaged_time` só conta segundos com `document.visibilityState ===
 * "visible"` (aba em primeiro plano) para não inflar o tempo real.
 */
const SCROLL_THRESHOLDS = [25, 50, 75, 90] as const;
const TIME_THRESHOLDS_SECONDS = [30, 60] as const;

function getScrollPercent(): number {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollableHeight <= 0) return 100;
  return Math.round((window.scrollY / scrollableHeight) * 100);
}

export function PageAnalytics() {
  const pathname = usePathname();

  // #region debug-temp (2026-07-14) — investigar "Application error" persistente em /obrigado. REMOVER depois.
  useEffect(() => {
    function report(kind: string, err: unknown) {
      const e = err as { message?: string; stack?: string; reason?: unknown; digest?: string } | undefined;
      const reasonObj = e?.reason as { digest?: string; message?: string; stack?: string } | undefined;
      fetch("/api/debug-client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          pathname,
          message: e?.message,
          stack: e?.stack,
          digest: e?.digest ?? reasonObj?.digest,
          reason: String(e?.reason ?? ""),
          href: typeof window !== "undefined" ? window.location.href : undefined,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
    const onError = (event: ErrorEvent) => report("error", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) =>
      report("unhandledrejection", { reason: event.reason, stack: event.reason?.stack, message: event.reason?.message });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);
  // #endregion debug-temp

  useEffect(() => {
    const firedScrollThresholds = new Set<number>();
    const firedTimeThresholds = new Set<number>();
    let engagedSeconds = 0;

    function checkScrollDepth() {
      const percent = getScrollPercent();
      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold && !firedScrollThresholds.has(threshold)) {
          firedScrollThresholds.add(threshold);
          trackEvent("scroll_depth", { percent: threshold, page_path: pathname });
        }
      }
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      engagedSeconds += 1;
      for (const threshold of TIME_THRESHOLDS_SECONDS) {
        if (engagedSeconds >= threshold && !firedTimeThresholds.has(threshold)) {
          firedTimeThresholds.add(threshold);
          trackEvent("engaged_time", { seconds: threshold, page_path: pathname });
        }
      }
    }, 1000);

    window.addEventListener("scroll", checkScrollDepth, { passive: true });
    checkScrollDepth(); // cobre o caso de a página já carregar rolada (ex.: âncora)

    return () => {
      window.removeEventListener("scroll", checkScrollDepth);
      window.clearInterval(intervalId);
    };
  }, [pathname]);

  return null;
}
