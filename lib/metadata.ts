import type { Metadata } from "next";

import { company } from "@/lib/company";
import { publicEnv } from "@/lib/env";

/**
 * lib/metadata.ts — helper de `generateMetadata`/`metadata` por página (Issue 20).
 * Fonte: ESPECIFICACAO v3.md, seção 17 ("metadados por página via
 * `generateMetadata` (title <60c, description <155c sem keyword
 * stuffing); Open Graph + Twitter Cards com `/og` dinâmica").
 *
 * `publicEnv.siteUrl` (NEXT_PUBLIC_SITE_URL) ainda não está configurado
 * nesta fase — quando ausente, o `canonical`/OG `url` viram caminhos
 * relativos (`path`), que o Next.js resolve corretamente na maioria dos
 * contextos; a URL absoluta correta passa a ser usada assim que a
 * variável for configurada (Issue 24/deploy), sem mudar este código.
 *
 * Nota (Issue 23A — "canonical apontando para produção apenas em
 * produção"): `NEXT_PUBLIC_SITE_URL` deve ser configurada com o domínio
 * de **produção** em todos os ambientes (inclusive staging) — é assim
 * que o canonical de uma página servida em staging aponta corretamente
 * para a versão de produção (prática recomendada), não para o próprio
 * domínio de staging. Isso é uma configuração de ambiente/deploy, não
 * uma lógica de código adicional.
 */
const TITLE_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 155;

export function buildPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Caminho da página, ex.: "/cotacao" (sem domínio). */
  path: string;
}): Metadata {
  if (title.length > TITLE_MAX_LENGTH) {
    console.warn(`[lib/metadata] title com ${title.length} caracteres (máx. recomendado ${TITLE_MAX_LENGTH}): "${title}"`);
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    console.warn(
      `[lib/metadata] description com ${description.length} caracteres (máx. recomendado ${DESCRIPTION_MAX_LENGTH}): "${description}"`
    );
  }

  const url = publicEnv.siteUrl ? `${publicEnv.siteUrl}${path}` : path;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: company.tradeName,
      type: "website",
      locale: "pt_BR",
      // Definir `openGraph` explicitamente na página substitui (não
      // mescla) a imagem que o Next.js geraria automaticamente a partir
      // de `app/opengraph-image.tsx` — por isso precisa ser repetida
      // aqui manualmente para toda página que usa este helper.
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
