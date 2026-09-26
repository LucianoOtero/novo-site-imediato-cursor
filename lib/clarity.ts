/**
 * Helpers Microsoft Clarity (Fase 2 UX telemetria).
 * Fonte: docs/UX_TELEMETRIA_PLAN.md
 */

export const CLARITY_CONSENT_KEY = "imediato_consent";
export const CLARITY_SAMPLE_KEY = "imediato_clarity_sample";
export const CLARITY_KILL_COOKIE = "imediato_clarity_off";

type ConsentChoice = { analytics?: boolean; marketing?: boolean };

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export function readAnalyticsConsentAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(CLARITY_CONSENT_KEY);
    if (!raw) return true; // opt-out parity with GTM
    const parsed = JSON.parse(raw) as ConsentChoice;
    return parsed.analytics !== false;
  } catch {
    return true;
  }
}

export function isClarityKillCookieSet(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${CLARITY_KILL_COOKIE}=1`));
}

/**
 * Sample rate: 5% while now < rampUntil (ISO); else 20%.
 * Override with NEXT_PUBLIC_CLARITY_SAMPLE_RATE (0–1).
 */
export function resolveClaritySampleRate(): number {
  const override = process.env.NEXT_PUBLIC_CLARITY_SAMPLE_RATE;
  if (override != null && override !== "") {
    const n = Number(override);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  const rampUntil = process.env.NEXT_PUBLIC_CLARITY_RAMP_UNTIL;
  if (rampUntil) {
    const t = Date.parse(rampUntil);
    if (Number.isFinite(t) && Date.now() < t) return 0.05;
  }
  return 0.2;
}

/** One draw per visitor; persists `0`|`1` in localStorage. */
export function isClaritySampleHit(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const existing = window.localStorage.getItem(CLARITY_SAMPLE_KEY);
    if (existing === "1") return true;
    if (existing === "0") return false;
    const hit = Math.random() < resolveClaritySampleRate();
    window.localStorage.setItem(CLARITY_SAMPLE_KEY, hit ? "1" : "0");
    return hit;
  } catch {
    return false;
  }
}

export function setClarityTag(key: string, value: string | number | boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.clarity?.("set", key, String(value));
  } catch {
    // no-op
  }
}

export function setClarityConsent(allowed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.clarity?.("consent", allowed);
  } catch {
    // no-op
  }
}
