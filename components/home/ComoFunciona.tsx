import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { company } from "@/lib/company";

/**
 * ComoFunciona — 3 passos do processo (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("ComoFunciona 3 passos: Cote →
 * Especialista compara 16 seguradoras → Você escolhe").
 *
 * O número de seguradoras vem de `company.business.insurersCount`
 * (Issue 04) — nunca hardcoded (seção 55), mesma fonte já usada por
 * `CredBar` (Issue 09). Descrições de apoio são texto de implementação
 * (processo real do produto, não um dado comercial/regulatório).
 *
 * Versão visual v2 (2026-07-19): passos com numerais display grandes
 * ("01/02/03", padrão editorial de agência) e linha-guia sutil ligando
 * os passos no desktop — substitui os círculos com ícone genéricos.
 */
export function ComoFunciona() {
  const steps = [
    { title: "Cote", description: "Preencha o formulário em poucos passos — leva menos de 1 minuto." },
    {
      title: "Especialista compara",
      description: `Um especialista compara as condições entre ${company.business.insurersCount} seguradoras parceiras.`,
    },
    { title: "Você escolhe", description: "Você recebe a melhor opção e decide com calma, sem compromisso." },
  ];

  return (
    <Section>
      <Container>
        <SectionHeader eyebrow="Processo simples" title="Como funciona" />
        <ol className="relative mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {/* Linha-guia entre os passos (só desktop; decorativa). */}
          <div aria-hidden="true" className="absolute left-0 right-0 top-7 hidden h-px bg-neutral-200 sm:block" />
          {steps.map((step, index) => (
            <li key={step.title} className="relative">
              <span className="relative inline-flex size-14 items-center justify-center rounded-2xl bg-brand-700 font-display text-xl font-bold text-white shadow-[0_8px_24px_rgba(10,37,64,0.25)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-neutral-900">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
