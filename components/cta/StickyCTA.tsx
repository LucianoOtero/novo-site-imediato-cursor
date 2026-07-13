"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useCurrentRamo } from "@/components/cta/use-current-ramo";
import { useContactModal } from "@/components/cta/ContactModalContext";
import { useStickyCtaVisible } from "@/components/cta/use-sticky-cta-visible";
import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { trackEvent } from "@/lib/analytics";
import { useWhatsappHref } from "@/lib/use-whatsapp-href";
import { cn } from "@/lib/utils";

/**
 * StickyCTA — barra fixa mobile (Issue 19).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 ("StickyCTA | barra mobile |
 * some no footer; safe-area | não rouba foco") e seção 30.2 ("Sticky CTA
 * | 200ms | slide-up ao passar do hero; slide-down no footer").
 *
 * "Passar do hero": como o componente `Hero` ainda não existe (issue
 * futura), o limiar usa uma altura de viewport como aproximação
 * razoável — pode ser refinado para medir o Hero real via `ref` quando
 * ele existir, sem mudar a API deste componente.
 *
 * "Não rouba foco": quando oculta (fora da tela), fica `inert` — não é
 * apenas visualmente escondida, também sai da ordem de tab/leitura.
 *
 * `role="complementary"` no wrapper (Issue 23, QA a11y): mesmo motivo
 * do `WhatsAppFAB` — elemento fora de `<Header>`/`<main>`/`<Footer>` no
 * layout, sem isso o axe-core reporta "region" quando visível.
 *
 * **Integrações 2026-07-08**: o botão de WhatsApp abre o
 * `ContactLeadModal` em vez de navegar direto — mesmo tratamento do
 * `WhatsAppButton`/`WhatsAppFAB`. Lógica de visibilidade extraída para
 * `useStickyCtaVisible` (compartilhada com `WhatsAppFAB`, que se esconde
 * no mobile exatamente quando esta barra aparece — evita o FAB ficar
 * escondido atrás da barra opaca, mesma faixa inferior da tela).
 */
export function StickyCTA() {
  const ramo = useCurrentRamo();
  const { open } = useContactModal();
  const visible = useStickyCtaVisible();
  const href = useWhatsappHref(ramo);

  return (
    <div role="complementary" aria-label="Barra de contato rápido">
      <div
        inert={!visible}
        aria-hidden={!visible}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-neutral-200 bg-white p-3 shadow-lg md:hidden",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          "transition-transform duration-200 ease-[var(--ease-standard)]",
          visible ? "translate-y-0" : "translate-y-full"
        )}
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            event.preventDefault();
            trackEvent("whatsapp_click", { location: "sticky", ramo });
            open({ channel: "whatsapp", location: "sticky", ramo });
          }}
          aria-label="Falar no WhatsApp"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-whatsapp text-white outline-none focus-visible:ring-2 focus-visible:ring-whatsapp focus-visible:ring-offset-2"
        >
          <WhatsAppIcon className="size-5" />
        </a>
        <Button
          render={<Link href="/cotacao" />}
          variant="primary"
          fullWidth
          onClick={() => trackEvent("cta_click", { cta_id: "sticky_cotar", location: "sticky" })}
        >
          Cotar agora
        </Button>
      </div>
    </div>
  );
}
