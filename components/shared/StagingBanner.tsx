import { AlertTriangle } from "lucide-react";

import { appEnvironment, isProduction } from "@/lib/env";

/**
 * StagingBanner — aviso de ambiente não-produção (Issue 23A).
 * Fonte: PLANO_IMPLEMENTACAO.md, Issue 23A ("banner visual discreto
 * 'Ambiente de homologação'... visível só fora de produção; produção
 * não mostra banner").
 *
 * Server Component simples (sem interatividade) — `isProduction` já é
 * resolvido no servidor a partir de `VERCEL_ENV`/`NEXT_PUBLIC_APP_ENV`
 * (`lib/env.ts`, Issue 03A), então não há risco de "vazar" em produção
 * por um cálculo incorreto no client.
 *
 * Cor âmbar (não a cor de alerta `--color-alert`, usada em erros de
 * formulário e estados pontuais — sem banner global vermelho desde
 * 2026-08-30) — discreto, não é um erro nem uma urgência para o
 * visitante, é um aviso operacional interno.
 */
export function StagingBanner() {
  if (isProduction) return null;

  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-400 px-3 py-1 text-center text-[0.65rem] font-semibold leading-snug text-amber-950 sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs">
      <AlertTriangle className="size-3 shrink-0 sm:size-3.5" aria-hidden="true" />
      <span className="line-clamp-2 sm:line-clamp-none">
        Ambiente de homologação ({appEnvironment}) — não indexável, não usar em campanhas
      </span>
    </div>
  );
}
