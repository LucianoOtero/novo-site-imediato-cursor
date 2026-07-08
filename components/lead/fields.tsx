import type { ReactNode } from "react";

/**
 * Field — wrapper de label/erro para os campos do LeadForm (Issue 11).
 * Fonte: ESPECIFICACAO v3.md, seção 21.1 ("a11y: <label> ligado,
 * aria-invalid, aria-describedby, foco ao 1º inválido, role=status no
 * sucesso"). O `<input>` em si (com `aria-invalid`/`aria-describedby`
 * ligados a `errorId`) é responsabilidade do chamador — este wrapper só
 * garante a estrutura label→campo→erro.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-900">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
