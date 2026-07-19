import Image from "next/image";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";

/**
 * Benefits — 4 diferenciais da Home (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("Benefits Preço · Bônus
 * integral · Sob medida · Apoio no sinistro (4 cards)").
 *
 * Os 4 títulos vêm literalmente do wireframe; as descrições de apoio
 * são texto de implementação (proposta de valor genérica, não uma
 * métrica/dado comercial que exija confirmação) — revisáveis por
 * Conteúdo sem impacto em dado regulatório/comercial.
 *
 * Versão visual v2 (2026-07-19): cards com sombra em camadas + hover
 * lift e `SectionHeader` (eyebrow + título display). Fase 5 do redesign:
 * ícones 3D exclusivos gerados via Higgsfield MCP no estilo da marca
 * (render 3D navy/azul, ver docs/VISUAL_HIGGSFIELD.md) substituem os
 * ícones genéricos do Lucide — WebP 256px, ~5 KB cada, lazy.
 */
const BENEFITS = [
  { icon: "/icons-3d/preco.webp", title: "Preço", description: "Comparamos entre seguradoras parceiras para encontrar o melhor custo-benefício." },
  { icon: "/icons-3d/bonus.webp", title: "Bônus integral", description: "Você mantém sua classe de bônus ao migrar seu seguro para a Imediato." },
  { icon: "/icons-3d/sobmedida.webp", title: "Sob medida", description: "Cobertura ajustada ao seu perfil, veículo e necessidade — sem pacote genérico." },
  { icon: "/icons-3d/sinistro.webp", title: "Apoio no sinistro", description: "Suporte humano do início ao fim, inclusive na hora que mais importa." },
];

export function Benefits() {
  return (
    <Section className="bg-neutral-50">
      <Container>
        <SectionHeader eyebrow="Nossos diferenciais" title="Por que a Imediato" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit.title}
              className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(11,31,58,0.06)] transition-all duration-200 ease-[var(--ease-standard)] hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(11,31,58,0.12)]"
            >
              <Image
                src={benefit.icon}
                alt=""
                width={64}
                height={64}
                className="size-16 transition-transform duration-200 group-hover:scale-110"
                aria-hidden="true"
              />
              <h3 className="mt-4 font-display text-lg font-bold text-neutral-900">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{benefit.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
