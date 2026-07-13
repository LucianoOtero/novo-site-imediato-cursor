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

export type DestinationResult = { delivered: boolean; attempts: number; responseData?: unknown };

/**
 * Retorna `{ok, responseData}` — além do status, devolve o corpo (JSON)
 * já parseado quando a resposta é OK, para que a chamada (`espocrm.ts`)
 * possa extrair `leadIdFlyingDonkeys`/`opportunityIdFlyingDonkeys` e
 * guardá-los para a atualização final (projeto 2026-07-13, captura em 2
 * fases — mesmo padrão do `MODAL_WHATSAPP_DEFINITIVO.js` legado).
 *
 * Também **loga o corpo da resposta em caso de falha** (achado
 * 2026-07-12: sem isso, uma rejeição real do proxy — ex.:
 * `{"details":"Telefone inválido"}` — ficava indistinguível de um erro
 * genérico nos logs). Nunca lança por causa do log/parse — se a leitura
 * do corpo falhar, ignora e segue.
 *
 * Correção 2026-07-13 (achado ao investigar por que o EspoCRM "aceitava"
 * leads sem e-mail/nome mesmo depois da correção de ontem): o EspoCRM
 * responde **HTTP 200 mesmo quando rejeita o lead internamente** (ex.:
 * `{"status":"error","message":"Campo email é obrigatório"}`, ainda com
 * status HTTP 200) — `response.ok` sozinho não detecta isso. Agora,
 * mesmo com `response.ok === true`, se o corpo trouxer
 * `status === "error"` ou `success === false` explicitamente, trata como
 * falha de verdade (entra no retry, e no fim ativa o `autoSync` do
 * Firebase). Destinos que já usam status HTTP corretos (Octadesk, na
 * maioria dos casos) não são afetados — só reforça a checagem.
 *
 * Achado adicional (mesma investigação): o ambiente PHP do proxy emite
 * avisos HTML (`<b>Warning</b>: file_put_contents(...)`) **antes e
 * depois** do JSON de resposta — `response.json()` (que faz
 * `JSON.parse` direto no corpo inteiro) falha silenciosamente nesse
 * caso, perdendo `leadIdFlyingDonkeys`/`opportunityIdFlyingDonkeys` sem
 * nenhum erro visível. `parseJsonTolerant()` extrai só o trecho entre a
 * primeira `{` e a última `}` do texto antes de fazer o parse.
 */
function parseJsonTolerant(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

async function sendOnce(
  label: string,
  url: string,
  lead: LeadRecord,
  payloadName: string
): Promise<{ ok: boolean; responseData?: unknown }> {
  const payload = buildLegacyProxyPayload(lead, payloadName);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    console.warn(`[lib/leads/${label}] Resposta não-OK (status ${response.status}) para o lead ${lead.id}: ${text}`);
    return { ok: false };
  }

  const responseData = parseJsonTolerant(text);
  const body = responseData as { status?: string; success?: boolean; message?: string } | undefined;
  if (body && (body.status === "error" || body.success === false)) {
    console.warn(
      `[lib/leads/${label}] Resposta HTTP 200, mas corpo indica falha para o lead ${lead.id}: ${body.message ?? JSON.stringify(body)}`
    );
    return { ok: false, responseData };
  }

  return { ok: true, responseData };
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
      const result = await sendOnce(label, url, lead, payloadName);
      if (result.ok) return { delivered: true, attempts: attempt + 1, responseData: result.responseData };
    } catch (error) {
      console.error(`[lib/leads/${label}] Tentativa ${attempt + 1} falhou para o lead ${lead.id}:`, error);
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  return { delivered: false, attempts: RETRY_DELAYS_MS.length + 1 };
}
