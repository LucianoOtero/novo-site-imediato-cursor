import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";

import { company } from "@/lib/company";
import { env } from "@/lib/env";
import type { ContactFormInput } from "@/lib/contact/types";

const SES_TIMEOUT_MS = 4_000;

/**
 * Envia o formulário `/contato` com template limpo.
 *
 * Prioridade:
 * 1) AWS SES (mesma conta/identidade do legado Cloud Run — `noreply@bpsegurosimediato.com.br`)
 * 2) Em não-produção Vercel: PHP mailer / SMTP cPanel (dev local)
 * 3) Resend (`EMAIL_API_KEY`) — opcional
 *
 * Em produção na Vercel NÃO tenta PHP/SMTP cPanel (timeouts longos + bloqueio
 * de IPs de datacenter). Se SES falhar, a API grava Firebase com
 * `emailSent:false` e o cron cPanel envia o HTML limpo.
 *
 * NÃO usa o Cloud Run `send-email-notification` (template de lead com
 * "ERRO NO ENVIO" — achado 2026-08-01/02).
 */
export async function sendContactFormEmail(
  data: ContactFormInput
): Promise<{ sent: boolean; error?: string }> {
  const content = buildMessage(data);
  const onVercelProd = process.env.VERCEL_ENV === "production";

  if (hasSesConfig()) {
    const viaSes = await sendViaSes(content);
    if (viaSes.sent) return viaSes;
    console.warn("[sendContactFormEmail] SES falhou:", viaSes.error);
  }

  // PHP/SMTP só fora da produção Vercel (evita travar o formulário).
  if (!onVercelProd) {
    const mailerUrl = cleanEnv(process.env.CONTACT_MAILER_URL);
    const mailerSecret = cleanEnv(process.env.CONTACT_MAILER_SECRET);
    if (mailerUrl && mailerSecret) {
      const viaPhp = await sendViaPhpMailer(data, mailerUrl, mailerSecret);
      if (viaPhp.sent) return viaPhp;
      console.warn("[sendContactFormEmail] PHP mailer falhou:", viaPhp.error);
    }

    if (hasSmtpConfig()) {
      const viaSmtp = await sendViaSmtp(content);
      if (viaSmtp.sent) return viaSmtp;
      console.warn("[sendContactFormEmail] SMTP falhou:", viaSmtp.error);
    }
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
    error: "Envio direto indisponível — aguardando cron cPanel via Firebase",
  };
}

