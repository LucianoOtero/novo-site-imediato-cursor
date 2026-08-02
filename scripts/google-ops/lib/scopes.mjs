/**
 * Escopos OAuth para ops GTM (+ Ads opcional).
 * Ads só funciona com Developer Token no header; o escopo sozinho não basta.
 */
export const GTM_SCOPES = [
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
  "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
  "https://www.googleapis.com/auth/tagmanager.publish",
];

/** Incluir no login se for usar Google Ads API depois */
export const ADS_SCOPE = "https://www.googleapis.com/auth/adwords";

export function resolveScopes({ withAds = false } = {}) {
  return withAds ? [...GTM_SCOPES, ADS_SCOPE] : [...GTM_SCOPES];
}
