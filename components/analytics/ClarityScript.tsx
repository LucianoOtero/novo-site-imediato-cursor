"use client";

import { useEffect, useRef } from "react";

import {
  isClarityKillCookieSet,
  isClaritySampleHit,
  readAnalyticsConsentAllowed,
  setClarityConsent,
} from "@/lib/clarity";
import { isProduction } from "@/lib/env";

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

/**
 * Microsoft Clarity — Fase 2 (docs/UX_TELEMETRIA_PLAN.md).
 * Injeta só se: produção + ID + sample + consent analytics + sem cookie kill.
 */
export function ClarityScript() {
  const injected = useRef(false);

  useEffect(() => {
    function maybeInject() {
      if (injected.current) return;
      if (!isProduction) return;
      const projectId = process.env.NEXT_PUBLIC_CLARITY_ID?.trim();
      if (!projectId) return;
      if (isClarityKillCookieSet()) return;
      if (!readAnalyticsConsentAllowed()) return;
      if (!isClaritySampleHit()) return;

      injected.current = true;

      const w = window as Window & { clarity?: ClarityFn };
      const clarity: ClarityFn = function (...args: unknown[]) {
        (clarity.q = clarity.q || []).push(args);
      };
      w.clarity = w.clarity || clarity;

      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${projectId}`;
      const first = document.getElementsByTagName("script")[0];
      first?.parentNode?.insertBefore(script, first);
    }

    maybeInject();

    function onConsentUpdated() {
      const allowed = readAnalyticsConsentAllowed();
      if (!allowed) {
        setClarityConsent(false);
        return;
      }
      maybeInject();
      setClarityConsent(true);
    }

    window.addEventListener("imediato:consent-updated", onConsentUpdated);
    return () => window.removeEventListener("imediato:consent-updated", onConsentUpdated);
  }, []);

  return null;
}
