import { company } from "@/lib/company";
import { env } from "@/lib/env";
import type { ContactFormInput } from "@/lib/contact/types";

/**
 * Envia o formulário de contato para `company.contact.formEmail` via Resend
 * (REST, sem SDK). Usa `EMAIL_API_KEY` (ou `RESEND_API_KEY`) e remetente
 * verificado (`CONTACT_EMAIL_FROM` opcional; padrão: e-mail comercial).
 */
export async function sendContactFormEmail(
  data: ContactFormInput
): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim() || env.emailApiKey?.trim();
  if (!apiKey) {
    // Em desenvolvimento: loga o payload e considera enviado (sem provedor).
    if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
      console.info("[sendContactFormEmail] DEV mock — e-mail não enviado de fato:", {
        to: company.contact.formEmail,
        assunto: data.assunto,
        de: data.email,
      });
      return { sent: true };
    }
    return { sent: false, error: "EMAIL_API_KEY/RESEND_API_KEY não configurada" };
  }

  const to = company.contact.formEmail;
  const from =
    process.env.CONTACT_EMAIL_FROM?.trim() ||
    `${company.tradeName} <${company.contact.email}>`;
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

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: data.email,
        subject: `[Contato site] ${data.assunto}`,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[sendContactFormEmail] Resend falhou:", response.status, body.slice(0, 400));
      return { sent: false, error: `Resend HTTP ${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error("[sendContactFormEmail] Erro de rede:", error);
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
