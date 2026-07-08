import { CheckCircle2, Star } from "lucide-react";

import { company } from "@/lib/company";

/**
 * CotacaoTrustPanel — "Lateral fixa" de confiança de `/cotacao` (Issue 13).
 * Fonte: ESPECIFICACAO v3.md, seção 6.3 ("Lateral fixa 'Cotação grátis ·
 * Sem compromisso · Retorno rápido' + ★4.8"). Nota de accessível/SR: cada
 * item tem texto visível, não depende só do ícone.
 *
 * `<div>` em vez de `<aside>` (Issue 23, QA a11y): landmark
 * `complementary` precisa ser top-level (irmão de `<main>`), não aninhado
 * dentro dele — este painel fica dentro do `<main>` da página, então
 * `<aside>` aqui violava a regra `landmark-complementary-is-top-level`
 * do axe-core.
 */
const TRUST_ITEMS = ["Cotação grátis", "Sem compromisso", "Retorno rápido"];

export function CotacaoTrustPanel() {
  const rating = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    company.business.googleRating
  );

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6 lg:sticky lg:top-24">
      <p className="flex items-center gap-2 text-sm font-bold text-neutral-900">
        <Star className="size-4 fill-brand-500 text-brand-500" aria-hidden="true" />
        {rating} de avaliação no Google
      </p>
      <ul className="flex flex-col gap-2">
        {TRUST_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-neutral-500">
            <CheckCircle2 className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
