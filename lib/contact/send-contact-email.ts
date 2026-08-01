import nodemailer from "nodemailer";

import { company } from "@/lib/company";
import { env } from "@/lib/env";
import type { ContactFormInput } from "@/lib/contact/types";

/**
 * Envia o formulário `/contato` para `company.contact.formEmail`.
 *
 * Prioridade:
 * 1) SMTP (cPanel / revenda) — `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS`
 * 2) Resend — `EMAIL_API_KEY` / `RESEND_API_KEY` (opcional)
 *
 * Remetente: `CONTACT_EMAIL_FROM` ou e-mail comercial da company.
 */
export async function sendContactFormEmail(
  data: ContactFormInput
): Promise<{ sent: boolean; error?: string }> {
  const content = buildMessage(data);

  if (hasSmtpConfig()) {
    return sendViaSmtp(content);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim() || env.emailApiKey?.trim();
  if (apiKey) {
    return sendViaResend(content, apiKey);
  }

  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    console.info("[sendContactFormEmail] DEV mock — e-mail não enviado de fato:", {
      to: content.to,
      assunto: data.assunto,
      de: data.email,
    });
    return { sent: true };
  }

  return {
    sent: false,
    error: "SMTP_* ou EMAIL_API_KEY não configurados para o formulário de contato",
  };
}

type BuiltMessage = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

function buildMessage(data: ContactFormInput): BuiltMessage {
  const telefoneLine = data.telefone?.trim() ? data.telefone.trim() : "(não informado)";
  const text = [
    `Nova mensagem pelo formulário do site (${company.tradeName})`,
    "",
    `Nome: ${data.nome}`,
    `E-mail: ${data.email}`,
    `Telefone: ${telefoneLine}`,
    `Assunto: ${data.assunto}`,
    "",
    "Mensagem:",
    data.mensagem,
  ].join("\n");

  const html = `
    <p><strong>Nova mensagem pelo formulário do site</strong> (${company.tradeName})</p>
    <ul>
      <li><strong>Nome:</strong> ${escapeHtml(data.nome)}</li>
      <li><strong>E-mail:</strong> ${escapeHtml(data.email)}</li>
      <li><strong>Telefone:</strong> ${escapeHtml(telefoneLine)}</li>
      <li><strong>Assunto:</strong> ${escapeHtml(data.assunto)}</li>
    </ul>
    <p><strong>Mensagem:</strong></p>
    <p>${escapeHtml(data.mensagem).replace(/\n/g, "<br />")}</p>
  `.trim();

  return {
    to: company.contact.formEmail,
    from:
      cleanEnv(process.env.CONTACT_EMAIL_FROM) ||
      `${company.tradeName} <${company.contact.email}>`,
    replyTo: data.email,
    subject: `[Contato site] ${data.assunto}`,
    text,
    html,
  };
}

/** Remove CR/LF que às vezes entram ao definir env na Vercel via PowerShell. */
function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/[\r\n]+/g, "").trim();
}

function hasSmtpConfig(): boolean {
  return Boolean(cleanEnv(process.env.SMTP_HOST) && cleanEnv(process.env.SMTP_USER) && cleanEnv(process.env.SMTP_PASS));
}

async function sendViaSmtp(content: BuiltMessage): Promise<{ sent: boolean; error?: string }> {
  const host = cleanEnv(process.env.SMTP_HOST);
  const port = Number(cleanEnv(process.env.SMTP_PORT) || "587");
  const user = cleanEnv(process.env.SMTP_USER);
  const pass = cleanEnv(process.env.SMTP_PASS);
  const secure = cleanEnv(process.env.SMTP_SECURE) === "true" || port === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: content.from,
      to: content.to,
      replyTo: content.replyTo,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    return { sent: true };
  } catch (error) {
    console.error("[sendContactFormEmail] SMTP falhou:", error);
    return { sent: false, error: "Falha SMTP ao enviar e-mail" };
  }
}

async function sendViaResend(
  content: BuiltMessage,
  apiKey: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: content.from,
        to: [content.to],
        reply_to: content.replyTo,
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[sendContactFormEmail] Resend falhou:", response.status, body.slice(0, 400));
      return { sent: false, error: `Resend HTTP ${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error("[sendContactFormEmail] Erro de rede (Resend):", error);
    return { sent: false, error: "Falha de rede ao enviar e-mail" };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
