"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { OfertasSuhai } from "@/components/suhai/OfertasSuhai";
import { PropostaSuhaiForm, type ContextoProposta } from "@/components/suhai/PropostaSuhaiForm";
import {
  CotacaoSuhaiForm,
  PREMISSAS_INICIAIS,
  type CotacaoSuhaiHandle,
  type PremissasSuhai,
} from "@/components/suhai/CotacaoSuhaiForm";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { postLead } from "@/lib/leads/post-lead";
import { TIPO_UTILIZACAO, UTILIZACAO_DUT, type PlanoAssistencia } from "@/lib/suhai/dominio";
import type { CotacaoResultado, Oferta } from "@/lib/suhai/types";

const selectClasses =
  "flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30";

/**
 * Formulário, preço e premissas da cotação Suhai.
 * O cabeçalho em volta do formulário muda por página; o cálculo não.
 */
export function CotacaoSuhaiExperiencia({
  cabecalho,
}: {
  cabecalho: (formulario: ReactNode) => ReactNode;
}) {
  const formRef = useRef<CotacaoSuhaiHandle>(null);
  const [premissas, setPremissas] = useState<PremissasSuhai>(PREMISSAS_INICIAIS);
  const [categoria, setCategoria] = useState("auto");
  const [resultado, setResultado] = useState<CotacaoResultado | null>(null);
  const [cotadas, setCotadas] = useState<PremissasSuhai>(PREMISSAS_INICIAIS);
  const [ajustando, setAjustando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [escolhida, setEscolhida] = useState<Oferta | null>(null);
  const [cliquesContratar, setCliquesContratar] = useState(0);
  const [contexto, setContexto] = useState<ContextoProposta>({ placa: "", cep: "", nome: "", ddd: "", celular: "" });
  const planoEnviadoRef = useRef<string>("");

  // O formulário da proposta abre abaixo dos cards, fora da tela: sem rolar, o clique parece não fazer nada.
  useEffect(() => {
    if (cliquesContratar === 0) return;
    document.getElementById("proposta-suhai")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("proposta-email")?.focus({ preventScroll: true });
  }, [cliquesContratar]);

  function escolher(oferta: Oferta) {
    setEscolhida(oferta);
    setCliquesContratar((total) => total + 1);
    if (!resultado || resultado.simulado || !contexto.leadId) return;
    const chave = `${oferta.protocolo}:${oferta.cdCobertura}`;
    if (planoEnviadoRef.current === chave) return;
    planoEnviadoRef.current = chave;
    void postLead({
      ramo: "auto",
      ddd: contexto.ddd,
      celular: contexto.celular,
      stage: "suhai_plan_selected",
      captureChannel: "suhai_form",
      leadId: contexto.leadId,
      suhaiCdCobertura: oferta.cdCobertura,
    }).catch((error) => console.error("[CotacaoSuhaiExperiencia] Falha ao registrar o plano (não bloqueante):", error));
  }

  // Só uma cotação nova rola até o preço; somar outro nível de assistência não.
  const protocoloBase = resultado?.protocolo;
  useEffect(() => {
    if (!protocoloBase) return;
    document.getElementById("preco-suhai")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [protocoloBase]);

  const usos = Object.entries(UTILIZACAO_DUT).filter(([, definicao]) =>
    (definicao.categorias as readonly string[]).includes(categoria),
  );
  const usoAtual = UTILIZACAO_DUT[cotadas.utilizacao as keyof typeof UTILIZACAO_DUT];

  async function pedirAssistencia(nivel: PlanoAssistencia) {
    const base = resultado?.protocolo;
    const extra = await formRef.current?.cotarAssistencia(cotadas, nivel);
    if (!extra) return;
    // Um recálculo no meio do caminho troca a cotação base; o nível pedido
    // antes dele tem outras premissas e é descartado.
    setResultado((atual) =>
      atual && atual.protocolo === base
        ? { ...atual, ofertas: [...atual.ofertas.filter((oferta) => oferta.assistencia !== nivel), ...extra.ofertas] }
        : atual,
    );
  }

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

  const formulario = (
    <CotacaoSuhaiForm
      ref={formRef}
      premissas={premissas}
      onResultado={(cotacao, categoriaVeiculo, usadas, origem) => {
        setCategoria(categoriaVeiculo);
        setCotadas(usadas);
        setResultado(cotacao);
        setContexto(origem);
        setEscolhida(null);
      }}
    />
  );

  return (
    <>
      {cabecalho(formulario)}
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
              <OfertasSuhai
                key={resultado.protocolo}
                resultado={resultado}
                escolhida={escolhida}
                onEscolher={escolher}
                onPedirAssistencia={pedirAssistencia}
              />
              <div id="proposta-suhai" className="scroll-mt-28">
                {escolhida && resultado.simulado && (
                  <p role="status" className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
                    Plano selecionado. A transmissão da proposta só abre com uma cotação real da Suhai.
                  </p>
                )}
                {escolhida && !resultado.simulado && (
                  <PropostaSuhaiForm protocolo={escolhida.protocolo} oferta={escolhida} contexto={contexto} />
                )}
              </div>
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
