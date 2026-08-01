import nodemailer from "nodemailer";

import { company } from "@/lib/company";
import { env } from "@/lib/env";
import type { ContactFormInput } from "@/lib/contact/types";

/**
 * Envia o formulário `/contato`.
 *
 * Prioridade (produção na Vercel):
 * 1) Cloud Run `send-email-notification` (HTTPS — já usado nos leads; SMTP
 *    cPanel costuma falhar a partir do serverless da Vercel)
 * 2) SMTP cPanel (`SMTP_*`) — útil em dev/local
 * 3) Resend (`EMAIL_API_KEY`) — opcional
 */
export async function sendContactFormEmail(
  data: ContactFormInput
): Promise<{ sent: boolean; error?: string }> {
  const content = buildMessage(data);

  if (cleanEnv(process.env.SEND_EMAIL_NOTIFICATION_URL)) {
    const viaCloudRun = await sendViaAdminCloudRun(data, content);
    if (viaCloudRun.sent) return viaCloudRun;
    console.warn("[sendContactFormEmail] Cloud Run falhou, tentando SMTP/Resend:", viaCloudRun.error);
  }

  if (hasSmtpConfig()) {
    const viaSmtp = await sendViaSmtp(content);
    if (viaSmtp.sent) return viaSmtp;
    console.warn("[sendContactFormEmail] SMTP falhou:", viaSmtp.error);
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
    error: "Nenhum provedor de e-mail configurado/respondendo (Cloud Run, SMTP ou Resend)",
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

/**
 * Reaproveita o Cloud Run de notificação admin dos leads (HTTPS).
 * Destinatários são os configurados no serviço (não necessariamente formEmail).
 */
async function sendViaAdminCloudRun(
  data: ContactFormInput,
  content: BuiltMessage
): Promise<{ sent: boolean; error?: string }> {
  const url = cleanEnv(process.env.SEND_EMAIL_NOTIFICATION_URL);
  if (!url) return { sent: false, error: "SEND_EMAIL_NOTIFICATION_URL ausente" };

  const phone = parseBrPhone(data.telefone);
  const ddd = phone?.ddd ?? "11";
  const celular = phone?.celular ?? "32301422";

  const payload = {
    ddd,
    celular,
    cpf: "",
    nome: `[Contato site] ${data.nome}`,
    email: data.email,
    cep: "",
    placa: "",
    gclid: "",
    momento: "update",
    momento_descricao: `Formulário /contato — ${data.assunto}`,
    momento_emoji: "✉️",
    erro: {
      message: content.text,
      status: null,
      code: "contact_form",
      response_data: null,
    },
  };

  try {
    const response = await fetch(url.replace(/\/?$/, "/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Modal-WhatsApp-EmailNotification-v1.0",
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text().catch(() => "");
    let body: { success?: boolean; total_sent?: number } | null = null;
    try {
      body = text ? (JSON.parse(text) as { success?: boolean; total_sent?: number }) : null;
    } catch {
      body = null;
    }

    if (response.ok && body?.success === true) {
      return { sent: true };
    }

    console.error("[sendContactFormEmail] Cloud Run sem sucesso:", response.status, text.slice(0, 400));
    return { sent: false, error: `Cloud Run HTTP ${response.status}` };
  } catch (error) {
    console.error("[sendContactFormEmail] Cloud Run rede:", error);
    return { sent: false, error: "Falha de rede no Cloud Run de e-mail" };
  }
}

function parseBrPhone(raw: string | undefined): { ddd: string; celular: string } | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  // 5511976687668 ou 11976687668
  if (digits.startsWith("55") && digits.length >= 12) {
    return { ddd: digits.slice(2, 4), celular: digits.slice(4) };
  }
  if (digits.length >= 10) {
    return { ddd: digits.slice(0, 2), celular: digits.slice(2) };
  }
  return null;
}

async function sendViaSmtp(content: BuiltMessage): Promise<{ sent: boolean; error?: string }> {
  const host = cleanEnv(process.env.SMTP_HOST);
  const configuredPort = Number(cleanEnv(process.env.SMTP_PORT) || "465");
  const user = cleanEnv(process.env.SMTP_USER);
  const pass = cleanEnv(process.env.SMTP_PASS);
  const portsToTry =
    configuredPort === 465 ? [465, 587] : configuredPort === 587 ? [587, 465] : [configuredPort, 465, 587];

  let lastError = "Falha SMTP ao enviar e-mail";

  for (const port of portsToTry) {
    const secure = port === 465 || (port === configuredPort && cleanEnv(process.env.SMTP_SECURE) === "true");
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 20_000,
        tls: { rejectUnauthorized: false },
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
      lastError = error instanceof Error ? error.message : "Falha SMTP ao enviar e-mail";
      console.error(`[sendContactFormEmail] SMTP porta ${port} falhou:`, lastError);
    }
  }

  return { sent: false, error: lastError };
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
