import type { Metadata } from "next";
import { Suspense } from "react";

import { ObrigadoContent } from "@/components/lead/ObrigadoContent";

/**
 * `/obrigado` — confirmação pós-lead (Issue 14).
 * Fonte: ESPECIFICACAO v3.md, seção 6.4 (noindex) e seção 15.
 *
 * `ramo` chega via querystring (`?ramo=auto`), passado por quem
 * redireciona para cá (ex.: `CotacaoForm`, Issue 13) — usado para a
 * mensagem de WhatsApp específica do produto e para o parâmetro do
 * evento de analytics.
 *
 * Nota (Issue 20): não usa `buildPageMetadata()` (que adiciona
 * `canonical`/Open Graph) de propósito — é contraditório dar `canonical`
 * a uma página `noindex` (sinaliza "indexe esta versão" e "não indexe"
 * ao mesmo tempo). Metadata mínima e manual aqui é a escolha correta
 * para uma página transacional não indexável.
 *
 * **Correção 2026-07-15** (ver docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md):
 * `ramo` deixou de ser lido aqui via `searchParams` (prop assíncrona do
 * Server Component) — essa era a ÚNICA página do site a usar essa API
 * dinâmica na própria página, e isso correlacionava exatamente com o
 * "Application error" que só ocorria na navegação client-side para
 * `/obrigado`: a captura real do erro mostrou uma promise de metadata
 * (`AsyncMetadataOutlet`) que nunca resolvia (`"error":"$Z"`, chunk `Z`
 * nunca entregue no stream) — presente tanto no carregamento fresco
 * quanto na navegação client-side, mas só fatal na 2ª (o roteador
 * precisa resolver essa promise por completo para montar a página; um
 * carregamento fresco não trava por causa disso). Todas as outras
 * páginas do site são estáticas (não leem `searchParams`/`cookies`/
 * `headers`) e nunca reproduziram o problema — forte correlação com o
 * uso de uma API dinâmica nesta página específica combinado com o
 * mecanismo de streaming de metadata do Next.js 15.
 *
 * `ramo` agora é lido no client, via `useSearchParams()` dentro de
 * `ObrigadoContent` (dentro de um `<Suspense>`, exigência do Next.js
 * para esse hook) — a página volta a ser 100% estática, sem nenhuma
 * API dinâmica no próprio Server Component.
 */
export const metadata: Metadata = {
  title: "Recebemos seu pedido | Imediato Seguros",
  robots: { index: false, follow: false },
};

export default function ObrigadoPage() {
  return (
    <Suspense>
      <ObrigadoContent />
    </Suspense>
  );
}
