"use client";

import { getImageProps } from "next/image";
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
 * estilo "blue hour" aprovado pelo cliente) com overlay do gradiente
 * da marca para legibilidade. Textos claros sobre o fundo escuro; o
 * card do formulário continua branco.
 *
 * **Heros por ramo + direção de arte responsiva** (2026-07-19, pedido
 * do cliente: "a adaptação da imagem para o mobile perdeu o sentido"):
 * cada ramo tem sua própria imagem, em DUAS composições distintas —
 * 16:9 para desktop (veículo à direita, copy space à esquerda) e 9:16
 * para mobile (veículo em destaque na metade inferior, céu no topo para
 * o texto). Implementado com `<picture>` + `getImageProps` (padrão
 * oficial do Next para art direction): o navegador baixa APENAS a
 * variante do breakpoint ativo (`md` = 768px), sem custo duplo.
 */
const HERO_IMAGES: Record<string, { desktop: string; mobile: string }> = {
  auto: { desktop: "/hero/hero-bluehour.webp", mobile: "/hero/auto-mobile.webp" },
  moto: { desktop: "/hero/moto-desktop.webp", mobile: "/hero/moto-mobile.webp" },
  caminhao: { desktop: "/hero/caminhao-desktop.webp", mobile: "/hero/caminhao-mobile.webp" },
  uber: { desktop: "/hero/uber-desktop.webp", mobile: "/hero/uber-mobile.webp" },
  taxi: { desktop: "/hero/taxi-desktop.webp", mobile: "/hero/taxi-mobile.webp" },
  utilitario: { desktop: "/hero/utilitario-desktop.webp", mobile: "/hero/utilitario-mobile.webp" },
  frota: { desktop: "/hero/frota-desktop.webp", mobile: "/hero/frota-mobile.webp" },
  pet: { desktop: "/hero/pet-desktop.webp", mobile: "/hero/pet-mobile.webp" },
  fianca: { desktop: "/hero/fianca-desktop.webp", mobile: "/hero/fianca-mobile.webp" },
  "assistencia-24-horas": { desktop: "/hero/assistencia-desktop.webp", mobile: "/hero/assistencia-mobile.webp" },
};

function HeroBackground({ ramoSlug }: { ramoSlug: string }) {
  const images = HERO_IMAGES[ramoSlug] ?? HERO_IMAGES.auto;

  // quality 70 (era 80) — otimização de LCP 2026-07-19: nas fotos noturnas
  // "blue hour" a diferença é imperceptível e corta ~25% dos bytes.
  const common = { alt: "", sizes: "100vw", quality: 70 } as const;
  const {
    props: { srcSet: desktopSrcSet, src: desktopSrc },
  } = getImageProps({ ...common, src: images.desktop, width: 1920, height: 1072 });
  const {
    props: { srcSet: mobileSrcSet, src: mobileSrc },
  } = getImageProps({ ...common, src: images.mobile, width: 828, height: 1472 });

  return (
    <>
      {/* Preload da imagem do hero (otimização de LCP 2026-07-19): sem isso o
          navegador só descobre a imagem ao processar o <picture> no corpo da
          página. React 19 iça estes <link> para o <head> — mas SÓ quando têm
          `href` (links de preload sem href são descartados na hoistagem);
          navegadores que suportam `imagesrcset` ignoram o href. O atributo
          media garante que cada dispositivo pré-carrega SÓ a sua variante. */}
      <link
        rel="preload"
        as="image"
        href={desktopSrc}
        imageSrcSet={desktopSrcSet}
        media="(min-width: 768px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={mobileSrc}
        imageSrcSet={mobileSrcSet}
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <picture>
        <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
        <source media="(max-width: 767px)" srcSet={mobileSrcSet} />
        {/* eslint-disable-next-line @next/next/no-img-element -- art direction exige <picture> com media queries; srcSet/otimização vêm de getImageProps (pipeline do next/image). */}
        <img
          src={mobileSrc}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center"
          aria-hidden="true"
        />
      </picture>
    </>
  );
}

export function Hero({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  const { submitLead } = useSubmitLead(ramoSlug);

  if (!ramo) return null;

  return (
    <Section className="relative overflow-hidden">
      <HeroBackground ramoSlug={ramoSlug} />
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
