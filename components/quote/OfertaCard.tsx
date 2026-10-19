import type { ReactNode } from "react";
import { Check, ShieldCheck, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROTULO_SELO, type OfertaExibicao } from "@/lib/quote/oferta";

/**
 * OfertaCard — cartão único de oferta de seguro, no visual da tela de
 * preços da Suhai. Usado por `OfertasSuhai` (`/cotacao-suhai`) e pelo
 * resultado do RPA (`RpaCalculationScreen`). Os dados chegam já
 * normalizados por `fromSuhaiOferta`/`fromRpaPlano`; campo ausente não
 * aparece.
 */
export interface OfertaCardProps {
  oferta: OfertaExibicao;
  /** Botão de largura total no rodapé do cartão. */
  acao?: ReactNode;
  as?: "li" | "div";
  className?: string;
}

export function OfertaCard({ oferta, acao, as: Tag = "div", className }: OfertaCardProps) {
  const SeloIcon = oferta.selo === "recomendado" ? Star : ShieldCheck;

  return (
    <Tag
      data-oferta-id={oferta.id}
      className={cn(
        "flex flex-col rounded-xl border bg-white p-5 shadow-sm",
        oferta.destaque ? "border-brand-500 ring-1 ring-brand-500" : "border-neutral-200",
        className,
      )}
    >
      {oferta.selo && (
        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
          <SeloIcon className="size-3.5" aria-hidden="true" />
          {ROTULO_SELO[oferta.selo]}
        </span>
      )}

      {oferta.seguradora && (
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{oferta.seguradora}</p>
      )}
      <h3 className="font-display text-lg font-bold text-neutral-900">{oferta.nome}</h3>
      {oferta.resumo && <p className="mt-1 text-sm text-neutral-500">{oferta.resumo}</p>}

      {oferta.preco && (
        <p className="mt-4">
          {oferta.preco.prefixo && (
            <span className="mr-1 text-sm font-semibold text-neutral-500">{oferta.preco.prefixo}</span>
          )}
          <span data-oferta-preco className="text-3xl font-bold text-neutral-900 tabular-nums">
            {oferta.preco.valor}
          </span>
          {oferta.preco.sufixo && <span className="text-sm text-neutral-500"> {oferta.preco.sufixo}</span>}
        </p>
      )}
      {oferta.legenda && <p className="text-xs text-neutral-500">{oferta.legenda}</p>}

      {oferta.faixaPagamento && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          {oferta.faixaPagamento}
        </p>
      )}

      {oferta.detalhes.length > 0 && (
        <dl className="mt-4 divide-y divide-neutral-100">
          {oferta.detalhes.map((detalhe) => (
            <div key={detalhe.rotulo} className="grid grid-cols-[auto_1fr] items-baseline gap-3 py-1.5 text-sm">
              <dt className="whitespace-nowrap text-neutral-500">{detalhe.rotulo}</dt>
              <dd className="text-right font-medium text-neutral-900 tabular-nums">{detalhe.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {oferta.coberturas.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 text-sm text-neutral-700">
          {oferta.coberturas.map((cobertura) => (
            <li
              key={cobertura.texto}
              className={cn("flex items-start gap-2", cobertura.tom === "informativa" && "text-neutral-500")}
            >
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  cobertura.tom === "informativa" ? "text-neutral-300" : "text-emerald-600",
                )}
                aria-hidden="true"
              />
              {cobertura.texto}
            </li>
          ))}
        </ul>
      )}

      {acao && <div className="mt-auto pt-5">{acao}</div>}
    </Tag>
  );
}
