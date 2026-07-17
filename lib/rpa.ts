import { publicEnv } from "@/lib/env";

/**
 * lib/rpa.ts — cotação automatizada via RPA (integrações 2026-07-03).
 * Fonte: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 9), confirmado lendo
 * `webflow_injection_limpo.js` (site legado, classes `MainPage`/
 * `ProgressModalRPA`).
 *
 * Fluxo confirmado:
 * 1. `POST {RPA_API_BASE_URL}/api/rpa/start` com os dados do lead → retorna `{ sessionId }`.
 * 2. Polling em `GET {RPA_API_BASE_URL}/api/rpa/progress/{sessionId}` → `{ progress: { etapa_atual, fase_atual, status, mensagem } }`.
 *
 * Chamada direta do navegador para `rpaimediatoseguros.com.br` (mesmo
 * padrão do site legado) — mesma URL em todos os ambientes (não há
 * variante de dev). Habilitado via `NEXT_PUBLIC_RPA_ENABLED`.
 *
 * Nota de fidelidade: o formato exato dos valores de `status` que
 * indicam conclusão/erro foi confirmado lendo `webflow_injection_limpo.js`
 * (site legado, só consultado como referência — nunca alterado) na
 * investigação de 2026-07-16 — ver `lib/rpa-calculation.ts`
 * (`isRpaErrorStatus`/`isRpaSuccessStatus`) e o hook
 * `lib/leads/use-rpa-calculation.ts`, que consomem este módulo e usam
 * um teto de tentativas (10min) para nunca ficar preso indefinidamente.
 */
export type RpaProgress = {
  etapa_atual?: string;
  fase_atual?: string;
  status?: string;
  mensagem?: string;
};

export class RpaError extends Error {}

export async function startRpaSession(dados: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${publicEnv.rpaApiBaseUrl}/api/rpa/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new RpaError(`Falha ao iniciar sessão RPA: HTTP ${response.status}`);
  }

  const result = (await response.json()) as { sessionId?: string };
  if (!result.sessionId) {
    throw new RpaError("Resposta do RPA não trouxe sessionId.");
  }

  return result.sessionId;
}

export async function fetchRpaProgress(sessionId: string): Promise<RpaProgress> {
  const response = await fetch(`${publicEnv.rpaApiBaseUrl}/api/rpa/progress/${sessionId}`);

  if (!response.ok) {
    throw new RpaError(`Falha ao consultar progresso RPA: HTTP ${response.status}`);
  }

  const result = (await response.json()) as { progress?: RpaProgress };
  return result.progress ?? {};
}

/**
 * Monta o payload enviado ao RPA a partir dos dados já coletados pelo
 * `LeadForm` — mesma convenção de nomes de campo já usada em
 * `lib/leads/legacy-proxy-payload.ts` (mesmo ecossistema legado).
 */
export function buildRpaPayload(dados: {
  ddd: string;
  celular: string;
  ramo: string;
  cep?: string;
  nome?: string;
  cpf?: string;
  placa?: string;
}): Record<string, unknown> {
  return {
    "DDD-CELULAR": `${dados.ddd}-${dados.celular}`,
    CELULAR: dados.celular,
    NOME: dados.nome ?? "",
    CPF: dados.cpf ?? "",
    CEP: dados.cep ?? "",
    PLACA: dados.placa ?? "",
    produto: dados.ramo,
  };
}
