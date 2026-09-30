"use client";

import { useEffect, useRef, useState } from "react";

import { Hero } from "@/components/home/Hero";
import { CredBar } from "@/components/social/CredBar";
import { OfertasSuhai } from "@/components/suhai/OfertasSuhai";
import {
  CotacaoSuhaiForm,
  PREMISSAS_INICIAIS,
  type CotacaoSuhaiHandle,
  type PremissasSuhai,
} from "@/components/suhai/CotacaoSuhaiForm";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { TIPO_UTILIZACAO, UTILIZACAO_DUT } from "@/lib/suhai/dominio";
import type { CotacaoResultado, Oferta } from "@/lib/suhai/types";

const selectClasses =
  "flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30";

/**
 * Hero da cotação Suhai e, depois do cálculo, os planos logo abaixo.
 * A CredBar mobile fica entre os dois, como na home.
 */
export function CotacaoSuhaiBloco() {
  const formRef = useRef<CotacaoSuhaiHandle>(null);
  const [premissas, setPremissas] = useState<PremissasSuhai>(PREMISSAS_INICIAIS);
  const [categoria, setCategoria] = useState("auto");
  const [resultado, setResultado] = useState<CotacaoResultado | null>(null);
  const [cotadas, setCotadas] = useState<PremissasSuhai>(PREMISSAS_INICIAIS);
  const [ajustando, setAjustando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [escolhida, setEscolhida] = useState<Oferta | null>(null);

  useEffect(() => {
    if (!resultado) return;
    document.getElementById("preco-suhai")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [resultado]);

  const usos = Object.entries(UTILIZACAO_DUT).filter(([, definicao]) =>
    (definicao.categorias as readonly string[]).includes(categoria),
  );
  const usoAtual = UTILIZACAO_DUT[cotadas.utilizacao as keyof typeof UTILIZACAO_DUT];

  async function recalcular(proximas: PremissasSuhai) {
    setPremissas(proximas);
    setRecalculando(true);
    setEscolhida(null);
    try {
      await formRef.current?.recalcular(proximas);
    } finally {
      setRecalculando(false);
    }
  }

  return (
    <>
      <Hero
        ramoSlug="auto"
        partnerLogo={{
          src: "/logos/seguradoras/suhai.svg",
          alt: "Suhai Seguros",
          className: "h-14 w-auto md:h-16",
          semMoldura: true,
        }}
        eyebrow="Seguro contra roubo e furto"
        headline={"Veja o preço agora\nsem esperar retorno"}
        subheadline={"Três etapas curtas: placa, CEP e CPF.\nO plano você escolhe em seguida."}
        badge="Preço na hora · sem compromisso"
        form={
          <CotacaoSuhaiForm
            ref={formRef}
            premissas={premissas}
            onResultado={(cotacao, categoriaVeiculo, usadas) => {
              setCategoria(categoriaVeiculo);
              setCotadas(usadas);
              setResultado(cotacao);
              setEscolhida(null);
            }}
          />
        }
      />
      <div className="lg:hidden">
        <CredBar variant="complementar" omitirParceiras />
      </div>

      {resultado && (
        <Section id="preco-suhai" tone="soft" className="scroll-mt-28">
          <Container className="max-w-5xl">
            <p className="text-sm text-neutral-600">
              Premissas deste preço: {usoAtual?.rotulo ?? "Particular"},{" "}
              {cotadas.garagemResidencia ? "garagem na residência" : "sem garagem na residência"} e bônus{" "}
              {cotadas.classeBonus}.
            </p>
            <button
              type="button"
              className="mt-2 text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
              onClick={() => setAjustando((aberto) => !aberto)}
            >
              {ajustando ? "Fechar ajustes" : "Ajustar"}
            </button>

            {ajustando && (
              <div className="mt-4 grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-900">
                  Uso do veículo
                  <select
                    className={selectClasses}
                    value={premissas.utilizacao}
                    onChange={(event) => setPremissas((anterior) => ({ ...anterior, utilizacao: event.target.value }))}
                  >
                    {usos.map(([chave, definicao]) => (
                      <option key={chave} value={chave}>
                        {definicao.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
                {premissas.utilizacao === "particular" && (
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-900">
                    Finalidade principal
                    <select
                      className={selectClasses}
                      value={premissas.tipoUtilizacao}
                      onChange={(event) =>
                        setPremissas((anterior) => ({ ...anterior, tipoUtilizacao: event.target.value }))
                      }
                    >
                      <option value={TIPO_UTILIZACAO.trabalhoELazer}>Locomoção, trabalho e lazer</option>
                      <option value={TIPO_UTILIZACAO.atividadeProfissional}>Atividade profissional</option>
                      <option value={TIPO_UTILIZACAO.lazerExclusivo}>Somente lazer</option>
                    </select>
                  </label>
                )}
                <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-900">
                  Classe de bônus
                  <select
                    className={selectClasses}
                    value={premissas.classeBonus}
                    onChange={(event) => setPremissas((anterior) => ({ ...anterior, classeBonus: event.target.value }))}
                  >
                    {Array.from({ length: 11 }, (_, indice) => (
                      <option key={indice} value={indice}>
                        {indice === 0 ? "0 — primeiro seguro" : indice}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="flex flex-col gap-2 sm:col-span-2">
                  <legend className="text-sm font-medium text-neutral-900">Onde o veículo fica guardado</legend>
                  {(
                    [
                      ["garagemResidencia", "Garagem ou estacionamento fechado em casa"],
                      ["garagemTrabalho", "Garagem ou estacionamento fechado no trabalho"],
                      ["garagemEscola", "Garagem ou estacionamento fechado na escola ou faculdade"],
                    ] as const
                  ).map(([chave, rotulo]) => (
                    <label key={chave} className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-neutral-300 text-brand-500"
                        checked={premissas[chave]}
                        onChange={(event) =>
                          setPremissas((anterior) => ({ ...anterior, [chave]: event.target.checked }))
                        }
                      />
                      {rotulo}
                    </label>
                  ))}
                </fieldset>
                <Button className="sm:col-span-2 sm:w-fit" loading={recalculando} onClick={() => void recalcular(premissas)}>
                  Recalcular
                </Button>
              </div>
            )}

            <div className="mt-8">
              <OfertasSuhai resultado={resultado} onEscolher={setEscolhida} />
              {escolhida && (
                <p role="status" className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  Plano selecionado. A transmissão da proposta entra na próxima fase.
                </p>
              )}
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
