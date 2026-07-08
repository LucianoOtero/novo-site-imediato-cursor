import { CheckCircle2, FileEdit, Users } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { company } from "@/lib/company";

/**
 * ComoFunciona — 3 passos do processo (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("ComoFunciona 3 passos: Cote →
 * Especialista compara 16 seguradoras → Você escolhe").
 *
 * O número de seguradoras vem de `company.business.insurersCount`
 * (Issue 04) — nunca hardcoded (seção 55), mesmo estando marcado
 * `A_CONFIRMAR` ali (mesma fonte já usada por `CredBar`, Issue 09).
 * Descrições de apoio são texto de implementação (processo real do
 * produto, não um dado comercial/regulatório) — não requerem
 * confirmação separada.
 */
export function ComoFunciona() {
  const steps = [
    { icon: FileEdit, title: "Cote", description: "Preencha o formulário em poucos passos — leva menos de 1 minuto." },
    {
      icon: Users,
      title: "Especialista compara",
      description: `Um especialista compara as condições entre ${company.business.insurersCount} seguradoras parceiras.`,
    },
    { icon: CheckCircle2, title: "Você escolhe", description: "Você recebe a melhor opção e decide com calma, sem compromisso." },
  ];

  return (
    <Section>
      <Container>
        <h2 className="text-center font-display text-2xl font-bold text-neutral-900 md:text-3xl">Como funciona</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <step.icon className="size-6" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-neutral-900">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm text-neutral-500">{step.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
