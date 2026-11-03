/**
 * Conversões otimizadas (Enhanced Conversions) do Google Ads.
 *
 * Os eventos que convertem no Ads saem com `user_data` contendo o celular
 * em E.164 com hash SHA-256 (feito no navegador — o número nunca entra em
 * claro no dataLayer). O evento sai sem `user_data` quando o visitante
 * rejeitou marketing no banner, quando não há Web Crypto ou quando o hash
 * não termina a tempo.
 *
 * As chaves seguem o formato `user_data` da tag do Google
 * (`sha256_phone_number`), lido no GTM pela variável de dados fornecidos
 * pelo usuário.
 */
import { trackEvent, type AnalyticsEventParams } from "./analytics";

export type HashedUserData = { sha256_phone_number: string };

type ConversionEvent = "form_initial_contact" | "whatsapp_modal_initial_contact" | "phone_modal_initial_contact";

const CONSENT_STORAGE_KEY = "imediato_consent";
const HASH_TIMEOUT_MS = 300;

function marketingRejected(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { marketing?: boolean }).marketing === false : false;
  } catch {
    return false;
  }
}

/** DDD + celular brasileiros → `+55DDNNNNNNNNN`; `null` se não tiver 10 ou 11 dígitos. */
export function phoneToE164(ddd: string, celular: string): string | null {
  const digits = `${ddd}${celular}`.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? `+55${digits}` : null;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashedUserData(ddd: string, celular: string): Promise<HashedUserData | null> {
  const phone = phoneToE164(ddd, celular);
  if (!phone || marketingRejected() || !globalThis.crypto?.subtle) return null;
  return { sha256_phone_number: await sha256Hex(phone) };
}

/**
 * Envia um evento de conversão com o celular hasheado em `user_data`.
 * O push acontece depois do hash (poucos ms), nunca depois de
 * `HASH_TIMEOUT_MS`; qualquer falha no hash envia o evento sem `user_data`.
 */
export function trackConversion<E extends ConversionEvent>(
  event: E,
  params: Omit<AnalyticsEventParams<E>, "user_data">,
  contact: { ddd: string; celular: string },
): void {
  if (typeof window === "undefined") return;
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), HASH_TIMEOUT_MS));
  void Promise.race([hashedUserData(contact.ddd, contact.celular), timeout])
    .catch(() => null)
    .then((userData) => {
      trackEvent(event, (userData ? { ...params, user_data: userData } : params) as AnalyticsEventParams<E>);
    });
}
