import Link from "next/link";
import { Shield } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getRamo } from "@/lib/ramos";

/**
 * CoverageCards — coberturas principais (Home, Issue 15; generalizado
 * para LPs de ramo, Issue 16, seção 6.2 "Coberturas coberturas
 * filtradas").
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("CoverageCards coberturas
 * principais (6 + link 'ver todas')").
 *
 * As coberturas em si vêm de `ramos.find(ramoSlug).coverages` (Issue
 * 05) — só "auto" tem a lista preenchida (`AUTO_COVERAGES`, observada
 * no site atual, seção 1.1); os demais ramos têm `coverages: []`
 * (`A_CONFIRMAR`, não inventado) — por isso o componente retorna `null`
 * quando vazio, tanto na Home quanto nas LPs desses ramos. Mostra as 6
 * primeiras, igual ao wireframe. Link "ver todas" aponta para
 * `/coberturas` (hub dedicado, seção 4 do mapa do site) — página ainda
 * não construída (issue futura), mesmo padrão já usado no sitemap
 * (Issue 21) de referenciar rotas planejadas.
 */
const VISIBLE_COVERAGES_COUNT = 6;

export function CoverageCards({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  const coverages = ramo?.coverages.slice(0, VISIBLE_COVERAGES_COUNT) ?? [];

  if (coverages.length === 0) return null;

  return (
    <Section>
      <Container>
        <h2 className="text-center font-display text-2xl font-bold text-neutral-900 md:text-3xl">Coberturas principais</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coverages.map((coverage) => (
            <div key={coverage} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
              <Shield className="size-5 shrink-0 text-brand-500" aria-hidden="true" />
              <span className="text-sm font-medium text-neutral-900">{coverage}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/coberturas"
            className="rounded-md text-sm font-medium text-brand-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Ver todas as coberturas
          </Link>
        </div>
      </Container>
    </Section>
  );
}
