"use client";

import { useMemo, useState } from "react";

import { OfertaCard } from "@/components/quote/OfertaCard";
import { Button } from "@/components/ui/button";
import { fromSuhaiOferta } from "@/lib/quote/oferta";
import { cn } from "@/lib/utils";
import { ROTULO_ASSISTENCIA, type PlanoAssistencia } from "@/lib/suhai/dominio";
import { PLANOS } from "@/lib/suhai/planos";
import type { CotacaoResultado, Oferta } from "@/lib/suhai/types";

/**
 * OfertasSuhai — tela de preços do fluxo `/cotacao-suhai`.
 *
 * Cada cotação Suhai devolve os combos de um nível de assistência (sem
 * informar, o de 200 km). Aqui eles viram três planos nomeados, e a
 * assistência é um seletor: o nível que ainda não veio é cotado no clique,
 * com protocolo próprio.
 */

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const NIVEIS: PlanoAssistencia[] = [1, 2, 0];

export function OfertasSuhai({
  resultado,
  onEscolher,
  onPedirAssistencia,
}: {
  resultado: CotacaoResultado;
  onEscolher?: (oferta: Oferta) => void;
  onPedirAssistencia?: (nivel: PlanoAssistencia) => Promise<void>;
}) {
  const [assistencia, setAssistencia] = useState<PlanoAssistencia>(1);
  const [carregando, setCarregando] = useState<PlanoAssistencia | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const porPlano = useMemo(() => {
    const mapa = new Map<string, Oferta>();
    for (const oferta of resultado.ofertas) {
      if (oferta.assistencia === assistencia) mapa.set(oferta.planoId, oferta);
    }
    return mapa;
  }, [resultado.ofertas, assistencia]);

  const protocolo = porPlano.values().next().value?.protocolo ?? resultado.protocolo;

  async function trocarAssistencia(nivel: PlanoAssistencia) {
    if (carregando !== null) return;
    setAssistencia(nivel);
    setErro(null);
    const jaCotado = resultado.ofertas.some((oferta) => oferta.assistencia === nivel);
    if (jaCotado || !onPedirAssistencia) return;
    setCarregando(nivel);
    try {
      await onPedirAssistencia(nivel);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível calcular agora.");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {resultado.simulado && (
        <p role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Valores simulados para desenvolvimento — a integração com a Suhai ainda não está ativa.
        </p>
      )}

      <div>
        <h2 className="font-display text-2xl font-bold text-neutral-900">
          {resultado.veiculo.marca} {resultado.veiculo.modelo} {resultado.veiculo.anoModelo}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Protocolo {protocolo}
          {resultado.veiculo.valorFipe ? ` · valor de referência ${moeda.format(resultado.veiculo.valorFipe)}` : ""}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-neutral-900">Assistência 24 horas</legend>
        <div className="flex flex-wrap gap-2">
          {NIVEIS.map((nivel) => (
            <button
              key={nivel}
              type="button"
              onClick={() => void trocarAssistencia(nivel)}
              disabled={carregando !== null}
              aria-pressed={assistencia === nivel}
              className={cn(
                "rounded-lg border px-4 py-2 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                assistencia === nivel
                  ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
              )}
            >
              {ROTULO_ASSISTENCIA[nivel]}
            </button>
          ))}
        </div>
      </fieldset>

      {carregando === assistencia && (
        <p role="status" className="text-sm text-neutral-600">
          Calculando o preço com {ROTULO_ASSISTENCIA[assistencia].toLowerCase()}…
        </p>
      )}
      {erro && carregando === null && porPlano.size === 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {erro}
          <button
            type="button"
            className="font-medium underline underline-offset-2"
            onClick={() => void trocarAssistencia(assistencia)}
          >
            Tentar de novo
          </button>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-3">
        {PLANOS.map((plano) => {
          const oferta = porPlano.get(plano.id);
          if (!oferta) return null;

          return (
            <OfertaCard
              key={plano.id}
              as="li"
              oferta={fromSuhaiOferta(plano, oferta)}
              acao={
                <Button
                  fullWidth
                  variant={plano.destaque ? "primary" : "secondary"}
                  onClick={() => onEscolher?.(oferta)}
                >
                  Contratar {plano.nome}
                </Button>
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
