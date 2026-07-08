import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buildPageMetadata } from "@/lib/metadata";
import { company } from "@/lib/company";
import { team } from "@/lib/team";

/**
 * `/equipe` — TeamGrid completo (Issue 15, extensão 2026-07-03).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 ("TeamStrip / TeamGrid | Equipe
 * humana | resumo · completo") — versão completa da equipe (`TeamStrip`
 * na Home mostra um resumo de 8, este grid mostra todos os 16). Rota já
 * antecipada em `components/layout/nav-data.ts` (link "Equipe" em "A
 * Imediato").
 *
 * Mesma fonte de dados que `TeamStrip` (`lib/team.ts`) — 16
 * colaboradores confirmados pelo cliente em 2026-07-03.
 */
export const metadata: Metadata = buildPageMetadata({
  title: `Nossa Equipe | ${company.tradeName}`,
  description: `Conheça os ${team.length} especialistas da ${company.tradeName} prontos para te atender do início ao fim.`,
  path: "/equipe",
});

export default function EquipePage() {
  return (
    <Section>
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-bold text-neutral-900 md:text-4xl">
            {team.length} especialistas, gente de verdade
          </h1>
          <p className="mt-3 text-lg text-neutral-500">
            Uma equipe humana pronta para te atender, do início ao fim — sem robôs, sem respostas automáticas.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {team.map((member) => (
            <div key={member.slug} className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos locais em WebP já otimizadas na origem. */}
              <img
                src={member.photo}
                alt={member.name}
                loading="lazy"
                decoding="async"
                width={128}
                height={128}
                className="size-24 rounded-full object-cover md:size-28"
              />
              <span className="text-sm font-medium text-neutral-900">{member.name}</span>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
