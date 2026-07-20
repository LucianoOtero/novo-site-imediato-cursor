import { Headset, Hourglass, Info, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FormTone } from "@/components/lead/fields";
import {
  RPA_DISABLED_CAMINHAO_MESSAGE,
  RPA_DISABLED_INCOMPLETE_MESSAGE,
  RPA_PROFILE_ESTIMATE_NOTICE,
  RPA_VALIDATING_MESSAGE,
  type RpaDisabledReason,
} from "@/lib/rpa-calculation";

/**
 * RpaChoiceStep — passo 4 do `LeadForm` (projeto 2026-07-16, "etapa de
 * decisão RPA no formulário"), exibido depois de CPF/CEP/Placa. Pergunta
 * se o usuário quer acompanhar o cálculo automático (RPA, 18
 * seguradoras) agora ou preferir que um consultor calcule depois —
 * textos deliberadamente sucintos, sem criar atrito com nenhuma das duas
 * escolhas (nenhuma opção é apresentada como "inferior").
 *
 * Cópias e disclaimers redigidos a pedido do cliente, cobrindo: tempo
 * estimado do cálculo (2 a 10 minutos), o que aparece ao final
 * (2 opções — recomendada e alternativa) e as condições de contratação
 * (feita pelo consultor após a proposta da seguradora, sujeita à
 * aprovação da seguradora).
 *
 * Habilitação do cálculo automático (projeto 2026-07-17): o botão
 * "Aguardar o cálculo" só fica ativo quando `rpaEnabled` é `true` — ou
 * seja, todos os dados obrigatórios foram preenchidos e validados e o
 * veículo foi identificado, e o ramo não é caminhão. Quando desabilitado,
 * mostramos uma mensagem elegante explicando o motivo e mantemos a opção
 * de falar com um consultor.
 */
export interface RpaChoiceStepProps {
  onChooseWait: () => void;
  onChooseConsultant: () => void;
  busy?: boolean;
  rpaEnabled: boolean;
  rpaDisabledReason?: RpaDisabledReason | null;
  /**
   * Feature-flag global do cálculo automático (`NEXT_PUBLIC_RPA_ENABLED`,
   * projeto 2026-07-18). Quando `false`, o cálculo automático ainda não está
   * no ar: ocultamos a opção "Aguardar o cálculo" e oferecemos apenas o
   * consultor (kill-switch de produção).
   */
  featureEnabled: boolean;
  /** `glass` (v2 visual, 2026-07-19): textos claros e cards internos translúcidos, para o card navy do Hero. */
  tone?: FormTone;
  /**
   * `true` enquanto validações assíncronas (placa/CEP/celular/e-mail) ainda
   * estão em andamento (pedido do cliente, 2026-07-20) — mostra a ampulheta
   * "Aguarde, validando os dados apresentados…" em vez do aviso de dados
   * incompletos, que piscava e sumia parecendo um erro.
   */
  validating?: boolean;
}

export function RpaChoiceStep({
  onChooseWait,
  onChooseConsultant,
  busy,
  rpaEnabled,
  rpaDisabledReason,
  featureEnabled,
  tone = "light",
  validating = false,
}: RpaChoiceStepProps) {
  const glass = tone === "glass";
  const bodyText = glass ? "text-brand-50/80" : "text-neutral-600";
  const mutedText = glass ? "text-brand-50/60" : "text-neutral-500";
  const titleText = glass ? "text-white" : "text-neutral-900";
  const innerCard = glass ? "border-white/20" : "border-neutral-200";
  const disabledMessage =
    rpaDisabledReason === "caminhao"
      ? RPA_DISABLED_CAMINHAO_MESSAGE
      : rpaDisabledReason === "dados_incompletos"
        ? RPA_DISABLED_INCOMPLETE_MESSAGE
        : null;

  // Cálculo automático desligado globalmente: só oferece o consultor.
  if (!featureEnabled) {
    return (
      <div className="flex flex-col gap-5">
        <p className={cn("text-sm", bodyText)}>
          Um consultor Imediato Seguros calcula sua cotação e entra em contato com as melhores condições encontradas.
        </p>
        <Button
          type="button"
          variant="primary"
          fullWidth
          iconLeft={<Headset className="size-4" aria-hidden="true" />}
          disabled={busy}
          onClick={onChooseConsultant}
        >
          Falar com um consultor
        </Button>
        <p className={cn("text-xs", mutedText)}>
          A contratação da apólice é feita pelo consultor após a proposta da seguradora escolhida, sempre sujeita à aprovação da
          seguradora.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className={cn("text-sm", bodyText)}>
        Comparamos sua cotação em tempo real entre 18 seguradoras parceiras — o cálculo pode levar de 2 a 10 minutos.
      </p>

      <div className="flex flex-col gap-3">
        <div className={cn("rounded-lg border p-4", innerCard)}>
          <p className={cn("text-sm font-medium", titleText)}>Calcular agora, em tempo real</p>
          {rpaEnabled ? (
            <p className={cn("mt-1 text-sm", mutedText)}>
              Acompanhe o progresso em tempo real. Ao final, mostramos 2 opções: a recomendada para o seu perfil e uma
              alternativa.
            </p>
          ) : validating ? (
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "mt-2 flex items-start gap-2 rounded-md border p-3 text-sm",
                glass ? "border-white/20 bg-white/10 text-brand-50/80" : "border-brand-100 bg-brand-50 text-brand-700"
              )}
            >
              <Hourglass className="mt-0.5 size-4 shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
              <span>{RPA_VALIDATING_MESSAGE}</span>
            </div>
          ) : (
            <div
              role="note"
              className={cn(
                "mt-2 flex items-start gap-2 rounded-md border p-3 text-sm",
                glass
                  ? "border-amber-300/30 bg-amber-400/15 text-amber-200"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              )}
            >
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{disabledMessage}</span>
            </div>
          )}
          <Button
            type="button"
            variant="primary"
            fullWidth
            className="mt-3"
            iconLeft={<Timer className="size-4" aria-hidden="true" />}
            disabled={busy || !rpaEnabled || validating}
            onClick={onChooseWait}
          >
            Quero calcular agora
          </Button>
        </div>

        <div className={cn("rounded-lg border p-4", innerCard)}>
          <p className={cn("text-sm font-medium", titleText)}>Deixe com um especialista</p>
          <p className={cn("mt-1 text-sm", mutedText)}>
            Um consultor Imediato Seguros faz o cálculo e entra em contato com as melhores condições encontradas.
          </p>
          <Button
            type="button"
            variant={rpaEnabled ? "secondary" : "primary"}
            fullWidth
            className="mt-3"
            iconLeft={<Headset className="size-4" aria-hidden="true" />}
            disabled={busy}
            onClick={onChooseConsultant}
          >
            Prefiro receber o cálculo completo depois
          </Button>
        </div>
      </div>

      {rpaEnabled && <p className={cn("text-xs", mutedText)}>{RPA_PROFILE_ESTIMATE_NOTICE}</p>}

      <p className={cn("text-xs", mutedText)}>
        A contratação da apólice é feita pelo consultor após a proposta da seguradora escolhida, sempre sujeita à aprovação da
        seguradora.
      </p>
    </div>
  );
}
