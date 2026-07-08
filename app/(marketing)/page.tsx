import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
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
 * Home `/` (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 (wireframe completo) e seção 16
 * (sistema de CTAs).
 *
 * Compõe blocos já prontos de issues anteriores (Header/Footer via
 * layout do grupo, CredBar, RamoGrid, FAQ) + os blocos do wireframe que
 * nunca tinham sido atribuídos a nenhuma issue anterior (Hero,
 * ComoFunciona, Benefits, CoverageCards, CTASection) — construídos
 * agora, decisão alinhada com o usuário, já que "fora de escopo: criar
 * componentes do zero" pressupunha que eles já existiriam.
 *
 * `InsurersGrid` (Issue 15) foi adicionado na extensão de 2026-07-03 —
 * os 18 logos reais foram baixados diretamente do site de produção (ver
 * `lib/seguradoras.ts` e `docs/BRAND_ASSETS.md`). Posicionado após
 * `Benefits`, espelhando a ordem do site legado ("diferenciais" →
 * "Parceiros" → "Coberturas").
 *
 * `TeamStrip` (Issue 15) também adicionado na mesma extensão — as 16
 * fotos reais da equipe foram baixadas diretamente do site de produção,
 * após confirmação explícita do cliente de que todos os 16 colaboradores
 * seguem na empresa e as fotos continuam atuais (ver `lib/team.ts`).
 * Posicionado após `CoverageCards`, seguindo a ordem da seção 6.1 da
 * especificação (só pulando `Testimonials`, ainda omitido). Mostra um
 * resumo de 8; a grade completa (16) está em `/equipe`
 * (`app/(marketing)/equipe/page.tsx`), rota que já estava antecipada no
 * menu "A Imediato" desde a Issue 06/07.
 *
 * `Testimonials` (Issue 15) também adicionado na mesma extensão — fonte
 * primária é a API do Google Places, **ativada em 2026-07-08** (cliente
 * criou a `GOOGLE_PLACES_API_KEY`; Place ID correto encontrado via busca
 * real na própria API). Além das avaliações individuais (filtradas por
 * nota mínima — o Google pode incluir avaliações negativas entre as
 * "mais relevantes", sem controle manual sobre quais aparecem), busca
 * também a nota média e a contagem total agregada **reais** do Google
 * (`rating`/`reviewCount`), exibidas no cabeçalho do carrossel. Fallback
 * (API indisponível): 12 avaliações reais extraídas do widget já
 * publicado no site de produção + `company.business.googleRating`/
 * `googleReviewsCount` (ver `lib/google-reviews.ts`). Posicionado entre
 * `CoverageCards` e `TeamStrip`, seguindo a ordem da seção 6.1 da
 * especificação.
 *
 * FAQ da Home é geral (processo/confiança) — perguntas específicas por
 * ramo (preço, carência, documentos) ficam na LP de cada ramo (Issue
 * 16). Respostas abaixo descrevem o processo real já implementado
 * (formulário, contato do especialista) — não são compromissos
 * comerciais/regulatórios, por isso não precisam do marcador
 * `A_CONFIRMAR` usado em `lib/ramos.ts`; ainda assim, é conteúdo de
 * implementação (rascunho) revisável pelo time de Conteúdo.
 */
const HOME_FAQ_ITEMS = [
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
  title: "Cotação de Seguro Grátis | Imediato Seguros",
  description: "Compare seguro auto, moto, caminhão e mais entre seguradoras parceiras. Cotação grátis, sem compromisso, com especialista humano.",
  path: "/",
});

export default async function HomePage() {
  const { reviews, rating, reviewCount } = await fetchGoogleReviewsSummary();

  return (
    <>
      <CredBar />
      <Hero ramoSlug="auto" />

      <Section tone="soft">
        <Container>
          <h2 className="text-center font-display text-2xl font-bold text-neutral-900 md:text-3xl">Seguros para todo tipo de veículo</h2>
          <div className="mt-10">
            <RamoGrid />
          </div>
        </Container>
      </Section>

      <ComoFunciona />
      <Benefits />
      <InsurersGrid />

      <CTASection
        ctaId="home_cta_meio"
        location="home_meio"
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
          <h2 className="text-center font-display text-2xl font-bold text-neutral-900 md:text-3xl">Perguntas frequentes</h2>
          <div className="mt-8">
            <FAQ items={HOME_FAQ_ITEMS} />
          </div>
        </Container>
      </Section>

      <CTASection
        ctaId="home_cta_final"
        location="home_final"
        heading="Fale com um especialista agora"
        tone="neutral"
        showCallButton
        ramo="auto"
      />
    </>
  );
}
