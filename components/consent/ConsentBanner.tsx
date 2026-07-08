"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * ConsentBanner — banner real de consentimento (Consent Mode v2),
 * integrações 2026-07-03.
 * Fonte: `docs/INTEGRACOES_ATUAIS.md` (item 15) e
 * `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 2) — decisão do usuário de
 * **não usar CookieYes** no novo site, mantendo o Consent Mode v2 nativo
 * já iniciado na Issue 03 (`components/consent/GtmConsentScripts.tsx`).
 *
 * Lacuna que este componente fecha: até aqui só existia o estado
 * *default* "denied" — nunca havia uma forma real de o usuário conceder
 * consentimento, então GA4/Ads nunca recebiam sinal de "granted". Este
 * banner concede/nega os 4 sinais do Consent Mode v2, conforme o próprio
 * comentário do Head Code do ambiente legado:
 * - `analytics_storage` → categoria "Analytics" (GA4)
 * - `ad_storage` + `ad_user_data` + `ad_personalization` → categoria
 *   "Marketing/Anúncios" (Google Ads Conversion/Linker) — sempre tratados
 *   juntos, como o próprio comentário do site legado especifica.
 *
 * Persistência: `localStorage` (client-only, sem necessidade de decisão
 * de consentimento no servidor) — key `imediato_consent`. Reaberto pelo
 * link "Preferências de cookies" do Footer (Issue 07,
 * `CookiePreferencesLink`) via o evento `imediato:open-cookie-preferences`
 * já definido lá.
 */
const STORAGE_KEY = "imediato_consent";

type ConsentChoice = { analytics: boolean; marketing: boolean; decidedAt: string };

function applyConsentUpdate(analytics: boolean, marketing: boolean) {
  const w = window as typeof window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  function gtag(...args: unknown[]) {
    w.dataLayer!.push(args);
  }
  gtag("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

function readStoredConsent(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentChoice) : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean, marketing: boolean) {
  const choice: ConsentChoice = { analytics, marketing, decidedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // localStorage indisponível (ex.: modo privado) — não bloqueia a decisão do usuário na sessão atual.
  }
  applyConsentUpdate(analytics, marketing);
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      // Reaplica em cada carregamento — Consent Mode v2 não persiste o
      // "update" entre navegações, só o "default" (script beforeInteractive).
      applyConsentUpdate(stored.analytics, stored.marketing);
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    } else {
      setVisible(true);
    }

    function handleReopen() {
      const current = readStoredConsent();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setShowPreferences(true);
      setVisible(true);
    }

    window.addEventListener("imediato:open-cookie-preferences", handleReopen);
    return () => window.removeEventListener("imediato:open-cookie-preferences", handleReopen);
  }, []);

  if (!visible) return null;

  function acceptAll() {
    saveConsent(true, true);
    setVisible(false);
    setShowPreferences(false);
  }

  function rejectAll() {
    saveConsent(false, false);
    setVisible(false);
    setShowPreferences(false);
  }

  function savePreferences() {
    saveConsent(analytics, marketing);
    setVisible(false);
    setShowPreferences(false);
  }

  return (
    <div
      role="region"
      aria-label="Preferências de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:p-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div>
          <p className="text-sm text-neutral-700">
            Usamos cookies para melhorar sua experiência, medir audiência e personalizar anúncios. Você pode aceitar
            todos, rejeitar os não essenciais ou escolher suas preferências.
          </p>
        </div>

        {showPreferences && (
          <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1 size-4 shrink-0 rounded border-neutral-300" />
              <span className="text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">Essenciais</span> — sempre ativos, necessários para o
                funcionamento do site.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1 size-4 shrink-0 rounded border-neutral-300 text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
              />
              <span className="text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">Analytics</span> — nos ajuda a entender como o site é
                usado (Google Analytics).
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
                className="mt-1 size-4 shrink-0 rounded border-neutral-300 text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
              />
              <span className="text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">Marketing/Anúncios</span> — usados para medir e
                personalizar anúncios (Google Ads).
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {showPreferences ? (
            <Button type="button" variant="primary" size="md" onClick={savePreferences}>
              Salvar preferências
            </Button>
          ) : (
            <>
              <Button type="button" variant="primary" size="md" onClick={acceptAll}>
                Aceitar tudo
              </Button>
              <Button type="button" variant="secondary" size="md" onClick={rejectAll}>
                Rejeitar
              </Button>
              <Button type="button" variant="ghost" size="md" onClick={() => setShowPreferences(true)}>
                Preferências
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
