/**
 * Conversões otimizadas (Enhanced Conversions) do Google Ads.
 *
 * Os eventos que convertem no Ads saem com `user_data` contendo o celular
 * em E.164 (e, quando houver, o e-mail normalizado) com hash SHA-256 feito
 * no navegador — os dados nunca entram em claro no dataLayer. O evento sai
 * sem `user_data` quando o visitante rejeitou marketing no banner, quando
 * não há Web Crypto ou quando o hash não termina a tempo.
 *
 * As chaves seguem o formato `user_data` da tag do Google
 * (`sha256_phone_number`, `sha256_email_address`), lido no GTM pela
 * variável de dados fornecidos pelo usuário.
 */
import { trackEvent, type AnalyticsEventParams } from "./analytics";

export type HashedUserData = { sha256_phone_number: string; sha256_email_address?: string };

export type ContatoConversao = { ddd: string; celular: string; email?: string };

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

async function hashedUserData(contact: ContatoConversao): Promise<HashedUserData | null> {
  const phone = phoneToE164(contact.ddd, contact.celular);
  if (!phone || marketingRejected() || !globalThis.crypto?.subtle) return null;
  const email = contact.email?.trim().toLowerCase();
  const [sha256_phone_number, sha256_email_address] = await Promise.all([
    sha256Hex(phone),
    email && email.includes("@") ? sha256Hex(email) : Promise.resolve(undefined),
  ]);
  return sha256_email_address ? { sha256_phone_number, sha256_email_address } : { sha256_phone_number };
}

/** `user_data` com hash, ou `null` em até `HASH_TIMEOUT_MS` (nunca rejeita). */
export function userDataComPrazo(contact: ContatoConversao): Promise<HashedUserData | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), HASH_TIMEOUT_MS));
  return Promise.race([hashedUserData(contact), timeout]).catch(() => null);
}

/**
 * Envia um evento de conversão com o celular hasheado em `user_data`.
 * O push acontece depois do hash (poucos ms), nunca depois de
 * `HASH_TIMEOUT_MS`; qualquer falha no hash envia o evento sem `user_data`.
 */
export function trackConversion<E extends ConversionEvent>(
  event: E,
  params: Omit<AnalyticsEventParams<E>, "user_data">,
  contact: ContatoConversao,
): void {
  if (typeof window === "undefined") return;
  void userDataComPrazo(contact).then((userData) => {
    trackEvent(event, (userData ? { ...params, user_data: userData } : params) as AnalyticsEventParams<E>);
  });
}
