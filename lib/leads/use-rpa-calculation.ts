"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchRpaProgress, startRpaSession, type RpaProgress } from "@/lib/rpa";
import {
  isRpaErrorStatus,
  isRpaSuccessStatus,
  parseRpaFinalResult,
  rpaPhaseLabel,
  rpaPhasePercentage,
  RPA_MANUAL_QUOTE_MESSAGE,
  type RpaFinalResult,
} from "@/lib/rpa-calculation";

/** 300 tentativas × 2s = 10 minutos — mesmo teto de `startProgressPolling()` do legado. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 300;
/** 3 minutos iniciais + 1 extensão de 2 minutos — réplica de `SpinnerTimer` do legado. */
const TIMER_INITIAL_SECONDS = 180;
const TIMER_EXTENSION_SECONDS = 120;

export type RpaCalculationPhase = "idle" | "starting" | "progress" | "success" | "error";

export interface RpaCalculationState {
  phase: RpaCalculationPhase;
  currentStep: number;
  percentage: number;
  phaseTitle: string;
  phaseSubtitle: string;
  result: RpaFinalResult;
  errorMessage: string | null;
  timerLabel: string;
  isExtended: boolean;
}

function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const initialState: RpaCalculationState = {
  phase: "idle",
  currentStep: 0,
  percentage: 0,
  phaseTitle: "",
  phaseSubtitle: "",
  result: {},
  errorMessage: null,
  timerLabel: formatTimer(TIMER_INITIAL_SECONDS),
  isExtended: false,
};

/**
 * useRpaCalculation — orquestra o cálculo automatizado do RPA (projeto
 * 2026-07-16, "etapa de decisão RPA no formulário"). Réplica, em React/
 * TypeScript nativo deste projeto, da mecânica das classes
 * `ProgressModalRPA`/`SpinnerTimer` do site legado
 * (`webflow_injection_limpo.js` — só consultado como referência de
 * leitura, nunca alterado): 16 fases de progresso, timer visual de 3min
 * com 1 extensão de +2min, polling de 2s (até 10min) e extração dos 2
 * planos finais (`recomendado`/`alternativo`) das 3 estruturas de
 * fallback já usadas pela API do RPA.
 *
 * Consome só os endpoints já existentes em `lib/rpa.ts`
 * (`startRpaSession`/`fetchRpaProgress`) — o contrato com o backend do
 * RPA não é alterado por este hook.
 */
export function useRpaCalculation() {
  const [state, setState] = useState<RpaCalculationState>(initialState);

  const sessionIdRef = useRef<string | null>(null);
  const pollCountRef = useRef(0);
  const pollTimeoutRef = useRef<number | undefined>(undefined);
  const timerIntervalRef = useRef<number | undefined>(undefined);
  const remainingSecondsRef = useRef(TIMER_INITIAL_SECONDS);
  const extendedRef = useRef(false);
  const doneRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
    pollTimeoutRef.current = undefined;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = undefined;
  }, []);

  const finishWithError = useCallback(
    (message: string) => {
      doneRef.current = true;
      stopPolling();
      stopTimer();
      setState((prev) => ({ ...prev, phase: "error", errorMessage: message }));
    },
    [stopPolling, stopTimer]
  );

  const poll = useCallback(async () => {
    if (doneRef.current || !sessionIdRef.current) return;
    pollCountRef.current += 1;

    if (pollCountRef.current > MAX_POLLS) {
      finishWithError(RPA_MANUAL_QUOTE_MESSAGE);
      return;
    }

    try {
      const progress = (await fetchRpaProgress(sessionIdRef.current)) as RpaProgress & Record<string, unknown>;
      if (doneRef.current) return;

      const status = progress.status ?? "processing";
      const mensagem = progress.mensagem ?? "";
      const errorCode = progress.error_code as string | number | undefined;

      if (isRpaErrorStatus(status, mensagem, errorCode)) {
        finishWithError(RPA_MANUAL_QUOTE_MESSAGE);
        return;
      }

      const success = isRpaSuccessStatus(status);
      const currentStep = success ? 16 : Number(progress.fase_atual ?? progress.etapa_atual ?? 1) || 1;
      const { title, subtitle } = rpaPhaseLabel(currentStep);
      const hasFinalData = Boolean(progress.dados_extra || progress.resultados_finais || progress.timeline);
      const result = hasFinalData ? parseRpaFinalResult(progress) : undefined;

      setState((prev) => ({
        ...prev,
        phase: success ? "success" : "progress",
        currentStep,
        percentage: rpaPhasePercentage(currentStep),
        phaseTitle: title,
        phaseSubtitle: subtitle,
        result: result ?? prev.result,
      }));

      if (success) {
        doneRef.current = true;
        stopPolling();
        stopTimer();
        return;
      }

      pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    } catch {
      // Best-effort — uma falha isolada de rede não encerra o polling; só o teto de tentativas (10min) encerra de fato.
      pollTimeoutRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
    }
  }, [finishWithError, stopPolling, stopTimer]);

  const startTimer = useCallback(() => {
    remainingSecondsRef.current = TIMER_INITIAL_SECONDS;
    extendedRef.current = false;
    setState((prev) => ({ ...prev, timerLabel: formatTimer(TIMER_INITIAL_SECONDS), isExtended: false }));

    timerIntervalRef.current = window.setInterval(() => {
      remainingSecondsRef.current -= 1;

      if (remainingSecondsRef.current <= 0) {
        if (!extendedRef.current) {
          extendedRef.current = true;
          remainingSecondsRef.current = TIMER_EXTENSION_SECONDS;
          setState((prev) => ({ ...prev, isExtended: true }));
        } else {
          remainingSecondsRef.current = 0;
          stopTimer();
        }
      }

      setState((prev) => ({ ...prev, timerLabel: formatTimer(remainingSecondsRef.current) }));
    }, 1000);
  }, [stopTimer]);

  const start = useCallback(
    async (payload: Record<string, unknown>) => {
      doneRef.current = false;
      pollCountRef.current = 0;
      setState({ ...initialState, phase: "starting" });

      try {
        const sessionId = await startRpaSession(payload);
        sessionIdRef.current = sessionId;
        startTimer();
        void poll();
      } catch {
        finishWithError(RPA_MANUAL_QUOTE_MESSAGE);
      }
    },
    [poll, startTimer, finishWithError]
  );

  useEffect(() => {
    return () => {
      doneRef.current = true;
      stopPolling();
      stopTimer();
    };
  }, [stopPolling, stopTimer]);

  return { ...state, start };
}
