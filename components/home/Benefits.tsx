import { BadgeDollarSign, HeartHandshake, Ruler, ShieldCheck } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";

/**
 * Benefits — 4 diferenciais da Home (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("Benefits Preço · Bônus
 * integral · Sob medida · Apoio no sinistro (4 cards)").
 *
 * Os 4 títulos vêm literalmente do wireframe; as descrições de apoio
 * são texto de implementação (proposta de valor genérica, não uma
 * métrica/dado comercial que exija confirmação) — revisáveis por
 * Conteúdo sem impacto em dado regulatório/comercial.
 */
const BENEFITS = [
  { icon: BadgeDollarSign, title: "Preço", description: "Comparamos entre seguradoras parceiras para encontrar o melhor custo-benefício." },
  { icon: ShieldCheck, title: "Bônus integral", description: "Você mantém sua classe de bônus ao migrar seu seguro para a Imediato." },
  { icon: Ruler, title: "Sob medida", description: "Cobertura ajustada ao seu perfil, veículo e necessidade — sem pacote genérico." },
  { icon: HeartHandshake, title: "Apoio no sinistro", description: "Suporte humano do início ao fim, inclusive na hora que mais importa." },
];

export function Benefits() {
  return (
    <Section className="bg-neutral-50">
      <Container>
        <h2 className="text-center font-display text-2xl font-bold text-neutral-900 md:text-3xl">Por que a Imediato</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="rounded-xl border border-neutral-200 bg-white p-6">
              <benefit.icon className="size-8 text-brand-500" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg font-bold text-neutral-900">{benefit.title}</h3>
              <p className="mt-2 text-sm text-neutral-500">{benefit.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
