import type { Metadata } from "next";

import { Benefits } from "@/components/home/Benefits";
import { ComoFunciona } from "@/components/home/ComoFunciona";
import { CoverageCards } from "@/components/home/CoverageCards";
import { TeamStrip } from "@/components/home/TeamStrip";
import { Testimonials } from "@/components/home/Testimonials";
import { CotacaoSuhaiBloco } from "@/components/suhai/CotacaoSuhaiBloco";
import { CredBar } from "@/components/social/CredBar";
import { CTASection } from "@/components/cta/CTASection";
import { FAQ } from "@/components/shared/FAQ";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchGoogleReviewsSummary } from "@/lib/google-reviews";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * `/cotacao-suhai` — preço na hora das coberturas que esta cotação vende.
 * Fora do índice e do menu enquanto a integração não estiver em produção.
 */

const PASSOS = [
  {
    title: "Informe a placa",
    description: "A gente identifica o veículo. Em seguida, o CEP e o CPF.",
  },
  {
    title: "Veja o preço",
    description: "O cálculo usa as coberturas da Suhai e mostra os planos na hora.",
  },
  {
    title: "Escolha o plano",
    description: "Compare essencial, completo e com terceiros, e o alcance do guincho.",
  },
];

const DIFERENCIAIS = [
  {
    icon: "/icons-3d/preco.webp",
    title: "Preço na hora",
    description: "Você vê o valor nesta página, sem esperar retorno.",
  },
  {
    icon: "/icons-3d/bonus.webp",
    title: "Sua classe de bônus",
    description: "Se você já tem seguro, informe a classe. No primeiro seguro, o bônus fica em zero.",
  },
  {
    icon: "/icons-3d/sobmedida.webp",
    title: "Combinação Suhai",
    description: "Você combina roubo e furto, perda total, danos a terceiros e o guincho.",
  },
  {
    icon: "/icons-3d/sinistro.webp",
    title: "Apoio no sinistro",
    description: "A Imediato acompanha você se precisar acionar o seguro.",
  },
];

const COBERTURAS = [
  { label: "Roubo e furto", icon: "/icons-3d/cov-roubo.webp" },
  { label: "Perda total por colisão", icon: "/icons-3d/cov-colisao.webp" },
  { label: "Danos materiais a terceiros", icon: "/icons-3d/cov-danos-materiais.webp" },
  { label: "Danos corporais a terceiros", icon: "/icons-3d/cov-danos-pessoais.webp" },
  { label: "Assistência 24h com guincho de 200 km ou 500 km", icon: "/icons-3d/cov-assistencia.webp" },
];

const FAQ_ITEMS = [
  {
    question: "O que esse preço cobre?",
    answer:
      "Roubo e furto, e, conforme o plano, perda total por colisão e danos materiais e corporais a terceiros. A assistência 24h entra com guincho de 200 km ou de 500 km.",
  },
  {
    question: "O que não está incluído?",
    answer:
      "Este cálculo não inclui vidros, faróis, retrovisores, pneus, carro reserva, chaveiro nem as panes. Também não inclui dano parcial de colisão nem um seguro só de terceiros.",
  },
  {
    question: "A cotação tem algum custo?",
    answer: "Não. Ver o preço não gera compromisso de contratação.",
  },
  {
    question: "Por que pedimos placa e CPF?",
    answer:
      "A placa identifica o veículo. O CPF completa o perfil para o preço sair certo. Não usamos esses dados para abrir um cadastro nesta etapa.",
  },
];

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Seguro contra roubo e furto online | Imediato Seguros",
    description:
      "Calcule o preço do seguro Suhai contra roubo e furto. Placa, CEP e CPF, e o valor aparece na hora.",
    path: "/cotacao-suhai",
  }),
  robots: { index: false, follow: false },
};

export default async function CotacaoSuhaiPage() {
  const { reviews, rating, reviewCount } = await fetchGoogleReviewsSummary();

  return (
    <>
      <div className="hidden lg:block">
        <CredBar omitirParceiras />
      </div>
      <CotacaoSuhaiBloco />
      <ComoFunciona steps={PASSOS} />
      <Benefits items={DIFERENCIAIS} />
      <CTASection
        ctaId="suhai_cta_meio"
        location="suhai_meio"
        heading="Veja o preço do seu veículo"
        description="Placa, CEP e CPF. O valor aparece na hora."
        tone="brand"
        showCotarButton
        cotarHref="#cotacao-suhai"
        cotarLabel="Ver meu preço"
        ramo="auto"
      />
      <CoverageCards
        items={COBERTURAS}
        eyebrow="Este seguro"
        title="Coberturas que entram no preço"
      />
      <Testimonials reviews={reviews} rating={rating} reviewCount={reviewCount} />
      <TeamStrip />
      <Section tone="soft">
        <Container className="mx-auto max-w-2xl">
          <SectionHeader eyebrow="Tire suas dúvidas" title="Perguntas frequentes" />
          <div className="mt-10">
            <FAQ items={FAQ_ITEMS} />
          </div>
        </Container>
      </Section>
      <CTASection
        ctaId="suhai_cta_final"
        location="suhai_final"
        heading="Se precisar, fale com a Imediato"
        description="Dúvida sobre o plano ou um sinistro: a equipe atende por telefone."
        tone="neutral"
        showCallButton
        ramo="auto"
      />
    </>
  );
}
