import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Quote, Star, ThumbsUp } from "lucide-react";

import { CTASection } from "@/components/cta/CTASection";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { company } from "@/lib/company";
import { fetchReputationPageData } from "@/lib/google-reviews";
import { buildPageMetadata } from "@/lib/metadata";
import { buildReputationThemes, extractPraisedNames } from "@/lib/reputation-insights";

/**
 * `/reputacao` — visão ampliada da reputação no Google (nota agregada,
 * temas recorrentes nas avaliações reais, depoimentos positivos).
 * Menu: `nav-data.ts`. Dados: `lib/google-reviews.ts` + análise em
 * `lib/reputation-insights.ts` (sem inventar volume de estrelas).
 */
export const metadata: Metadata = buildPageMetadata({
  title: `Reputação no Google | ${company.tradeName}`,
  description: `Nota ${company.business.googleRating} no Google com mais de ${company.business.googleReviewsCount.toLocaleString("pt-BR")} avaliações. Veja o que os clientes destacam sobre a ${company.tradeName}.`,
  path: "/reputacao",
});

function StarRow({ rating, size = "size-5" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={
            index < Math.round(rating) ? `${size} fill-amber-400 text-amber-400` : `${size} text-neutral-300`
          }
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default async function ReputacaoPage() {
  const { reviews, rating, reviewCount } = await fetchReputationPageData();
  const themes = buildReputationThemes(reviews);
  const praisedNames = extractPraisedNames(reviews);

  const ratingLabel = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
  const reviewCountLabel = new Intl.NumberFormat("pt-BR").format(reviewCount);
  const derivedSatisfaction = Math.round((rating / 5) * 100);
  const fiveStarInSample = reviews.filter((r) => r.rating >= 5).length;
  const sampleSize = reviews.length;

  return (
    <>
      <Section>
        <Container className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Reputação</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 md:text-4xl">
            O que o Google diz sobre a {company.tradeName}
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            Visão ampla da nossa reputação pública: nota agregada do Google Meu Negócio, temas que
            mais aparecem nos depoimentos e uma seleção ampliada de avaliações positivas reais —
            as mesmas que qualquer pessoa encontra no perfil oficial.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-8">
            <StarRow rating={rating} size="size-7" />
            <p className="font-display text-5xl font-bold text-neutral-900 md:text-6xl">{ratingLabel}</p>
            <p className="text-neutral-600">
              de 5 · baseado em <strong>{reviewCountLabel} avaliações</strong> no Google
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
                <ThumbsUp className="size-3.5" aria-hidden="true" />
                {derivedSatisfaction}% de satisfação (nota ÷ 5)
              </span>
              {company.business.satisfactionRate != null && (
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-sm font-medium text-neutral-700 ring-1 ring-neutral-200">
                  {company.business.satisfactionRate}% de clientes satisfeitos (dado institucional)
                </span>
              )}
            </div>
            {company.google?.reviewUrl && (
              <Link
                href={company.google.reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Ver ou deixar avaliação no Google
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">Leitura analítica</h2>
          <p className="mt-2 max-w-2xl text-neutral-600">
            A Places API do Google devolve no máximo algumas avaliações “mais relevantes” por
            chamada. Por isso esta página combina a nota e o volume oficiais com uma amostra
            ampliada de depoimentos positivos reais (perfil público + arquivo já publicado no site)
            e analisa o que os clientes repetem com mais frequência.
          </p>

          <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <dt className="text-sm font-semibold text-neutral-500">Nota agregada</dt>
              <dd className="mt-1 font-display text-3xl font-bold text-brand-700">{ratingLabel}</dd>
              <dd className="mt-1 text-sm text-neutral-600">Média de todo o histórico no Google</dd>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <dt className="text-sm font-semibold text-neutral-500">Volume</dt>
              <dd className="mt-1 font-display text-3xl font-bold text-brand-700">{reviewCountLabel}</dd>
              <dd className="mt-1 text-sm text-neutral-600">Avaliações públicas acumuladas</dd>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <dt className="text-sm font-semibold text-neutral-500">Amostra nesta página</dt>
              <dd className="mt-1 font-display text-3xl font-bold text-brand-700">{sampleSize}</dd>
              <dd className="mt-1 text-sm text-neutral-600">
                Depoimentos positivos exibidos ({fiveStarInSample} com 5 estrelas na amostra)
              </dd>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <dt className="text-sm font-semibold text-neutral-500">Trajetória</dt>
              <dd className="mt-1 font-display text-3xl font-bold text-brand-700">
                {company.business.yearsExperience}+
              </dd>
              <dd className="mt-1 text-sm text-neutral-600">Anos de experiência da corretora</dd>
            </div>
          </dl>

          {themes.length > 0 && (
            <div className="mt-12">
              <h3 className="font-display text-xl font-bold text-neutral-900 md:text-2xl">
                O que os clientes mais destacam
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Temas detectados por palavras-chave nos textos da amostra (não é ranking oficial do
                Google — é leitura qualitativa dos depoimentos que exibimos).
              </p>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {themes.map((theme) => (
                  <li key={theme.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h4 className="font-display text-lg font-bold text-neutral-900">{theme.label}</h4>
                      <span className="shrink-0 text-sm font-semibold text-brand-700">
                        {theme.mentionCount}/{sampleSize} textos
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600">{theme.description}</p>
                    {theme.sampleAuthors.length > 0 && (
                      <p className="mt-3 text-xs text-neutral-500">
                        Exemplos: {theme.sampleAuthors.join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {praisedNames.length > 0 && (
            <p className="mt-8 text-sm text-neutral-600">
              <strong className="text-neutral-900">Especialistas citados pelos clientes:</strong>{" "}
              {praisedNames.join(", ")}. Conheça a{" "}
              <Link href="/equipe" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
                equipe completa
              </Link>
              .
            </p>
          )}
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
            Avaliações positivas em destaque
          </h2>
          <p className="mt-2 max-w-2xl text-neutral-600">
            Seleção ampliada de depoimentos com nota alta, ordenados para priorizar textos mais
            detalhados. Exibimos apenas avaliações com 4 ou mais estrelas (política do site).
          </p>

          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <li
                key={`${review.author}-${review.text.slice(0, 24)}`}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <StarRow rating={review.rating} size="size-4" />
                  <Quote className="size-5 text-brand-200" aria-hidden="true" />
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-neutral-700">
                  “{review.text}”
                </blockquote>
                <footer className="mt-4 text-sm font-semibold text-neutral-900">{review.author}</footer>
                <p className="text-xs text-neutral-500">Avaliação no Google</p>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-neutral-500">
            A reputação no Google é pública e independente da {company.tradeName}. Qualquer cliente
            pode ler o histórico completo no{" "}
            {company.google?.profileUrl ? (
              <Link
                href={company.google.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                perfil oficial
              </Link>
            ) : (
              "perfil oficial"
            )}
            .
          </p>
        </Container>
      </Section>

      <CTASection
        ctaId="reputacao-cta"
        location="reputacao"
        heading="Quer a mesma experiência de cotação?"
        description="Fale com um especialista e compare condições entre as seguradoras parceiras."
        showCotarButton
        showCallButton
      />
    </>
  );
}
