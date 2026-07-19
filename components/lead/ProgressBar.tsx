import { cn } from "@/lib/utils";

import type { FormTone } from "@/components/lead/fields";

/**
 * ProgressBar — indicador de progresso do LeadForm (Issue 11).
 * Fonte: ESPECIFICACAO v3.md, seção 6.3 ("ProgressBar Passo 1 de 3
 * ▓▓░░░░") e seção 29.3 ("ProgressIndicator | ... | % visível |
 * aria-valuenow/min/max").
 *
 * `tone="glass"` (v2 visual, 2026-07-19): trilho branco translúcido e
 * preenchimento branco — o azul brand-500 some sobre o card navy do Hero.
 */
export function ProgressBar({
  step,
  totalSteps,
  compact = false,
  tone = "light",
}: {
  step: number;
  totalSteps: number;
  compact?: boolean;
  tone?: FormTone;
}) {
  const percent = Math.round((step / totalSteps) * 100);

  // O texto "Etapa X de Y" fica no cabeçalho do LeadForm (visível também no
  // Hero, onde a barra é `compact`) — aqui exibimos apenas a barra, evitando
  // duplicar o contador (projeto 2026-07-17).
  return (
    <div className={cn(compact ? "mb-4" : "mb-6")}>
      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Etapa ${step} de ${totalSteps}`}
        className={cn(
          "h-1.5 w-full overflow-hidden rounded-full",
          tone === "glass" ? "bg-white/20" : "bg-neutral-200"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-[var(--ease-standard)]",
            tone === "glass" ? "bg-white" : "bg-brand-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
