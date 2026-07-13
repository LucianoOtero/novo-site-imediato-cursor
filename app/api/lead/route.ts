import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { saveLeadBackupToFirebase } from "@/lib/leads/firebase-backup";
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
  // Captura em 2 fases (projeto 2026-07-13, réplica do modal legado):
  // "initial" — só telefone confirmado, dispara o contato inicial;
  // "complete" (padrão, preserva o comportamento anterior a esta issue)
  // — envio único ou atualização final com os dados completos.
  const stage = data.stage ?? "complete";
  const now = new Date().toISOString();

  // Se for a atualização final de um contato inicial anterior, localiza
  // o registro original (por `leadId`, e por `dedupeKey` como reforço —
  // `leadId` pode não ser encontrado se a chamada anterior caiu numa
  // instância serverless diferente, ver nota de "best-effort" em
  // lib/leads/store.ts) para atualizar em vez de criar um lead duplicado.
  let existingInitial: LeadRecord | null = null;
  if (stage === "complete") {
    const byId = data.leadId ? await leadStore.findById(data.leadId) : null;
    const byDedupe = byId ? null : await leadStore.findRecentByDedupeKey(dedupeKey, DEDUPE_WINDOW_MS);
    const candidate = byId ?? byDedupe;
    if (candidate && candidate.stage === "initial") {
      existingInitial = candidate;
    } else if (candidate) {
      // Já existe um lead "complete" com o mesmo telefone+ramo — comportamento inalterado desde a Issue 12.
      await leadStore.update(candidate.id, { utm: data.utm ?? candidate.utm });
      return respond(idempotencyKey, 200, { duplicate: true, leadId: candidate.id, redirect: "/obrigado" });
    }
  } else {
    // stage === "initial": se já existe um registro (mesmo telefone+ramo,
    // inicial ou completo), não dispara o contato inicial de novo — só
    // devolve o `leadId` existente (idempotente, mesma janela de dedupe).
    const existing = await leadStore.findRecentByDedupeKey(dedupeKey, DEDUPE_WINDOW_MS);
    if (existing) {
      return respond(idempotencyKey, 200, { leadId: existing.id });
    }
  }

  const lead: LeadRecord = existingInitial
    ? {
        ...existingInitial,
        stage: "complete",
        cep: data.cep ?? existingInitial.cep,
        nome: data.nome ?? existingInitial.nome,
        cpf: data.cpf ?? existingInitial.cpf,
        placa: data.placa ?? existingInitial.placa,
        email: data.email ?? existingInitial.email,
        veiculoAno: data.veiculoAno ?? existingInitial.veiculoAno,
        veiculoMarcaModelo: data.veiculoMarcaModelo ?? existingInitial.veiculoMarcaModelo,
        utm: data.utm ?? existingInitial.utm,
        updatedAt: now,
      }
    : {
        id: generateLeadId(),
        stage,
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
  if (existingInitial) {
    await leadStore.update(lead.id, lead);
  } else {
    await leadStore.save(lead);
  }

  // Enriquecimento opcional via PH3A. Simplificação deliberada em relação
  // ao site legado: o resultado só atualiza o nosso próprio LeadRecord
  // (`ph3aSexo`/`ph3aDataNascimento`/`ph3aEstadoCivil`), sem reenviar uma
  // atualização ao EspoCRM depois (o legado tinha um fluxo de "criar" +
  // "atualizar" separado no CRM; replicar isso aqui é trabalho futuro,
  // não crítico enquanto PH3A_ENRICHMENT_ENABLED continua desabilitado
  // por padrão). Ver lib/ph3a.ts.
  //
  // Precisa ser `await` (correção 2026-07-12, mesmo motivo do backup
  // Firebase abaixo) — "fire-and-forget" sem `await` não sobrevive ao
  // possível encerramento da função serverless após a resposta HTTP.
  // `enrichLeadWithPh3a` é rápida quando desabilitada (retorno imediato)
  // e nunca lança.
  await enrichLeadWithPh3a(lead);

  const webhookResult = await sendLeadWebhook(lead);
  await leadStore.update(lead.id, {
    espocrmStatus: webhookResult.espocrm.delivered ? "sent" : "failed",
    espocrmAttempts: webhookResult.espocrm.attempts,
    octadeskStatus: webhookResult.octadesk.delivered ? "sent" : "failed",
    octadeskAttempts: webhookResult.octadesk.attempts,
    // Guarda os IDs do EspoCRM (projeto 2026-07-13, captura em 2 fases)
    // para a atualização final referenciar o mesmo lead/oportunidade —
    // preserva o valor anterior se esta chamada não trouxe um novo (ex.:
    // EspoCRM falhou nesta tentativa, mas já tínhamos o ID de antes).
    espocrmLeadId: webhookResult.espocrmLeadId ?? lead.espocrmLeadId,
    espocrmOpportunityId: webhookResult.espocrmOpportunityId ?? lead.espocrmOpportunityId,
  });

  // Backup no Firebase Realtime Database (paridade com o site legado,
  // 2026-07-12). Se a entrega direta acima falhou, o registro fica com
  // `autoSync: true` e a Cloud Function tenta reentregar. Ver
  // lib/leads/firebase-backup.ts.
  //
  // IMPORTANTE: precisa ser `await`, não "fire-and-forget" (correção
  // 2026-07-12, achado ao validar em produção real na Vercel) — o
  // runtime serverless da Vercel pode congelar/encerrar a função assim
  // que a resposta HTTP é enviada, matando qualquer tarefa em segundo
  // plano ainda pendente (sem `waitUntil`, que não está disponível no
  // runtime Node usado aqui). `saveLeadBackupToFirebase` nunca lança —
  // aguardá-la é seguro e não deixa a resposta vulnerável a um erro daqui.
  await saveLeadBackupToFirebase(lead, webhookResult);

  // Contato inicial (projeto 2026-07-13, captura em 2 fases): devolve só
  // o `leadId`, para a próxima chamada (`stage: "complete"`) atualizar
  // este mesmo registro — sem `redirect` (o modal/formulário decide
  // sozinho quando navegar, normalmente só depois de o usuário terminar
  // de preencher o resto).
  if (stage === "initial") {
    return respond(idempotencyKey, 201, { leadId: lead.id });
  }

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
