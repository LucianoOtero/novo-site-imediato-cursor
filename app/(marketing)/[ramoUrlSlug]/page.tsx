import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RamoLandingPage } from "@/components/ramo-lp/RamoLandingPage";
import { getRamo, getSeguroRamoSlugs } from "@/lib/ramos";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * `/seguro-{ramo}` — template de LP por ramo (Issue 16).
 * Fonte: ESPECIFICACAO v3.md, seção 6.2 (wireframe) e seção 31/56
 * (`generateStaticParams`; message match; sem cópia duplicada manual).
 *
 * Nota de fidelidade — desvio necessário do caminho sugerido no plano
 * (`app/(marketing)/seguro-[ramo]/page.tsx`): o App Router do Next.js
 * **não suporta segmento dinâmico parcial** — uma pasta chamada
 * `seguro-[ramo]` é tratada como texto literal ("seguro-[ramo]"), não
 * como prefixo "seguro-" + parâmetro dinâmico (confirmado: RFC de rotas
 * dinâmicas do Next.js, "Named parameters cannot appear in the middle
 * of a route name"). A pasta precisa ser 100% dinâmica (`[ramoUrlSlug]`)
 * no nível do grupo `(marketing)`; o prefixo `seguro-` é conferido e
 * removido em código abaixo. Rotas estáticas irmãs (`/cotacao`,
 * `/obrigado`, `/fianca`, `/assistencia-24-horas`) continuam
 * funcionando normalmente — o Next.js sempre prioriza rotas estáticas
 * sobre segmentos dinâmicos no mesmo nível.
 *
 * Cobre 8 dos 10 ramos — os 2 restantes (`fianca`,
 * `assistencia-24-horas`) têm URL própria sem o prefixo `seguro-`
 * (`getSeguroRamoSlugs()`, `lib/ramos.ts`) e viram rotas estáticas
 * dedicadas, reaproveitando o mesmo `RamoLandingPage`.
 */
const SEGURO_PREFIX = "seguro-";

type RamoPageParams = { params: Promise<{ ramoUrlSlug: string }> };

function resolveRamoSlug(ramoUrlSlug: string): string | undefined {
  if (!ramoUrlSlug.startsWith(SEGURO_PREFIX)) return undefined;
  const ramoSlug = ramoUrlSlug.slice(SEGURO_PREFIX.length);
  return getSeguroRamoSlugs().includes(ramoSlug) ? ramoSlug : undefined;
}

export function generateStaticParams() {
  return getSeguroRamoSlugs().map((ramoSlug) => ({ ramoUrlSlug: `${SEGURO_PREFIX}${ramoSlug}` }));
}

export async function generateMetadata({ params }: RamoPageParams): Promise<Metadata> {
  const { ramoUrlSlug } = await params;
  const ramoSlug = resolveRamoSlug(ramoUrlSlug);
  const ramo = ramoSlug ? getRamo(ramoSlug) : undefined;
  if (!ramo) return {};

  return buildPageMetadata({ title: ramo.seo.title, description: ramo.seo.description, path: ramo.seo.canonicalPath });
}

export default async function SeguroRamoPage({ params }: RamoPageParams) {
  const { ramoUrlSlug } = await params;
  const ramoSlug = resolveRamoSlug(ramoUrlSlug);
  if (!ramoSlug) notFound();

  return <RamoLandingPage ramoSlug={ramoSlug} />;
}
