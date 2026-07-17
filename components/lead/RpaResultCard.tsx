import { CheckCircle2, Shield, Star } from "lucide-react";

import type { RpaPlano } from "@/lib/rpa-calculation";

/**
 * RpaResultCard — 1 cartão de plano de cotação (projeto 2026-07-16,
 * "etapa de decisão RPA no formulário"). Réplica dos campos exibidos nos
 * cartões `Recomendado`/`Alternativo` do site legado
 * (`webflow_injection_limpo.js`, classe `ProgressModalRPA.updateCardDetails`
 * — só consultado como referência, nunca alterado), com o visual do
 * Design System deste projeto (sem CSS/cores do legado).
 */
export interface RpaResultCardProps {
  variant: "recomendado" | "alternativo";
  plano?: RpaPlano;
}

const FEATURE_LABELS: { key: keyof RpaPlano; label: string }[] = [
  { key: "formaPagamento", label: "Forma de pagamento" },
  { key: "parcelamento", label: "Parcelamento" },
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

export function RpaResultCard({ variant, plano }: RpaResultCardProps) {
  const isRecomendado = variant === "recomendado";
  const Icon = isRecomendado ? Star : Shield;

  return (
    <div
      className={
        isRecomendado
          ? "flex flex-col gap-3 rounded-xl border-2 border-brand-500 bg-brand-50/40 p-4"
          : "flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-1.5 text-sm font-semibold ${isRecomendado ? "text-brand-700" : "text-neutral-700"}`}>
          <Icon className="size-4" aria-hidden="true" />
          {isRecomendado ? "Recomendado" : "Alternativo"}
        </span>
        {plano?.valor && <span className="font-display text-lg font-bold text-neutral-900">{plano.valor}</span>}
      </div>

      <dl className="flex flex-col gap-1.5">
        {FEATURE_LABELS.filter((feature) => plano?.[feature.key]).map((feature) => (
          <div key={feature.key} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-neutral-500">{feature.label}</dt>
            <dd className="font-medium text-neutral-900">{String(plano?.[feature.key])}</dd>
          </div>
        ))}
      </dl>

      {COVERAGE_FLAGS.some((flag) => plano?.[flag.key]) && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-2.5">
          {COVERAGE_FLAGS.filter((flag) => plano?.[flag.key]).map((flag) => (
            <li key={flag.key} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <CheckCircle2 className="size-3.5 text-brand-500" aria-hidden="true" />
              {flag.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
