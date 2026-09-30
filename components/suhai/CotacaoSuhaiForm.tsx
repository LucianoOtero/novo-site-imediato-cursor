"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

import { Field } from "@/components/lead/fields";
import { ProgressBar } from "@/components/lead/ProgressBar";
import { VehicleInfoDisplay } from "@/components/lead/VehicleInfoDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ESTADO_CIVIL, SEXO, TIPO_CONTRATACAO } from "@/lib/suhai/dominio";
import type { CotacaoResultado } from "@/lib/suhai/types";
import { cn } from "@/lib/utils";
import { formatCep, formatCpf, formatPlaca, isValidCpf, isValidPlacaFormat, onlyDigits } from "@/lib/validators";

/**
 * Card da cotação Suhai no mesmo frost do LeadForm inline.
 * Três etapas: placa, CEP de pernoite, nome e CPF. Uso, garagem e bônus
 * não aparecem aqui — entram como premissas depois do preço.
 */

const FROST_CARD_CLASS =
  "border-white/50 bg-white/95 supports-[backdrop-filter]:bg-white/85 backdrop-blur-md shadow-2xl";

const ETAPAS = [
  { rotulo: "Placa", subtitulo: "A placa identifica o veículo e já adianta marca, modelo e ano." },
  { rotulo: "CEP", subtitulo: "O CEP de onde o carro dorme muda o preço." },
  { rotulo: "Seus dados", subtitulo: "Nome e CPF fecham o cálculo. O restante a gente completa para você." },
] as const;

const CTAS = ["Continuar", "Falta pouco", "Ver meu preço"] as const;

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
  semPlaca: boolean;
  placa: string;
  categoria: string;
  marca: string;
  modelo: string;
  anoModelo: string;
  anoFabricacao: string;
  codFipe: string;
  cepPernoite: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  estadoCivil: string;
  perfilPronto: boolean;
  perfilManual: boolean;
};

const INICIAL: Estado = {
  semPlaca: false,
  placa: "",
  categoria: "auto",
  marca: "",
  modelo: "",
  anoModelo: "",
  anoFabricacao: "",
  codFipe: "",
  cepPernoite: "",
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
};

type Props = {
  premissas: PremissasSuhai;
  onResultado: (resultado: CotacaoResultado, categoria: string, usadas: PremissasSuhai) => void;
};

