"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Phone, X } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/lead/fields";
import { useContactModal } from "@/components/cta/ContactModalContext";
import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { company } from "@/lib/company";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";
import {
  captureUtmFromLocation,
  formatCelular,
  formatCep,
  formatCpf,
  formatDdd,
  formatPlaca,
  leadSchema,
  type LeadInput,
} from "@/lib/validators";

/**
 * ContactLeadModal — modal de captura de lead antes de abrir WhatsApp/
 * telefone (integrações 2026-07-08).
 *
 * Réplica, a pedido explícito do cliente, do modal já existente no site
 * legado (`docs/LEGACY_JS_AUDIT.md`, "Achado crítico — WhatsApp e
 * telefone abrem modal de captura de lead antes de navegar"): card
 * flutuante com 8 campos (DDD/Celular obrigatórios; Email, CEP, CPF,
 * Placa, Ano do modelo, Marca/modelo opcionais), enviado para o mesmo
 * `/api/lead` que já orquestra EspoCRM/Octadesk (Issue 12 + integrações
 * de 2026-07-03) — **não duplicamos** a gravação direta no Firebase/
 * EspoCRM/Octadesk que o modal legado fazia, reaproveitamos a
 * infraestrutura de lead já existente e mais robusta (idempotência,
 * rate limit, retry, fallback de e-mail).
 *
 * **Correção deliberada em relação ao legado** (decisão do cliente,
 * 2026-07-08): no site legado, fechar o modal no "×" é um "beco sem
 * saída" — nenhuma navegação acontece, o usuário nunca chega ao
 * WhatsApp/telefone. Aqui, **qualquer forma de dispensar o modal sem
 * enviar** (×, Esc, clique fora) ainda leva à mensagem/ligação, sem
 * captura de dados — porque a intenção original do clique (`Falar no
 * WhatsApp`/`Ligar`) deve ser respeitada mesmo se o usuário não quiser
 * preencher o formulário.
 *
 * Envio do lead é não-bloqueante para a navegação: mesmo se `/api/lead`
 * falhar, o usuário ainda chega ao destino (nunca perder a conversão
 * por causa de uma falha de rede/servidor).
 */
type ContactModalFormValues = z.input<typeof leadSchema>;

const CHANNEL_COPY = {
  whatsapp: {
    icon: WhatsAppIcon,
    title: "Solicitar Cotação",
    subtitle: "Quer uma cotação de seguro? Comece pelo seu telefone!",
    submitLabel: "Ir para o WhatsApp",
  },
  phone: {
    icon: Phone,
    title: "Solicitar Cotação",
    subtitle: "Quer uma cotação de seguro? Comece pelo seu telefone!",
    submitLabel: "Ligar agora",
  },
} as const;

