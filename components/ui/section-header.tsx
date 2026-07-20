import { cn } from "@/lib/utils";

/**
 * SectionHeader — cabeçalho padrão de seção (versão visual v2, 2026-07-19).
 *
 * Padrão de agência para dar ritmo e hierarquia às seções: eyebrow
 * (rótulo curto em caps, cor da marca) + título display + texto de apoio
 * opcional. Centralizado por padrão (uso predominante na home); variante
 * alinhada à esquerda para seções editoriais.
 */
export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  /** Tom do fundo da seção — ajusta as cores do texto. */
  tone?: "light" | "dark";
  className?: string;
}

export function SectionHeader({ eyebrow, title, description, align = "center", tone = "light", className }: SectionHeaderProps) {
  const isCenter = align === "center";
  const isDark = tone === "dark";

  return (
    <div className={cn(isCenter && "text-center", className)}>
      {eyebrow && (
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-widest",
            isDark ? "text-brand-100" : "text-brand-500"
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl",
          isDark ? "text-white" : "text-neutral-900"
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-3 text-lg", isCenter && "mx-auto max-w-2xl", isDark ? "text-white/80" : "text-neutral-500")}>
          {description}
        </p>
      )}
    </div>
  );
}
