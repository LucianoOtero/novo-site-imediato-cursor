"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * error.tsx — error boundary do grupo de rotas `(marketing)` (projeto
 * 2026-07-15, ver `docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md`).
 *
 * **Por que este arquivo é a peça central da correção**: sem nenhum
 * `error.tsx`/`global-error.tsx` no projeto, qualquer erro de render do
 * lado do cliente caía no fallback genérico e assustador do Next.js
 * ("Application error: a client-side exception has occurred...").
 * Convenção nativa do App Router — recebe `{ error, reset }` com o
 * objeto `Error` **real** (incluindo `digest`), diferente da
 * instrumentação anterior (`window.addEventListener("error", ...)` em
 * `PageAnalytics.tsx`), que nunca capturava nada porque erros de
 * *render* do React são tratados internamente (só `console.error`) e
 * nunca se tornam um evento global `error`/`unhandledrejection`.
 *
 * **Limite importante**: este boundary cobre `page.tsx` (o conteúdo
 * dentro de `<main>`) de cada rota do grupo — **não** cobre o próprio
 * `app/(marketing)/layout.tsx` (Header, Footer, WhatsAppFAB, StickyCTA,
 * PageAnalytics, FraudAlert), já que um `error.tsx` nunca captura erros
 * do layout do mesmo segmento (regra do Next.js). Erros nesses
 * componentes só são capturados por `app/global-error.tsx` (raiz).
 *
 * Reporta o erro para `/api/debug-client-error` (mesmo endpoint da
 * instrumentação antiga, agora recebendo o tipo de erro certo) e
 * mostra uma UI de recuperação simples e deliberadamente conservadora
 * (sem hooks/contexto além do essencial) — um error boundary que
 * quebra sozinho não tem mais nenhuma rede de segurança abaixo dele.
 *
 * **Achado 2026-07-15 (primeira captura real, ver documento)**: o erro
 * relatado em `/obrigado` é "An error occurred in the Server
 * Components render" — mensagem genérica que o Next.js usa em
 * produção tanto para uma exceção real num Server Component quanto
 * para uma falha ao buscar/interpretar o payload de RSC por
 * incompatibilidade de versão (o navegador ainda com o bundle de um
 * deploy anterior tenta navegar depois que um novo deploy já está no
 * ar — "version skew"). `isLikelyStaleDeployError()` detecta esse
 * padrão e troca "Tentar novamente" de `reset()` (só re-renderiza com
 * o MESMO bundle, possivelmente ainda desatualizado) para um reload
 * completo (`window.location.reload()`, garante buscar o build atual).
 */
const STALE_DEPLOY_ERROR_PATTERN = /Server Components render|ChunkLoadError|Failed to fetch/i;

function isLikelyStaleDeployError(error: Error): boolean {
  return STALE_DEPLOY_ERROR_PATTERN.test(error.message);
}

export default function MarketingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/debug-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "error-boundary",
        pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        href: typeof window !== "undefined" ? window.location.href : undefined,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
    console.error("[app/(marketing)/error.tsx] Erro capturado:", error);
  }, [error]);

  function handleRetry() {
    if (isLikelyStaleDeployError(error)) {
      window.location.reload();
    } else {
      reset();
    }
  }

  return (
    <Section>
      <Container className="mx-auto max-w-lg text-center">
        <div role="alert" className="flex flex-col items-center gap-4">
          <AlertTriangle className="size-14 text-alert" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">Algo deu errado</h1>
          <p className="text-neutral-500">
            Não foi possível carregar esta página agora. Tente novamente ou fale direto com a gente pelo
            WhatsApp — se você acabou de enviar uma cotação, ela já foi recebida e um especialista vai entrar
            em contato.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleRetry} variant="primary">
            Tentar novamente
          </Button>
          <Button href={buildWhatsappUrl()} target="_blank" rel="noopener noreferrer" variant="whatsapp">
            Falar no WhatsApp
          </Button>
          <Button href="/" variant="ghost">
            Voltar ao início
          </Button>
        </div>
      </Container>
    </Section>
  );
}
