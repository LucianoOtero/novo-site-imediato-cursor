import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input — primitive de campo de texto (introduzido na Issue 11, junto do
 * LeadForm, que é o primeiro consumidor). Segue o mesmo padrão dos demais
 * primitives do Design System (Issue 08): altura mínima de 44px (seção
 * 14), foco visível, e estado `aria-invalid` estilizado para erros de
 * validação.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none",
        "placeholder:text-neutral-400",
        "transition-colors duration-[var(--dur-fast)]",
        "focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30",
        "aria-invalid:border-alert aria-invalid:focus-visible:ring-alert/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});

export { Input };
