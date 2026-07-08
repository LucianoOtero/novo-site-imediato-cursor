import { CheckCircle2 } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getRamo } from "@/lib/ramos";

/**
 * Arguments — 3 selling points do ramo, em FeatureCards (Issue 16).
 * Fonte: ESPECIFICACAO v3.md, seção 6.2 ("Argumentos 3 selling points
 * em FeatureCards") e seção 7 ("FeatureCards" — implícito na lista de
 * componentes via `Benefits`/cards de destaque).
 *
 * `ramo.arguments` (Issue 05, seção 31.2) já são conteúdo real — não
 * placeholder — por isso, ao contrário de FAQ/objections, podem ser
 * renderizados diretamente sem risco de mostrar `A_CONFIRMAR`.
 */
export function Arguments({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  if (!ramo || ramo.arguments.length === 0) return null;

  return (
    <Section tone="soft">
      <Container>
        <div className="grid gap-6 sm:grid-cols-3">
          {ramo.arguments.map((argument) => (
            <div key={argument} className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-5">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />
              <span className="font-medium text-neutral-900">{argument}</span>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
