"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Lock } from "lucide-react";
import type { FieldErrors } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, type FormTone } from "@/components/lead/fields";
import { ProgressBar } from "@/components/lead/ProgressBar";
import { VehicleInfoDisplay } from "@/components/lead/VehicleInfoDisplay";
import { RpaChoiceStep } from "@/components/lead/RpaChoiceStep";
import { RpaCalculationScreen } from "@/components/lead/RpaCalculationScreen";
import { useRpaCalculation } from "@/lib/leads/use-rpa-calculation";
import type { RpaDisabledReason } from "@/lib/rpa-calculation";
import { buildRpaPayload } from "@/lib/rpa";
import { publicEnv } from "@/lib/env";
import { company } from "@/lib/company";
import {
  LEAD_FORM_STEPS,
  captureUtmFromLocation,
  formatCelular,
  formatCep,
  formatCpf,
  formatDdd,
  formatPlaca,
  leadSchema,
  onlyDigits,
  type LeadInput,
} from "@/lib/validators";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * LeadForm — formulário multi-step de captura de lead (Issue 11).
 * Fonte: ESPECIFICACAO v3.md, seção 21.1 (contrato/estados/a11y) e seção
 * 6.3 (passo 1: DDD+celular — mínimo p/ virar lead; passo 2: CEP+nome;
 * passo 3: CPF+placa, opcionais, "ou deixe que coletamos no contato").
 *
 * Paridade com o formulário legado (docs/FORMULARIOS_ATUAIS.md, Issue
 * P-09): o site atual exige Nome/E-mail/DDD/Celular no passo único. Este
 * novo formulário reduz deliberadamente para DDD+Celular como único
 * obrigatório — mudança já decidida pela especificação (não é uma
 * regressão; ver "Achado" em FORMULARIOS_ATUAIS.md), reduzindo a
 * fricção observada como problema no site atual.
 *
 * Fora de escopo (explícito na issue): a rota `/api/lead` (Issue 12) não
 * existe ainda. O envio final chama `onSuccess`, se fornecido pelo
 * consumidor; sem ele, o formulário apenas transita para o estado
 * "sucesso" localmente — permitindo compor/testar o formulário antes da
 * Issue 12 existir, sem inventar uma integração real.
 *
 * Captura em 2 fases + validação em tempo real (projeto 2026-07-13,
 * réplica do comportamento do `ContactLeadModal`/site legado): ao
 * confirmar o passo 1 (DDD+Celular), dispara — em paralelo, sem
 * bloquear a navegação entre passos — o contato inicial
 * (`stage: "initial"` em `/api/lead`, que já cria o lead e envia a
 * mensagem via Octadesk). O `leadId` devolvido é passado a `onSuccess`
 * para que o envio final atualize esse mesmo lead. No envio final, se o
 * CPF ou o CEP não passarem o checksum/formato, abre um diálogo
 * "Corrigir" (foca o campo) vs. "Prosseguir assim mesmo" (envia como
 * está, sem bloquear a conversão, sinalizando `skipStrictValidation` —
 * ver `lib/leads/types.ts` — para o servidor não rejeitar de novo o
 * mesmo valor) — mesma lógica do `SweetAlert` do formulário legado.
 *
 * Passos reorganizados em 2026-07-14 (decisão do cliente): passo 2
 * passa a coletar Nome + E-mail (com validação em tempo real via
 * SafetyMails, mesmo padrão do `ContactLeadModal`); passo 3 passa a ser
 * CPF, CEP, Placa (nessa ordem) — CEP saiu do passo 2.
 *
 * CEP e Placa (passo 3, projeto 2026-07-14, réplica de
 * `validarCepViaCep`/`validarPlacaApi` do site legado): `onBlur` chama
 * `/api/validate/cep` (ViaCEP) e `/api/validate/placa` (proxy "Placa
 * Fipe") — a placa encontrada auto-preenche marca/modelo/ano
 * (`veiculoMarcaModelo`/`veiculoAno`, enviados no payload final). Os
 * dois entram no mesmo diálogo "Corrigir ou Prosseguir" do CPF — ver
 * `docs/VALIDACAO_TEMPO_REAL_E_CAPTURA_2_FASES.md`.
 *
 * Celular (passo 1, correção 2026-07-14): `onBlur` chama
 * `checkCelularApi()` (formato local + APILayer) — antes só disparava
 * dentro de `goNext()`, já depois de avançar para o passo 2, deixando o
 * aviso de "celular não confirmado" invisível na tela seguinte. Agora
 * dispara ainda no passo 1 (mesmo ponto do `blur.siPhone` no
 * `FooterCodeSiteDefinitivoCompleto.js`/`webflow_injection_limpo.js`
 * legado), e continua também sendo chamado em `goNext()` como reforço
 * (ex.: usuário confirma com Enter, sem disparar o `blur` antes).
 *
 * DDD (passo 1, correção 2026-07-14): `onBlur` chama `trigger("ddd")` —
 * réplica de `$DDD.on('blur.siPhone', ...)` do legado (que checa o DDD
 * de forma independente do celular, mesmo antes do usuário preencher o
 * celular). Dá feedback imediato ("DDD inválido") ao saltar do campo,
 * em vez de esperar o clique em "Continuar".
 *
 * Ficha do veículo (passo 3, projeto 2026-07-16, a pedido do cliente):
 * `handlePlacaBlur` também preenche os campos granulares
 * `veiculoMarca`/`veiculoModelo`/`veiculoAnoFabricacao`/
 * `veiculoAnoModelo` — exibidos, somente-leitura, por
 * `VehicleInfoDisplay` logo abaixo do campo Placa. Guardados no lead
 * para uso futuro no cálculo do RPA.
 *
 * Passo 4 — decisão do RPA (projeto 2026-07-16, "etapa de decisão RPA
 * no formulário", a pedido do cliente): depois de CPF/CEP/Placa,
 * `RpaChoiceStep` pergunta se o usuário quer aguardar o cálculo
 * automático (18 seguradoras) agora ou preferir que um consultor
 * calcule depois. "Prefiro consultor" segue **exatamente** o fluxo de
 * envio final que já existia (`handleChooseConsultant` reaproveita o
 * mesmo `handleSubmit(onSubmit)` de antes). "Aguardar o cálculo"
 * (`handleChooseWaitForRpa`) grava o lead direto (mesmo padrão de
 * `sendInitialContact`, sem passar por `onSuccess` — não queremos o
 * redirect para `/obrigado` aqui) e então substitui todo o formulário
 * por `RpaCalculationScreen`, que usa o hook `useRpaCalculation`
 * (`lib/leads/use-rpa-calculation.ts`) para orquestrar o polling/timer/
 * resultado — réplica em código novo, só deste projeto, da mecânica do
 * `ProgressModalRPA` do site legado (`webflow_injection_limpo.js`, só
 * consultado como referência, nunca alterado). Sem redirect automático
 * ao final (decisão do cliente): a tela de resultado/erro tem seu
 * próprio botão de WhatsApp.
 *
 * Validação de CPF/CEP/Placa ao avançar do passo 3 (ajuste 2026-07-16):
 * como o passo 3 deixou de ser o passo final, o diálogo "Corrigir ou
 * Prosseguir" (que antes só aparecia no envio final) passa a abrir já
 * em `goNext()`, no momento de sair do passo 3 — mesmo diálogo, só
 * antecipado um passo. "Prosseguir assim mesmo" continua pulando direto
 * para o envio final (sem passar pelo passo 4/RPA), mesma lógica de
 * sempre.
 */
export interface LeadFormProps {
  ramo: string;
  /** `inline` (dentro do Hero) vs `page` (`/cotacao`, passo a passo completo). */
  variant?: "inline" | "page";
  /**
   * `leadId`: presente quando um contato inicial (passo 1) já criou o
   * lead — ver nota acima. `skipStrictValidation`: `true` quando o
   * usuário escolheu "Prosseguir assim mesmo" com CPF/CEP inválidos —
   * ver `lib/leads/types.ts`.
   */
  onSuccess?: (
    lead: LeadInput,
    leadId?: string,
    skipStrictValidation?: boolean
  ) => void | Promise<void>;
}

type FormStatus = "idle" | "validating" | "submitting" | "success" | "error";
type StepNumber = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;
/**
 * Passos de COLETA de dados (1 a 3). O passo 4 (`RpaChoiceStep`) é uma
 * decisão, não coleta — por isso o contador exibe "Etapa X de 3" e a última
 * tela não é contada (pedido do cliente, 2026-07-17).
 */
const COLLECTION_STEPS = 3;
/** Teaser de rapidez exibido nos passos de coleta (1 a 3). */
const FORM_SPEED_TEASER = "Poucos dados por etapa — cada uma leva de 15 a 30 segundos.";

/** Título fixo + subtítulo por passo (pedido do cliente, 2026-07-14) — orienta o que preencher em cada etapa. */
const FORM_TITLE = "Inicie aqui sua cotação";
const STEP_SUBTITLES: Record<StepNumber, string> = {
  1: "Informe seu telefone",
  2: "Informe nome e e-mail",
  3: "Informe CEP, CPF e placa do veículo",
  4: "Como você quer receber sua cotação?",
};

/**
 * Tone "glass" (v2 visual, 2026-07-19, pedido do cliente): na variante
 * `inline` (Hero), o card deixa de ser branco opaco e vira navy
 * translúcido com backdrop-blur — a imagem do hero continua visível por
 * trás sem comprometer a legibilidade. Campos ganham vidro branco suave
 * (`bg-white/10`) com texto branco; erros usam red-300 (o `text-alert`
 * padrão é escuro demais sobre navy). A variante `page` (/cotacao) e o
 * `ContactLeadModal` continuam com o card branco de sempre.
 *
 * Fallback: navegadores sem `backdrop-filter` recebem navy a 90% de
 * opacidade (via `supports-[backdrop-filter]`) — sem blur, a opacidade
 * maior garante a legibilidade sozinha.
 */
// blur-md (era xl, 2026-07-20): raio de desfoque menor corta o custo de
// pintura do backdrop-filter em CPUs de celular (medido no Lighthouse) —
// visualmente quase idêntico, pois o fundo já é uma foto noturna suave.
const GLASS_CARD_CLASS =
  "border-white/15 bg-[#0a2540]/90 supports-[backdrop-filter]:bg-[#0a2540]/65 backdrop-blur-md shadow-2xl";
const GLASS_INPUT_CLASS = [
  "border-white/25 bg-white/10 text-white placeholder:text-white/40",
  "focus-visible:border-white/60 focus-visible:ring-white/25",
  "aria-invalid:border-red-300 aria-invalid:focus-visible:ring-red-300/30",
].join(" ");

/** Ordem de exibição/foco no passo 3 — mesma ordem dos campos na tela. */
const STEP_3_FIELDS = ["cpf", "cep", "placa"] as const;
const STEP_3_FIELD_LABELS: Record<(typeof STEP_3_FIELDS)[number], string> = {
  cpf: "CPF",
  cep: "CEP",
  placa: "Placa",
};

/**
 * `leadSchema` usa `.transform()` em vários campos (máscaras → dígitos),
 * então o tipo do que o formulário coleta (`LeadFormValues`, antes do
 * resolver rodar) difere do tipo validado/normalizado (`LeadInput`,
 * depois). O terceiro generic de `useForm` (`TTransformedValues`, RHF
 * ≥7.43) é o que permite `handleSubmit` entregar o tipo já normalizado.
 */
type LeadFormValues = z.input<typeof leadSchema>;

export function LeadForm({ ramo, variant = "page", onSuccess }: LeadFormProps) {
  const tone: FormTone = variant === "inline" ? "glass" : "light";
  const glass = tone === "glass";
  const [step, setStep] = useState<StepNumber>(1);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [showCorrectOrProceed, setShowCorrectOrProceed] = useState(false);
  /** `true` a partir do momento em que o usuário escolhe "Quero calcular agora" no passo 4 — substitui todo o formulário por `RpaCalculationScreen`. */
  const [rpaActive, setRpaActive] = useState(false);
  /**
   * Validações assíncronas em andamento (placa/CEP/celular/e-mail) — pedido
   * do cliente, 2026-07-20: ao chegar no passo 4 com a consulta da placa
   * ainda em voo, a mensagem "dados incompletos" aparecia por um instante e
   * sumia quando a API respondia, parecendo um erro. Enquanto este contador
   * for > 0, o passo 4 mostra "Aguarde, validando os dados apresentados…"
   * (ampulheta) em vez do aviso de dados incompletos.
   */
  const [pendingValidations, setPendingValidations] = useState(0);
  const rpa = useRpaCalculation();
  const initialLeadIdRef = useRef<string | null>(null);
  const initialCallInFlightRef = useRef(false);
  /**
   * Guarda contra reenvio duplicado no passo final (correção 2026-07-15,
   * ver docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md) — achado real:
   * logs de produção mostraram 3-4 chamadas a `/api/lead` em rajada por
   * um único envio do formulário. Causa: o botão "Enviar" só fica
   * desabilitado (`isBusy`) depois que `submitPayload` chama
   * `setStatus("submitting")` — mas isso só acontece **depois** da
   * validação assíncrona do `handleSubmit` do RHF (`zodResolver`) já ter
   * rodado. Nessa janela (validação em andamento, botão ainda
   * clicável), um duplo clique/Enter repetido disparava uma 2ª (ou 3ª)
   * chamada a `handleSubmit`, cada uma terminando em seu próprio
   * `router.push("/obrigado?...")` — múltiplos `router.push` para o
   * mesmo destino quase simultâneos é a hipótese líder para o "Server
   * Components render" sem digest relatado (estado do roteador do
   * Next.js corrompido pela corrida, não uma exceção real do código da
   * aplicação). Este ref é checado de forma **síncrona**, no exato
   * momento do evento de submit — antes de qualquer validação
   * assíncrona rodar — e por isso bloqueia cliques repetidos de
   * verdade, diferente de `isBusy` (que só reflete estado depois de um
   * ciclo de render).
   */
  const finalSubmitInFlightRef = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    setFocus,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors, touchedFields },
  } = useForm<LeadFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    mode: "onSubmit",
    defaultValues: {
      ramo,
      ddd: "",
      celular: "",
      cep: "",
      nome: "",
      email: "",
      cpf: "",
      placa: "",
      veiculoAno: "",
      veiculoMarcaModelo: "",
      veiculoMarca: "",
      veiculoModelo: "",
      veiculoAnoFabricacao: "",
      veiculoAnoModelo: "",
    },
  });

  /** Ficha do veículo (projeto 2026-07-16) — reflete os `setValue` de `handlePlacaBlur` na UI, ver `VehicleInfoDisplay`. */
  const watchedVeiculoMarca = watch("veiculoMarca");
  const watchedVeiculoModelo = watch("veiculoModelo");
  const watchedVeiculoAnoFabricacao = watch("veiculoAnoFabricacao");
  const watchedVeiculoAnoModelo = watch("veiculoAnoModelo");

  /**
   * Elegibilidade do cálculo automático (RPA) no passo 4 (projeto
   * 2026-07-17, critérios do cliente):
   * - Caminhão nunca é cotado automaticamente (exige especialista).
   * - Caso contrário, só habilita quando TODOS os dados obrigatórios estão
   *   preenchidos e validados (sem erro) e o veículo foi identificado pela
   *   placa (marca/modelo preenchidos via Placa Fipe).
   * Quando desabilitado, o passo 4 mostra o motivo e mantém a opção de
   * falar com um consultor.
   */
  const watchedDdd = watch("ddd");
  const watchedCelular = watch("celular");
  const watchedNome = watch("nome");
  const watchedEmail = watch("email");
  const watchedCpf = watch("cpf");
  const watchedCep = watch("cep");
  const watchedPlaca = watch("placa");

  const rpaDisabledReason: RpaDisabledReason | null = (() => {
    if (ramo === "caminhao") return "caminhao";
    const todosPreenchidos = [
      watchedDdd,
      watchedCelular,
      watchedNome,
      watchedEmail,
      watchedCpf,
      watchedCep,
      watchedPlaca,
    ].every((v) => typeof v === "string" && v.trim().length > 0);
    const veiculoIdentificado = Boolean(watchedVeiculoMarca && watchedVeiculoModelo);
    const semErros =
      !errors.ddd &&
      !errors.celular &&
      !errors.nome &&
      !errors.email &&
      !errors.cpf &&
      !errors.cep &&
      !errors.placa;
    return todosPreenchidos && veiculoIdentificado && semErros ? null : "dados_incompletos";
  })();
  const rpaEnabled = rpaDisabledReason === null;

  /**
   * Check de campo válido (itens de conversão, 2026-07-20): tocado +
   * preenchido + sem erro. Campos opcionais vazios não mostram check —
   * feedback positivo só quando o usuário de fato preencheu algo válido.
   */
  const fieldValues: Record<string, string | undefined> = {
    ddd: watchedDdd,
    celular: watchedCelular,
    nome: watchedNome,
    email: watchedEmail,
    cpf: watchedCpf,
    cep: watchedCep,
    placa: watchedPlaca,
  };
  function isFieldValid(
    field: "ddd" | "celular" | "nome" | "email" | "cpf" | "cep" | "placa"
  ): boolean {
    const value = fieldValues[field];
    return Boolean(touchedFields[field] && value && value.trim().length > 0 && !errors[field]);
  }

  const ddd = register("ddd");
  const celular = register("celular");
  const cep = register("cep");
  const nome = register("nome");
  const email = register("email");
  const cpf = register("cpf");
  const placa = register("placa");

  function markStarted() {
    if (!hasStarted) {
      setHasStarted(true);
      trackEvent("form_start", { form_id: "lead_form", ramo });
    }
  }

  /**
   * Contato inicial (projeto 2026-07-13) — disparado uma única vez ao
   * confirmar o passo 1 (DDD+Celular), sem bloquear a navegação entre
   * passos (mesmo comportamento do `ContactLeadModal`). Falha aqui nunca
   * impede o avanço de passo nem o envio final.
   */
  async function sendInitialContact() {
    if (initialCallInFlightRef.current) return;
    initialCallInFlightRef.current = true;

    try {
      const values = getValues();
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          ramo,
          ddd: values.ddd,
          celular: values.celular,
          stage: "initial",
          utm: captureUtmFromLocation(),
        }),
      });
      const data = (await response.json().catch(() => null)) as { leadId?: string } | null;
      if (data?.leadId) initialLeadIdRef.current = data.leadId;
    } catch (error) {
      console.error("[LeadForm] Falha no contato inicial (não bloqueante):", error);
    }
  }

  /**
   * Validação em tempo real do celular via APILayer (projeto 2026-07-13,
   * réplica de `validarTelefoneAsync`/`validateCelular` do site legado —
   * mesma lógica em `FooterCodeSiteDefinitivoCompleto.js`/
   * `webflow_injection_limpo.js`: formato local primeiro, API só se o
   * formato já passou). Amber, não-bloqueante — dispara no `onBlur` do
   * campo Celular (ainda no passo 1, mesmo ponto do legado — antes era
   * disparado só dentro de `goNext()`, já depois de avançar de passo,
   * deixando o aviso invisível na tela seguinte).
   */
  async function checkCelularApi() {
    const formatOk = await trigger(["ddd", "celular"]);
    if (!formatOk) return;

    const { ddd: dddValue, celular: celularValue } = getValues();
    setPendingValidations((count) => count + 1);
    try {
      const response = await fetch("/api/validate/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ddd: dddValue, celular: celularValue }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (result.ok === false) {
        setError("celular", {
          type: "manual",
          message: "Não conseguimos confirmar esse celular — revise ou prossiga assim mesmo",
        });
      }
    } catch {
      // Best-effort — nunca bloqueia.
    } finally {
      setPendingValidations((count) => count - 1);
    }
  }

  /**
   * Validação em tempo real de e-mail via SafetyMails (projeto
   * 2026-07-14, réplica exata de `handleEmailBlur` em
   * `ContactLeadModal.tsx`) — e-mail é opcional, só valida se algo foi
   * digitado. Best-effort: nunca bloqueia (o proxy cai em `ok:true` se o
   * SafetyMails não responder — ver `lib/validation/email-safetymails.ts`).
   */
  async function handleEmailBlur() {
    const emailValue = getValues("email");
    if (!emailValue) return;

    const formatOk = await trigger("email");
    if (!formatOk) return;

    setPendingValidations((count) => count + 1);
    try {
      const response = await fetch("/api/validate/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (result.ok === false) {
        setError("email", {
          type: "manual",
          message: "Não conseguimos confirmar esse e-mail — revise ou prossiga assim mesmo",
        });
      }
    } catch {
      // Best-effort — nunca bloqueia.
    } finally {
      setPendingValidations((count) => count - 1);
    }
  }

  /**
   * Validação em tempo real de CEP via ViaCEP (projeto 2026-07-14,
   * réplica de `validarCepViaCep`/`validateCEP` do site legado) — CEP é
   * opcional, só valida se algo foi digitado.
   *
   * Correção 2026-07-14 (achado ao analisar `FooterCodeSiteDefinitivoCompleto.js`
   * de novo): o legado SEMPRE chama a validação no blur/change do CEP,
   * mesmo incompleto — `validarCepViaCep` retorna `{ok:false,
   * reason:'formato'}` nesse caso (sem chamar a API), disparando o
   * alerta "CEP inválido" imediatamente. A versão anterior aqui fazia
   * um `return` silencioso quando o CEP não tinha 8 dígitos, então
   * nunca reportava o erro de formato no blur (só o formato "correto,
   * mas endereço não encontrado" chegava a aparecer) — corrigido para
   * chamar `trigger("cep")` primeiro (mesmo padrão de `handlePlacaBlur`
   * abaixo), garantindo o erro "CEP inválido" apareça de imediato para
   * qualquer CEP mal formatado, e só chama a API real se o formato já
   * for válido (evita uma chamada de rede inútil para algo já sabido
   * inválido — mesmo comportamento do legado).
   */
  async function handleCepBlur() {
    const formatOk = await trigger("cep");
    const cepValue = getValues("cep");
    if (!formatOk || !cepValue) return;

    setPendingValidations((count) => count + 1);
    try {
      const response = await fetch("/api/validate/cep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cepValue }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (result.ok === false) {
        setError("cep", {
          type: "manual",
          message: "Não encontramos esse CEP — revise ou prossiga assim mesmo",
        });
      }
    } catch {
      // Best-effort — nunca bloqueia.
    } finally {
      setPendingValidations((count) => count - 1);
    }
  }

  /**
   * Validação em tempo real de placa via proxy "Placa Fipe" (projeto
   * 2026-07-14, réplica de `validarPlacaApi`/`validatePlaca` do site
   * legado) — placa é opcional, só valida se o formato local (antigo ou
   * Mercosul) já passou. Quando o veículo é encontrado, preenche
   * automaticamente marca/modelo/ano (mesmo auto-preenchimento do
   * legado). Best-effort: nunca bloqueia.
   *
   * Campos granulares (projeto 2026-07-16, a pedido do cliente):
   * `veiculoMarca`/`veiculoModelo`/`veiculoAnoFabricacao`/
   * `veiculoAnoModelo` são preenchidos aqui e exibidos, somente-leitura,
   * por `VehicleInfoDisplay` — nunca digitados pelo usuário.
   * `veiculoMarcaModelo`/`veiculoAno` (combinados) continuam sendo
   * preenchidos também, só por compatibilidade com a Cloud Function
   * (`VEICULO`/`ANO` no proxy EspoCRM/Octadesk).
   */
  async function handlePlacaBlur() {
    const placaValid = await trigger("placa");
    const placaValue = getValues("placa");
    if (!placaValid || !placaValue) return;

    setPendingValidations((count) => count + 1);
    try {
      const response = await fetch("/api/validate/placa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: placaValue }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        marca?: string;
        modelo?: string;
        anoFabricacao?: string;
        anoModelo?: string;
        marcaModelo?: string;
        ano?: string;
      };
      if (result.ok === false) {
        setError("placa", {
          type: "manual",
          message: "Não encontramos essa placa — revise ou prossiga assim mesmo",
        });
        return;
      }
      if (result.marca) setValue("veiculoMarca", result.marca);
      if (result.modelo) setValue("veiculoModelo", result.modelo);
      if (result.anoFabricacao) setValue("veiculoAnoFabricacao", result.anoFabricacao);
      if (result.anoModelo) setValue("veiculoAnoModelo", result.anoModelo);
      if (result.marcaModelo) setValue("veiculoMarcaModelo", result.marcaModelo);
      if (result.ano) setValue("veiculoAno", result.ano);
    } catch {
      // Best-effort — nunca bloqueia.
    } finally {
      setPendingValidations((count) => count - 1);
    }
  }

  async function goNext() {
    setStatus("validating");

    // Valida campo a campo (em vez de `trigger(fields)` de uma vez) para
    // saber com certeza qual foi o primeiro inválido e focá-lo — o objeto
    // `errors` da closure não reflete o resultado do `trigger()` recém
    // resolvido (só é atualizado no próximo render), então checá-lo logo
    // depois do `await` inspecionaria um estado desatualizado.
    let firstInvalid: keyof LeadInput | null = null;
    for (const field of LEAD_FORM_STEPS[step]) {
      const isFieldValid = await trigger(field);
      if (!isFieldValid) {
        firstInvalid = field;
        break;
      }
    }

    setStatus("idle");

    if (firstInvalid) {
      // Ao sair do passo 3 (CPF/CEP/Placa), abre o mesmo diálogo "Corrigir
      // ou Prosseguir" que antes só aparecia no envio final — agora o
      // passo 3 deixou de ser o último, mas a UX de tolerar formato
      // inválido continua igual (ver docstring do topo do arquivo).
      if (step === 3 && STEP_3_FIELDS.includes(firstInvalid as (typeof STEP_3_FIELDS)[number])) {
        setShowCorrectOrProceed(true);
        return;
      }
      setFocus(firstInvalid);
      return;
    }

    if (step === 1) {
      void sendInitialContact();
      void checkCelularApi();
    }

    const nextStep = (step + 1) as StepNumber;
    setStep(nextStep);
    trackEvent("form_step", { step: nextStep, ramo });
  }

  function goBack() {
    setStep((current) => (current > 1 ? ((current - 1) as StepNumber) : current));
  }

  async function submitPayload(data: LeadInput, skipStrictValidation?: boolean) {
    setStatus("submitting");
    try {
      const payload: LeadInput = { ...data, ramo, utm: captureUtmFromLocation() };
      await onSuccess?.(payload, initialLeadIdRef.current ?? undefined, skipStrictValidation);
      trackEvent("generate_lead", { ramo, method: "form" });
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      finalSubmitInFlightRef.current = false;
    }
  }

  async function onSubmit(data: LeadInput) {
    await submitPayload(data);
  }

  /**
   * Wrapper síncrono do `onSubmit` do passo final — ver
   * `finalSubmitInFlightRef` acima. Precisa ser síncrono e checar/setar
   * o ref **antes** de chamar `handleSubmit` do RHF, senão a corrida
   * continua existindo (a checagem chegaria tarde demais).
   */
  function handleFinalSubmit(event: React.BaseSyntheticEvent) {
    if (finalSubmitInFlightRef.current) {
      event.preventDefault();
      return;
    }
    finalSubmitInFlightRef.current = true;
    void handleSubmit(onSubmit, (formErrors) => {
      finalSubmitInFlightRef.current = false;
      onInvalidFinalStep(formErrors);
    })(event);
  }

  /**
   * Diálogo "Corrigir ou Prosseguir" (projeto 2026-07-13, réplica do
   * `SweetAlert` do formulário legado) — aberto quando `handleSubmit`
   * detecta erro no envio final. Cobre CPF (checksum), CEP (formato +
   * ViaCEP) e, desde 2026-07-14, também Placa (formato + Placa Fipe) —
   * os três ficam no passo 3 (último passo, sem `goNext()` intermediário
   * para pegar o erro antes do envio final).
   */
  function onInvalidFinalStep(formErrors: FieldErrors<LeadInput>) {
    if (formErrors.cpf || formErrors.cep || formErrors.placa) {
      setShowCorrectOrProceed(true);
    }
  }

  /** Foca o primeiro campo inválido entre CPF/CEP/Placa (nessa ordem, mesma do passo 3). */
  function handleCorrigir() {
    setShowCorrectOrProceed(false);
    const firstInvalid = STEP_3_FIELDS.find((field) => errors[field]) ?? "cpf";
    setFocus(firstInvalid);
  }

  /**
   * Normaliza os valores brutos do formulário (`getValues()`, ainda sem
   * passar pelo `zodResolver`) para o formato final `LeadInput` — mesma
   * lógica de máscara/trim já usada por `handleProsseguirAssimMesmo`,
   * extraída para reaproveitar também em `handleChooseWaitForRpa`
   * (passo 4), que precisa do payload completo sem esperar o
   * `handleSubmit` do RHF (o passo 4 não passa pelo submit nativo do
   * formulário).
   */
  function buildPayloadFromRawValues(raw: LeadFormValues): LeadInput {
    return {
      ramo,
      ddd: onlyDigits(raw.ddd),
      celular: onlyDigits(raw.celular),
      cep: raw.cep ? onlyDigits(raw.cep) : undefined,
      nome: raw.nome?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      cpf: raw.cpf ? onlyDigits(raw.cpf) : undefined,
      placa: raw.placa ? raw.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : undefined,
      veiculoAno: raw.veiculoAno?.trim() || undefined,
      veiculoMarcaModelo: raw.veiculoMarcaModelo?.trim() || undefined,
      veiculoMarca: raw.veiculoMarca?.trim() || undefined,
      veiculoModelo: raw.veiculoModelo?.trim() || undefined,
      veiculoAnoFabricacao: raw.veiculoAnoFabricacao?.trim() || undefined,
      veiculoAnoModelo: raw.veiculoAnoModelo?.trim() || undefined,
    };
  }

  /**
   * "Prosseguir assim mesmo" — envia CPF/CEP como o usuário digitou
   * (sem checksum/formato), sinalizando `skipStrictValidation: true`
   * para o servidor não rejeitar de novo o mesmo valor que o usuário já
   * confirmou querer enviar (achado 2026-07-14 — sem esse sinal, o
   * `apiLeadSchema` do servidor reaplicaria a mesma validação estrita e
   * este botão falharia silenciosamente). Ver lib/leads/types.ts.
   *
   * Pula direto para o envio final (mesmo destino de sempre — passo 4/
   * RPA nunca aparece nesse caso) — dado inválido já significa
   * "especialista entra em contato", sem cotação automatizada, mesma
   * lógica do formulário legado.
   */
  async function handleProsseguirAssimMesmo() {
    setShowCorrectOrProceed(false);
    const payload = buildPayloadFromRawValues(getValues());
    await submitPayload(payload, true);
  }

  /**
   * Passo 4, opção "Prefiro falar com um consultor depois" — reaproveita
   * **exatamente** o envio final que já existia antes deste passo
   * (mesmo `handleSubmit(onSubmit)`, mesma guarda `finalSubmitInFlightRef`).
   */
  function handleChooseConsultant() {
    if (finalSubmitInFlightRef.current) return;
    finalSubmitInFlightRef.current = true;
    void handleSubmit(onSubmit, (formErrors) => {
      finalSubmitInFlightRef.current = false;
      onInvalidFinalStep(formErrors);
    })();
  }

  /**
   * Passo 4, opção "Aguardar o cálculo" — grava o lead (`stage:
   * "complete"`) direto via `fetch`, sem passar por `onSuccess` (que
   * faria `router.push("/obrigado")`, indesejado aqui: o usuário
   * precisa continuar na tela para acompanhar o RPA). Mesmo padrão de
   * `sendInitialContact()` acima. Falha nesse `POST` é só logada — o
   * contato inicial (passo 1) já garantiu que o telefone está salvo,
   * então nunca bloqueia o RPA (mesma filosofia "nunca perder a
   * conversão" do resto do arquivo).
   */
  async function handleChooseWaitForRpa() {
    // Defesa: a opção só aparece com a feature ligada e fica desabilitada
    // quando o RPA não é elegível (caminhão/dados incompletos).
    if (!publicEnv.rpaEnabled) return;
    if (!rpaEnabled) return;
    if (finalSubmitInFlightRef.current) return;
    finalSubmitInFlightRef.current = true;
    setStatus("submitting");

    const payload = buildPayloadFromRawValues(getValues());
    // Perfil derivado da PH3A (projeto 2026-07-17): a resposta de `/api/lead`
    // traz `perfilRpa` (sexo/data de nascimento/estado civil por idade)
    // quando a PH3A está habilitada e retornou data de nascimento. Usamos
    // esse bloco no payload do RPA; se a chamada falhar ou não vier o perfil,
    // seguimos sem ele (o backend estima, como antes).
    let perfilRpa: { sexo?: string; dataNascimento?: string; estadoCivil?: string } | undefined;
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          ...payload,
          stage: "complete",
          leadId: initialLeadIdRef.current ?? undefined,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        perfilRpa?: { sexo?: string; dataNascimento?: string; estadoCivil?: string };
      };
      perfilRpa = result.perfilRpa;
      trackEvent("generate_lead", { ramo, method: "form" });
    } catch (error) {
      console.error(
        "[LeadForm] Falha ao gravar lead antes do RPA (não bloqueia — contato inicial já foi salvo):",
        error
      );
    }

    setStatus("idle");
    finalSubmitInFlightRef.current = false;
    setRpaActive(true);
    void rpa.start(
      buildRpaPayload({
        ddd: payload.ddd,
        celular: payload.celular,
        ramo,
        cep: payload.cep,
        nome: payload.nome,
        cpf: payload.cpf,
        placa: payload.placa,
        sexo: perfilRpa?.sexo,
        dataNascimento: perfilRpa?.dataNascimento,
        estadoCivil: perfilRpa?.estadoCivil,
        marca: payload.veiculoMarca,
        modelo: payload.veiculoModelo,
        ano: payload.veiculoAnoModelo || payload.veiculoAnoFabricacao || payload.veiculoAno,
        email: payload.email,
      })
    );
  }

  if (rpaActive) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6">
        <RpaCalculationScreen
          phase={rpa.phase}
          currentStep={rpa.currentStep}
          percentage={rpa.percentage}
          phaseTitle={rpa.phaseTitle}
          phaseSubtitle={rpa.phaseSubtitle}
          result={rpa.result}
          errorMessage={rpa.errorMessage}
          timerLabel={rpa.timerLabel}
          isExtended={rpa.isExtended}
          ramo={ramo}
        />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border p-8 text-center",
          glass ? GLASS_CARD_CLASS : "border-neutral-200 bg-white"
        )}
      >
        <CheckCircle2
          className={cn("size-10", glass ? "text-brand-100" : "text-brand-500")}
          aria-hidden="true"
        />
        <p
          className={cn(
            "font-display text-lg font-bold",
            glass ? "text-white" : "text-neutral-900"
          )}
        >
          Recebemos seus dados!
        </p>
        <p className={cn("text-sm", glass ? "text-brand-50/70" : "text-neutral-500")}>
          Em breve um especialista entra em contato para finalizar sua cotação.
        </p>
      </div>
    );
  }

  /** Passo 4 é o "passo final" no sentido de navegação (`TOTAL_STEPS`), mas não tem submit nativo — as 2 escolhas de `RpaChoiceStep` chamam seus próprios handlers. */
  const isFinalStep = step === TOTAL_STEPS;
  const isBusy = status === "validating" || status === "submitting";

  return (
    <form
      noValidate
      onFocus={markStarted}
      onSubmit={
        isFinalStep
          ? handleFinalSubmit
          : (event) => {
              event.preventDefault();
              void goNext();
            }
      }
      className={cn(
        "flex flex-col gap-4 rounded-xl border p-6",
        glass ? GLASS_CARD_CLASS : "border-neutral-200 bg-white"
      )}
    >
      <div>
        <h2
          className={cn(
            "font-display text-xl font-bold md:text-2xl",
            glass ? "text-white" : "text-neutral-900"
          )}
        >
          {FORM_TITLE}
        </h2>
        <p className={cn("mt-1 text-sm", glass ? "text-brand-50/80" : "text-neutral-500")}>
          {STEP_SUBTITLES[step]}
        </p>
        {step <= COLLECTION_STEPS && (
          <>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                glass ? "text-brand-50/70" : "text-neutral-500"
              )}
            >
              Etapa {step} de {COLLECTION_STEPS}
            </p>
            <p className={cn("mt-0.5 text-xs", glass ? "text-brand-50/50" : "text-neutral-400")}>
              {FORM_SPEED_TEASER}
            </p>
          </>
        )}
      </div>

      {step <= COLLECTION_STEPS && (
        <ProgressBar
          step={step}
          totalSteps={COLLECTION_STEPS}
          compact={variant === "inline"}
          tone={tone}
        />
      )}

      {/* `key={step}` remonta o wrapper a cada passo, disparando a entrada
          animada (fade + slide da direita, ~200ms — motion da spec, seção
          30.2 "Form passo"). `motion-safe` respeita prefers-reduced-motion. */}
      <div
        key={step}
        className="flex flex-col gap-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200"
      >
        {step === 1 && (
          <div className="grid grid-cols-[5rem_1fr] gap-3">
            <Field
              label="DDD"
              htmlFor="ddd"
              error={errors.ddd?.message}
              tone={tone}
              valid={isFieldValid("ddd")}
            >
              <Input
                id="ddd"
                className={glass ? GLASS_INPUT_CLASS : undefined}
                inputMode="numeric"
                autoComplete="tel-area-code"
                placeholder="11"
                maxLength={2}
                aria-invalid={!!errors.ddd}
                aria-describedby={errors.ddd ? "ddd-error" : undefined}
                {...ddd}
                onChange={(event) => {
                  event.target.value = formatDdd(event.target.value);
                  void ddd.onChange(event);
                }}
                onBlur={(event) => {
                  void ddd.onBlur(event);
                  void trigger("ddd");
                }}
              />
            </Field>
            <Field
              label="Celular"
              htmlFor="celular"
              error={errors.celular?.message}
              tone={tone}
              valid={isFieldValid("celular")}
            >
              <Input
                id="celular"
                className={glass ? GLASS_INPUT_CLASS : undefined}
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765-4321"
                aria-invalid={!!errors.celular}
                aria-describedby={errors.celular ? "celular-error" : undefined}
                {...celular}
                onChange={(event) => {
                  event.target.value = formatCelular(event.target.value);
                  void celular.onChange(event);
                }}
                onBlur={(event) => {
                  void celular.onBlur(event);
                  void checkCelularApi();
                }}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <>
            <Field
              label="Nome"
              htmlFor="nome"
              error={errors.nome?.message}
              hint="Opcional"
              tone={tone}
              valid={isFieldValid("nome")}
            >
              <Input
                id="nome"
                className={glass ? GLASS_INPUT_CLASS : undefined}
                autoComplete="name"
                placeholder="Seu nome"
                aria-invalid={!!errors.nome}
                {...nome}
              />
            </Field>
            <Field
              label="E-mail"
              htmlFor="email"
              error={errors.email?.message}
              hint="Opcional"
              tone={tone}
              valid={isFieldValid("email")}
            >
              <Input
                id="email"
                className={glass ? GLASS_INPUT_CLASS : undefined}
                type="email"
                autoComplete="email"
                placeholder="voce@email.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...email}
                onBlur={(event) => {
                  void email.onBlur(event);
                  void handleEmailBlur();
                }}
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <p className={cn("text-sm", glass ? "text-brand-50/70" : "text-neutral-500")}>
              CPF, CEP e placa são opcionais — ou deixe que coletamos no contato.
            </p>
            <Field
              label="CPF"
              htmlFor="cpf"
              error={errors.cpf?.message}
              hint="Opcional"
              tone={tone}
              valid={isFieldValid("cpf")}
            >
              <Input
                id="cpf"
                className={glass ? GLASS_INPUT_CLASS : undefined}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                aria-invalid={!!errors.cpf}
                {...cpf}
                onBlur={(event) => {
                  void cpf.onBlur(event);
                  void trigger("cpf");
                }}
                onChange={(event) => {
                  event.target.value = formatCpf(event.target.value);
                  void cpf.onChange(event);
                }}
              />
            </Field>
            <Field
              label="CEP"
              htmlFor="cep"
              error={errors.cep?.message}
              hint="Opcional"
              tone={tone}
              valid={isFieldValid("cep")}
            >
              <Input
                id="cep"
                className={glass ? GLASS_INPUT_CLASS : undefined}
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                aria-invalid={!!errors.cep}
                aria-describedby={errors.cep ? "cep-error" : undefined}
                {...cep}
                onChange={(event) => {
                  event.target.value = formatCep(event.target.value);
                  void cep.onChange(event);
                }}
                onBlur={(event) => {
                  void cep.onBlur(event);
                  void handleCepBlur();
                }}
              />
            </Field>
            <Field
              label="Placa"
              htmlFor="placa"
              error={errors.placa?.message}
              hint="Opcional"
              tone={tone}
              valid={isFieldValid("placa")}
            >
              <Input
                id="placa"
                className={glass ? GLASS_INPUT_CLASS : undefined}
                autoComplete="off"
                placeholder="ABC1D23"
                aria-invalid={!!errors.placa}
                {...placa}
                onChange={(event) => {
                  event.target.value = formatPlaca(event.target.value);
                  void placa.onChange(event);
                }}
                onBlur={(event) => {
                  void placa.onBlur(event);
                  void handlePlacaBlur();
                }}
              />
            </Field>
            <VehicleInfoDisplay
              marca={watchedVeiculoMarca}
              modelo={watchedVeiculoModelo}
              anoFabricacao={watchedVeiculoAnoFabricacao}
              anoModelo={watchedVeiculoAnoModelo}
              tone={tone}
            />
          </>
        )}

        {step === 4 && (
          <RpaChoiceStep
            onChooseWait={handleChooseWaitForRpa}
            onChooseConsultant={handleChooseConsultant}
            busy={isBusy}
            rpaEnabled={rpaEnabled}
            rpaDisabledReason={rpaDisabledReason}
          featureEnabled={publicEnv.rpaEnabled}
          tone={tone}
          validating={pendingValidations > 0}
        />
        )}
      </div>

      {status === "error" && (
        <p
          role="alert"
          className={cn("text-sm font-medium", glass ? "text-red-300" : "text-alert")}
        >
          Não foi possível enviar agora. Tente novamente ou fale conosco pelo WhatsApp.
        </p>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="ghost"
            className={glass ? "text-white hover:bg-white/10" : undefined}
            onClick={goBack}
            disabled={isBusy}
          >
            Voltar
          </Button>
        )}
        {!isFinalStep && (
          <Button type="submit" variant="primary" fullWidth loading={isBusy}>
            Continuar
          </Button>
        )}
      </div>

      {/* Trust microcopy (versão visual v2, 2026-07-19) — sinais de confiança
          junto ao formulário, padrão de LP financeira de alta conversão.
          SUSEP vem de lib/company (fonte única, nunca hardcoded). */}
      <p
        className={cn(
          "flex items-center justify-center gap-1.5 text-xs",
          glass ? "text-brand-50/60" : "text-neutral-400"
        )}
      >
        <Lock className="size-3.5 shrink-0" aria-hidden="true" />
        Dados protegidos (LGPD) · Corretora registrada SUSEP {company.susep}
      </p>

      {(() => {
        const invalidLabels = STEP_3_FIELDS.filter((field) => errors[field]).map(
          (field) => STEP_3_FIELD_LABELS[field]
        );
        const isPlural = invalidLabels.length > 1;
        const fieldsText = invalidLabels.length > 0 ? invalidLabels.join(" e ") : "dado";
        return (
          <AlertDialog open={showCorrectOrProceed} onOpenChange={setShowCorrectOrProceed}>
            <AlertDialogContent>
              <AlertDialogTitle>
                {fieldsText} parece{isPlural ? "m" : ""} inválido{isPlural ? "s" : ""}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isPlural ? `Os dados informados (${fieldsText})` : `O ${fieldsText} informado`} não
                parece
                {isPlural ? "m" : ""} válido{isPlural ? "s" : ""}. Você pode corrigir agora ou
                prosseguir assim mesmo — nesse caso, um especialista entra em contato para confirmar
                seus dados (sem cotação automatizada).
              </AlertDialogDescription>
              <div className="mt-5 flex gap-3">
                <Button type="button" variant="ghost" fullWidth onClick={handleCorrigir}>
                  Corrigir
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={handleProsseguirAssimMesmo}
                >
                  Prosseguir assim mesmo
                </Button>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}
    </form>
  );
}
