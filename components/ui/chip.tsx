"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Chip — rótulo interativo: selecionável e/ou removível (Issue 08).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 (matriz de componentes:
 * "Badge/Chip | ... | removível/selecionável | chip selecionável = button;
 * aria-pressed").
 *
 * - Selecionável: renderiza como `<button aria-pressed>`, alterna estado
 *   via `selected`/`onSelectedChange` (controlado pelo pai).
 * - Removível: botão "×" adicional com `aria-label` próprio.
 * - A11y: alvo de toque ≥44px (seção 14) mesmo sendo um chip compacto —
 *   por isso a altura mínima é 44px (`min-h-11`), não o tamanho visual
 *   "pequeno" comum em chips de outros design systems.
 */
const chipVariants = cva(
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
  {
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
  }
);

export interface ChipProps extends VariantProps<typeof chipVariants> {
  className?: string;
  children: React.ReactNode;
  /** Torna o chip selecionável (renderiza como `<button aria-pressed>`). */
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Exibe um botão "×" para remover o chip. */
  removable?: boolean;
  onRemove?: () => void;
  /** Rótulo acessível do botão de remover (padrão: "Remover {children}"). */
  removeLabel?: string;
}

function Chip({
  className,
  variant,
  children,
  selected,
  onSelectedChange,
  removable = false,
  onRemove,
  removeLabel,
}: ChipProps) {
  const isSelectable = typeof onSelectedChange === "function";

  return (
    <span data-slot="chip" className={cn(chipVariants({ variant, className }))}>
      {isSelectable ? (
        <button
          type="button"
          aria-pressed={selected ?? false}
          onClick={() => onSelectedChange?.(!selected)}
          className="inline-flex min-h-11 flex-1 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {children}
        </button>
      ) : (
        <span className="inline-flex flex-1 items-center">{children}</span>
      )}
      {removable && (
        <button
          type="button"
          aria-label={removeLabel ?? `Remover ${typeof children === "string" ? children : "item"}`}
          onClick={onRemove}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export { Chip, chipVariants };
