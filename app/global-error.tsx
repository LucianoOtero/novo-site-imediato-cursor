"use client";

import { useEffect } from "react";

import "./globals.css";
import { buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * global-error.tsx — error boundary da raiz (projeto 2026-07-15, ver
 * `docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md`).
 *
 * Convenção especial do Next.js App Router: é o **único** boundary que
 * captura erros lançados no próprio `app/layout.tsx` (raiz) ou em
 * qualquer `layout.tsx` de um grupo de rotas (ex.: `(marketing)`) —
 * `app/(marketing)/error.tsx` não cobre esses casos (regra do Next.js:
 * um `error.tsx` nunca captura erros do `layout.tsx` do mesmo
 * segmento). Como `Header`/`Footer`/`WhatsAppFAB`/`StickyCTA`/
 * `PageAnalytics` são todos renderizados por `app/(marketing)/
 * layout.tsx`, um erro em qualquer um deles (ex.: o bug de
 * `useStickyCtaVisible` corrigido nesta mesma rodada) só é capturado
 * aqui, nunca pelo `error.tsx` do grupo.
 *
 * Por substituir a árvore inteira (inclusive `app/layout.tsx`), este
 * arquivo precisa declarar sua própria `<html>`/`<body>` e não pode
 * depender de nenhum Provider/Context da árvore normal (`useContactModal`,
 * etc.) — por isso usa só um link `<a>` direto para o WhatsApp, em vez
 * do `WhatsAppButton`/`ContactLeadModal` usados no resto do site.
 * `./globals.css` é reimportado aqui de propósito, senão as classes do
 * Tailwind não seriam aplicadas nesta árvore isolada.
 *
 * **Achado 2026-07-15** (mesma lógica de `app/(marketing)/error.tsx`,
 * ver `docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md`): "Tentar
 * novamente" faz um reload completo em vez de `reset()` quando o erro
 * combina com o padrão de incompatibilidade de versão de deploy
 * ("version skew" — navegador com bundle de um deploy anterior
 * tentando renderizar depois que um novo deploy já está no ar).
 * `reset()` só re-renderiza com o MESMO bundle (possivelmente ainda
 * desatualizado); um reload garante buscar o build atual.
 */
const STALE_DEPLOY_ERROR_PATTERN = /Server Components render|ChunkLoadError|Failed to fetch/i;

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  function handleRetry() {
    if (STALE_DEPLOY_ERROR_PATTERN.test(error.message)) {
      window.location.reload();
    } else {
      reset();
    }
  }

  useEffect(() => {
    fetch("/api/debug-client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "global-error-boundary",
        pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        href: typeof window !== "undefined" ? window.location.href : undefined,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
    console.error("[app/global-error.tsx] Erro capturado:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
          <h1 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">Algo deu errado</h1>
          <p className="max-w-md text-neutral-500">
            Não foi possível carregar o site agora. Tente novamente ou fale direto com a gente pelo WhatsApp —
            se você acabou de enviar uma cotação, ela já foi recebida e um especialista vai entrar em contato.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Tentar novamente
            </button>
            <a
              href={buildWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-whatsapp px-5 text-sm font-medium text-white outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Falar no WhatsApp
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- <a> nativo de propósito: `global-error.tsx` substitui a árvore inteira, sem o roteador do Next.js disponível de forma confiável; um hard navigation aqui é o comportamento correto (recarrega a partir de um estado limpo). */}
            <a
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-transparent px-5 text-sm font-medium text-brand-700 outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Voltar ao início
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
