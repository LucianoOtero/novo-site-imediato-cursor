"use client";

import { MessageCircle } from "lucide-react";

import { useCurrentRamo } from "@/components/cta/use-current-ramo";
import { useContactModal } from "@/components/cta/ContactModalContext";
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
 * navegar direto — mesmo tratamento do `WhatsAppButton`.
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
        <MessageCircle className="size-7" aria-hidden="true" />
      </a>
    </div>
  );
}
