"use client";

import { ShieldCheck } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { LeadForm } from "@/components/lead/LeadForm";
import { RPAProgressModal } from "@/components/lead/RPAProgressModal";
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
 * "LCP no hero" (critério de aceite): sem imagem de fundo/hero-image
 * ainda (asset não migrado, ver BRAND_ASSETS.md) — o H1 em si (texto)
 * já é o maior elemento renderizado na dobra, então o próprio texto é o
 * candidato a LCP, sem depender de otimização de imagem.
 */
export function Hero({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  const { submitLead, rpaSessionId, clearRpaSession } = useSubmitLead(ramoSlug);

  if (!ramo) return null;

  return (
    <Section className="bg-linear-to-b from-brand-50/60 to-white">
      <Container className="grid gap-10 py-10 lg:grid-cols-2 lg:items-center lg:py-16">
        <div>
          {ramo.eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-600">{ramo.eyebrow}</p>}
          <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 md:text-5xl">{ramo.headline}</h1>
          <p className="mt-4 text-lg text-neutral-500">{ramo.subheadline}</p>
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            Cotação grátis, sem compromisso
          </p>
        </div>
        <LeadForm ramo={ramoSlug} variant="inline" onSuccess={submitLead} />
      </Container>
      <RPAProgressModal sessionId={rpaSessionId} onClose={clearRpaSession} />
    </Section>
  );
}
