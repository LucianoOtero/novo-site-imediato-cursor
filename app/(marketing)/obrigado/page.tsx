import type { Metadata } from "next";

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
 */
export const metadata: Metadata = {
  title: "Recebemos seu pedido | Imediato Seguros",
  robots: { index: false, follow: false },
};

export default async function ObrigadoPage({ searchParams }: { searchParams: Promise<{ ramo?: string }> }) {
  const { ramo } = await searchParams;
  return <ObrigadoContent ramo={ramo} />;
}
