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

/**
 * Incluir no login para o GA4 Admin API (dimensões personalizadas, key
 * events — projeto v45, 2026-08-04). Requer a API "Google Analytics
 * Admin API" habilitada no projeto do OAuth client
 * (leads-imediato-seguros) e conta com papel Editor na propriedade GA4.
 */
export const ANALYTICS_ADMIN_SCOPE = "https://www.googleapis.com/auth/analytics.edit";

export function resolveScopes({ withAds = false, withAnalytics = false } = {}) {
  const scopes = [...GTM_SCOPES];
  if (withAds) scopes.push(ADS_SCOPE);
  if (withAnalytics) scopes.push(ANALYTICS_ADMIN_SCOPE);
  return scopes;
}
