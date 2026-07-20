"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Star, ThumbsUp } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { company } from "@/lib/company";
import type { GoogleReview } from "@/lib/google-reviews";

/**
 * Testimonials — carrossel de avaliações reais do Google (Home, Issue
 * 15; implementado na extensão de 2026-07-03, ver `docs/BACKLOG.md`).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("Testimonials carrossel Embla
 * de avaliações Google reais") e seção 29.3 ("Testimonials | Avaliações
 * (Embla) | arrastando · auto-play pausável").
 *
 * Dados vêm de `lib/google-reviews.ts` (fetch server-side na Home,
 * passado como prop) — API do Google Places como fonte primária
 * (ativada em 2026-07-08), com fallback de avaliações reais extraídas do
 * site atual caso a API fique indisponível.
 *
 * `rating`/`reviewCount` (2026-07-08): nota média e contagem total
 * **agregadas reais** do Google, exibidas no cabeçalho — não dependem
 * do filtro de nota mínima aplicado à lista de avaliações individuais
 * (esse filtro só afeta os cards do carrossel).
 *
 * "% de satisfação" (2026-07-08, a pedido do cliente): calculado
 * dinamicamente como `(rating / 5) * 100` a partir da nota real do
 * Google acima — métrica derivada em tempo real, distinta do campo
 * `company.business.satisfactionRate` (98%, já confirmado pelo cliente
 * por outra via, mas não usado neste cálculo específico).
 *
 * Auto-play pausável: `Autoplay` do próprio embla-carousel, com
 * `stopOnInteraction: false` (retoma após o usuário soltar o arrasto) e
 * pausa total nos botões prev/next e no foco do teclado
 * (`stopOnFocusIn`), para não competir com leitores de tela.
 */
const AUTOPLAY_DELAY_MS = 6000;

function StarRating({ rating, size = "size-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={index < Math.round(rating) ? `${size} fill-amber-400 text-amber-400` : `${size} text-neutral-300`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function Testimonials({ reviews, rating, reviewCount }: { reviews: GoogleReview[]; rating: number; reviewCount: number }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: AUTOPLAY_DELAY_MS, stopOnInteraction: false, stopOnFocusIn: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (reviews.length === 0) return null;

  const ratingLabel = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
  const reviewCountLabel = new Intl.NumberFormat("pt-BR").format(reviewCount);
  const satisfactionPercent = Math.round((rating / 5) * 100);

  return (
    <Section tone="soft">
      <Container>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
            O que dizem sobre a <span className="text-brand-700">{company.tradeName}</span>
          </h2>
          <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <div className="flex items-center gap-2">
              <StarRating rating={rating} size="size-5" />
              <span className="text-lg font-bold text-neutral-900">{ratingLabel}</span>
            </div>
            <span className="text-neutral-500">baseado em {reviewCountLabel} avaliações no Google</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
              <ThumbsUp className="size-3.5 shrink-0" aria-hidden="true" />
              {satisfactionPercent}% de satisfação
            </span>
          </div>
        </div>

        <div className="relative mt-10">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {reviews.map((review) => (
                <div key={`${review.author}-${review.text.slice(0, 20)}`} className="min-w-0 flex-[0_0_100%] px-2 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]">
                  <div className="flex h-full flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_6px_20px_rgba(11,31,58,0.06)]">
                    <StarRating rating={review.rating} />
                    <p className="flex-1 text-sm leading-relaxed text-neutral-700">&ldquo;{review.text}&rdquo;</p>
                    <div className="flex items-center gap-3 border-t border-neutral-100 pt-3">
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-sm font-bold text-brand-600"
                      >
                        {review.author.trim().charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{review.author}</p>
                        <p className="text-xs text-neutral-500">Avaliação no Google</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              aria-label="Avaliação anterior"
              className="inline-flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>

            {/*
              Dots ocultos no mobile (Issue 23, critério "sem overflow
              horizontal em 360px"): 12 avaliações geram 12 dots — mesmo
              com alvo de toque reduzido, não cabem sem quebrar em telas
              pequenas. No mobile, arrastar + os botões prev/next (44px,
              ver acima) já cobrem a navegação. A partir de `sm`
              (≥640px) há espaço para os dots com alvo de toque de 28px
              (menor que os 44px do padrão do Design System, mas
              aceitável para indicadores paginação secundários — a
              navegação primária, prev/next, já cumpre 44px).
            */}
            <div className="hidden gap-1 sm:flex" role="tablist" aria-label="Selecionar avaliação">
              {reviews.map((review, index) => (
                <button
                  key={`${review.author}-dot-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={index === selectedIndex}
                  aria-label={`Ir para avaliação ${index + 1}`}
                  onClick={() => emblaApi?.scrollTo(index)}
                  className="inline-flex size-7 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${index === selectedIndex ? "bg-brand-500" : "bg-neutral-300"}`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              aria-label="Próxima avaliação"
              className="inline-flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Container>
    </Section>
  );
}
