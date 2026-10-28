"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { EnderecoCepDisplay } from "@/components/lead/EnderecoCepDisplay";
import { Field } from "@/components/lead/fields";
import { ProgressBar } from "@/components/lead/ProgressBar";
import { VehicleInfoDisplay } from "@/components/lead/VehicleInfoDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TelefoneInput } from "@/components/ui/telefone-input";
import { ESTADO_CIVIL, SEXO, TIPO_CONTRATACAO, type PlanoAssistencia } from "@/lib/suhai/dominio";
import { trackEvent } from "@/lib/analytics";
import { getAttributionUtm } from "@/lib/leads/attribution";
import { postLead } from "@/lib/leads/post-lead";
import type { OpcaoVeiculo } from "@/lib/suhai/veiculo-placa";
import type { ContextoProposta } from "@/components/suhai/PropostaSuhaiForm";
import type { CotacaoResultado } from "@/lib/suhai/types";
import { cn } from "@/lib/utils";
import {
  formatCep,
  formatCpf,
  formatPlacaMascara,
  formatTelefone,
  isValidCpf,
  isValidPlacaFormat,
  onlyDigits,
} from "@/lib/validators";

/**
 * Card da cotação Suhai no mesmo frost do LeadForm inline.
 * Quatro etapas: celular, placa, CEP de pernoite, nome e CPF. Uso, garagem
 * e bônus não aparecem aqui — entram como premissas depois do preço.
 *
 * Mesmo pipeline de leads do LeadForm: o celular cria o lead (`initial`),
 * cada etapa seguinte atualiza (`progress`) e a cotação leva o `leadId`
 * para o servidor registrar protocolo e ofertas no CRM.
 */

const FROST_CARD_CLASS =
  "border-white/50 bg-white/95 supports-[backdrop-filter]:bg-white/85 backdrop-blur-md shadow-2xl";

const ETAPAS = [
  { rotulo: "Celular", subtitulo: "Para enviar o seu preço pelo WhatsApp e seguir a cotação." },
  { rotulo: "Placa", subtitulo: "A placa identifica o veículo e já adianta marca, modelo e ano." },
  { rotulo: "CEP", subtitulo: "O CEP de onde o carro dorme muda o preço." },
  { rotulo: "Seus dados", subtitulo: "Nome e CPF fecham o cálculo. O restante a gente completa para você." },
] as const;

const CTAS = ["Começar", "Continuar", "Falta pouco", "Ver meu preço"] as const;

type Etapa = 1 | 2 | 3 | 4;

const selectClasses =
  "flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30";

export type PremissasSuhai = {
  utilizacao: string;
  tipoUtilizacao: string;
  garagemResidencia: boolean;
  garagemTrabalho: boolean;
  garagemEscola: boolean;
  classeBonus: string;
};

export const PREMISSAS_INICIAIS: PremissasSuhai = {
  utilizacao: "particular",
  tipoUtilizacao: "1",
  garagemResidencia: true,
  garagemTrabalho: false,
  garagemEscola: false,
  classeBonus: "0",
};

type Estado = {
  ddd: string;
  celular: string;
  semPlaca: boolean;
  placa: string;
  categoria: string;
  marca: string;
  modelo: string;
  anoModelo: string;
  anoFabricacao: string;
  codFipe: string;
  opcoes: OpcaoVeiculo[];
  cepPernoite: string;
  enderecoLinha: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  estadoCivil: string;
  perfilPronto: boolean;
  perfilManual: boolean;
};

const INICIAL: Estado = {
  ddd: "",
  celular: "",
  semPlaca: false,
  placa: "",
  categoria: "auto",
  marca: "",
  modelo: "",
  anoModelo: "",
  anoFabricacao: "",
  codFipe: "",
  opcoes: [],
  cepPernoite: "",
  enderecoLinha: "",
  nome: "",
  cpf: "",
  dataNascimento: "",
  sexo: String(SEXO.masculino),
  estadoCivil: String(ESTADO_CIVIL.solteiro),
  perfilPronto: false,
  perfilManual: false,
};

export type CotacaoSuhaiHandle = {
  recalcular: (premissas: PremissasSuhai) => Promise<void>;
  cotarAssistencia: (premissas: PremissasSuhai, nivel: PlanoAssistencia) => Promise<CotacaoResultado>;
};

type Props = {
  premissas: PremissasSuhai;
  onResultado: (
    resultado: CotacaoResultado,
    categoria: string,
    usadas: PremissasSuhai,
    contexto: ContextoProposta,
  ) => void;
};

