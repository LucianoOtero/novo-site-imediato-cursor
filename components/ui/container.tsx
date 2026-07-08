import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Container — largura máxima de conteúdo (Issue 08).
 * Fonte: ESPECIFICACAO v3.md, seção 13 (container máx. 1200px, gutter
 * 20px mobile / 32px desktop) e seção 28.6 (grid 12 colunas).
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

function Container({ as: Comp = "div", className, ...props }: ContainerProps) {
  return <Comp className={cn("mx-auto w-full max-w-[1200px] px-5 md:px-8", className)} {...props} />;
}

export { Container };
