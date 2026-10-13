import type { MetadataRoute } from "next";

import { isProduction, publicEnv } from "@/lib/env";

/**
 * app/robots.ts — regras de robôs (Issues 21 e 23A).
 * Fonte: ESPECIFICACAO v3.md, seção 4 ("robots.txt · sitemap.xml") e
 * Issue 23A ("robots bloqueando crawlers em staging"; "Search Console
 * não deve receber sitemap de staging").
 *
 * Fora de produção: bloqueia **tudo** (`disallow: "/"`) e omite o
 * sitemap (reduz a chance de descoberta/crawling acidental de staging).
 *
 * Em produção: bloqueia `/api/*` e a imagem Open Graph servida como URL.
 * `/_next/` **não** pode ser bloqueado: contém CSS, JS, fontes e
 * `/_next/image` — sem eles o Googlebot renderiza a página quebrada e não
 * indexa as imagens (auditoria Semrush 2026-10-13: 751 recursos bloqueados).
 * **`/obrigado` não é bloqueado aqui de
 * propósito** — bloquear via `robots.txt` impediria o Google de sequer
 * rastrear a página e ler sua meta tag `noindex` (Issue 14, já
 * implementada); a prática correta é deixar rastrear e confiar no
 * `noindex` da própria página, não duplicar via disallow.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicEnv.siteUrl || "http://localhost:3000";

  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/opengraph-image"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
