import type { Instrumentation } from "next";

/**
 * instrumentation.ts — hook oficial do Next 15 chamado em TODO erro de
 * renderização/rota no servidor (App Router, Pages Router, middleware).
 *
 * Motivação (2026-10-13): em produção o Next omite a mensagem do erro
 * ("An error occurred in the Server Components render… digest") tanto no
 * HTML quanto no console da function — os logs da Vercel mostravam só o
 * digest (`3000337422` em /cotacao e /cotacao-porto, `2676725244` na
 * home) para 68 falhas de regeneração ISR que devolveram HTTP 500 ao
 * AdsBot/Googlebot e reprovaram os anúncios. Este hook recebe o erro
 * ORIGINAL, com mensagem e stack, e grava uma linha JSON no stderr para
 * que apareça nos logs de runtime da Vercel.
 *
 * Não altera o comportamento da resposta; só observabilidade.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as { message?: unknown; stack?: unknown; digest?: unknown; name?: unknown; cause?: unknown };

  console.error(
    "[onRequestError]",
    JSON.stringify({
      name: typeof err?.name === "string" ? err.name : undefined,
      message: typeof err?.message === "string" ? err.message : String(error),
      digest: typeof err?.digest === "string" ? err.digest : undefined,
      stack: typeof err?.stack === "string" ? err.stack : undefined,
      cause: err?.cause instanceof Error ? `${err.cause.name}: ${err.cause.message}` : undefined,
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
      userAgent: request.headers["user-agent"],
    })
  );
};