export const CotacaoSuhaiForm = forwardRef<CotacaoSuhaiHandle, Props>(function CotacaoSuhaiForm(
  { premissas, onResultado },
  ref,
) {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [estado, setEstado] = useState<Estado>(INICIAL);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const premissasRef = useRef(premissas);
  premissasRef.current = premissas;

  function definir<K extends keyof Estado>(campo: K, valor: Estado[K]) {
    setEstado((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function preencherPorPlaca(placaInformada?: string) {
    const placa = (placaInformada ?? estadoRef.current.placa).replace(/[^A-Za-z0-9]/g, "");
    if (!isValidPlacaFormat(placa)) return null;
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
      };
      if (!corpo.ok || !corpo.marca || !corpo.modelo || !corpo.anoModelo) {
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
        modelo: corpo.modelo,
        codFipe: corpo.codFipe || "",
      };
      setErros((anterior) => ({ ...anterior, placa: "" }));
      setEstado((anterior) => ({ ...anterior, ...patch }));
      return patch;
    } catch {
      setErros((anterior) => ({ ...anterior, placa: "Não foi possível consultar a placa agora." }));
      return null;
    }
  }

  async function preencherPorCpf(cpfInformado?: string) {
    const cpf = onlyDigits(cpfInformado ?? estadoRef.current.cpf);
    if (!isValidCpf(cpf)) return null;
    try {
      const resposta = await fetch("/api/suhai/perfil", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cpf }),
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

  function validarEtapa(atual: Estado, passo: 1 | 2 | 3): Record<string, string> {
    const proximos: Record<string, string> = {};
    if (passo === 1) {
      if (atual.semPlaca) {
        if (!atual.marca.trim()) proximos.marca = "Informe a marca.";
        if (!atual.modelo.trim()) proximos.modelo = "Informe o modelo.";
        if (!/^\d{4}$/.test(atual.anoModelo)) proximos.anoModelo = "Informe o ano com 4 dígitos.";
      } else if (!isValidPlacaFormat(atual.placa.replace(/[^A-Za-z0-9]/g, ""))) {
        proximos.placa = "Informe a placa.";
      } else if (!atual.marca || !atual.modelo || !atual.anoModelo) {
        proximos.placa = "Aguarde a identificação do veículo ou informe os dados.";
      }
    }
    if (passo === 2 && onlyDigits(atual.cepPernoite).length !== 8) {
      proximos.cep = "Informe o CEP com 8 dígitos.";
    }
    if (passo === 3) {
      if (atual.nome.trim().length < 3) proximos.nome = "Informe o nome completo.";
      if (!isValidCpf(atual.cpf)) proximos.cpf = "CPF inválido.";
      if (atual.perfilManual && !/^\d{4}-\d{2}-\d{2}$/.test(atual.dataNascimento)) {
        proximos.nascimento = "Informe a data de nascimento.";
      }
    }
    return proximos;
  }

  async function enviar(atual: Estado, usadas: PremissasSuhai) {
    setCarregando(true);
    setErroGeral(null);
    try {
      const pessoa = {
        cpf: onlyDigits(atual.cpf),
        nome: atual.nome.trim(),
        dataNascimento: atual.dataNascimento,
        sexo: Number(atual.sexo),
        estadoCivil: Number(atual.estadoCivil),
      };
      const resposta = await fetch("/api/suhai/cotacao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
            placa: atual.semPlaca ? undefined : atual.placa,
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
          },
        }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) {
        setErros(corpo.campos ?? {});
        setErroGeral(corpo.mensagem ?? "Não foi possível calcular agora.");
        return;
      }
      onResultado(corpo as CotacaoResultado, atual.categoria, usadas);
    } catch {
      setErroGeral("Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  useImperativeHandle(ref, () => ({
    recalcular: (usadas) => enviar(estadoRef.current, usadas),
  }));

  async function avancar() {
    let atual = estadoRef.current;
    if (etapa === 1 && !atual.semPlaca && (!atual.marca || !atual.modelo || !atual.anoModelo)) {
      const patch = await preencherPorPlaca(atual.placa);
      if (patch) atual = { ...atual, ...patch };
    }
    const falhas = validarEtapa(atual, etapa);
    setErros(falhas);
    if (Object.values(falhas).some(Boolean)) return;

    if (etapa < 3) {
      setEtapa((passo) => (passo + 1) as 2 | 3);
      return;
    }

    if (!atual.dataNascimento) {
      const patch = await preencherPorCpf(atual.cpf);
      if (patch) atual = { ...atual, ...patch };
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

  return (
    <form
      id="cotacao-suhai"
      noValidate
      className={cn(
        "flex scroll-mt-28 flex-col gap-4 rounded-xl border p-6 max-[360px]:gap-3 max-[360px]:p-4 lg:gap-3 lg:p-5 xl:gap-4 xl:p-6",
        FROST_CARD_CLASS,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        void avancar();
      }}
    >
      <div>
        <h2 className="font-display text-xl font-bold leading-snug text-brand-700 lg:text-lg xl:text-xl 2xl:text-2xl">
          Veja seu preço agora
        </h2>
        <p className="mt-1 text-xs text-neutral-400 lg:text-[0.7rem] xl:text-xs">3 etapas curtas — comece pela placa</p>
        <p className="mt-1 text-sm font-medium text-neutral-500 lg:text-xs xl:text-sm">
          {ETAPAS[indice].rotulo} · {etapa}/3
        </p>
        <p className="mt-0.5 text-sm text-neutral-500 lg:text-xs xl:text-sm">{ETAPAS[indice].subtitulo}</p>
      </div>

      <ProgressBar step={etapa} totalSteps={3} label={ETAPAS[indice].rotulo} compact />

      <div
        key={etapa}
        className="flex flex-col gap-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200"
      >
        {etapa === 1 && (
          <>
            {!estado.semPlaca && (
              <Field label="Placa" htmlFor="placa" error={erros.placa || undefined}>
                <Input
                  id="placa"
                  value={estado.placa}
                  autoComplete="off"
                  onChange={(event) => definir("placa", formatPlaca(event.target.value))}
                  onBlur={(event) => void preencherPorPlaca(event.target.value)}
                />
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
                }))
              }
            >
              {estado.semPlaca ? "Tenho a placa" : "Ainda não tenho placa"}
            </button>
          </>
        )}

        {etapa === 2 && (
          <Field
            label="CEP onde o veículo dorme"
            htmlFor="cep"
            error={erros.cep}
            hint="É o CEP de pernoite, o lugar em que o carro passa a noite."
          >
            <Input
              id="cep"
              inputMode="numeric"
              autoComplete="postal-code"
              value={estado.cepPernoite}
              onChange={(event) => definir("cepPernoite", formatCep(event.target.value))}
            />
          </Field>
        )}

        {etapa === 3 && (
          <>
            <Field label="Nome completo" htmlFor="nome" error={erros.nome}>
              <Input
                id="nome"
                autoComplete="name"
                value={estado.nome}
                onChange={(event) => definir("nome", event.target.value)}
              />
            </Field>
            <Field
              label="CPF"
              htmlFor="cpf"
              error={erros.cpf}
              hint="Usamos o CPF para calcular o seu preço, não para abrir um cadastro."
            >
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                value={estado.cpf}
                onChange={(event) =>
                  setEstado((anterior) => ({
                    ...anterior,
                    cpf: formatCpf(event.target.value),
                    perfilPronto: false,
                    perfilManual: false,
                    dataNascimento: "",
                  }))
                }
                onBlur={(event) => void preencherPorCpf(event.target.value)}
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
          <Button type="button" variant="ghost" onClick={() => setEtapa((passo) => (passo - 1) as 1 | 2)}>
            Voltar
          </Button>
        )}
        <Button type="submit" loading={carregando}>
          {CTAS[indice]}
        </Button>
      </div>
    </form>
  );
});
