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
import { faixaPremio, trackSuhai } from "@/lib/suhai/analytics";
import {
  GARAGEM_RESIDENCIA,
  GARAGEM_USO,
  TIPO_UTILIZACAO,
  UTILIZACAO_DUT,
  type GaragemResidencia,
  type GaragemUso,
  type PlanoAssistencia,
} from "@/lib/suhai/dominio";
import type { CotacaoResultado, Oferta } from "@/lib/suhai/types";

const selectClasses =
  "flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30";

/** Caminhão e van respondem só à pergunta 4 da Suhai; carro e moto, às perguntas 1 a 3. */
function ehCargaOuVan(categoria: string) {
  return categoria === "caminhao" || categoria === "van";
}

function textoGaragem(premissas: PremissasSuhai, categoria: string) {
  if (ehCargaOuVan(categoria)) {
    return premissas.garagemPatio ? "guardado em garagem fora de serviço" : "sem garagem fora de serviço";
  }
  const partes = [GARAGEM_RESIDENCIA[premissas.garagemResidencia].rotulo.toLowerCase()];
  if (premissas.garagemTrabalho !== "naoUsa") partes.push(`trabalho: ${GARAGEM_USO[premissas.garagemTrabalho].rotulo.toLowerCase()}`);
  if (premissas.garagemEscola !== "naoUsa") partes.push(`escola: ${GARAGEM_USO[premissas.garagemEscola].rotulo.toLowerCase()}`);
  return partes.join(", ");
}

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
  /** Até onde o cliente chegou depois do preço; `null` = ainda sem preço ou proposta já transmitida. */
  const estagioRef = useRef<"price" | "plan" | "proposal_form" | null>(null);

  useEffect(() => {
    let emitido = false;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const emitir = (reason: "pagehide" | "hidden") => {
      const stage = estagioRef.current;
      if (emitido || !stage) return;
      emitido = true;
      trackSuhai("suhai_offer_abandon", { stage, reason });
    };
    const aoSair = () => emitir("pagehide");
    const aoOcultar = () => {
      if (espera) clearTimeout(espera);
      espera = document.visibilityState === "hidden" ? setTimeout(() => emitir("hidden"), 400) : null;
    };
    window.addEventListener("pagehide", aoSair);
    document.addEventListener("visibilitychange", aoOcultar);
    return () => {
      window.removeEventListener("pagehide", aoSair);
      document.removeEventListener("visibilitychange", aoOcultar);
      if (espera) clearTimeout(espera);
    };
  }, []);

  // O formulário da proposta abre abaixo dos cards, fora da tela: sem rolar, o clique parece não fazer nada.
  useEffect(() => {
    if (cliquesContratar === 0) return;
    document.getElementById("proposta-suhai")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("proposta-email")?.focus({ preventScroll: true });
  }, [cliquesContratar]);

  function escolher(oferta: Oferta) {
    setEscolhida(oferta);
    setCliquesContratar((total) => total + 1);
    if (estagioRef.current === "price") estagioRef.current = "plan";
    trackSuhai("suhai_plan_select", {
      plan: oferta.planoId,
      assist: oferta.assistencia,
      premium_band: faixaPremio(oferta.premioTotal),
    });
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
        if (estagioRef.current === null) estagioRef.current = "price";
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
              {textoGaragem(cotadas, categoria)} e bônus{" "}
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
                {ehCargaOuVan(categoria) ? (
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-900 sm:col-span-2">
                    Guarda o veículo em garagem ou estacionamento quando não está em serviço?
                    <select
                      className={selectClasses}
                      value={premissas.garagemPatio ? "sim" : "nao"}
                      onChange={(event) =>
                        setPremissas((anterior) => ({ ...anterior, garagemPatio: event.target.value === "sim" }))
                      }
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-900">
                      Em casa, à noite
                      <select
                        className={selectClasses}
                        value={premissas.garagemResidencia}
                        onChange={(event) =>
                          setPremissas((anterior) => ({
                            ...anterior,
                            garagemResidencia: event.target.value as GaragemResidencia,
                          }))
                        }
                      >
                        {Object.entries(GARAGEM_RESIDENCIA).map(([chave, opcao]) => (
                          <option key={chave} value={chave}>
                            {opcao.rotulo}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(
                      [
                        ["garagemTrabalho", "Ida ao trabalho"],
                        ["garagemEscola", "Ida à escola ou faculdade"],
                      ] as const
                    ).map(([chave, rotulo]) => (
                      <label key={chave} className="flex flex-col gap-1.5 text-sm font-medium text-neutral-900">
                        {rotulo}
                        <select
                          className={selectClasses}
                          value={premissas[chave]}
                          onChange={(event) =>
                            setPremissas((anterior) => ({ ...anterior, [chave]: event.target.value as GaragemUso }))
                          }
                        >
                          {Object.entries(GARAGEM_USO).map(([codigo, opcao]) => (
                            <option key={codigo} value={codigo}>
                              {opcao.rotulo}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </>
                )}
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
                  <PropostaSuhaiForm
                    protocolo={escolhida.protocolo}
                    oferta={escolhida}
                    veiculo={resultado.veiculo}
                    contexto={contexto}
                    onInicio={() => {
                      if (estagioRef.current) estagioRef.current = "proposal_form";
                    }}
                    onEnviada={() => {
                      estagioRef.current = null;
                    }}
                  />
                )}
              </div>
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
