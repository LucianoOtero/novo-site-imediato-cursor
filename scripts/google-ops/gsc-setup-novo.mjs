/**
 * Search Console — setup do domínio novo (auditoria 2026-08-07).
 *
 * 1) Lista as propriedades acessíveis à conta autenticada.
 * 2) Se existir propriedade de Domínio `sc-domain:segurosimediato.com.br`,
 *    o subdomínio novo já está coberto — só submete o sitemap nela.
 * 3) Senão, adiciona a propriedade URL-prefix
 *    `https://novo.segurosimediato.com.br/` (a verificação acontece pelas
 *    meta tags google-site-verification já publicadas no site) e submete
 *    o sitemap.
 *
 * Requer token com escopo webmasters: npm run auth -- --with-ads
 * --with-analytics --with-gsc
 */
import { google } from "googleapis";
import { getAuthorizedClient } from "./lib/auth.mjs";

const DOMAIN_PROPERTY = "sc-domain:segurosimediato.com.br";
const URL_PROPERTY = "https://novo.segurosimediato.com.br/";
const SITEMAP_URL = "https://novo.segurosimediato.com.br/sitemap.xml";

async function main() {
  const auth = await getAuthorizedClient();
  const gsc = google.searchconsole({ version: "v1", auth });

  const { data } = await gsc.sites.list();
  const sites = data.siteEntry || [];
  console.log("Propriedades acessíveis:");
  for (const s of sites) console.log(`- ${s.siteUrl} (${s.permissionLevel})`);

  const domainProp = sites.find((s) => s.siteUrl === DOMAIN_PROPERTY);
  const urlProp = sites.find((s) => s.siteUrl === URL_PROPERTY);

  let target;
  if (domainProp && domainProp.permissionLevel !== "siteUnverifiedUser") {
    console.log(`\nPropriedade de Domínio já cobre o subdomínio: ${DOMAIN_PROPERTY}`);
    target = DOMAIN_PROPERTY;
  } else if (urlProp && urlProp.permissionLevel !== "siteUnverifiedUser") {
    console.log(`\nPropriedade URL-prefix já existe e está verificada: ${URL_PROPERTY}`);
    target = URL_PROPERTY;
  } else {
    console.log(`\nAdicionando propriedade ${URL_PROPERTY}…`);
    await gsc.sites.add({ siteUrl: URL_PROPERTY });
    const check = await gsc.sites.get({ siteUrl: URL_PROPERTY }).catch(() => null);
    console.log(`Propriedade adicionada. permissionLevel: ${check?.data?.permissionLevel || "?"}`);
    if (check?.data?.permissionLevel === "siteUnverifiedUser") {
      console.log(
        "AVISO: propriedade ainda não verificada — as meta tags google-site-verification do site precisam pertencer a esta conta. Verificar manualmente em search.google.com/search-console se persistir.",
      );
    }
    target = URL_PROPERTY;
  }

  console.log(`\nSubmetendo sitemap ${SITEMAP_URL} na propriedade ${target}…`);
  await gsc.sitemaps.submit({ siteUrl: target, feedpath: SITEMAP_URL });

  const { data: sm } = await gsc.sitemaps.list({ siteUrl: target });
  console.log("Sitemaps na propriedade:");
  for (const s of sm.sitemap || []) {
    console.log(`- ${s.path} | pending=${s.isPending} | lastSubmitted=${s.lastSubmitted}`);
  }
}

main().catch((e) => {
  console.error(e.response?.data?.error?.message || e.message || e);
  process.exit(1);
});
