"use client";

/**
 * CookiePreferencesLink — botão "Preferências de cookies" do Footer (Issue 07).
 * Fonte: ESPECIFICACAO v3.md, seção 57.3 ("Revogar: link 'Preferências de
 * cookies' no footer reabre o banner").
 *
 * O banner de consentimento (`CookieConsent`) ainda não foi implementado
 * (é uma issue futura — apenas o script de consent default existe até
 * agora, da Issue 03). Para não bloquear o Footer nem inventar uma API do
 * banner que ainda não existe, este botão despacha um evento customizado
 * estável; o futuro `CookieConsent` deve escutar `imediato:open-cookie-preferences`
 * em `window` para se reabrir. Isolado em componente cliente à parte para
 * que `Footer.tsx` continue Server Component (seção 24 da especificação).
 */
export function CookiePreferencesLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("imediato:open-cookie-preferences"))}
      className={className}
    >
      Preferências de cookies
    </button>
  );
}
