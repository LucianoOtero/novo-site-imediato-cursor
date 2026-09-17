import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Hero } from "@/components/home/Hero";
import { ComoFunciona } from "@/components/home/ComoFunciona";
import { Benefits } from "@/components/home/Benefits";
import { InsurersGrid } from "@/components/home/InsurersGrid";
import { Testimonials } from "@/components/home/Testimonials";
import { CredBar } from "@/components/social/CredBar";
import { CTASection } from "@/components/cta/CTASection";
import { FAQ } from "@/components/shared/FAQ";
import { buildPageMetadata } from "@/lib/metadata";
import { fetchGoogleReviewsSummary } from "@/lib/google-reviews";

/**
 * `/cotacao-porto` — LP de conquista Porto Seguro (padrão home).
 * Final URL da campanha Ads Porto (site novo). Corretora independente;
 * message-match com logo oficial Porto 2022 no hero.
 */
const PORTO_FAQ_ITEMS = [
  {
    question: "Vocês são a Porto Seguro?",
    answer:
      "Não. Somos a Imediato Seguros, corretora independente. Cotamos Porto Seguro e outras seguradoras parceiras para você comparar e escolher a melhor condição.",
  },
  {
    question: "Como faço para pedir uma cotação Porto Seguro?",
    answer:
      "Preencha o formulário com DDD e celular. Um especialista entra em contato para montar sua cotação — inclusive opções da Porto e de outras seguradoras.",
  },
  {
    question: "A cotação tem algum custo?",
    answer: "Não. A cotação é gratuita e não gera compromisso de contratação.",
  },
  {
    question: "Posso comparar a Porto com outras seguradoras?",
    answer:
      "Sim. Como corretora, comparamos condições entre seguradoras parceiras para orientar a melhor escolha para o seu perfil.",
  },
  {
    question: "Quanto tempo leva para eu ser atendido?",
    answer: "O retorno é rápido — um especialista entra em contato assim que recebemos sua cotação.",
  },
  {
    question: "É seguro informar meus dados no formulário?",
    answer: "Sim. Seus dados são usados exclusivamente para contato sobre sua cotação, conforme nossa Política de Privacidade.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title: "Cotação Porto Seguro Online | Imediato Seguros",
  description:
    "Cotação Porto Seguro com a Imediato Seguros. Compare Porto e outras seguradoras. Grátis, sem compromisso, com especialista.",
  path: "/cotacao-porto",
});

export default async function CotacaoPortoPage() {
  const { reviews, rating, reviewCount } = await fetchGoogleReviewsSummary();

  return (
    <>
      <div className="hidden lg:block">
        <CredBar />
      </div>
      <Hero
        ramoSlug="auto"
        partnerLogo={{ src: "/logos/seguradoras/porto-2022.svg", alt: "Porto Seguro" }}
        eyebrow=""
        headline={"Cotação Porto Seguro\nonline e sem compromisso"}
        subheadline={
          "Corretora independente: compare Porto Seguro e outras seguradoras.\nGrátis, rápido e com atendimento humano."
        }
      />
      <div className="lg:hidden">
        <CredBar variant="complementar" />
      </div>

      <ComoFunciona />
      <Benefits />
      <InsurersGrid />

      <CTASection
        ctaId="cotacao_porto_cta_meio"
        location="cotacao_porto_meio"
        heading="Compare Porto e outras seguradoras"
        description="Um especialista da Imediato monta sua cotação sem compromisso."
        tone="brand"
        showCotarButton
        ramo="auto"
      />

      <Testimonials reviews={reviews} rating={rating} reviewCount={reviewCount} />

      <Section tone="soft">
        <Container className="mx-auto max-w-2xl">
          <SectionHeader eyebrow="Tire suas dúvidas" title="Perguntas frequentes" />
          <div className="mt-10">
            <FAQ items={PORTO_FAQ_ITEMS} />
          </div>
        </Container>
      </Section>

      <CTASection
        ctaId="cotacao_porto_cta_final"
        location="cotacao_porto_final"
        heading="Fale com um especialista agora"
        tone="neutral"
        showCallButton
        ramo="auto"
      />
    </>
  );
}
