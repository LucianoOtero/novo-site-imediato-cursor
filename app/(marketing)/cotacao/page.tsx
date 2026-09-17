import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Hero } from "@/components/home/Hero";
import { ComoFunciona } from "@/components/home/ComoFunciona";
import { Benefits } from "@/components/home/Benefits";
import { CoverageCards } from "@/components/home/CoverageCards";
import { InsurersGrid } from "@/components/home/InsurersGrid";
import { Testimonials } from "@/components/home/Testimonials";
import { TeamStrip } from "@/components/home/TeamStrip";
import { RamoGrid } from "@/components/home/RamoGrid";
import { CredBar } from "@/components/social/CredBar";
import { CTASection } from "@/components/cta/CTASection";
import { FAQ } from "@/components/shared/FAQ";
import { buildPageMetadata } from "@/lib/metadata";
import { fetchGoogleReviewsSummary } from "@/lib/google-reviews";

/**
 * `/cotacao` — LP de cotação genérica no mesmo formato da home
 * (CredBar + Hero com LeadForm inline + blocos de confiança).
 * Final URL principal do braço Exp do Ads; SEO próprio vs `/`.
 */
const COTACAO_FAQ_ITEMS = [
  {
    question: "Como faço para pedir uma cotação?",
    answer:
      "Preencha o formulário com DDD e celular — leva menos de 1 minuto. Um especialista entra em contato para finalizar sua cotação, sem compromisso.",
  },
  {
    question: "A cotação tem algum custo?",
    answer: "Não. A cotação é gratuita e não gera nenhum compromisso de contratação.",
  },
  {
    question: "Quanto tempo leva para eu ser atendido?",
    answer: "O retorno é rápido — um especialista entra em contato assim que recebemos sua cotação.",
  },
  {
    question: "Preciso ter todos os documentos em mãos para cotar?",
    answer:
      "Não. Para a cotação inicial, basta DDD e celular. Dados como CEP, CPF e placa são opcionais nessa etapa — você pode informá-los depois, direto com o especialista.",
  },
  {
    question: "Como funciona o atendimento após o envio da cotação?",
    answer:
      "Um especialista da Imediato entra em contato pelo telefone ou WhatsApp informado para entender sua necessidade e apresentar as melhores opções entre as seguradoras parceiras.",
  },
  {
    question: "É seguro informar meus dados no formulário?",
    answer: "Sim. Seus dados são usados exclusivamente para contato sobre sua cotação, conforme nossa Política de Privacidade.",
  },
];

export const metadata: Metadata = buildPageMetadata({
  title: "Cotação Grátis e Sem Compromisso | Imediato Seguros",
  description:
    "Peça sua cotação de seguro grátis. Compare seguradoras parceiras e fale com um especialista — sem compromisso.",
  path: "/cotacao",
});

export default async function CotacaoPage() {
  const { reviews, rating, reviewCount } = await fetchGoogleReviewsSummary();

  return (
    <>
      <div className="hidden lg:block">
        <CredBar />
      </div>
      <Hero
        ramoSlug="auto"
        eyebrow="Cotação online · Sem compromisso"
        headline={"Peça sua cotação grátis\nem 21 seguradoras"}
        subheadline={
          "Compare condições com um especialista da Imediato.\nGrátis, rápido e sem compromisso de contratação."
        }
      />
      <div className="lg:hidden">
        <CredBar variant="complementar" />
      </div>

      <Section tone="soft">
        <Container>
          <SectionHeader eyebrow="O que protegemos" title="Seguros para todo tipo de veículo" />
          <div className="mt-12">
            <RamoGrid />
          </div>
        </Container>
      </Section>

      <ComoFunciona />
      <Benefits />
      <InsurersGrid />

      <CTASection
        ctaId="cotacao_cta_meio"
        location="cotacao_meio"
        heading="Receba sua cotação hoje"
        description="Um especialista compara as melhores condições para você, sem compromisso."
        tone="brand"
        showCotarButton
        ramo="auto"
      />

      <CoverageCards ramoSlug="auto" />
      <Testimonials reviews={reviews} rating={rating} reviewCount={reviewCount} />
      <TeamStrip />

      <Section tone="soft">
        <Container className="mx-auto max-w-2xl">
          <SectionHeader eyebrow="Tire suas dúvidas" title="Perguntas frequentes" />
          <div className="mt-10">
            <FAQ items={COTACAO_FAQ_ITEMS} />
          </div>
        </Container>
      </Section>

      <CTASection
        ctaId="cotacao_cta_final"
        location="cotacao_final"
        heading="Fale com um especialista agora"
        tone="neutral"
        showCallButton
        ramo="auto"
      />
    </>
  );
}
