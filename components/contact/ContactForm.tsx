"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";

type FieldErrors = Partial<Record<"nome" | "email" | "telefone" | "assunto" | "mensagem", string[]>>;

/**
 * Formulário da página `/contato` — POST `/api/contact` → e-mail
 * `company.contact.formEmail` (adm@…).
 */
export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      nome: String(formData.get("nome") ?? ""),
      email: String(formData.get("email") ?? ""),
      telefone: String(formData.get("telefone") ?? ""),
      assunto: String(formData.get("assunto") ?? ""),
      mensagem: String(formData.get("mensagem") ?? ""),
      website: String(formData.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        fields?: FieldErrors;
      };

      if (!response.ok || !body.ok) {
        if (body.fields) setFieldErrors(body.fields);
        setErrorMessage(body.error || "Não foi possível enviar. Tente novamente.");
        setStatus("error");
        return;
      }

      trackEvent("contact_form_submit", { location: "contato" });
      form.reset();
      setStatus("success");
    } catch {
      setErrorMessage("Falha de conexão. Verifique sua internet e tente de novo.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-6 text-neutral-800"
        role="status"
      >
        <p className="font-display text-lg font-semibold text-brand-800">Mensagem enviada</p>
        <p className="mt-2 text-sm text-neutral-600">
          Obrigado pelo contato. Nossa equipe responde pelo e-mail informado, em horário comercial.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => setStatus("idle")}
        >
          Enviar outra mensagem
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" htmlFor="contato-nome" error={fieldErrors.nome?.[0]}>
          <Input
            id="contato-nome"
            name="nome"
            autoComplete="name"
            required
            maxLength={120}
            aria-invalid={Boolean(fieldErrors.nome)}
            disabled={status === "loading"}
          />
        </Field>
        <Field label="E-mail" htmlFor="contato-email" error={fieldErrors.email?.[0]}>
          <Input
            id="contato-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.email)}
            disabled={status === "loading"}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone (opcional)" htmlFor="contato-telefone" error={fieldErrors.telefone?.[0]}>
          <Input
            id="contato-telefone"
            name="telefone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="(11) 90000-0000"
            aria-invalid={Boolean(fieldErrors.telefone)}
            disabled={status === "loading"}
          />
        </Field>
        <Field label="Assunto" htmlFor="contato-assunto" error={fieldErrors.assunto?.[0]}>
          <Input
            id="contato-assunto"
            name="assunto"
            required
            maxLength={160}
            aria-invalid={Boolean(fieldErrors.assunto)}
            disabled={status === "loading"}
          />
        </Field>
      </div>

      <Field label="Mensagem" htmlFor="contato-mensagem" error={fieldErrors.mensagem?.[0]}>
        <textarea
          id="contato-mensagem"
          name="mensagem"
          required
          rows={5}
          maxLength={4000}
          aria-invalid={Boolean(fieldErrors.mensagem)}
          disabled={status === "loading"}
          className="flex w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30 aria-invalid:border-alert aria-invalid:focus-visible:ring-alert/30 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </Field>

      {/* Honeypot — oculto de humanos */}
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="contato-website">Website</label>
        <input id="contato-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {errorMessage && (
        <p className="text-sm text-alert" role="alert">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={status === "loading"} className="w-full sm:w-auto">
        {status === "loading" ? "Enviando…" : "Enviar mensagem"}
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
