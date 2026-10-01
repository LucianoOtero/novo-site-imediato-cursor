import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FormTone } from "@/components/lead/fields";

/**
 * Confirmação somente-leitura do endereço devolvido pelo ViaCEP.
 * Aparece logo abaixo do campo CEP. Some quando a frase está vazia.
 */
export function EnderecoCepDisplay({ linha, tone = "light" }: { linha?: string; tone?: FormTone }) {
  const glass = tone === "glass";
  if (!linha) return null;

  return (
    <div
      role="status"
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 flex items-start gap-2.5 rounded-lg px-3.5 py-3",
        glass ? "bg-white/10" : "bg-neutral-50"
      )}
    >
      <MapPin className={cn("mt-0.5 size-4 shrink-0", glass ? "text-brand-50/60" : "text-neutral-400")} aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-[11px] font-medium tracking-wide uppercase",
            glass ? "text-brand-50/60" : "text-neutral-400"
          )}
        >
          Endereço encontrado
        </p>
        <p className={cn("text-sm font-medium", glass ? "text-white" : "text-neutral-700")}>{linha}</p>
      </div>
    </div>
  );
}
