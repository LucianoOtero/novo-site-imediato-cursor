import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Section — padding vertical padrão de seção (Issue 08).
 * Fonte: ESPECIFICACAO v3.md, seção 13 (section-y 64px mobile → 112px
 * desktop) e seção 28.6 (ritmo de seção: alternância branco ↔ cinza-nuvem;
 * bloco azul profundo a cada ~3 seções).
 *
 * `tone` controla o fundo, seguindo esse ritmo cromático — usar "brand"
 * com moderação (hero, CTA-faixa, footer), nunca em sequência.
 */
const sectionToneClasses = {
  white: "bg-white text-neutral-900",
  soft: "bg-neutral-50 text-neutral-900",
  brand: "bg-brand-700 text-white",
} as const;

export type SectionTone = keyof typeof sectionToneClasses;

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: "section" | "div" | "header" | "footer";
  tone?: SectionTone;
}

function Section({ as: Comp = "section", tone = "white", className, ...props }: SectionProps) {
  return <Comp className={cn("py-16 md:py-28", sectionToneClasses[tone], className)} {...props} />;
}

export { Section };
