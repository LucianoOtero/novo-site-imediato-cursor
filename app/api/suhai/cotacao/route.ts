import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, getClientIp, hashIp } from "@/lib/leads/security";
import { GatewayError, gatewayConfigurado, realizarCotacao } from "@/lib/suhai/gateway";
import { cotacaoInputSchema } from "@/lib/suhai/types";

/**
 * POST /api/suhai/cotacao — executa a cotação Suhai para o formulário
 * `/cotacao-suhai`.
 *
 * A rota nunca fala com a Suhai diretamente: ela valida a entrada e delega
 * ao `suhai-gateway`, que tem o IP da whitelist e as credenciais de Cotador
 * (ver `lib/suhai/gateway.ts`). Sem gateway configurado a resposta vem do
 * gerador simulado, sempre marcada com `simulado: true`.
 *
 * Runtime Node por causa do `google-auth-library` usado na obtenção do
 * token OIDC.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ipHash = hashIp(getClientIp(request.headers));
  const rateLimit = checkRateLimit(ipHash);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { erro: "indisponivel", mensagem: "Muitas tentativas. Aguarde alguns instantes." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
      },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ erro: "validacao", mensagem: "JSON inválido." }, { status: 422 });
  }

  const parsed = cotacaoInputSchema.safeParse(json);
  if (!parsed.success) {
    const campos: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const caminho = issue.path.join(".");
      if (caminho && !campos[caminho]) campos[caminho] = issue.message;
    }
    return NextResponse.json({ erro: "validacao", mensagem: "Dados incompletos.", campos }, { status: 422 });
  }

  try {
    const resultado = await realizarCotacao(parsed.data);
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[api/suhai/cotacao] falha ao cotar", error);

    // Recusa da própria Suhai (ex.: modelo fora da tabela) é informação útil
    // ao cliente; falha de transporte vira mensagem genérica.
    if (error instanceof GatewayError && error.codigoSuhai) {
      return NextResponse.json(
        { erro: "suhai", mensagem: error.message, codigoSuhai: error.codigoSuhai },
        { status: 422 },
      );
    }

    return NextResponse.json(
      {
        erro: gatewayConfigurado() ? "suhai" : "indisponivel",
        mensagem: "Não foi possível calcular agora. Tente novamente em instantes.",
      },
      { status: 502 },
    );
  }
}
