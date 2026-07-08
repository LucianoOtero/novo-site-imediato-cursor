"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 */
export interface LeadFormProps {
  ramo: string;
  /** `inline` (dentro do Hero) vs `page` (`/cotacao`, passo a passo completo). */
  variant?: "inline" | "page";
  onSuccess?: (lead: LeadInput) => void | Promise<void>;
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

  const {
    register,
    handleSubmit,
    trigger,
    setFocus,
    formState: { errors },
  } = useForm<LeadFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    mode: "onSubmit",
    defaultValues: { ramo, ddd: "", celular: "", cep: "", nome: "", cpf: "", placa: "" },
  });

  const ddd = register("ddd");
  const celular = register("celular");
  const cep = register("cep");
  const nome = register("nome");
  const cpf = register("cpf");
  const placa = register("placa");

  function markStarted() {
    if (!hasStarted) {
      setHasStarted(true);
      trackEvent("form_start", { form_id: "lead_form", ramo });
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

    const nextStep = (step + 1) as StepNumber;
    setStep(nextStep);
    trackEvent("form_step", { step: nextStep, ramo });
  }

  function goBack() {
    setStep((current) => (current > 1 ? ((current - 1) as StepNumber) : current));
  }

  async function onSubmit(data: LeadInput) {
    setStatus("submitting");
    try {
      const payload: LeadInput = { ...data, ramo, utm: captureUtmFromLocation() };
      await onSuccess?.(payload);
      trackEvent("generate_lead", { ramo, method: "form" });
      setStatus("success");
    } catch {
      setStatus("error");
    }
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
          ? handleSubmit(onSubmit)
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
          <Field label="Nome" htmlFor="nome" error={errors.nome?.message} hint="Opcional">
            <Input id="nome" autoComplete="name" placeholder="Seu nome" aria-invalid={!!errors.nome} {...nome} />
          </Field>
        </>
      )}

      {step === 3 && (
        <>
          <p className="text-sm text-neutral-500">CPF e placa são opcionais — ou deixe que coletamos no contato.</p>
          <Field label="CPF" htmlFor="cpf" error={errors.cpf?.message} hint="Opcional">
            <Input
              id="cpf"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              aria-invalid={!!errors.cpf}
              {...cpf}
              onChange={(event) => {
                event.target.value = formatCpf(event.target.value);
                void cpf.onChange(event);
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
    </form>
  );
}