export const CotacaoSuhaiForm = forwardRef<CotacaoSuhaiHandle, Props>(function CotacaoSuhaiForm(
  { premissas, onResultado },
  ref,
) {
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [estado, setEstado] = useState<Estado>(INICIAL);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [consultando, setConsultando] = useState<"placa" | "cpf" | null>(null);
  const [avancando, setAvancando] = useState(false);
  const avancandoRef = useRef(false);
  const [demorando, setDemorando] = useState(false);
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const consultaAtivaRef = useRef(0);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const premissasRef = useRef(premissas);
  premissasRef.current = premissas;
  const cepConsultaRef = useRef(0);
  const etapaRef = useRef(etapa);
  etapaRef.current = etapa;
  const comecouRef = useRef(false);
  const precoEmitidoRef = useRef(false);
  const abandonouRef = useRef(false);
  const efeitoAbandonoRef = useRef(0);
  const leadIdRef = useRef<string | undefined>(undefined);
  const contatoInicialRef = useRef<Promise<void> | null>(null);
  const telefoneEnviadoRef = useRef("");
  const consultaPlacaRef = useRef<{ placa: string; resultado: ReturnType<typeof consultarPlaca> } | null>(null);
  const consultaCpfRef = useRef<{ cpf: string; resultado: ReturnType<typeof consultarPerfil> } | null>(null);

  useEffect(() => {
    if (!consultando) return;
    const espera = setTimeout(() => setDemorando(true), 8000);
    return () => {
      clearTimeout(espera);
      setDemorando(false);
    };
  }, [consultando]);

  /** Mantém o aviso "Consultando…" enquanto a consulta mais recente não volta. */
  function acompanharConsulta<T>(tipo: "placa" | "cpf", promessa: Promise<T>): Promise<T> {
    const consulta = ++consultaAtivaRef.current;
    setConsultando(tipo);
    return promessa.finally(() => {
      if (consultaAtivaRef.current === consulta) setConsultando(null);
    });
  }

  function tocar(campo: string) {
    setTocados((anterior) => (anterior[campo] ? anterior : { ...anterior, [campo]: true }));
  }

  /**
   * Campos do lead já conhecidos — cada `progress` reenvia tudo, como o
   * LeadForm. Nome e CPF chegam ao CRM pela cotação: o servidor grava os
   * dados da etapa 4 junto com o protocolo, sem disputar a ordem com ela.
   */
  function dadosLead(atual: Estado) {
    const placa = atual.semPlaca ? undefined : atual.placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase() || undefined;
    const cep = onlyDigits(atual.cepPernoite);
    const cpf = onlyDigits(atual.cpf);
    return {
      ramo: "auto",
      ddd: onlyDigits(atual.ddd),
      celular: onlyDigits(atual.celular),
      captureChannel: "suhai_form",
      placa,
      veiculoMarca: atual.marca || undefined,
      veiculoModelo: atual.modelo || undefined,
      veiculoAnoFabricacao: atual.anoFabricacao || undefined,
      veiculoAnoModelo: atual.anoModelo || undefined,
      veiculoMarcaModelo: [atual.marca, atual.modelo].filter(Boolean).join(" ") || undefined,
      veiculoAno: atual.anoModelo || undefined,
      cep: cep.length === 8 ? cep : undefined,
      nome: atual.nome.trim().length >= 3 ? atual.nome.trim() : undefined,
      cpf: isValidCpf(cpf) ? cpf : undefined,
      utm: getAttributionUtm(),
    };
  }

  /** Cria o lead no CRM assim que o celular é confirmado. Não bloqueia a navegação. */
  function enviarContatoInicial(atual: Estado) {
    const telefone = `${onlyDigits(atual.ddd)}${onlyDigits(atual.celular)}`;
    if (telefoneEnviadoRef.current === telefone) return;
    telefoneEnviadoRef.current = telefone;
    leadIdRef.current = undefined;
    trackEvent("form_initial_contact", { ramo: "auto", method: "suhai" });
    contatoInicialRef.current = (async () => {
      try {
        const resposta = await postLead({
          ramo: "auto",
          ddd: onlyDigits(atual.ddd),
          celular: onlyDigits(atual.celular),
          stage: "initial",
          captureChannel: "suhai_form",
          utm: getAttributionUtm(),
        });
        const corpo = (await resposta.json().catch(() => null)) as { leadId?: string } | null;
        if (corpo?.leadId) leadIdRef.current = corpo.leadId;
      } catch (error) {
        console.error("[CotacaoSuhaiForm] Falha no contato inicial (não bloqueante):", error);
      }
    })();
  }

  /** Atualiza o lead ao concluir cada etapa. Best-effort, como no LeadForm. */
  async function enviarProgresso(atual: Estado, suhaiEtapa: "veiculo" | "cep") {
    try {
      await contatoInicialRef.current;
      await postLead({
        ...dadosLead(atual),
        stage: "progress",
        suhaiEtapa,
        leadId: leadIdRef.current,
      });
    } catch (error) {
      console.error("[CotacaoSuhaiForm] Falha na atualização de progresso (não bloqueante):", error);
    }
  }

  async function validarCelularApi(atual: Estado) {
    const ddd = onlyDigits(atual.ddd);
    const celular = onlyDigits(atual.celular);
    if (!/^\d{2}$/.test(ddd) || !/^9\d{8}$/.test(celular)) return;
    try {
      const resposta = await fetch("/api/validate/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ddd, celular }),
      });
      const corpo = (await resposta.json()) as { ok?: boolean };
      if (corpo.ok === false) {
        setErros((anterior) => ({
          ...anterior,
          celular: "Não conseguimos confirmar esse celular — revise ou prossiga assim mesmo",
        }));
      }
    } catch {
      // Best-effort — nunca bloqueia.
    }
  }

  function marcarInicio() {
    if (comecouRef.current) return;
    comecouRef.current = true;
    trackEvent("suhai_quote_start", { form_id: "cotacao_suhai" });
  }

  useEffect(() => {
    const efeito = ++efeitoAbandonoRef.current;
    let espera: ReturnType<typeof setTimeout> | null = null;

    const emitir = (reason: "pagehide" | "hidden" | "unmount") => {
      if (abandonouRef.current || !comecouRef.current || precoEmitidoRef.current) return;
      abandonouRef.current = true;
      trackEvent("suhai_quote_abandon", {
        form_id: "cotacao_suhai",
        last_step: etapaRef.current,
        reason,
      });
    };

    const aoSair = () => emitir("pagehide");
    const aoOcultar = () => {
      if (document.visibilityState !== "hidden") {
        if (espera) {
          clearTimeout(espera);
          espera = null;
        }
        return;
      }
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => emitir("hidden"), 400);
    };

    window.addEventListener("pagehide", aoSair);
    document.addEventListener("visibilitychange", aoOcultar);
    return () => {
      window.removeEventListener("pagehide", aoSair);
      document.removeEventListener("visibilitychange", aoOcultar);
      if (espera) clearTimeout(espera);
      queueMicrotask(() => {
        if (efeitoAbandonoRef.current !== efeito) return;
        emitir("unmount");
      });
    };
  }, []);

  function definir<K extends keyof Estado>(campo: K, valor: Estado[K]) {
    setEstado((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function consultarCep(valor: string) {
    const digits = onlyDigits(valor);
    if (digits.length !== 8) return;
    const consulta = ++cepConsultaRef.current;
    try {
      const resposta = await fetch("/api/validate/cep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cep: digits }),
      });
      const corpo = (await resposta.json()) as { ok?: boolean; linha?: string };
      if (consulta !== cepConsultaRef.current || onlyDigits(estadoRef.current.cepPernoite) !== digits) return;
      if (corpo.ok === false) {
        setEstado((anterior) => ({ ...anterior, enderecoLinha: "" }));
        setErros((anterior) => ({
          ...anterior,
          cep: "Não encontramos esse CEP — revise ou prossiga assim mesmo",
        }));
        return;
      }
      setErros((anterior) => ({ ...anterior, cep: "" }));
      setEstado((anterior) => ({ ...anterior, enderecoLinha: corpo.linha ?? "" }));
    } catch {
      // A consulta que falha não trava o formulário.
    }
  }

  /** Blur e "Continuar" pedem a mesma placa: reaproveita a consulta (falha libera nova tentativa). */
  function preencherPorPlaca(placaInformada?: string): ReturnType<typeof consultarPlaca> {
    const placa = (placaInformada ?? estadoRef.current.placa).replace(/[^A-Za-z0-9]/g, "");
    if (!isValidPlacaFormat(placa)) return Promise.resolve(null);
    const anterior = consultaPlacaRef.current;
    if (anterior?.placa === placa) return anterior.resultado;
    const resultado = acompanharConsulta("placa", consultarPlaca(placa)).then((patch) => {
      if (!patch && consultaPlacaRef.current?.resultado === resultado) consultaPlacaRef.current = null;
      return patch;
    });
    consultaPlacaRef.current = { placa, resultado };
    return resultado;
  }

  async function consultarPlaca(placa: string) {
    setErroGeral(null);
    try {
      const resposta = await fetch("/api/suhai/veiculo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placa }),
      });
      const corpo = (await resposta.json()) as {
        ok?: boolean;
        categoria?: string;
        anoModelo?: string;
        anoFabricacao?: string;
        marca?: string;
        modelo?: string;
        codFipe?: string;
        opcoes?: OpcaoVeiculo[];
      };
      const opcoes = corpo.opcoes ?? [];
      if (!corpo.ok || !corpo.marca || !corpo.anoModelo || (opcoes.length === 0 && !corpo.modelo)) {
        setErros((anterior) => ({ ...anterior, placa: "Não encontramos essa placa. Confira ou informe o veículo." }));
        setEstado((anterior) => ({ ...anterior, semPlaca: true }));
        return null;
      }
      const patch = {
        semPlaca: false,
        categoria: corpo.categoria || "auto",
        anoModelo: corpo.anoModelo,
        anoFabricacao: corpo.anoFabricacao || corpo.anoModelo,
        marca: corpo.marca,
        modelo: opcoes.length > 1 ? "" : corpo.modelo || "",
        codFipe: opcoes.length > 1 ? "" : corpo.codFipe || "",
        opcoes,
      };
      setErros((anterior) => ({ ...anterior, placa: "" }));
      setEstado((anterior) => ({ ...anterior, ...patch }));
      return patch;
    } catch {
      setErros((anterior) => ({ ...anterior, placa: "Não foi possível consultar a placa agora." }));
      return null;
    }
  }

  /** Blur e "Ver meu preço" pedem o mesmo CPF: reaproveita a consulta (falha libera nova tentativa). */
  function preencherPorCpf(cpfInformado?: string): ReturnType<typeof consultarPerfil> {
    const cpf = onlyDigits(cpfInformado ?? estadoRef.current.cpf);
    if (!isValidCpf(cpf)) return Promise.resolve(null);
    const anterior = consultaCpfRef.current;
    if (anterior?.cpf === cpf) return anterior.resultado;
    const resultado = acompanharConsulta("cpf", consultarPerfil(cpf)).then((patch) => {
      if (!patch && consultaCpfRef.current?.resultado === resultado) consultaCpfRef.current = null;
      return patch;
    });
    consultaCpfRef.current = { cpf, resultado };
    return resultado;
  }

  async function consultarPerfil(cpf: string) {
    try {
      await contatoInicialRef.current;
      const resposta = await fetch("/api/suhai/perfil", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpf, leadId: leadIdRef.current }),
      });
      const corpo = (await resposta.json()) as {
        ok?: boolean;
        dataNascimento?: string;
        sexo?: number;
        estadoCivil?: number;
      };
      if (!corpo.ok || !corpo.dataNascimento || !corpo.sexo || !corpo.estadoCivil) {
        setEstado((anterior) => ({ ...anterior, perfilPronto: false, perfilManual: true }));
        return null;
      }
      const patch = {
        dataNascimento: corpo.dataNascimento,
        sexo: String(corpo.sexo),
        estadoCivil: String(corpo.estadoCivil),
        perfilPronto: true,
        perfilManual: false,
      };
      setEstado((anterior) => ({ ...anterior, ...patch }));
      return patch;
    } catch {
      setEstado((anterior) => ({ ...anterior, perfilPronto: false, perfilManual: true }));
      return null;
    }
  }

  function validarEtapa(atual: Estado, passo: Etapa): Record<string, string> {
    const proximos: Record<string, string> = {};
    if (passo === 1) {
      if (!/^\d{2}$/.test(onlyDigits(atual.ddd))) proximos.ddd = "DDD inválido";
      if (!/^9\d{8}$/.test(onlyDigits(atual.celular))) {
        proximos.celular = "Celular inválido — deve ter 9 dígitos e começar com 9";
      }
    }
    if (passo === 2) {
      if (atual.semPlaca) {
        if (!atual.marca.trim()) proximos.marca = "Informe a marca.";
        if (!atual.modelo.trim()) proximos.modelo = "Informe o modelo.";
        if (!/^\d{4}$/.test(atual.anoModelo)) proximos.anoModelo = "Informe o ano com 4 dígitos.";
      } else if (!isValidPlacaFormat(atual.placa.replace(/[^A-Za-z0-9]/g, ""))) {
        proximos.placa = "Informe a placa.";
      } else if (atual.opcoes.length > 1 && !atual.codFipe) {
        proximos.versao = "Escolha a versão do veículo.";
      } else if (!atual.marca || !atual.modelo || !atual.anoModelo) {
        proximos.placa = "Aguarde a identificação do veículo ou informe os dados.";
      }
    }
    if (passo === 3 && onlyDigits(atual.cepPernoite).length !== 8) {
      proximos.cep = "Informe o CEP com 8 dígitos.";
    }
    if (passo === 4) {
      if (atual.nome.trim().length < 3) proximos.nome = "Informe o nome completo.";
      if (!isValidCpf(atual.cpf)) proximos.cpf = "CPF inválido.";
      if (atual.perfilManual && !/^\d{4}-\d{2}-\d{2}$/.test(atual.dataNascimento)) {
        proximos.nascimento = "Informe a data de nascimento.";
      }
    }
    return proximos;
  }

  function pedirCotacao(atual: Estado, usadas: PremissasSuhai, planoAssistencia?: PlanoAssistencia) {
    const pessoa = {
      cpf: onlyDigits(atual.cpf),
      nome: atual.nome.trim(),
      dataNascimento: atual.dataNascimento,
      sexo: Number(atual.sexo),
      estadoCivil: Number(atual.estadoCivil),
    };
    return fetch("/api/suhai/cotacao", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        leadId: leadIdRef.current,
        proponente: pessoa,
        condutorPrincipal: pessoa,
        veiculo: {
          categoria: atual.categoria,
          marca: atual.marca,
          modelo: atual.modelo,
          anoModelo: Number(atual.anoModelo),
          anoFabricacao: atual.anoFabricacao ? Number(atual.anoFabricacao) : undefined,
          codFipe: atual.codFipe || undefined,
          zeroKm: atual.semPlaca,
          placa: atual.semPlaca ? undefined : atual.placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
        },
        uso: {
          utilizacao: usadas.utilizacao,
          tipoUtilizacao: usadas.utilizacao === "particular" ? Number(usadas.tipoUtilizacao) : undefined,
          cepPernoite: onlyDigits(atual.cepPernoite),
          garagem: {
            residencia: usadas.garagemResidencia,
            trabalho: usadas.garagemTrabalho,
            escola: usadas.garagemEscola,
          },
        },
        contrato: {
          tipoContratacao: TIPO_CONTRATACAO.novo,
          classeBonus: Number(usadas.classeBonus),
          planoAssistencia,
        },
      }),
    });
  }

  /** Outro nível de assistência, com os mesmos dados da cotação apresentada. */
  async function cotarAssistencia(usadas: PremissasSuhai, nivel: PlanoAssistencia): Promise<CotacaoResultado> {
    let resposta: Response;
    try {
      resposta = await pedirCotacao(estadoRef.current, usadas, nivel);
    } catch {
      throw new Error("Falha de conexão. Tente novamente.");
    }
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok) throw new Error(corpo?.mensagem ?? "Não foi possível calcular agora.");
    return corpo as CotacaoResultado;
  }

  async function enviar(atual: Estado, usadas: PremissasSuhai) {
    setCarregando(true);
    setErroGeral(null);
    try {
      await contatoInicialRef.current;
      const resposta = await pedirCotacao(atual, usadas);
      const corpo = await resposta.json();
      if (!resposta.ok) {
        setErros(corpo.campos ?? {});
        setErroGeral(corpo.mensagem ?? "Não foi possível calcular agora.");
        return;
      }
      onResultado(corpo as CotacaoResultado, atual.categoria, usadas, {
        placa: atual.semPlaca ? "" : atual.placa.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
        cep: onlyDigits(atual.cepPernoite),
        nome: atual.nome.trim(),
        ddd: onlyDigits(atual.ddd),
        celular: onlyDigits(atual.celular),
        leadId: leadIdRef.current,
      });
      if (!precoEmitidoRef.current) {
        precoEmitidoRef.current = true;
        trackEvent("suhai_quote_price", { form_id: "cotacao_suhai" });
      }
    } catch {
      setErroGeral("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  useImperativeHandle(ref, () => ({
    recalcular: (usadas) => enviar(estadoRef.current, usadas),
    cotarAssistencia,
  }));

  async function avancar() {
    if (avancandoRef.current) return;
    avancandoRef.current = true;
    setAvancando(true);
    try {
      await avancarEtapa();
    } finally {
      avancandoRef.current = false;
      setAvancando(false);
    }
  }

  async function avancarEtapa() {
    let atual = estadoRef.current;
    if (etapa === 2 && !atual.semPlaca && (!atual.marca || !atual.modelo || !atual.anoModelo)) {
      const patch = await preencherPorPlaca(atual.placa);
      if (patch) atual = { ...atual, ...patch };
    }
    const falhas = validarEtapa(atual, etapa);
    setErros(falhas);
    if (Object.values(falhas).some(Boolean)) return;

    if (etapa === 1) enviarContatoInicial(atual);
    if (etapa === 2) void enviarProgresso(atual, "veiculo");
    if (etapa === 3) void enviarProgresso(atual, "cep");

    if (etapa < 4) {
      setEtapa((passo) => (passo + 1) as Etapa);
      return;
    }

    if (!atual.dataNascimento) {
      const patch = await preencherPorCpf(atual.cpf);
      if (patch) {
        atual = { ...atual, ...patch };
        setEstado((anterior) => ({ ...anterior, ...patch }));
      }
    }
    if (!atual.dataNascimento) {
      setEstado((anterior) => ({ ...anterior, perfilManual: true }));
      setErros({ nascimento: "Informe a data de nascimento." });
      return;
    }
    await enviar(atual, premissasRef.current);
  }

  const indice = etapa - 1;
  const fichaVisivel = Boolean(estado.marca || estado.modelo || estado.anoModelo);
  const consultaVisivel =
    (consultando === "placa" && etapa === 2) || (consultando === "cpf" && etapa === 4) ? consultando : null;
  /**
   * Sinal de ok do LeadForm: campo tocado, preenchido e sem erro. No telefone, como lá,
   * aparece com o DDD completo enquanto o celular é digitado; o formato é conferido no blur.
   */
  const valido = {
    telefone: Boolean(
      tocados.telefone &&
        /^\d{2}$/.test(onlyDigits(estado.ddd)) &&
        onlyDigits(estado.celular) &&
        !erros.ddd &&
        !erros.celular,
    ),
    placa: Boolean(
      tocados.placa &&
        isValidPlacaFormat(estado.placa.replace(/[^A-Za-z0-9]/g, "")) &&
        estado.marca &&
        consultando !== "placa" &&
        !erros.placa,
    ),
    cep: Boolean(tocados.cep && onlyDigits(estado.cepPernoite).length === 8 && !erros.cep),
    nome: Boolean(tocados.nome && estado.nome.trim().length >= 3 && !erros.nome),
    cpf: Boolean(tocados.cpf && isValidCpf(estado.cpf) && !erros.cpf),
  };

  return (
    <form
      id="cotacao-suhai"
      noValidate
      className={cn(
        "flex scroll-mt-28 flex-col gap-4 rounded-xl border p-6 max-[360px]:gap-3 max-[360px]:p-4 lg:gap-3 lg:p-5 xl:gap-4 xl:p-6",
        FROST_CARD_CLASS,
      )}
      onFocusCapture={marcarInicio}
      onSubmit={(event) => {
        event.preventDefault();
        void avancar();
      }}
    >
      <div>
        <h2 className="font-display text-xl font-bold leading-snug text-brand-700 lg:text-lg xl:text-xl 2xl:text-2xl">
          Veja seu preço agora
        </h2>
        <p className="mt-1 text-xs text-neutral-400 lg:text-[0.7rem] xl:text-xs">4 etapas curtas — comece pelo celular</p>
        <p className="mt-1 text-sm font-medium text-neutral-500 lg:text-xs xl:text-sm">
          {ETAPAS[indice].rotulo} · {etapa}/4
        </p>
        <p className="mt-0.5 text-sm text-neutral-500 lg:text-xs xl:text-sm">{ETAPAS[indice].subtitulo}</p>
      </div>

      <ProgressBar step={etapa} totalSteps={4} label={ETAPAS[indice].rotulo} compact />

      <div
        key={etapa}
        className="flex flex-col gap-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200"
      >
        {etapa === 1 && (
          <>
            <Field
              label="Celular com DDD"
              htmlFor="suhai-telefone"
              error={erros.ddd || erros.celular}
              valid={valido.telefone}
            >
              <TelefoneInput
                id="suhai-telefone"
                name="telefone"
                data-clarity-mask="true"
                value={formatTelefone(onlyDigits(estado.ddd) + onlyDigits(estado.celular))}
                aria-invalid={Boolean(erros.ddd || erros.celular)}
                onTelefoneChange={(next) => {
                  tocar("telefone");
                  setEstado((anterior) => ({ ...anterior, ddd: next.ddd, celular: next.celular }));
                  setErros((anterior) => ({ ...anterior, ddd: "", celular: "" }));
                }}
                onBlur={() => {
                  tocar("telefone");
                  const atual = estadoRef.current;
                  const falhas = validarEtapa(atual, 1);
                  if (onlyDigits(atual.ddd + atual.celular) && Object.keys(falhas).length > 0) {
                    setErros((anterior) => ({ ...anterior, ...falhas }));
                    return;
                  }
                  void validarCelularApi(atual);
                }}
              />
            </Field>
            <p className="text-xs leading-snug text-neutral-500">
              Usamos o número para enviar o resultado por WhatsApp e seguir sua cotação.
            </p>
          </>
        )}

        {etapa === 2 && (
          <>
            {!estado.semPlaca && (
              <Field label="Placa" htmlFor="placa" error={erros.placa || undefined} valid={valido.placa}>
                <Input
                  id="placa"
                  aria-invalid={Boolean(erros.placa)}
                  value={estado.placa}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABC-1D23"
                  maxLength={8}
                  data-clarity-mask="true"
                  onChange={(event) => definir("placa", formatPlacaMascara(event.target.value))}
                  onBlur={(event) => {
                    tocar("placa");
                    void preencherPorPlaca(event.target.value);
                  }}
                />
              </Field>
            )}
            {estado.opcoes.length > 1 && (
              <Field label="Versão" htmlFor="versao" error={erros.versao}>
                <select
                  id="versao"
                  className={selectClasses}
                  value={estado.codFipe}
                  onChange={(event) => {
                    const escolhida = estado.opcoes.find((opcao) => opcao.codFipe === event.target.value);
                    setEstado((anterior) => ({
                      ...anterior,
                      codFipe: escolhida?.codFipe ?? "",
                      marca: escolhida?.marca ?? anterior.marca,
                      modelo: escolhida?.modelo ?? "",
                    }));
                  }}
                >
                  <option value="">Escolha a versão</option>
                  {estado.opcoes.map((opcao) => (
                    <option key={opcao.codFipe} value={opcao.codFipe}>
                      {opcao.modelo}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {fichaVisivel && !estado.semPlaca && (
              <VehicleInfoDisplay
                marca={estado.marca}
                modelo={estado.modelo}
                anoFabricacao={estado.anoFabricacao}
                anoModelo={estado.anoModelo}
              />
            )}
            {estado.semPlaca && (
              <>
                <Field label="Marca" htmlFor="marca" error={erros.marca}>
                  <Input id="marca" value={estado.marca} onChange={(event) => definir("marca", event.target.value)} />
                </Field>
                <Field label="Modelo" htmlFor="modelo" error={erros.modelo}>
                  <Input id="modelo" value={estado.modelo} onChange={(event) => definir("modelo", event.target.value)} />
                </Field>
                <Field label="Ano do modelo" htmlFor="ano" error={erros.anoModelo}>
                  <Input
                    id="ano"
                    inputMode="numeric"
                    maxLength={4}
                    value={estado.anoModelo}
                    onChange={(event) => definir("anoModelo", event.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                </Field>
              </>
            )}
            <button
              type="button"
              className="self-start text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
              onClick={() =>
                setEstado((anterior) => ({
                  ...anterior,
                  semPlaca: !anterior.semPlaca,
                  placa: anterior.semPlaca ? anterior.placa : "",
                  codFipe: "",
                  opcoes: [],
                }))
              }
            >
              {estado.semPlaca ? "Tenho a placa" : "Ainda não tenho placa"}
            </button>
          </>
        )}

        {etapa === 3 && (
          <>
            <Field
              label="CEP onde o veículo dorme"
              htmlFor="cep"
              error={erros.cep}
              valid={valido.cep}
              hint="É o CEP de pernoite, o lugar em que o carro passa a noite."
            >
              <Input
                id="cep"
                aria-invalid={Boolean(erros.cep)}
                inputMode="numeric"
                autoComplete="postal-code"
                value={estado.cepPernoite}
                onChange={(event) => {
                  cepConsultaRef.current += 1;
                  const cep = formatCep(event.target.value);
                  setEstado((anterior) => ({ ...anterior, cepPernoite: cep, enderecoLinha: "" }));
                  setErros((anterior) => ({ ...anterior, cep: "" }));
                }}
                onBlur={(event) => {
                  tocar("cep");
                  void consultarCep(event.target.value);
                }}
              />
            </Field>
            <EnderecoCepDisplay linha={estado.enderecoLinha} />
          </>
        )}

        {etapa === 4 && (
          <>
            <div className="rounded-lg bg-neutral-50 px-3.5 py-3">
              <p className="text-sm font-medium text-neutral-900">
                {[estado.marca, estado.modelo].filter(Boolean).join(" ")}
                {estado.anoModelo ? ` · ${estado.anoModelo}` : ""}
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">
                {estado.semPlaca ? "Sem placa" : `Placa ${estado.placa}`}
                {estado.enderecoLinha
                  ? ` · ${estado.enderecoLinha}`
                  : estado.cepPernoite
                    ? ` · CEP ${estado.cepPernoite}`
                    : ""}
              </p>
              <p className="mt-1.5 flex gap-3">
                <button
                  type="button"
                  className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                  onClick={() => setEtapa(2)}
                >
                  Alterar veículo
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                  onClick={() => setEtapa(3)}
                >
                  Alterar CEP
                </button>
              </p>
            </div>
            <Field label="Nome completo" htmlFor="nome" error={erros.nome} valid={valido.nome}>
              <Input
                id="nome"
                autoComplete="name"
                value={estado.nome}
                aria-invalid={Boolean(erros.nome)}
                onChange={(event) => {
                  definir("nome", event.target.value);
                  setErros((anterior) => ({ ...anterior, nome: "" }));
                }}
                onBlur={() => tocar("nome")}
              />
            </Field>
            <Field
              label="CPF"
              htmlFor="cpf"
              error={erros.cpf}
              valid={valido.cpf}
              hint="Usamos o CPF para calcular o seu preço, não para abrir um cadastro."
            >
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                value={estado.cpf}
                aria-invalid={Boolean(erros.cpf)}
                onChange={(event) => {
                  consultaCpfRef.current = null;
                  setEstado((anterior) => ({
                    ...anterior,
                    cpf: formatCpf(event.target.value),
                    perfilPronto: false,
                    perfilManual: false,
                    dataNascimento: "",
                  }));
                  setErros((anterior) => ({ ...anterior, cpf: "" }));
                }}
                onBlur={(event) => {
                  tocar("cpf");
                  void preencherPorCpf(event.target.value);
                }}
              />
            </Field>
            {estado.perfilManual && (
              <>
                <Field label="Data de nascimento" htmlFor="nascimento" error={erros.nascimento}>
                  <Input
                    id="nascimento"
                    type="date"
                    value={estado.dataNascimento}
                    onChange={(event) => definir("dataNascimento", event.target.value)}
                  />
                </Field>
                <Field label="Sexo" htmlFor="sexo">
                  <select
                    id="sexo"
                    className={selectClasses}
                    value={estado.sexo}
                    onChange={(event) => definir("sexo", event.target.value)}
                  >
                    <option value={SEXO.feminino}>Feminino</option>
                    <option value={SEXO.masculino}>Masculino</option>
                  </select>
                </Field>
                <Field label="Estado civil" htmlFor="estado-civil">
                  <select
                    id="estado-civil"
                    className={selectClasses}
                    value={estado.estadoCivil}
                    onChange={(event) => definir("estadoCivil", event.target.value)}
                  >
                    <option value={ESTADO_CIVIL.solteiro}>Solteiro(a)</option>
                    <option value={ESTADO_CIVIL.casado}>Casado(a) ou união estável</option>
                    <option value={ESTADO_CIVIL.outros}>Separado(a), divorciado(a) ou outros</option>
                  </select>
                </Field>
              </>
            )}
          </>
        )}
      </div>

      {erroGeral && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-alert">
          {erroGeral}
        </p>
      )}

      <div className="flex items-center gap-3">
        {etapa > 1 && (
          <Button
            type="button"
            variant="ghost"
            disabled={avancando}
            onClick={() => setEtapa((passo) => (passo - 1) as Etapa)}
          >
            Voltar
          </Button>
        )}
        <Button type="submit" loading={carregando || avancando}>
          {CTAS[indice]}
        </Button>
      </div>

      {/* Abaixo dos botões: o aviso surge no blur da placa e não pode deslocar o "Continuar" no meio do clique. */}
      {consultaVisivel && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          {demorando
            ? "Está demorando um pouco mais que o normal…"
            : consultaVisivel === "placa"
              ? "Consultando a placa…"
              : "Consultando o CPF…"}
        </p>
      )}
    </form>
  );
});
