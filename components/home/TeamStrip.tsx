import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { team } from "@/lib/team";

/**
 * TeamStrip — resumo da equipe na Home (Issue 15; implementado na
 * extensão de 2026-07-03, ver `docs/BACKLOG.md`).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("TeamStrip ... + grade de
 * fotos") e seção 29.3 ("TeamStrip / TeamGrid | Equipe humana | resumo
 * · completo" — resumo aqui, completo em `/equipe`, ver
 * `app/(marketing)/equipe/page.tsx`).
 *
 * Ficou fora da Home original (Issue 15) por falta dos assets reais —
 * as 16 fotos foram baixadas diretamente do site de produção nesta
 * rodada (arquivos públicos, ver `docs/IMAGE_ASSETS_INVENTORY.md` e
 * `lib/team.ts`) e salvas em `/public/team/`, após confirmação
 * explícita do cliente de que os 16 colaboradores seguem na empresa e
 * as fotos continuam atuais.
 *
 * Mostra os 8 primeiros (`team.length` real = 16, nunca o "39" de
 * exemplo do wireframe — ver nota em `lib/team.ts`), com link para a
 * grade completa em `/equipe`.
 */
const VISIBLE_MEMBERS_COUNT = 8;

export function TeamStrip() {
  const visibleMembers = team.slice(0, VISIBLE_MEMBERS_COUNT);

  return (
    <Section>
      <Container>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
            {team.length} especialistas, gente de verdade
          </h2>
          <p className="mt-2 text-neutral-500">Uma equipe humana pronta para te atender, do início ao fim.</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-8">
          {visibleMembers.map((member) => (
            <div key={member.slug} className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- fotos locais em WebP já otimizadas na origem; grid simples sem necessidade do pipeline de otimização do next/image. */}
              <img
                src={member.photo}
                alt={member.name}
                loading="lazy"
                decoding="async"
                width={96}
                height={96}
                className="size-20 rounded-full object-cover md:size-24"
              />
              <span className="text-sm font-medium text-neutral-900">{member.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/equipe"
            className="rounded-md text-sm font-medium text-brand-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Conheça toda a equipe
          </Link>
        </div>
      </Container>
    </Section>
  );
}
