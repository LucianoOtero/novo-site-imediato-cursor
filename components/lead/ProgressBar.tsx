import { cn } from "@/lib/utils";

/**
 * ProgressBar — indicador de progresso do LeadForm (Issue 11).
 * Fonte: ESPECIFICACAO v3.md, seção 6.3 ("ProgressBar Passo 1 de 3
 * ▓▓░░░░") e seção 29.3 ("ProgressIndicator | ... | % visível |
 * aria-valuenow/min/max").
 */
export function ProgressBar({
  step,
  totalSteps,
  compact = false,
}: {
  step: number;
  totalSteps: number;
  compact?: boolean;
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
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-[var(--ease-standard)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
