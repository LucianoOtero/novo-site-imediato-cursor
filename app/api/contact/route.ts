import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { saveContactMessageToFirebase } from "@/lib/contact/firebase-backup";
import { sendContactFormEmail } from "@/lib/contact/send-contact-email";
import { contactFormSchema } from "@/lib/contact/types";
import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";

/**
 * POST /api/contact — formulário da página `/contato`.
 * Envia e-mail para `company.contact.formEmail` (Resend) e grava backup
 * no Firebase. Rate limit + honeypot.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);
  const rate = checkRateLimit(ipHash, { bucket: "contact" });
  if (!rate.allowed) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Tente novamente em instantes." },
      {
        status: 429,
        headers: rate.retryAfterSeconds
          ? { "Retry-After": String(rate.retryAfterSeconds) }
          : undefined,
      }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Dados inválidos.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (data.website && data.website.length > 0) {
    // Honeypot preenchido — responde sucesso falso (bots).
    return NextResponse.json({ ok: true });
  }

  // 1) SES (principal, timeout curto) — template limpo.
  // 2) Firebase backup — se SES falhar, cron cPanel puxa pendentes.
  const id = randomUUID();
  const emailResult = await sendContactFormEmail(data);

  const saved = await saveContactMessageToFirebase({
    id,
    nome: data.nome,
    email: data.email,
    telefone: data.telefone?.trim() || null,
    assunto: data.assunto,
    mensagem: data.mensagem,
    createdAt: new Date().toISOString(),
    ipHash,
    emailSent: emailResult.sent === true,
  });

  if (emailResult.sent || saved) {
    return NextResponse.json({ ok: true, id });
  }

  console.error("[api/contact] Sem e-mail e sem Firebase:", emailResult.error, "id=", id);
  return NextResponse.json(
    {
      ok: false,
      error:
        "Não foi possível enviar sua mensagem agora. Use telefone, WhatsApp ou e-mail direto.",
    },
    { status: 503 }
  );
}
