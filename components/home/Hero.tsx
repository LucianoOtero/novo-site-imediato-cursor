"use client";

import { getImageProps } from "next/image";
import { ShieldCheck, Star } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { LeadForm } from "@/components/lead/LeadForm";
import { company } from "@/lib/company";
import { getRamo } from "@/lib/ramos";
import { useSubmitLead } from "@/lib/leads/use-submit-lead";
import { HERO_BLUR } from "@/lib/hero-blur.generated";

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
  "assistencia-24-horas": {
    desktop: "/hero/assistencia-desktop.webp",
    mobile: "/hero/assistencia-mobile.webp",
  },
};

function HeroBackground({ ramoSlug }: { ramoSlug: string }) {
  const images = HERO_IMAGES[ramoSlug] ?? HERO_IMAGES.auto;

  // quality 65 (era 80, depois 70) — otimização de LCP 2026-07-19/20: nas
  // fotos noturnas "blue hour" (sempre atrás de overlay navy) a diferença é
  // imperceptível; cada ponto a menos corta bytes do maior download da página.
  const common = { alt: "", sizes: "100vw", quality: 65 } as const;
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
          // LQIP (itens de conversão, 2026-07-20): miniatura de 16px como
          // background — prévia desfocada instantânea (viaja no HTML, ~220
          // bytes) enquanto a foto real baixa. Gerada por
          // scripts/generate-hero-blur.mjs. Usamos a variante mobile como
          // placeholder único: em 16px as duas composições são indistinguíveis.
          style={{
            backgroundImage: `url(${HERO_BLUR[images.mobile] ?? ""})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
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

  // Satisfação sempre derivada da nota real do Google (nota ÷ 5 × 100) —
  // mesma fórmula da CredBar/CotacaoTrustPanel (2026-08-09), nunca hardcoded.
  const satisfaction = Math.round((company.business.googleRating / 5) * 100);

  /**
   * Selos (cotação grátis + estrelas Google) — SÓ no mobile (<md), abaixo
   * do card do formulário (conversão mobile, 2026-08-07). De md em diante
   * o selo sai do hero (ajuste 2026-08-09, pedido do cliente): a CredBar,
   * visível logo abaixo do menu nessas larguras, já exibe exatamente
   * "96% de satisfação no Google" e "+2.200 avaliações" — o selo
   * duplicava a mesma frase na mesma dobra. No lg+ a prova social do
   * hero fica por conta da régua de estatísticas (números grandes),
   * apresentação distinta da CredBar.
   */
  const badges = (
    <>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        Sem compromisso · 21 seguradoras
      </p>
      {/* Pilha de linhas (2026-08-09, pedido do cliente): a versão em linha
          única quebrava no meio da frase em telas estreitas — agora estrelas,
          satisfação e avaliações têm cada uma a sua linha, centradas. */}
      <div className="flex flex-col items-center gap-1 text-sm font-medium text-white">
        <span className="flex" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="size-4 fill-amber-400 text-amber-400" />
          ))}
        </span>
        <span>{satisfaction}% de satisfação no Google</span>
        <span className="text-brand-50/90">
          +{company.business.googleReviewsCount.toLocaleString("pt-BR")} avaliações
        </span>
      </div>
    </>
  );

  return (
    // py reduzido no mobile (conversão mobile, 2026-08-07): o py-16 da
    // Section somado ao py-12 do Container dava 112px de espaço morto antes
    // do conteúdo — principal culpado do formulário nascer abaixo da dobra.
    // md/lg preservam o ritmo original.
    <Section className="relative overflow-hidden py-4 md:py-28">
      <HeroBackground ramoSlug={ramoSlug} />
      {/* Overlay do gradiente da marca (navy → azul) para legibilidade do texto claro. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-r from-[#0a2540]/90 via-[#0a2540]/70 to-[#0f55b8]/40"
      />

      <Container className="relative grid gap-6 py-8 md:py-12 lg:grid-cols-2 lg:items-center lg:gap-10 lg:py-20">
        <div>
          {ramo.eyebrow && (
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-100 backdrop-blur-sm">
              {ramo.eyebrow}
            </p>
          )}
          {/* H1 em "lockup" de 3 linhas (ajuste 2026-08-08, pedido do cliente):
              headlines com `\n` (hoje só o Auto) viram linhas com tamanhos
              próprios — 1ª grande (como antes), 2ª/3ª menores: no desktop com
              largura ~igual à da 1ª ("Seguro auto" em text-6xl ≈ 330px); no
              mobile dimensionadas para caber inteiras até em telas de 360px
              (antes a 2ª linha quebrava em 4ª linha e empurrava o formulário).
              Headlines sem `\n` (demais ramos) seguem no layout original. */}
          {ramo.headline.includes("\n") ? (
            <h1 className="font-display font-bold tracking-tight text-white">
              {ramo.headline.split("\n").map((line, index) => (
                <span
                  key={line}
                  className={
                    index === 0
                      ? "block text-[1.75rem] leading-[1.15] md:text-6xl md:leading-[1.08]"
                      : "mt-1 block text-[1.35rem] leading-[1.3] md:text-[1.65rem] md:leading-[1.3]"
                  }
                >
                  {line}
                </span>
              ))}
            </h1>
          ) : (
            <h1 className="font-display text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white md:text-6xl md:leading-[1.08]">
              {ramo.headline}
            </h1>
          )}
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-brand-50/90 md:mt-5">
            {ramo.subheadline}
          </p>

          <div className="mt-8 hidden gap-8 border-t border-white/15 pt-6 lg:flex">
            <div>
              <p className="font-display text-3xl font-bold text-white">
                {company.business.yearsExperience}+
              </p>
              <p className="mt-0.5 text-sm text-brand-50/80">anos de experiência</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-white">
                {company.business.insurersCount}
              </p>
              <p className="mt-0.5 text-sm text-brand-50/80">seguradoras comparadas</p>
            </div>
            <div>
              {/* nota ÷ 5, não `satisfactionRate` — padronização 2026-08-09
                  (mesmo número em CredBar, Hero e /cotacao). */}
              <p className="font-display text-3xl font-bold text-white">{satisfaction}%</p>
              <p className="mt-0.5 text-sm text-brand-50/80">clientes satisfeitos</p>
            </div>
          </div>
        </div>
        <LeadForm ramo={ramoSlug} variant="inline" onSuccess={submitLead} />
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 md:hidden">
          {badges}
        </div>
      </Container>
    </Section>
  );
}