export function ContactLeadModal() {
  const { state, close } = useContactModal();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactModalFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    mode: "onSubmit",
    defaultValues: {
      ramo: state?.ramo ?? "auto",
      ddd: "",
      celular: "",
      email: "",
      cep: "",
      cpf: "",
      placa: "",
      veiculoAno: "",
      veiculoMarcaModelo: "",
    },
  });

  /**
   * `ContactLeadModal` é renderizado uma única vez, sempre montado (só
   * "esconde" retornando `null` visualmente quando `state` é `null`) —
   * `defaultValues` do `useForm` só roda na montagem inicial, então sem
   * este reset o campo `ramo` ficaria travado no valor da 1ª abertura
   * (ou "auto", se a 1ª renderização ocorreu com `state` ainda nulo).
   * Reseta o formulário a cada nova abertura, usando o `ramo` do gatilho
   * que acabou de abrir o modal.
   */
  useEffect(() => {
    if (!state) return;
    reset({
      ramo: state.ramo ?? "auto",
      ddd: "",
      celular: "",
      email: "",
      cep: "",
      cpf: "",
      placa: "",
      veiculoAno: "",
      veiculoMarcaModelo: "",
    });
  }, [state, reset]);

  if (!state) return null;

  const { channel, location, ramo, phoneNumber } = state;
  const copy = CHANNEL_COPY[channel];
  const Icon = copy.icon;

  /** Navega para o destino final (WhatsApp em nova aba; discador na mesma aba) — chamado após envio OU após dispensar o modal sem preencher. */
  function goToDestination() {
    if (channel === "whatsapp") {
      window.open(buildWhatsappUrl(ramo), "_blank", "noopener,noreferrer");
    } else {
      window.location.href = `tel:${phoneNumber ?? company.contact.phone}`;
    }
  }

  /** Dispensar sem enviar (×, Esc, clique fora) — corrige o "beco sem saída" do modal legado: ainda leva ao destino. */
  function handleDismiss() {
    close();
    reset();
    goToDestination();
  }

  async function onSubmit(data: LeadInput) {
    setSubmitting(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ ...data, ramo: ramo ?? data.ramo, utm: captureUtmFromLocation() }),
      });
    } catch (error) {
      // Não-bloqueante: nunca impedir a navegação por causa de uma falha de rede/servidor.
      console.error("[ContactLeadModal] Falha ao enviar lead (não impede a navegação):", error);
    } finally {
      trackEvent("whatsapp_modal_submit", { form_type: "whatsapp_modal", modal_channel: channel, location, ramo });
      setSubmitting(false);
      close();
      reset();
      goToDestination();
    }
  }

  return (
    <DialogPrimitive.Root open={!!state} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-neutral-900/30 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-h-[85vh] w-auto max-w-sm flex-col overflow-hidden rounded-xl bg-white shadow-2xl outline-none transition-all sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 bg-linear-to-br from-brand-500 to-brand-700 px-5 py-4 text-white">
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <DialogPrimitive.Title className="font-display text-base font-bold">{copy.title}</DialogPrimitive.Title>
                <p className="mt-0.5 text-sm text-white/90">{copy.subtitle}</p>
              </div>
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar e continuar sem preencher"
              className="shrink-0 rounded-md p-1 text-white/80 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-[4.5rem_1fr] gap-3">
              <Field label="DDD" htmlFor="modal-ddd" error={errors.ddd?.message}>
                <Input
                  id="modal-ddd"
                  inputMode="numeric"
                  autoComplete="tel-area-code"
                  placeholder="11"
                  maxLength={2}
                  aria-invalid={!!errors.ddd}
                  {...register("ddd")}
                  onChange={(event) => {
                    event.target.value = formatDdd(event.target.value);
                    void register("ddd").onChange(event);
                  }}
                />
              </Field>
              <Field label="Celular" htmlFor="modal-celular" error={errors.celular?.message}>
                <Input
                  id="modal-celular"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="98765-4321"
                  aria-invalid={!!errors.celular}
                  {...register("celular")}
                  onChange={(event) => {
                    event.target.value = formatCelular(event.target.value);
                    void register("celular").onChange(event);
                  }}
                />
              </Field>
            </div>

            <Field label="E-mail" htmlFor="modal-email" error={errors.email?.message} hint="Opcional">
              <Input id="modal-email" type="email" autoComplete="email" placeholder="voce@email.com" aria-invalid={!!errors.email} {...register("email")} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="CEP" htmlFor="modal-cep" error={errors.cep?.message} hint="Opcional">
                <Input
                  id="modal-cep"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  aria-invalid={!!errors.cep}
                  {...register("cep")}
                  onChange={(event) => {
                    event.target.value = formatCep(event.target.value);
                    void register("cep").onChange(event);
                  }}
                />
              </Field>
              <Field label="CPF" htmlFor="modal-cpf" error={errors.cpf?.message} hint="Opcional">
                <Input
                  id="modal-cpf"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  aria-invalid={!!errors.cpf}
                  {...register("cpf")}
                  onChange={(event) => {
                    event.target.value = formatCpf(event.target.value);
                    void register("cpf").onChange(event);
                  }}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Placa" htmlFor="modal-placa" error={errors.placa?.message} hint="Opcional">
                <Input
                  id="modal-placa"
                  autoComplete="off"
                  placeholder="ABC1D23"
                  aria-invalid={!!errors.placa}
                  {...register("placa")}
                  onChange={(event) => {
                    event.target.value = formatPlaca(event.target.value);
                    void register("placa").onChange(event);
                  }}
                />
              </Field>
              <Field label="Ano do modelo" htmlFor="modal-ano" error={errors.veiculoAno?.message} hint="Opcional">
                <Input id="modal-ano" inputMode="numeric" placeholder="2020" maxLength={4} {...register("veiculoAno")} />
              </Field>
            </div>

            <Field label="Marca/modelo" htmlFor="modal-veiculo" error={errors.veiculoMarcaModelo?.message} hint="Opcional">
              <Input id="modal-veiculo" placeholder="Ex.: Fiat Uno Vivace 1.4 flex" {...register("veiculoMarcaModelo")} />
            </Field>

            <Button type="submit" variant={channel === "whatsapp" ? "whatsapp" : "primary"} fullWidth loading={submitting} className="mt-1">
              {copy.submitLabel}
            </Button>

            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-md text-center text-xs text-neutral-500 underline underline-offset-2 outline-none hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              Prefiro ir direto, sem preencher
            </button>
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
