"use client";

import Image from "next/image";
import { ShieldCheck, Star } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { LeadForm } from "@/components/lead/LeadForm";
import { company } from "@/lib/company";
import { getRamo } from "@/lib/ramos";
import { useSubmitLead } from "@/lib/leads/use-submit-lead";

/**
 * Hero — seção de abertura (Home, Issue 15; generalizado para LPs de
 * ramo, Issue 16).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 (Home: H1 com preço "a partir
 * de" · subhead · LeadForm passo 1 · selo "grátis, sem compromisso") e
 * seção 6.2 (LP de ramo: "Eyebrow · H1 (message-match) · LeadForm ·
 * prova social").
 *
 * H1/subhead/eyebrow vêm literalmente de `ramos.find(ramoSlug)` (Issue
 * 05) — nunca reescritos aqui. `ramoSlug` por prop (em vez de fixo em
 * "auto") é o que permite reusar este mesmo componente nas 10 LPs de
 * ramo sem duplicar código (`RamoLandingPage`, Issue 16).
 *
 * `LeadForm` já tinha a variante `variant="inline"` desde a Issue 11
 * pensando exatamente neste uso — só estava sem consumidor até a Issue
 * 15. `useSubmitLead` faz o mesmo POST a `/api/lead` e redirect para
 * `/obrigado` que `CotacaoForm` já fazia.
 *
 * Versão visual v2 (2026-07-19, branch v2-visual): imagem de fundo
 * fotográfica gerada via Higgsfield MCP (ver docs/VISUAL_HIGGSFIELD.md,
 * variação "blue hour" aprovada pelo cliente) com overlay do gradiente
 * da marca para legibilidade. `next/image` com `priority` + `fill` —
 * o WebP de 1920px tem ~113 KB (dentro do budget de LCP definido no
 * plano). Textos passam a claros sobre o fundo escuro; o card do
 * formulário continua branco (contraste e affordance preservados).
 */
export function Hero({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  const { submitLead } = useSubmitLead(ramoSlug);

  if (!ramo) return null;

  return (
    <Section className="relative overflow-hidden">
      <Image
        src="/hero/hero-bluehour.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
        aria-hidden="true"
      />
      {/* Overlay do gradiente da marca (navy → azul) para legibilidade do texto claro. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-r from-[#0a2540]/90 via-[#0a2540]/70 to-[#0f55b8]/40"
      />

      <Container className="relative grid gap-10 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          {ramo.eyebrow && (
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-100 backdrop-blur-sm">
              {ramo.eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl">
            {ramo.headline}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-50/90">{ramo.subheadline}</p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              Cotação grátis, sem compromisso
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
              <span className="flex" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </span>
              {company.business.googleRating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} no Google · +
              {company.business.googleReviewsCount.toLocaleString("pt-BR")} avaliações
            </p>
          </div>

          <div className="mt-8 hidden gap-8 border-t border-white/15 pt-6 lg:flex">
            <div>
              <p className="font-display text-3xl font-bold text-white">{company.business.yearsExperience}+</p>
              <p className="mt-0.5 text-sm text-brand-50/80">anos de experiência</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-white">{company.business.insurersCount}</p>
              <p className="mt-0.5 text-sm text-brand-50/80">seguradoras comparadas</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-white">{company.business.satisfactionRate}%</p>
              <p className="mt-0.5 text-sm text-brand-50/80">clientes satisfeitos</p>
            </div>
          </div>
        </div>
        <LeadForm ramo={ramoSlug} variant="inline" onSuccess={submitLead} />
      </Container>
    </Section>
  );
}
