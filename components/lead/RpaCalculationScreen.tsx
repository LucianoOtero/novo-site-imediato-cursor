import { Loader2, PhoneCall } from "lucide-react";

import { WhatsAppButton } from "@/components/cta/WhatsAppButton";
import { RpaResultCard } from "@/components/lead/RpaResultCard";
import { RPA_SUCCESS_NOTICE, RPA_TOTAL_PHASES, type RpaFinalResult } from "@/lib/rpa-calculation";
import type { RpaCalculationPhase } from "@/lib/leads/use-rpa-calculation";

/**
 * RpaCalculationScreen — tela de cálculo do RPA (projeto 2026-07-16,
 * "etapa de decisão RPA no formulário"), exibida no lugar do formulário
 * (mesmo padrão de substituição total já usado pelo bloco `status ===
 * "success"` do `LeadForm`) quando o usuário escolhe "Aguardar o
 * cálculo" no passo 4.
 *
 * Réplica, com o visual do Design System deste projeto (sem CSS/emojis
 * do legado), da mecânica de `ProgressModalRPA` do site legado
 * (`webflow_injection_limpo.js` — só consultado como referência, nunca
 * alterado): barra de progresso em 16 fases, timer visual com extensão,
 * e ao final os 2 cartões de resultado (`Recomendado`/`Alternativo`) ou
 * a mensagem de "cálculo manual necessário".
 *
 * **Sem redirect automático** (decisão do cliente, 2026-07-16): ao
 * concluir (sucesso ou erro), o usuário permanece nesta tela — só sai
 * clicando no botão de WhatsApp (`skipModal`, mesmo padrão de
 * `ObrigadoContent`) ou navegando manualmente.
 */
export interface RpaCalculationScreenProps {
  phase: RpaCalculationPhase;
  currentStep: number;
  percentage: number;
  phaseTitle: string;
  phaseSubtitle: string;
  result: RpaFinalResult;
  errorMessage: string | null;
  timerLabel: string;
  isExtended: boolean;
  ramo: string;
}

export function RpaCalculationScreen({
  phase,
  currentStep,
  percentage,
  phaseTitle,
  phaseSubtitle,
  result,
  errorMessage,
  timerLabel,
  isExtended,
  ramo,
}: RpaCalculationScreenProps) {
  if (phase === "success") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-xl font-bold text-neutral-900">Encontramos 2 opções para você</h2>
          <p className="text-sm text-neutral-500">{RPA_SUCCESS_NOTICE}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <RpaResultCard variant="recomendado" plano={result.recomendado} />
          <RpaResultCard variant="alternativo" plano={result.alternativo} />
        </div>

        <WhatsAppButton location="rpa_resultado" ramo={ramo} skipModal fullWidth>
          Falar agora no WhatsApp
        </WhatsAppButton>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <PhoneCall className="size-10 text-brand-500" aria-hidden="true" />
        <div>
          <h2 className="font-display text-xl font-bold text-neutral-900">Vamos calcular manualmente para você</h2>
          <p className="mt-2 text-sm text-neutral-500">{errorMessage}</p>
        </div>
        <WhatsAppButton location="rpa_erro" ramo={ramo} skipModal fullWidth>
          Falar agora no WhatsApp
        </WhatsAppButton>
      </div>
    );
  }

  // "starting" | "progress"
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-4 text-center">
      <Loader2 className="size-8 animate-spin text-brand-500" aria-hidden="true" />
      <div>
        <h2 className="font-display text-lg font-bold text-neutral-900">Calculando sua cotação</h2>
        <p className="mt-1 text-sm text-neutral-500">{phaseTitle || "Iniciando o cálculo…"}</p>
        {phaseSubtitle && <p className="text-xs text-neutral-400">{phaseSubtitle}</p>}
      </div>

      <div className="w-full">
        <div
          role="progressbar"
          aria-valuenow={Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Fase ${currentStep} de ${RPA_TOTAL_PHASES}`}
          className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-[var(--ease-standard)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-400">
          <span>
            Fase {currentStep} de {RPA_TOTAL_PHASES}
          </span>
          <span>{timerLabel}</span>
        </div>
      </div>

      {isExtended && (
        <p className="text-xs text-neutral-500">Está levando um pouco mais que o normal — seguimos calculando.</p>
      )}
    </div>
  );
}
