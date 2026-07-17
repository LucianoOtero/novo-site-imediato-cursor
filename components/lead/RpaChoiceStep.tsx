import { Headset, Info, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  RPA_DISABLED_CAMINHAO_MESSAGE,
  RPA_DISABLED_INCOMPLETE_MESSAGE,
  RPA_PROFILE_ESTIMATE_NOTICE,
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
}

export function RpaChoiceStep({
  onChooseWait,
  onChooseConsultant,
  busy,
  rpaEnabled,
  rpaDisabledReason,
}: RpaChoiceStepProps) {
  const disabledMessage =
    rpaDisabledReason === "caminhao"
      ? RPA_DISABLED_CAMINHAO_MESSAGE
      : rpaDisabledReason === "dados_incompletos"
        ? RPA_DISABLED_INCOMPLETE_MESSAGE
        : null;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-600">
        Comparamos sua cotação em tempo real entre 18 seguradoras parceiras — o cálculo pode levar de 2 a 10 minutos.
      </p>

      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-neutral-200 p-4">
          <p className="text-sm font-medium text-neutral-900">Aguardar o cálculo agora</p>
          {rpaEnabled ? (
            <p className="mt-1 text-sm text-neutral-500">
              Acompanhe o progresso em tempo real. Ao final, mostramos 2 opções: a recomendada para o seu perfil e uma
              alternativa.
            </p>
          ) : (
            <div
              role="note"
              className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
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
            disabled={busy || !rpaEnabled}
            onClick={onChooseWait}
          >
            Aguardar o cálculo
          </Button>
        </div>

        <div className="rounded-lg border border-neutral-200 p-4">
          <p className="text-sm font-medium text-neutral-900">Prefiro que cuidem disso para mim</p>
          <p className="mt-1 text-sm text-neutral-500">
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
            Falar com um consultor depois
          </Button>
        </div>
      </div>

      {rpaEnabled && <p className="text-xs text-neutral-500">{RPA_PROFILE_ESTIMATE_NOTICE}</p>}

      <p className="text-xs text-neutral-500">
        A contratação da apólice é feita pelo consultor após a proposta da seguradora escolhida, sempre sujeita à aprovação da
        seguradora.
      </p>
    </div>
  );
}
