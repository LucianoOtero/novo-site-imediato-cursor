/**
 * lib/suhai/gateway.ts — cliente server-side do `suhai-gateway`.
 *
 * O gateway roda no Cloud Run com saída pelo Cloud NAT, e é o único ponto
 * autorizado a falar com a Suhai: ele tem o IP da whitelist, as credenciais
 * de Cotador e as chaves AES. Nada disso passa pela Vercel nem pelo browser.
 *
 * Enquanto a Suhai não libera o acesso, `SUHAI_GATEWAY_URL` fica vazio e a
 * rota cai no gerador simulado — ver `lib/suhai/mock.ts`.
 */

import { GoogleAuth } from "google-auth-library";

import { gerarCotacaoSimulada } from "./mock";
import { normalizarCotacao, type CotacaoBruta } from "./normalizar";
import type { CotacaoPayload, CotacaoResultado } from "./types";

const GATEWAY_URL = process.env.SUHAI_GATEWAY_URL?.replace(/\/$/, "") ?? "";
const TIMEOUT_MS = Number(process.env.SUHAI_GATEWAY_TIMEOUT_MS ?? 30000);

export function gatewayConfigurado(): boolean {
  return GATEWAY_URL.length > 0;
}

let authCache: GoogleAuth | null = null;

/**
 * O Cloud Run privado exige token OIDC de uma service account — credencial
 * de usuário (ADC do `gcloud auth application-default login`) gera token com
 * audiência errada e leva a 403. Reaproveitamos a mesma conta que o Firebase
 * Admin já usa, que também está configurada na Vercel.
 */
function construirAuth(): GoogleAuth {
  const clientEmail = process.env.SUHAI_GATEWAY_SA_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.SUHAI_GATEWAY_SA_KEY || process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, "\n");

  if (clientEmail && privateKey) {
    return new GoogleAuth({ credentials: { client_email: clientEmail, private_key: privateKey } });
  }

  // Cloud Run, Cloud Functions e afins: a identidade do próprio runtime serve.
  return new GoogleAuth();
}

async function authorizationHeader(): Promise<Record<string, string>> {
  const tokenFixo = process.env.SUHAI_GATEWAY_TOKEN;
  if (tokenFixo) return { authorization: `Bearer ${tokenFixo}` };

  authCache ??= construirAuth();
  const client = await authCache.getIdTokenClient(GATEWAY_URL);
  const headers = await client.getRequestHeaders();
  const authorization = headers.get("authorization");
  return authorization ? { authorization } : {};
}

/** Erro com o código devolvido pelo gateway, para a rota decidir o status. */
export class GatewayError extends Error {
  constructor(
    mensagem: string,
    readonly codigo: string,
    readonly status: number,
    readonly codigoSuhai: string | null = null,
  ) {
    super(mensagem);
    this.name = "GatewayError";
  }
}

async function chamar<T>(caminho: string, corpo: unknown): Promise<T> {
  const headers = {
    "content-type": "application/json",
    ...(await authorizationHeader()),
  };

  const resposta = await fetch(`${GATEWAY_URL}${caminho}`, {
    method: "POST",
    headers,
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  const texto = await resposta.text();

  if (!resposta.ok) {
    // O gateway responde erro em JSON; o Cloud Run, em HTML (403 sem permissão).
    try {
      const json = JSON.parse(texto) as { erro?: string; mensagem?: string; codigoSuhai?: string | null };
      throw new GatewayError(
        json.mensagem ?? `gateway ${caminho} respondeu ${resposta.status}`,
        json.erro ?? "indisponivel",
        resposta.status,
        json.codigoSuhai ?? null,
      );
    } catch (error) {
      if (error instanceof GatewayError) throw error;
      throw new GatewayError(
        `gateway ${caminho} respondeu ${resposta.status}: ${texto.slice(0, 200)}`,
        "indisponivel",
        resposta.status,
      );
    }
  }

  return JSON.parse(texto) as T;
}

/**
 * Executa a cotação (`IncluirCotacaoSuhai`). Sem gateway configurado,
 * devolve a cotação simulada — marcada com `simulado: true` para a UI avisar.
 */
export async function realizarCotacao(payload: CotacaoPayload): Promise<CotacaoResultado> {
  if (!gatewayConfigurado()) return gerarCotacaoSimulada(payload);

  try {
    const bruta = await chamar<CotacaoBruta>("/cotacao", payload);
    return normalizarCotacao(bruta, payload);
  } catch (error) {
    // Gateway no ar mas ainda sem credencial de Cotador: mantém o fluxo
    // navegável com a cotação simulada em vez de quebrar a tela.
    if (error instanceof GatewayError && error.codigo === "sem_credenciais") {
      return gerarCotacaoSimulada(payload);
    }
    throw error;
  }
}

/** Item do catálogo FIPE Suhai, com a grafia exata aceita na cotação. */
export type VeiculoFipe = {
  codFipe: string | null;
  numPassageiros: number | null;
  codMarca: number | null;
  marca: string;
  codModelo: number | null;
  modelo: string;
  codCategoria: number | null;
  categoria: string;
  codCategoriaTarifaria: number | null;
};

/**
 * Consulta o catálogo FIPE da Suhai. Sem `codFipe` a chamada devolve a base
 * inteira — uso previsto apenas na carga diária, nunca por cotação.
 */
export async function consultarFipe(parametros: {
  codFipe?: string;
  codCategoria?: number;
}): Promise<VeiculoFipe[]> {
  if (!gatewayConfigurado()) return [];
  const resposta = await chamar<{ total: number; veiculos: VeiculoFipe[] }>("/fipe/consulta", parametros);
  return resposta.veiculos;
}
