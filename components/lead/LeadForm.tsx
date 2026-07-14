"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
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
import { Field } from "@/components/lead/fields";
import { ProgressBar } from "@/components/lead/ProgressBar";
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
  onSuccess?: (lead: LeadInput, leadId?: string, skipStrictValidation?: boolean) => void | Promise<void>;
}

type FormStatus = "idle" | "validating" | "submitting" | "success" | "error";
type StepNumber = 1 | 2 | 3;
const TOTAL_STEPS = 3;

/**
 * `leadSchema` usa `.transform()` em vários campos (máscaras → dígitos),
 * então o tipo do que o formulário coleta (`LeadFormValues`, antes do
 * resolver rodar) difere do tipo validado/normalizado (`LeadInput`,
 * depois). O terceiro generic de `useForm` (`TTransformedValues`, RHF
 * ≥7.43) é o que permite `handleSubmit` entregar o tipo já normalizado.
 */
type LeadFormValues = z.input<typeof leadSchema>;

export function LeadForm({ ramo, variant = "page", onSuccess }: LeadFormProps) {
  const [step, setStep] = useState<StepNumber>(1);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [hasStarted, setHasStarted] = useState(false);
  const [showCorrectOrProceed, setShowCorrectOrProceed] = useState(false);
  const initialLeadIdRef = useRef<string | null>(null);
  const initialCallInFlightRef = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    setFocus,
    setError,
    getValues,
    formState: { errors },
  } = useForm<LeadFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    mode: "onSubmit",
    defaultValues: { ramo, ddd: "", celular: "", cep: "", nome: "", email: "", cpf: "", placa: "" },
  });

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
        body: JSON.stringify({ ramo, ddd: values.ddd, celular: values.celular, stage: "initial", utm: captureUtmFromLocation() }),
      });
      const data = (await response.json().catch(() => null)) as { leadId?: string } | null;
      if (data?.leadId) initialLeadIdRef.current = data.leadId;
    } catch (error) {
      console.error("[LeadForm] Falha no contato inicial (não bloqueante):", error);
    }
  }

  /** Validação em tempo real do celular via APILayer (âmbar, não-bloqueante — só usada no passo 1). */
  async function checkCelularApi() {
    const { ddd: dddValue, celular: celularValue } = getValues();
    try {
      const response = await fetch("/api/validate/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ddd: dddValue, celular: celularValue }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (result.ok === false) {
        setError("celular", { type: "manual", message: "Não conseguimos confirmar esse celular — revise ou prossiga assim mesmo" });
      }
    } catch {
      // Best-effort — nunca bloqueia.
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

    try {
      const response = await fetch("/api/validate/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (result.ok === false) {
        setError("email", { type: "manual", message: "Não conseguimos confirmar esse e-mail — revise ou prossiga assim mesmo" });
      }
    } catch {
      // Best-effort — nunca bloqueia.
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
    }
  }

  async function onSubmit(data: LeadInput) {
    await submitPayload(data);
  }

  /**
   * Diálogo "Corrigir ou Prosseguir" (projeto 2026-07-13, réplica do
   * `SweetAlert` do formulário legado) — aberto quando `handleSubmit`
   * detecta erro no envio final. Cobre CPF (checksum) e, desde
   * 2026-07-14, também CEP (formato) — os dois agora ficam no passo 3
   * (último passo, sem `goNext()` intermediário para pegar o erro antes
   * do envio final).
   */
  function onInvalidFinalStep(formErrors: FieldErrors<LeadInput>) {
    if (formErrors.cpf || formErrors.cep) {
      setShowCorrectOrProceed(true);
    }
  }

  /** Foca o primeiro campo inválido entre CPF/CEP (nessa ordem, mesma do passo 3). */
  function handleCorrigir() {
    setShowCorrectOrProceed(false);
    setFocus(errors.cpf ? "cpf" : "cep");
  }

  /**
   * "Prosseguir assim mesmo" — envia CPF/CEP como o usuário digitou
   * (sem checksum/formato), sinalizando `skipStrictValidation: true`
   * para o servidor não rejeitar de novo o mesmo valor que o usuário já
   * confirmou querer enviar (achado 2026-07-14 — sem esse sinal, o
   * `apiLeadSchema` do servidor reaplicaria a mesma validação estrita e
   * este botão falharia silenciosamente). Ver lib/leads/types.ts.
   */
  async function handleProsseguirAssimMesmo() {
    setShowCorrectOrProceed(false);
    const raw = getValues();
    const payload: LeadInput = {
      ramo,
      ddd: onlyDigits(raw.ddd),
      celular: onlyDigits(raw.celular),
      cep: raw.cep ? onlyDigits(raw.cep) : undefined,
      nome: raw.nome?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      cpf: raw.cpf ? onlyDigits(raw.cpf) : undefined,
      placa: raw.placa ? raw.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : undefined,
      veiculoAno: undefined,
      veiculoMarcaModelo: undefined,
    };
    await submitPayload(payload, true);
  }

  if (status === "success") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <CheckCircle2 className="size-10 text-brand-500" aria-hidden="true" />
        <p className="font-display text-lg font-bold text-neutral-900">Recebemos seus dados!</p>
        <p className="text-sm text-neutral-500">Em breve um especialista entra em contato para finalizar sua cotação.</p>
      </div>
    );
  }

  const isFinalStep = step === TOTAL_STEPS;
  const isBusy = status === "validating" || status === "submitting";

  return (
    <form
      noValidate
      onFocus={markStarted}
      onSubmit={
        isFinalStep
          ? handleSubmit(onSubmit, onInvalidFinalStep)
          : (event) => {
              event.preventDefault();
              void goNext();
            }
      }
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6"
    >
      <ProgressBar step={step} totalSteps={TOTAL_STEPS} compact={variant === "inline"} />

      {step === 1 && (
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Field label="DDD" htmlFor="ddd" error={errors.ddd?.message}>
            <Input
              id="ddd"
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
            />
          </Field>
          <Field label="Celular" htmlFor="celular" error={errors.celular?.message}>
            <Input
              id="celular"
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
            />
          </Field>
        </div>
      )}

      {step === 2 && (
        <>
          <Field label="Nome" htmlFor="nome" error={errors.nome?.message} hint="Opcional">
            <Input id="nome" autoComplete="name" placeholder="Seu nome" aria-invalid={!!errors.nome} {...nome} />
          </Field>
          <Field label="E-mail" htmlFor="email" error={errors.email?.message} hint="Opcional">
            <Input
              id="email"
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
          <p className="text-sm text-neutral-500">CPF, CEP e placa são opcionais — ou deixe que coletamos no contato.</p>
          <Field label="CPF" htmlFor="cpf" error={errors.cpf?.message} hint="Opcional">
            <Input
              id="cpf"
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
          <Field label="CEP" htmlFor="cep" error={errors.cep?.message} hint="Opcional">
            <Input
              id="cep"
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
            />
          </Field>
          <Field label="Placa" htmlFor="placa" error={errors.placa?.message} hint="Opcional">
            <Input
              id="placa"
              autoComplete="off"
              placeholder="ABC1D23"
              aria-invalid={!!errors.placa}
              {...placa}
              onChange={(event) => {
                event.target.value = formatPlaca(event.target.value);
                void placa.onChange(event);
              }}
            />
          </Field>
        </>
      )}

      {status === "error" && (
        <p role="alert" className="text-sm font-medium text-alert">
          Não foi possível enviar agora. Tente novamente ou fale conosco pelo WhatsApp.
        </p>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <Button type="button" variant="ghost" onClick={goBack} disabled={isBusy}>
            Voltar
          </Button>
        )}
        <Button type="submit" variant="primary" fullWidth loading={isBusy}>
          {isFinalStep ? "Enviar" : "Continuar"}
        </Button>
      </div>

      <AlertDialog open={showCorrectOrProceed} onOpenChange={setShowCorrectOrProceed}>
        <AlertDialogContent>
          <AlertDialogTitle>{errors.cpf && errors.cep ? "CPF e CEP parecem inválidos" : errors.cpf ? "CPF parece inválido" : "CEP parece inválido"}</AlertDialogTitle>
          <AlertDialogDescription>
            {errors.cpf && errors.cep ? "O CPF e o CEP informados" : errors.cpf ? "O CPF informado" : "O CEP informado"} não
            parece{errors.cpf && errors.cep ? "m" : ""} válido{errors.cpf && errors.cep ? "s" : ""}. Você pode corrigir agora
            ou prosseguir assim mesmo — nesse caso, um especialista entra em contato para confirmar seus dados (sem cotação
            automatizada).
          </AlertDialogDescription>
          <div className="mt-5 flex gap-3">
            <Button type="button" variant="ghost" fullWidth onClick={handleCorrigir}>
              Corrigir
            </Button>
            <Button type="button" variant="primary" fullWidth onClick={handleProsseguirAssimMesmo}>
              Prosseguir assim mesmo
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
