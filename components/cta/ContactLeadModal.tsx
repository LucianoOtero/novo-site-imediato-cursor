"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Phone, X } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/lead/fields";
import { VehicleInfoDisplay } from "@/components/lead/VehicleInfoDisplay";
import { useContactModal } from "@/components/cta/ContactModalContext";
import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { company } from "@/lib/company";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";
import { postLead } from "@/lib/leads/post-lead";
import { getAttributionUtm } from "@/lib/leads/attribution";
import {
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
 * telefone (integrações 2026-07-08; captura em 2 fases + validação em
 * tempo real, projeto 2026-07-13).
 *
 * Réplica, a pedido explícito do cliente, do modal já existente no site
 * legado (`docs/LEGACY_JS_AUDIT.md`, "Achado crítico — WhatsApp e
 * telefone abrem modal de captura de lead antes de navegar"): card
 * flutuante com DDD/Celular obrigatórios e CPF/E-mail/Nome Completo/
 * CEP/Placa opcionais, enviado para o mesmo `/api/lead` que já orquestra
 * EspoCRM/Octadesk (Issue 12 + integrações de 2026-07-03) — **não
 * duplicamos** a gravação direta no Firebase/EspoCRM/Octadesk que o
 * modal legado fazia, reaproveitamos a infraestrutura de lead já
 * existente e mais robusta (idempotência, rate limit, retry, fallback
 * de e-mail).
 *
 * **Ficha do veículo (projeto 2026-07-16)**: os campos "Ano do modelo"
 * e "Marca/modelo", antes digitáveis manualmente, foram substituídos
 * por `VehicleInfoDisplay` — uma visualização somente-leitura,
 * preenchida automaticamente pela consulta à Placa Fipe (nunca
 * digitada pelo usuário). Ver `handlePlacaBlur` abaixo.
 *
 * **Captura em 2 fases** (projeto 2026-07-13, análise detalhada de
 * `MODAL_WHATSAPP_DEFINITIVO.js`): só DDD+Celular ficam visíveis no
 * início (`etapa 1`). No `blur` do celular, se o formato for válido,
 * `etapa 2` (demais campos) aparece com animação, e — em paralelo, sem
 * esperar o resto do formulário — dispara `POST /api/lead` com
 * `stage: "initial"`, que já cria o lead e envia a mensagem inicial via
 * Octadesk (mesmo comportamento do modal legado). O `leadId` devolvido é
 * usado no envio final (`stage: "complete"`) para **atualizar** esse
 * mesmo lead (dados completos), em vez de criar um duplicado.
 *
 * DDD (correção 2026-07-14): `onBlur` chama `trigger("ddd")` — réplica
 * de `$DDD.on('blur.siPhone', ...)` do legado, que valida o DDD de
 * forma independente do celular (feedback imediato ao saltar do
 * campo, sem esperar o blur do celular ou o clique em enviar).
 *
 * Validação em tempo real (CPF/CEP/placa/e-mail): reaproveita a
 * infraestrutura já existente do React Hook Form (`trigger()`/
 * `setError()`) — CPF/CEP/Placa usam checksum/formato local
 * (`lib/validators.ts`); CEP e Placa também consultam, no `onBlur`,
 * `/api/validate/cep` (ViaCEP) e `/api/validate/placa` (proxy "Placa
 * Fipe", que auto-preenche a ficha do veículo quando encontra a placa
 * — projeto 2026-07-14, estendido em 2026-07-16 com campos granulares
 * — ver `VehicleInfoDisplay`); e-mail usa o proxy
 * `/api/validate/email` (SafetyMails, best-effort). Simplificação
 * deliberada em relação ao legado: essas validações **nunca bloqueiam**
 * a navegação final — o submit sempre chega a `sendLeadAndNavigate`
 * (com `skipStrictValidation: true` quando o schema estrito falha, via
 * `onInvalid` — achado 2026-07-14, sem isso o clique no botão não fazia
 * nada quando CPF/CEP/Placa estavam mal formatados).
 *
 * **Skip só após o telefone (decisão do cliente, 2026-08-03)**: o
 * antigo link "Prefiro ir direto, sem preencher" (visível desde a
 * etapa 1 e que navegava sem capturar nada) foi substituído por
 * "Prosseguir sem preencher o resto", exibido **apenas na etapa 2**
 * (telefone já validado, lead `initial` já disparado). Ele é um
 * `type="submit"` estilizado como link: passa pelo mesmo
 * `handleFinalSubmit` do botão principal — atualiza o lead
 * (`stage: "complete"` só com o telefone), dispara a conversão Ads
 * (`whatsapp_modal_submit`) e navega. Quem se recusa a dar o telefone
 * ainda escapa pelo ×/Esc/clique fora (ver `handleDismiss`), agora
 * medido pelo evento `whatsapp_modal_dismiss` (GA4, sem tag Ads).
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
  const [step2Visible, setStep2Visible] = useState(false);
  const initialLeadIdRef = useRef<string | null>(null);
  const initialCallInFlightRef = useRef(false);
  /** Guarda contra reenvio duplicado no submit final — mesmo achado/motivo de `finalSubmitInFlightRef` em `LeadForm.tsx` (ver docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md). */
  const finalSubmitInFlightRef = useRef(false);
  /** Marca que o submit veio do link "Prosseguir sem preencher o resto" — vira `submit_mode: "skip"` no `whatsapp_modal_submit` (telemetria GA4, 2026-08-04). */
  const skipSubmitRef = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContactModalFormValues, unknown, LeadInput>({
    resolver: zodResolver(leadSchema),
    mode: "onSubmit",
    defaultValues: {
      ramo: state?.ramo ?? "auto",
      ddd: "",
      celular: "",
      nome: "",
      email: "",
      cep: "",
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
   * `ContactLeadModal` é renderizado uma única vez, sempre montado (só
   * "esconde" retornando `null` visualmente quando `state` é `null`) —
   * `defaultValues` do `useForm` só roda na montagem inicial, então sem
   * este reset o campo `ramo` ficaria travado no valor da 1ª abertura
   * (ou "auto", se a 1ª renderização ocorreu com `state` ainda nulo).
   * Reseta o formulário e o estado da captura em 2 fases a cada nova
   * abertura, usando o `ramo` do gatilho que acabou de abrir o modal.
   */
  useEffect(() => {
    if (!state) return;
    reset({
      ramo: state.ramo ?? "auto",
      ddd: "",
      celular: "",
      nome: "",
      email: "",
      cep: "",
      cpf: "",
      placa: "",
      veiculoAno: "",
      veiculoMarcaModelo: "",
      veiculoMarca: "",
      veiculoModelo: "",
      veiculoAnoFabricacao: "",
      veiculoAnoModelo: "",
    });
    setStep2Visible(false);
    initialLeadIdRef.current = null;
    initialCallInFlightRef.current = false;
    finalSubmitInFlightRef.current = false;
    skipSubmitRef.current = false;
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

  /**
   * Dispensar sem enviar (×, Esc, clique fora) — corrige o "beco sem
   * saída" do modal legado: ainda leva ao destino. Desde 2026-08-03 o
   * abandono é medido (`whatsapp_modal_dismiss`; `modal_step: 2` indica
   * que o telefone já tinha sido capturado via lead `initial`).
   */
  function handleDismiss() {
    trackEvent("whatsapp_modal_dismiss", {
      form_type: "whatsapp_modal",
      modal_channel: channel,
      location,
      ramo,
      modal_step: step2Visible ? 2 : 1,
    });
    close();
    reset();
    goToDestination();
  }

  /**
   * Contato inicial (projeto 2026-07-13) — disparado uma única vez
   * (`initialCallInFlightRef`) quando DDD+Celular passam a validação
   * local, sem esperar o resto do formulário. Sempre não-bloqueante:
   * falha aqui nunca impede a expansão da etapa 2 nem o envio final.
   *
   * **Conversão Ads no contato inicial (paridade com o legado,
   * 2026-08-04):** emite aqui os mesmos eventos do site legado
   * (`whatsapp_modal_initial_contact`/`phone_modal_initial_contact`),
   * que disparam as tags Ads **legadas** (`ND-wCL…`/`KL9b…`) — mesmo
   * momento e mesma action nos dois braços do experimento. As tags
   * `[NovoSite] Ads - *modal_submit` foram pausadas (GTM v43); o push
   * de `whatsapp_modal_submit` no envio final continua, mas sem tag
   * Ads ativa (funil/GA4).
   */
  async function sendInitialContact() {
    if (initialCallInFlightRef.current) return;
    initialCallInFlightRef.current = true;

    trackEvent(
      channel === "whatsapp" ? "whatsapp_modal_initial_contact" : "phone_modal_initial_contact",
      { form_type: "whatsapp_modal", modal_channel: channel, location, ramo },
    );

    try {
      const values = getValues();
      const response = await postLead({
        ramo: ramo ?? values.ramo,
        ddd: values.ddd,
        celular: values.celular,
        stage: "initial",
        captureChannel: "contact_modal",
        modalChannel: channel,
        utm: getAttributionUtm(),
      });
      const data = (await response.json().catch(() => null)) as { leadId?: string } | null;
      if (data?.leadId) initialLeadIdRef.current = data.leadId;
    } catch (error) {
      console.error("[ContactLeadModal] Falha no contato inicial (não bloqueante):", error);
    }
  }

  /**
   * Validação em tempo real de DDD+Celular (formato local, via o mesmo
   * schema do envio final) — se válido, expande a etapa 2 e dispara o
   * contato inicial. A validação via APILayer (`/api/validate/phone`)
   * roda em paralelo, só para feedback visual (nunca bloqueia a
   * expansão nem o contato inicial já disparado).
   */
  async function handlePhoneBlur() {
    const valid = await trigger(["ddd", "celular"]);
    if (!valid) return;

    setStep2Visible(true);
    void sendInitialContact();

    const { ddd, celular } = getValues();
    fetch("/api/validate/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ddd, celular }),
    })
      .then((response) => response.json())
      .then((result: { ok?: boolean }) => {
        if (result.ok === false) {
          setError("celular", { type: "manual", message: "Não conseguimos confirmar esse celular — revise ou prossiga assim mesmo" });
        }
      })
      .catch(() => {
        // Best-effort — nunca bloqueia (mesma filosofia do restante do projeto).
      });
  }

  /** E-mail é opcional — só valida (formato local + SafetyMails best-effort) se algo foi digitado. */
  async function handleEmailBlur() {
    const email = getValues("email");
    if (!email) return;

    const formatOk = await trigger("email");
    if (!formatOk) return;

    try {
      const response = await fetch("/api/validate/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (result.ok === false) {
        setError("email", { type: "manual", message: "Não conseguimos confirmar esse e-mail — revise ou prossiga assim mesmo" });
      }
    } catch {
      // Best-effort — nunca bloqueia.
    }
  }

  /**
   * CEP é opcional — valida (formato local + ViaCEP best-effort) só se
   * algo foi digitado. Correção 2026-07-14 (mesma de `LeadForm.tsx`):
   * chama `trigger("cep")` primeiro para reportar imediatamente um CEP
   * mal formatado (réplica de `validarCepViaCep`, que retorna
   * `{ok:false, reason:'formato'}` sem chamar a API nesse caso) — antes
   * só retornava silenciosamente, sem nunca mostrar o erro de formato.
   */
  async function handleCepBlur() {
    const formatOk = await trigger("cep");
    const cepValue = getValues("cep");
    if (!formatOk || !cepValue) return;

    try {
      const response = await fetch("/api/validate/cep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cepValue }),
      });
      const result = (await response.json()) as { ok?: boolean };
      if (result.ok === false) {
        setError("cep", { type: "manual", message: "Não encontramos esse CEP — revise ou prossiga assim mesmo" });
      }
    } catch {
      // Best-effort — nunca bloqueia.
    }
  }

  /**
   * Placa é opcional — valida (formato local + Placa Fipe best-effort)
   * e auto-preenche a ficha do veículo quando encontrada. Campos
   * granulares (`veiculoMarca`/`veiculoModelo`/`veiculoAnoFabricacao`/
   * `veiculoAnoModelo`, projeto 2026-07-16) exibidos, somente-leitura,
   * por `VehicleInfoDisplay` — nunca digitados pelo usuário.
   * `veiculoMarcaModelo`/`veiculoAno` (combinados) continuam sendo
   * preenchidos também, só por compatibilidade com a Cloud Function.
   */
  async function handlePlacaBlur() {
    const placaValid = await trigger("placa");
    const placaValue = getValues("placa");
    if (!placaValid || !placaValue) return;

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
        setError("placa", { type: "manual", message: "Não encontramos essa placa — revise ou prossiga assim mesmo" });
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
    }
  }

  /**
   * Envia o lead e navega ao destino — usado tanto quando os dados
   * passam a validação estrita (`onSubmit`) quanto quando não passam
   * (`onInvalid`, abaixo). `skipStrictValidation` avisa o servidor a
   * usar o schema tolerante quando os dados vieram sem validação
   * estrita (mesmo mecanismo do `LeadForm` — ver `lib/leads/types.ts`).
   */
  async function sendLeadAndNavigate(data: LeadInput, skipStrictValidation?: boolean) {
    setSubmitting(true);
    try {
      await postLead({
        ...data,
        ramo: ramo ?? data.ramo,
        stage: "complete",
        captureChannel: "contact_modal",
        modalChannel: channel,
        leadId: initialLeadIdRef.current ?? undefined,
        utm: getAttributionUtm(),
        skipStrictValidation,
      });
    } catch (error) {
      // Não-bloqueante: nunca impedir a navegação por causa de uma falha de rede/servidor.
      console.error("[ContactLeadModal] Falha ao enviar lead (não impede a navegação):", error);
    } finally {
      trackEvent("whatsapp_modal_submit", {
        form_type: "whatsapp_modal",
        modal_channel: channel,
        location,
        ramo,
        submit_mode: skipSubmitRef.current ? "skip" : "full",
      });
      setSubmitting(false);
      close();
      reset();
      goToDestination();
    }
  }

  async function onSubmit(data: LeadInput) {
    await sendLeadAndNavigate(data);
    finalSubmitInFlightRef.current = false;
  }

  /**
   * Achado 2026-07-14: CPF/CEP/Placa têm validação de formato/checksum
   * no schema compartilhado (`lib/validators.ts`) — sem um handler de
   * erro aqui, um valor inválido nesses campos opcionais faria
   * `handleSubmit` não fazer nada (nem enviar, nem navegar),
   * contradizendo a promessa deste modal de nunca bloquear a navegação
   * final por causa desses campos. Envia os valores como o usuário
   * digitou (sem checksum/formato), sinalizando `skipStrictValidation`.
   */
  async function onInvalid() {
    const raw = getValues();
    const payload: LeadInput = {
      ramo: ramo ?? raw.ramo,
      ddd: raw.ddd.replace(/\D/g, ""),
      celular: raw.celular.replace(/\D/g, ""),
      nome: raw.nome?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      cep: raw.cep ? raw.cep.replace(/\D/g, "") : undefined,
      cpf: raw.cpf ? raw.cpf.replace(/\D/g, "") : undefined,
      placa: raw.placa ? raw.placa.toUpperCase().replace(/[^A-Z0-9]/g, "") : undefined,
      veiculoAno: raw.veiculoAno?.trim() || undefined,
      veiculoMarcaModelo: raw.veiculoMarcaModelo?.trim() || undefined,
      veiculoMarca: raw.veiculoMarca?.trim() || undefined,
      veiculoModelo: raw.veiculoModelo?.trim() || undefined,
      veiculoAnoFabricacao: raw.veiculoAnoFabricacao?.trim() || undefined,
      veiculoAnoModelo: raw.veiculoAnoModelo?.trim() || undefined,
    };
    await sendLeadAndNavigate(payload, true);
    finalSubmitInFlightRef.current = false;
  }

  /** Wrapper síncrono — checa/seta o ref antes do `handleSubmit` do RHF rodar, ver `finalSubmitInFlightRef` acima. */
  function handleFinalSubmit(event: React.BaseSyntheticEvent) {
    if (finalSubmitInFlightRef.current) {
      event.preventDefault();
      return;
    }
    finalSubmitInFlightRef.current = true;
    void handleSubmit(onSubmit, onInvalid)(event);
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

          <form onSubmit={handleFinalSubmit} className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
            {/* Etapa 1 — sempre visível (projeto 2026-07-13, réplica do modal legado) */}
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
                  onBlur={(event) => {
                    void register("ddd").onBlur(event);
                    void trigger("ddd");
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
                  onBlur={(event) => {
                    void register("celular").onBlur(event);
                    void handlePhoneBlur();
                  }}
                />
              </Field>
            </div>

            {/* Etapa 2 — aparece só depois do telefone validado (projeto 2026-07-13) */}
            {step2Visible && (
              <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 flex flex-col gap-3 border-t border-neutral-100 pt-3">
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
                  Esses campos são opcionais, mas ajudam a agilizar sua cotação.
                </p>

                {/* Ordem alinhada ao legado: CPF → E-mail → Nome Completo → CEP → Placa */}
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
                    onBlur={(event) => {
                      void register("cpf").onBlur(event);
                      void trigger("cpf");
                    }}
                  />
                </Field>

                <Field label="E-mail" htmlFor="modal-email" error={errors.email?.message} hint="Opcional">
                  <Input
                    id="modal-email"
                    type="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    aria-invalid={!!errors.email}
                    {...register("email")}
                    onBlur={(event) => {
                      void register("email").onBlur(event);
                      void handleEmailBlur();
                    }}
                  />
                </Field>

                <Field label="Nome Completo" htmlFor="modal-nome" error={errors.nome?.message} hint="Opcional">
                  <Input
                    id="modal-nome"
                    autoComplete="name"
                    placeholder="João da Silva"
                    aria-invalid={!!errors.nome}
                    {...register("nome")}
                  />
                </Field>

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
                    onBlur={(event) => {
                      void register("cep").onBlur(event);
                      void handleCepBlur();
                    }}
                  />
                </Field>

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
                    onBlur={(event) => {
                      void register("placa").onBlur(event);
                      void handlePlacaBlur();
                    }}
                  />
                </Field>

                <VehicleInfoDisplay
                  marca={watchedVeiculoMarca}
                  modelo={watchedVeiculoModelo}
                  anoFabricacao={watchedVeiculoAnoFabricacao}
                  anoModelo={watchedVeiculoAnoModelo}
                />

                <Button type="submit" variant={channel === "whatsapp" ? "whatsapp" : "primary"} fullWidth loading={submitting} className="mt-1">
                  {copy.submitLabel}
                </Button>

                {/* Skip pós-telefone (2026-08-03): submit disfarçado de link — envia só o telefone e conta a conversão, em vez de navegar sem registrar nada. */}
                <button
                  type="submit"
                  onClick={() => {
                    skipSubmitRef.current = true;
                  }}
                  disabled={submitting}
                  className="rounded-md text-center text-xs text-neutral-500 underline underline-offset-2 outline-none hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
                >
                  Prosseguir sem preencher o resto
                </button>
              </div>
            )}
          </form>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
