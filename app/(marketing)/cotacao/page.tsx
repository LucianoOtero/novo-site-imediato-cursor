import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { CotacaoForm } from "@/components/lead/CotacaoForm";
import { CotacaoTrustPanel } from "@/components/lead/CotacaoTrustPanel";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * `/cotacao` — página de cotação genérica (Issue 13).
 * Fonte: ESPECIFICACAO v3.md, seção 6.3 (wireframe: ProgressBar + passos
 * do LeadForm + "Lateral fixa" de confiança) e seção 21 (LeadForm
 * `variant="page"`).
 *
 * Metadata via `buildPageMetadata` (Issue 20) — title/description/OG/
 * canonical consistentes com as demais páginas.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Cotação Grátis e Sem Compromisso | Imediato Seguros",
  description:
    "Peça sua cotação de seguro grátis. Preencha em poucos passos e um especialista entra em contato — sem compromisso.",
  path: "/cotacao",
});

export default function CotacaoPage() {
  return (
    <Section>
      <Container className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-display text-3xl font-bold text-neutral-900 md:text-4xl">Peça sua cotação grátis</h1>
          <p className="mt-2 text-neutral-500">Poucos passos, sem compromisso. Um especialista entra em contato para finalizar.</p>
          <div className="mt-8">
            <CotacaoForm />
          </div>
        </div>
        <CotacaoTrustPanel />
      </Container>
    </Section>
  );
}
