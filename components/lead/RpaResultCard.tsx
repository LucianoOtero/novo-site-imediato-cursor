import { CheckCircle2, Shield, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RpaPlano } from "@/lib/rpa-calculation";

/**
 * RpaResultCard — 1 cartão de plano de cotação (projeto 2026-07-16,
 * "etapa de decisão RPA no formulário"). Réplica dos campos exibidos nos
 * cartões `Recomendado`/`Alternativo` do site legado
 * (`webflow_injection_limpo.js`, classe `ProgressModalRPA.updateCardDetails`
 * — só consultado como referência, nunca alterado), com o visual do
 * Design System deste projeto (sem CSS/cores do legado).
 *
 * Redesign 2026-07-20 (pedido do cliente: "apresentação mais fluida,
 * alinhada e elegante"):
 * - Preço vira o herói do cartão (Manrope 800 + `tabular-nums`, DNA da
 *   marca "numeral em destaque"), com o parcelamento como legenda.
 * - `formaPagamento` (texto longo, gancho comercial "4x sem juros!") sai
 *   da lista de linhas e vira uma faixa destacada de largura total —
 *   eliminava-se assim a pior quebra de linha do layout anterior.
 * - Linhas de detalhe em grid `[auto_1fr]`: label nunca quebra; valor
 *   alinhado à direita com `tabular-nums`. O MESMO conjunto de linhas é
 *   renderizado nos dois cartões (fallback "—"), mantendo-os alinhados
 *   horizontalmente quando lado a lado.
 * - Coberturas como chips arredondados.
 */
export interface RpaResultCardProps {
  variant: "recomendado" | "alternativo";
  plano?: RpaPlano;
}

/** Linhas de detalhe (valores curtos). `formaPagamento` fica na faixa destacada; `parcelamento` na legenda do preço. */
const DETAIL_ROWS: { key: keyof RpaPlano; label: string }[] = [
  { key: "valorMercado", label: "Valor de mercado" },
  { key: "valorFranquia", label: "Franquia" },
  { key: "tipoFranquia", label: "Tipo de franquia" },
  { key: "danosMateriais", label: "Danos materiais" },
  { key: "danosCorporais", label: "Danos corporais" },
  { key: "danosMorais", label: "Danos morais" },
  { key: "morteInvalidez", label: "Morte e invalidez" },
];

const COVERAGE_FLAGS: { key: keyof RpaPlano; label: string }[] = [
  { key: "assistencia", label: "Assistência 24h" },
  { key: "vidros", label: "Vidros" },
  { key: "carroReserva", label: "Carro reserva" },
];

/**
 * Separa o prefixo monetário do número ("R$2.360,18" → ["R$", "2.360,18"])
 * para exibir o "R$" menor ao lado do numeral grande. O backend envia com e
 * sem espaço após "R$" — normalizamos aqui, só para exibição.
 */
function splitCurrency(valor: string): { prefix: string | null; amount: string } {
  const match = valor.match(/^\s*(R\$)\s*(.+)$/);
  if (match) return { prefix: match[1], amount: match[2] };
  return { prefix: null, amount: valor };
}

export function RpaResultCard({ variant, plano }: RpaResultCardProps) {
  const isRecomendado = variant === "recomendado";
  const BadgeIcon = isRecomendado ? Star : Shield;
  const price = plano?.valor ? splitCurrency(plano.valor) : null;

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 rounded-xl p-4",
        isRecomendado ? "border-2 border-brand-500 bg-brand-50/40" : "border border-neutral-200 bg-white"
      )}
    >
      <div className="flex flex-col gap-2">
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
            isRecomendado ? "bg-brand-500 text-white" : "border border-neutral-200 bg-neutral-50 text-neutral-600"
          )}
        >
          <BadgeIcon className="size-3.5" aria-hidden="true" />
          {isRecomendado ? "Recomendado" : "Alternativo"}
        </span>

        {price && (
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            {price.prefix && <span className="text-sm font-semibold text-neutral-500">{price.prefix}</span>}
            <span className="font-display text-3xl font-extrabold tracking-tight text-neutral-900 tabular-nums">
              {price.amount}
            </span>
            {plano?.parcelamento && <span className="text-sm text-neutral-500">/ {plano.parcelamento}</span>}
          </p>
        )}
      </div>

      {plano?.formaPagamento && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">{plano.formaPagamento}</p>
      )}

      <dl className="divide-y divide-neutral-100">
        {DETAIL_ROWS.map((row) => {
          const value = plano?.[row.key];
          return (
            <div key={row.key} className="grid grid-cols-[auto_1fr] items-baseline gap-3 py-1.5 text-sm">
              <dt className="whitespace-nowrap text-neutral-500">{row.label}</dt>
              <dd className="text-right font-medium text-neutral-900 tabular-nums">
                {value ? String(value) : <span aria-hidden="true">—</span>}
              </dd>
            </div>
          );
        })}
      </dl>

      {COVERAGE_FLAGS.some((flag) => plano?.[flag.key]) && (
        <ul className="mt-auto flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3">
          {COVERAGE_FLAGS.filter((flag) => plano?.[flag.key]).map((flag) => (
            <li
              key={flag.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700"
            >
              <CheckCircle2 className="size-3.5 text-brand-500" aria-hidden="true" />
              {flag.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
