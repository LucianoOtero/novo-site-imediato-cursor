import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge — rótulo não-interativo (Issue 08).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 (matriz de componentes:
 * "Badge/Chip | info · success · alert · neutro · filtro").
 *
 * Badge é a variante estática (não-clicável); a variante interativa
 * (selecionável/removível, `aria-pressed`) é o `Chip` (chip.tsx).
 *
 * Regra de cor (seção 12): verde/vermelho são funcionais e exclusivos
 * (WhatsApp / alerta de fraude) — `success` e `alert` aqui só devem ser
 * usados nesse sentido funcional, nunca como decoração.
 */
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", {
  variants: {
    variant: {
      info: "bg-brand-50 text-brand-700",
      success: "bg-whatsapp/10 text-whatsapp",
      alert: "bg-alert/10 text-alert",
      neutro: "bg-neutral-50 text-neutral-500",
    },
  },
  defaultVariants: {
    variant: "neutro",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
