import { Award, Building2, ShieldCheck, Star, Users } from "lucide-react";

import { Container } from "@/components/ui/container";
import { company } from "@/lib/company";

/**
 * CredBar — barra de prova social (Issue 09).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 (wireframe da Home: "CredBar ★ 4.8
 * · +2.000 avaliações · 25+ anos · SUSEP · 16 seguradoras"), seção 29.3
 * ("TrustIndicators | barra · grid | SUSEP, nota, anos | números com
 * contexto") e seção 55 (`lib/company.ts` como fonte única).
 *
 * Único estado (estático) — Server Component, sem interatividade.
 * Cada número vem acompanhado de um rótulo textual visível (não apenas
 * `aria-label`), satisfazendo o critério "números com contexto textual
 * (SR)" tanto para leitura visual quanto por leitor de tela.
 */
export function CredBar() {
  const reviewsCount = new Intl.NumberFormat("pt-BR").format(company.business.googleReviewsCount);
  const rating = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    company.business.googleRating
  );

  const items = [
    {
      icon: Star,
      label: `${rating} de avaliação no Google`,
    },
    {
      icon: Users,
      label: `+${reviewsCount} avaliações`,
    },
    {
      icon: Award,
      label: `${company.business.yearsExperience}+ anos de experiência`,
    },
    {
      icon: ShieldCheck,
      label: `SUSEP ${company.susep}`,
    },
    {
      icon: Building2,
      label: `${company.business.insurersCount} seguradoras parceiras`,
    },
  ];

  return (
    <div className="border-b border-neutral-200 bg-neutral-50" aria-label="Selos de confiança">
      <Container className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 text-sm text-neutral-900 [&>*:last-child]:col-span-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:[&>*:last-child]:col-span-1">
        {items.map((item) => (
          <p key={item.label} className="flex items-center justify-center gap-1.5 whitespace-nowrap sm:justify-start">
            <item.icon className="size-4 shrink-0 text-brand-500" aria-hidden="true" />
            <span className="font-medium">{item.label}</span>
          </p>
        ))}
      </Container>
    </div>
  );
}
