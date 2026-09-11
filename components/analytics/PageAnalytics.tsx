"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { trackEvent } from "@/lib/analytics";
import { persistAttributionFromLocation } from "@/lib/leads/attribution";

/**
 * PageAnalytics — dispara `scroll_depth` e `engaged_time` (Issue 18).
 * Fonte: ESPECIFICACAO v3.md, seção 20 ("scroll_depth | 25/50/75/90% |
 * percent, page_path" e "engaged_time | 30s / 60s | seconds, page_path").
 *
 * Fase 1 UX: mantém série `scope: "page"` (25/50/75/90) e adiciona
 * `scope: "below_hero"` (25/50/75/100) quando existe `[data-hero]`.
 * Sem hero → below_hero no-op (sem eventos falsos).
 *
 * Também persiste o pacote Ads/UTM no primeiro hit / troca de rota
 * (`lib/leads/attribution.ts`).
 */
const PAGE_SCROLL_THRESHOLDS = [25, 50, 75, 90] as const;
const BELOW_HERO_SCROLL_THRESHOLDS = [25, 50, 75, 100] as const;
const TIME_THRESHOLDS_SECONDS = [30, 60] as const;

function getPageScrollPercent(): number {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollableHeight <= 0) return 100;
  return Math.round((window.scrollY / scrollableHeight) * 100);
}

/** % do scroll no trecho abaixo do hero (0 = topo do pós-hero; 100 = fim da página). */
function getBelowHeroScrollPercent(heroBottom: number): number {
  const docBottom = document.documentElement.scrollHeight;
  const viewportBottom = window.scrollY + window.innerHeight;
  const range = docBottom - heroBottom;
  if (range <= 0) return 100;
  const progressed = viewportBottom - heroBottom;
  if (progressed <= 0) return 0;
  return Math.min(100, Math.round((progressed / range) * 100));
}

export function PageAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    persistAttributionFromLocation();
  }, [pathname]);

  useEffect(() => {
    const firedPageScroll = new Set<number>();
    const firedBelowHeroScroll = new Set<number>();
    const firedTimeThresholds = new Set<number>();
    let engagedSeconds = 0;

    function checkScrollDepth() {
      const pagePercent = getPageScrollPercent();
      for (const threshold of PAGE_SCROLL_THRESHOLDS) {
        if (pagePercent >= threshold && !firedPageScroll.has(threshold)) {
          firedPageScroll.add(threshold);
          trackEvent("scroll_depth", {
            percent: threshold,
            page_path: pathname,
            scope: "page",
          });
        }
      }

      const hero = document.querySelector("[data-hero]");
      if (!(hero instanceof HTMLElement)) return;
      const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
      const belowPercent = getBelowHeroScrollPercent(heroBottom);
      for (const threshold of BELOW_HERO_SCROLL_THRESHOLDS) {
        if (belowPercent >= threshold && !firedBelowHeroScroll.has(threshold)) {
          firedBelowHeroScroll.add(threshold);
          trackEvent("scroll_depth", {
            percent: threshold,
            page_path: pathname,
            scope: "below_hero",
          });
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
    checkScrollDepth();

    return () => {
      window.removeEventListener("scroll", checkScrollDepth);
      window.clearInterval(intervalId);
    };
  }, [pathname]);

  return null;
}
