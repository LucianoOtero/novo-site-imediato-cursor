"use client";

import { useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Loader2, X } from "lucide-react";

import { fetchRpaProgress, type RpaProgress } from "@/lib/rpa";

const POLL_INTERVAL_MS = 2000;
/** Nunca fica preso indefinidamente, mesmo que os valores de `status` retornados não batam com o esperado (formato exato não confirmado — ver lib/rpa.ts). */
const MAX_POLL_DURATION_MS = 90_000;

export interface RPAProgressModalProps {
  /** `null` = modal fechado. */
  sessionId: string | null;
  onClose: () => void;
}

/**
 * RPAProgressModal — barra/modal de progresso da cotação automatizada
 * (integrações 2026-07-03, `lib/rpa.ts`).
 * Fonte: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 9) — substitui o
 * `ProgressModalRPA` (SweetAlert2) do site legado pelo Design System
 * deste projeto, usando `@base-ui/react/dialog` (mesmo padrão de
 * `components/layout/Drawer.tsx`).
 *
 * Fechável pelo usuário a qualquer momento (`X`/Esc/clique fora) — o RPA
 * continua rodando no servidor independentemente do modal estar aberto;
 * fechar só para de exibir progresso, não cancela o processo.
 */
export function RPAProgressModal({ sessionId, onClose }: RPAProgressModalProps) {
  const [progress, setProgress] = useState<RpaProgress>({});
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setProgress({});
    setErrored(false);
    if (!sessionId) return;

    let cancelled = false;
    const startedAt = Date.now();
    let timeoutId: number | undefined;

    async function poll() {
      if (cancelled || !sessionId) return;

      try {
        const result = await fetchRpaProgress(sessionId);
        if (cancelled) return;
        setProgress(result);
      } catch {
        if (!cancelled) setErrored(true);
        return;
      }

      if (Date.now() - startedAt < MAX_POLL_DURATION_MS) {
        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [sessionId]);

  return (
    <DialogPrimitive.Root open={!!sessionId} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-neutral-900/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(24rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-lg outline-none transition-all data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="font-display text-lg font-bold text-neutral-900">
              Comparando seguradoras
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="rounded-md p-1 text-neutral-500 outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3">
            {!errored && <Loader2 className="size-5 shrink-0 animate-spin text-brand-500" aria-hidden="true" />}
            <p className="text-sm text-neutral-500">
              {errored
                ? "Não foi possível acompanhar o progresso agora — sua cotação já foi recebida e um especialista vai continuar por WhatsApp."
                : progress.mensagem || progress.etapa_atual || "Comparando as melhores condições entre as seguradoras parceiras…"}
            </p>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
