"use client";

import { useCurrentRamo } from "@/components/cta/use-current-ramo";
import { useContactModal } from "@/components/cta/ContactModalContext";
import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { trackEvent } from "@/lib/analytics";
import { buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * WhatsAppFAB — botão flutuante de WhatsApp (Issue 19).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 ("FloatingCTA/WhatsAppFAB |
 * WhatsApp · multi | msg por ramo | label descritivo") e seção 16
 * (sistema de CTAs: "... · WhatsApp FAB").
 *
 * Renderizado uma vez no layout `(marketing)` — aparece em todas as
 * páginas do grupo, com posição fixa.
 *
 * `role="complementary"` no wrapper (Issue 23, QA a11y): o FAB é
 * renderizado como irmão de `<Header>`/`<main>`/`<Footer>` no layout —
 * sem isso, o axe-core reporta a violação "region" (conteúdo fora de
 * qualquer landmark).
 *
 * **Integrações 2026-07-08**: abre o `ContactLeadModal` em vez de
 * navegar direto — mesmo tratamento do `WhatsAppButton`. Ícone trocado
 * de `MessageCircle` (genérico) para `WhatsAppIcon` (glifo original da
 * marca) e adicionado anel pulsante (`animate-ping`), replicando o
 * comportamento do FAB do site legado ("símbolo original verde do
 * WhatsApp pulsando" — pedido do cliente). `motion-reduce:animate-none`
 * desliga o pulso para quem prefere movimento reduzido (a11y).
 */
export function WhatsAppFAB() {
  const ramo = useCurrentRamo();
  const { open } = useContactModal();

  return (
    <div role="complementary" aria-label="Atalho de contato">
      <a
        href={buildWhatsappUrl(ramo)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => {
          event.preventDefault();
          trackEvent("whatsapp_click", { location: "fab", ramo });
          open({ channel: "whatsapp", location: "fab", ramo });
        }}
        aria-label="Falar no WhatsApp"
        className="fixed right-5 bottom-5 z-30 flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg outline-none transition-transform duration-[var(--dur-fast)] hover:scale-105 focus-visible:ring-2 focus-visible:ring-whatsapp focus-visible:ring-offset-2 md:right-8 md:bottom-8"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-whatsapp opacity-75 motion-safe:animate-ping motion-reduce:animate-none"
        />
        <WhatsAppIcon className="size-7" />
      </a>
    </div>
  );
}
