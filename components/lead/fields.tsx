import type { ReactNode } from "react";
import { CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/** Tom visual dos componentes do LeadForm: `light` (card branco, padrão) ou `glass` (card navy translúcido sobre o hero — v2 visual, 2026-07-19). */
export type FormTone = "light" | "glass";

/**
 * Field — wrapper de label/erro para os campos do LeadForm (Issue 11).
 * Fonte: ESPECIFICACAO v3.md, seção 21.1 ("a11y: <label> ligado,
 * aria-invalid, aria-describedby, foco ao 1º inválido, role=status no
 * sucesso"). O `<input>` em si (com `aria-invalid`/`aria-describedby`
 * ligados a `errorId`) é responsabilidade do chamador — este wrapper só
 * garante a estrutura label→campo→erro.
 *
 * `tone="glass"` (v2 visual): cores claras para uso sobre o card navy
 * translúcido do Hero — label branco, hint em brand-50 suave e erro em
 * red-300 (o `text-alert` padrão é escuro demais sobre navy).
 *
 * `valid` (itens de conversão, 2026-07-20): check discreto ao lado do
 * label quando o campo foi tocado, preenchido e validado — feedback
 * positivo durante o preenchimento reduz abandono em formulários
 * multi-step (motion da spec, seção 30.2 "Form validação: ✓ scale-in").
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  tone = "light",
  valid = false,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  tone?: FormTone;
  valid?: boolean;
  children: ReactNode;
}) {
  const glass = tone === "glass";
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium",
          glass ? "text-white" : "text-neutral-900"
        )}
      >
        {label}
        {valid && !error && (
          <CircleCheck
            className={cn(
              "size-4 shrink-0 motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:fade-in motion-safe:duration-150",
              glass ? "text-emerald-300" : "text-emerald-600"
            )}
            aria-hidden="true"
          />
        )}
      </label>
      {children}
      {hint && !error && (
        <p className={cn("text-xs", glass ? "text-brand-50/60" : "text-neutral-500")}>{hint}</p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className={cn("text-xs font-medium", glass ? "text-red-300" : "text-alert")}
        >
          {error}
        </p>
      )}
    </div>
  );
}
