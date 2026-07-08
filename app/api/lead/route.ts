import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { generateLeadId, leadStore } from "@/lib/leads/store";
import { checkRateLimit, getClientIp, hashIp, verifyTurnstile } from "@/lib/leads/security";
import { apiLeadSchema } from "@/lib/leads/types";
import type { LeadRecord } from "@/lib/leads/types";
import { sendFallbackEmail, sendLeadWebhook } from "@/lib/leads/webhook";
import { enrichLeadWithPh3a } from "@/lib/ph3a";

/**
 * POST /api/lead — Route Handler de captura de lead (Issue 12).
 * Fonte: ESPECIFICACAO v3.md, seções 43/44 (validação/dedup/fallback) e
 * 51 (segurança). Ver `lib/leads/*` para cada camada (store, security,
 * webhook) e seus comentários sobre o que é mock vs. definitivo.
 *
 * Runtime Node (não edge): o store padrão usa `node:fs` (ver
 * lib/leads/store.ts) — não roda no runtime edge.
 *
 * Ordem das camadas (seção 44/51): idempotência → rate limit → parse/
 * validação → honeypot → Turnstile → normalização E.164 → dedupe →
 * persistência → webhook (retry) → fallback + alerta.
 */
export const runtime = "nodejs";

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

function toE164(ddd: string, celular: string): string {
  return `+55${ddd}${celular}`;
}

function buildDedupeKey(phoneE164: string, ramo: string): string {
  return createHash("sha256").update(`${phoneE164}:${ramo}`).digest("hex");
}

async function respond(idempotencyKey: string | null, status: number, body: unknown) {
  if (idempotencyKey) {
    await leadStore.saveIdempotentResponse(idempotencyKey, status, body);
  }
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("x-idempotency-key");

  if (idempotencyKey) {
    const cached = await leadStore.getIdempotentResponse(idempotencyKey);
    if (cached) return NextResponse.json(cached.body, { status: cached.status });
  }

  const ipHash = hashIp(getClientIp(request.headers));
  const rateLimit = checkRateLimit(ipHash);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Muitas tentativas. Tente novamente em instantes." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
      }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return respond(idempotencyKey, 422, { error: "validation", message: "JSON inválido." });
  }

  const parsed = apiLeadSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const fields: Record<string, string> = {};
    for (const [key, messages] of Object.entries(fieldErrors)) {
      if (messages?.[0]) fields[key] = messages[0];
    }
    return respond(idempotencyKey, 422, { error: "validation", fields });
  }

  const data = parsed.data;

  // Honeypot (seção 51): campo que um humano nunca preenche. Se vier
  // preenchido, finge sucesso (não revela ao bot que foi detectado) e
  // não persiste/processa nada de verdade.
  if (data.honeypot) {
    console.warn("[api/lead] Honeypot preenchido — requisição descartada silenciosamente.");
    return respond(idempotencyKey, 201, { leadId: generateLeadId(), redirect: "/obrigado" });
  }

  const turnstileOk = await verifyTurnstile(data.turnstileToken);
  if (!turnstileOk) {
    return respond(idempotencyKey, 403, { error: "challenge_failed", message: "Verificação de segurança falhou." });
  }

  const phoneE164 = toE164(data.ddd, data.celular);
  const dedupeKey = buildDedupeKey(phoneE164, data.ramo);

  const existing = await leadStore.findRecentByDedupeKey(dedupeKey, DEDUPE_WINDOW_MS);
  if (existing) {
    await leadStore.update(existing.id, { utm: data.utm ?? existing.utm });
    return respond(idempotencyKey, 200, { duplicate: true, leadId: existing.id, redirect: "/obrigado" });
  }

  const now = new Date().toISOString();
  const lead: LeadRecord = {
    id: generateLeadId(),
    ramo: data.ramo,
    phoneE164,
    cep: data.cep,
    nome: data.nome,
    cpf: data.cpf,
    placa: data.placa,
    email: data.email,
    veiculoAno: data.veiculoAno,
    veiculoMarcaModelo: data.veiculoMarcaModelo,
    utm: data.utm,
    status: "received",
    dedupeKey,
    createdAt: now,
    updatedAt: now,
    espocrmStatus: "pending",
    espocrmAttempts: 0,
    octadeskStatus: "pending",
    octadeskAttempts: 0,
  };

  // Persiste ANTES de tentar o CRM — "DB é a fonte da verdade" (seção 51):
  // o lead nunca deve depender do sucesso do webhook para existir.
  await leadStore.save(lead);

  // Enriquecimento opcional via PH3A (não-bloqueante) — dispara em
  // paralelo ao webhook, sem atrasar a resposta ao usuário. Simplificação
  // deliberada em relação ao site legado: o resultado só atualiza o
  // nosso próprio LeadRecord (`ph3aSexo`/`ph3aDataNascimento`/
  // `ph3aEstadoCivil`), sem reenviar uma atualização ao EspoCRM depois
  // (o legado tinha um fluxo de "criar" + "atualizar" separado no CRM;
  // replicar isso aqui é trabalho futuro, não crítico enquanto
  // PH3A_ENRICHMENT_ENABLED continua desabilitado por padrão). Ver
  // lib/ph3a.ts.
  void enrichLeadWithPh3a(lead);

  const webhookResult = await sendLeadWebhook(lead);
  await leadStore.update(lead.id, {
    espocrmStatus: webhookResult.espocrm.delivered ? "sent" : "failed",
    espocrmAttempts: webhookResult.espocrm.attempts,
    octadeskStatus: webhookResult.octadesk.delivered ? "sent" : "failed",
    octadeskAttempts: webhookResult.octadesk.attempts,
  });

  if (webhookResult.delivered) {
    await leadStore.update(lead.id, { status: "sent" });
    return respond(idempotencyKey, 201, { leadId: lead.id, redirect: "/obrigado" });
  }

  await leadStore.update(lead.id, { status: "pending_crm" });
  await sendFallbackEmail(lead);
  console.error(
    `[api/lead] ALERTA: lead ${lead.id} não entregue ao EspoCRM após ${webhookResult.attempts} tentativa(s) — status 'pending_crm' (fila), fallback de e-mail acionado. Encaminhar para Sentry/Slack quando integrados (seção 51).`
  );

  return respond(idempotencyKey, 201, { leadId: lead.id, redirect: "/obrigado", queued: true });
}