type BuiltMessage = {
  to: string[];
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

/** Destinatários do formulário `/contato` (principal + extras). */
export function contactFormRecipients(): string[] {
  const primary = company.contact.formEmail;
  const extra = company.contact.formEmailExtra ?? [];
  return Array.from(new Set([primary, ...extra].map((e) => e.trim()).filter(Boolean)));
}

function buildMessage(data: ContactFormInput): BuiltMessage {
  const telefoneLine = data.telefone?.trim() ? data.telefone.trim() : "(não informado)";
  const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const text = [
    `Nova mensagem pelo formulário do site (${company.tradeName})`,
    "",
    `Nome: ${data.nome}`,
    `E-mail: ${data.email}`,
    `Telefone: ${telefoneLine}`,
    `Assunto: ${data.assunto}`,
    `Data/hora: ${dataHora}`,
    "",
    "Mensagem:",
    data.mensagem,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;white-space:nowrap;"><strong>${label}</strong></td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#222;">${value}</td></tr>`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;">
    <div style="background:#0b3b8c;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:18px;">Nova mensagem — formulário de contato do site</h2>
      <p style="margin:4px 0 0;font-size:13px;opacity:.85;">novo.segurosimediato.com.br → página /contato</p>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-top:none;">
      ${row("Nome", escapeHtml(data.nome))}
      ${row("E-mail", `<a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>`)}
      ${row("Telefone", escapeHtml(telefoneLine))}
      ${row("Assunto", escapeHtml(data.assunto))}
      ${row("Data/hora", escapeHtml(dataHora))}
    </table>
    <div style="background:#f7f8fa;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px;">
      <p style="margin:0 0 8px;color:#666;font-size:13px;"><strong>Mensagem</strong></p>
      <p style="margin:0;color:#222;white-space:pre-wrap;">${escapeHtml(data.mensagem)}</p>
    </div>
    <p style="color:#999;font-size:12px;margin-top:12px;">Responda diretamente a este e-mail para falar com o cliente (reply-to configurado).</p>
  </div>`.trim();

  const sesFrom = cleanEnv(process.env.AWS_SES_FROM);
  const legacySesFrom =
    cleanEnv(process.env.AWS_SES_FROM_NAME) && cleanEnv(process.env.AWS_SES_FROM_EMAIL)
      ? `${cleanEnv(process.env.AWS_SES_FROM_NAME)} <${cleanEnv(process.env.AWS_SES_FROM_EMAIL)}>`
      : "";

  return {
    to: contactFormRecipients(),
    from:
      sesFrom ||
      legacySesFrom ||
      cleanEnv(process.env.CONTACT_EMAIL_FROM) ||
      `${company.tradeName} <${company.contact.email}>`,
    replyTo: data.email,
    subject: `[Contato site] ${data.assunto}`,
    text,
    html,
  };
}

function cleanEnv(value: string | undefined): string {
  return (value ?? "").replace(/[\r\n]+/g, "").trim();
}

function hasSesConfig(): boolean {
  return Boolean(
    cleanEnv(process.env.AWS_SES_REGION || process.env.AWS_REGION) &&
      cleanEnv(process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
      cleanEnv(process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY) &&
      (cleanEnv(process.env.AWS_SES_FROM) ||
        (cleanEnv(process.env.AWS_SES_FROM_EMAIL) && cleanEnv(process.env.AWS_SES_FROM_NAME)) ||
        cleanEnv(process.env.CONTACT_EMAIL_FROM))
  );
}

function hasSmtpConfig(): boolean {
  return Boolean(cleanEnv(process.env.SMTP_HOST) && cleanEnv(process.env.SMTP_USER) && cleanEnv(process.env.SMTP_PASS));
}

async function sendViaSes(content: BuiltMessage): Promise<{ sent: boolean; error?: string }> {
  const region = cleanEnv(process.env.AWS_SES_REGION || process.env.AWS_REGION);
  const accessKeyId = cleanEnv(process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(
    process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  );

  const client = new SESv2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SES_TIMEOUT_MS);

  try {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: content.from,
        Destination: { ToAddresses: content.to },
        ReplyToAddresses: content.replyTo ? [content.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: content.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: content.text, Charset: "UTF-8" },
              Html: { Data: content.html, Charset: "UTF-8" },
            },
          },
        },
      }),
      { abortSignal: controller.signal }
    );
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const name = error && typeof error === "object" && "name" in error ? String((error as { name: string }).name) : "";
    console.error("[sendContactFormEmail] SES falhou:", name || message.slice(0, 200));
    if (name === "AbortError" || message.includes("abort")) {
      return { sent: false, error: "SES timeout" };
    }
    return { sent: false, error: name || message.slice(0, 160) || "Falha SES" };
  } finally {
    clearTimeout(timer);
  }
}

async function sendViaPhpMailer(
  data: ContactFormInput,
  url: string,
  secret: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ImediatoSiteContato/1.0",
      },
      body: JSON.stringify({
        secret,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || "",
        assunto: data.assunto,
        mensagem: data.mensagem,
        createdAt: new Date().toISOString(),
      }),
    });
    const text = await response.text().catch(() => "");
    let body: { success?: boolean } | null = null;
    try {
      body = text ? (JSON.parse(text) as { success?: boolean }) : null;
    } catch {
      body = null;
    }
    if (response.ok && body?.success === true) {
      return { sent: true };
    }
    console.error("[sendContactFormEmail] PHP mailer:", response.status, text.slice(0, 300));
    return { sent: false, error: `PHP mailer HTTP ${response.status}` };
  } catch (error) {
    console.error("[sendContactFormEmail] PHP mailer rede:", error);
    return { sent: false, error: "Falha de rede no PHP mailer" };
  }
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
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 8_000,
        tls: { rejectUnauthorized: false },
      });

      await transporter.sendMail({
        from: content.from,
        to: content.to.join(", "),
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
        to: content.to,
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
