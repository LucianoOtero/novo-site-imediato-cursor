import type { MetadataRoute } from "next";

import { company } from "@/lib/company";
import { publicEnv } from "@/lib/env";
import { ramos } from "@/lib/ramos";

/**
 * app/sitemap.ts — sitemap dinâmico (Issue 21).
 * Fonte: ESPECIFICACAO v3.md, seção 4 ("Novo mapa do site").
 *
 * Nota de fidelidade: as páginas institucionais (`/coberturas`,
 * `/a-imediato`, `/equipe`, etc.) e as LPs de ramo (`/seguro-auto`, ...)
 * ainda não existem como `page.tsx` (Issues 15/16, futuras) — este
 * sitemap já lista as URLs **planejadas** conforme a seção 4 (documento
 * já aprovado, não é dado inventado); essas URLs retornam 404 até as
 * respectivas issues rodarem, sem precisar alterar este arquivo depois.
 *
 * Deliberadamente **fora** do sitemap: `/obrigado` (thank-you page,
 * `noindex` — issue explícita: "garantir noindex"; um sitemap não deve
 * listar páginas não-indexáveis) e `/blog` (Fase 3, fora do MVP_SCOPE).
 */
const STATIC_PATHS = [
  "/",
  "/coberturas",
  "/seguradoras-parceiras",
  "/a-imediato",
  "/equipe",
  "/reputacao",
  "/contato",
  "/cotacao",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = publicEnv.siteUrl || "http://localhost:3000";
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
  }));

  const ramoEntries: MetadataRoute.Sitemap = ramos.map((ramo) => ({
    url: `${baseUrl}${ramo.seo.canonicalPath}`,
    lastModified,
  }));

  const legalEntries: MetadataRoute.Sitemap = [
    company.legalUrls.privacyPolicy,
    company.legalUrls.terms,
    company.legalUrls.fraudAlert,
  ].map((path) => ({ url: `${baseUrl}${path}`, lastModified }));

  return [...staticEntries, ...ramoEntries, ...legalEntries];
}
