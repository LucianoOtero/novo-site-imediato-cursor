import { Award, Building2, Star, Users } from "lucide-react";

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
 *
 * `variant="complementar"` (2026-08-09, pedido do cliente): só os 2 itens
 * que o selo com estrelas do Hero NÃO mostra (anos de experiência e
 * seguradoras parceiras) — usada no mobile da home, onde a CredBar vem
 * logo após o hero e a versão completa duplicava "96%"/"+2.200" que o
 * selo acabou de exibir.
 */
export function CredBar({ variant = "full" }: { variant?: "full" | "complementar" }) {
  const reviewsCount = new Intl.NumberFormat("pt-BR").format(company.business.googleReviewsCount);
  // Satisfação sempre derivada da nota real do Google (nota ÷ 5 × 100 —
  // mesma fórmula do selo do Testimonials), nunca hardcoded (2026-08-08).
  const satisfaction = Math.round((company.business.googleRating / 5) * 100);

  const items = [
    ...(variant === "full"
      ? [
          {
            icon: Star,
            label: `${satisfaction}% de satisfação no Google`,
          },
          {
            icon: Users,
            label: `+${reviewsCount} avaliações`,
          },
        ]
      : []),
    {
      icon: Award,
      label: `${company.business.yearsExperience}+ anos de experiência`,
    },
    // SUSEP removida daqui (pedido do cliente, 2026-08-07): CNPJ/SUSEP
    // ficam no Footer — evitar duplicação no fold. (A barra jurídica do
    // Header que motivava esse comentário foi removida em 2026-08-30.)
    {
      icon: Building2,
      label: `${company.business.insurersCount} seguradoras parceiras`,
    },
  ];

  return (
    <div className="border-b border-neutral-200 bg-neutral-50" aria-label="Selos de confiança">
      {/* Mobile: grid 2x2 com quebra de linha dentro da célula (sem
          whitespace-nowrap — com ele, rótulos mais largos que a coluna
          transbordavam por cima do vizinho em 360px, bug 2026-08-08).
          Desktop (sm+): flex centralizado em linha única, como antes. */}
      <Container className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 text-xs text-neutral-900 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:text-sm">
        {items.map((item) => (
          <p key={item.label} className="flex items-start justify-start gap-1.5 sm:items-center sm:whitespace-nowrap">
            <item.icon className="mt-0.5 size-4 shrink-0 text-brand-500 sm:mt-0" aria-hidden="true" />
            <span className="font-medium">{item.label}</span>
          </p>
        ))}
      </Container>
    </div>
  );
}
