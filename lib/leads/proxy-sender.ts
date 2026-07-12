import { isMockMode } from "@/lib/env";
import { buildLegacyProxyPayload } from "@/lib/leads/legacy-proxy-payload";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/proxy-sender.ts — envio genérico com retry exponencial para
 * os proxies Cloud Run legados (EspoCRM/Octadesk, integrações 2026-07-03).
 * Fonte: ESPECIFICACAO v3.md, seção 44.3 (retry 3x/1s-4s-9s), aplicado
 * agora por destino (antes era um único webhook genérico).
 *
 * Extraído de `lib/leads/webhook.ts` (Issue 12) para ser reutilizado por
 * `lib/leads/espocrm.ts` e `lib/leads/octadesk.ts` sem duplicar o loop de
 * retry — os dois destinos usam exatamente o mesmo contrato de payload
 * (`buildLegacyProxyPayload`) e o mesmo comportamento de retry, só a URL
 * e o rótulo de log mudam.
 */
const RETRY_DELAYS_MS = [1000, 4000, 9000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type DestinationResult = { delivered: boolean; attempts: number };

/**
 * Retorna `response.ok`, mas antes disso **loga o corpo da resposta em
 * caso de falha** (achado 2026-07-12: sem isso, uma rejeição real do
 * proxy — ex.: `{"details":"Telefone inválido"}` — ficava indistinguível
 * de um erro genérico nos logs, dificultando o diagnóstico de um bug
 * real de payload que existiu sem ser notado por um tempo). Nunca lança
 * por causa do log — se a leitura do corpo falhar, ignora e segue.
 */
async function sendOnce(label: string, url: string, lead: LeadRecord, payloadName: string): Promise<boolean> {
  const payload = buildLegacyProxyPayload(lead, payloadName);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(corpo não pôde ser lido)");
    console.warn(`[lib/leads/${label}] Resposta não-OK (status ${response.status}) para o lead ${lead.id}: ${body}`);
  }

  return response.ok;
}

/**
 * @param label rótulo curto para logs (ex.: "espocrm", "octadesk").
 * @param url URL do proxy — se ausente ou em mock mode, simula sucesso sem chamada real.
 * @param payloadName valor do campo `name` no payload (ver `buildLegacyProxyPayload`).
 */
export async function sendToLegacyProxy(
  label: string,
  url: string | undefined,
  lead: LeadRecord,
  payloadName: string
): Promise<DestinationResult> {
  if (isMockMode || !url) {
    console.info(`[lib/leads/${label}] Mock mode — simulando envio do lead ${lead.id} (sem URL real configurada).`);
    return { delivered: true, attempts: 0 };
  }

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const ok = await sendOnce(label, url, lead, payloadName);
      if (ok) return { delivered: true, attempts: attempt + 1 };
    } catch (error) {
      console.error(`[lib/leads/${label}] Tentativa ${attempt + 1} falhou para o lead ${lead.id}:`, error);
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  return { delivered: false, attempts: RETRY_DELAYS_MS.length + 1 };
}
