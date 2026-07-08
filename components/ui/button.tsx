"use client";

import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Button — primitive base do Design System (Issue 08).
 * Fonte: ESPECIFICACAO v3.md, seção 29.2 ("Fichas-chave" — Button).
 *
 * Variantes: `primary | secondary | ghost | whatsapp | destructive`.
 * Tamanhos: `sm | md | lg` — todos com altura mínima de 44px (seção 14,
 * "alvos de toque ≥ 44px"; mesmo o `sm` é 44px, não um botão menor).
 * Estados: hover (-2px Y), active (scale .98), focus-visible (anel 2px),
 * disabled (opacidade .6), loading (spinner + `aria-busy`).
 *
 * Nota de adaptação: a especificação lista um prop `asChild` (padrão do
 * Radix). O shadcn/ui instalado neste projeto (Issue 01) usa **Base UI**,
 * não Radix — o equivalente nativo é a prop `render` (aceita um
 * `ReactElement` para substituir a tag renderizada). Em vez de adicionar
 * `@radix-ui/react-slot` só para replicar `asChild`, usamos `render`
 * diretamente; `href` é um atalho de conveniência para o caso mais comum
 * (renderizar como `<a>`), satisfazendo a exigência de a11y "`<button>`/
 * `<a>` semântico".
 *
 * Nota de a11y: quando `href`/`render` apontam para um link (navegação
 * real, ex.: "Cotar agora", "Ligar"), o `<ButtonPrimitive>` do Base UI NÃO
 * é usado como wrapper. O motivo: o primitivo sempre aplica semântica de
 * botão (`nativeButton`) — com `nativeButton={false}` ele passa a impor
 * `role="button"` sobre o elemento renderizado, sobrescrevendo o `role`
 * nativo de link do `<a>`. Isso é incorreto para uma navegação real (deve
 * permanecer `role="link"`). Por isso, o caminho `href`/`render` clona o
 * elemento diretamente com as mesmas classes/estados, sem o wrapper.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium",
    "transition-all duration-[var(--dur-fast)] ease-[var(--ease-standard)] select-none",
    "outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-60",
    "aria-disabled:pointer-events-none aria-disabled:opacity-60",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-brand-500 text-white shadow-sm hover:shadow-cta",
        secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
        ghost: "bg-transparent text-brand-700 hover:bg-neutral-50",
        whatsapp: "bg-whatsapp text-white hover:brightness-95",
        destructive: "bg-alert text-white hover:brightness-95",
      },
      size: {
        sm: "h-11 px-4 text-sm",
        md: "h-12 px-5 text-base",
        lg: "h-14 px-6 text-base",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends Omit<ButtonPrimitive.Props, "render" | "className">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  /** Ícone antes do label. Substituído pelo spinner quando `loading`. */
  iconLeft?: React.ReactNode;
  /** Ícone depois do label. Ocultado quando `loading`. */
  iconRight?: React.ReactNode;
  /** Estado de carregamento — mostra spinner e define `aria-busy`. */
  loading?: boolean;
  /** Atalho: renderiza como `<a href={href}>` em vez de `<button>`. */
  href?: string;
  /** Só tem efeito junto de `href`/`render` apontando para um `<a>` (ex.: WhatsApp em nova aba). */
  target?: React.HTMLAttributeAnchorTarget;
  /** Só tem efeito junto de `href`/`render` apontando para um `<a>`. */
  rel?: string;
  /**
   * Substitui a tag renderizada por um elemento próprio (ex.: `<Link
   * href="/rota" />` do `next/link`). Aceita apenas `ReactElement`
   * (diferente do `render` do Base UI, que também aceita função) — ver
   * nota de a11y acima sobre por que este atalho não usa `ButtonPrimitive`.
   */
  render?: React.ReactElement<{ className?: string }>;
}

function Button({
  className,
  variant,
  size,
  fullWidth,
  iconLeft,
  iconRight,
  loading = false,
  href,
  render,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sharedClassName = cn(buttonVariants({ variant, size, fullWidth, className }));
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </>
  );

  const linkElement = render ?? (href ? <a href={href} /> : undefined);
  if (linkElement) {
    return React.cloneElement(
      linkElement,
      {
        "data-slot": "button",
        className: cn(sharedClassName, linkElement.props.className),
        "aria-busy": loading || undefined,
        "aria-disabled": isDisabled || undefined,
        ...props,
      },
      content
    );
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={sharedClassName}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
