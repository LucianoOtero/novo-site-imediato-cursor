"use client";

import { useCurrentRamo } from "@/components/cta/use-current-ramo";
import { useContactModal } from "@/components/cta/ContactModalContext";
import { useStickyCtaVisible } from "@/components/cta/use-sticky-cta-visible";
import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { trackEvent } from "@/lib/analytics";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

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
 *
 * **Tamanho responsivo (2026-07-08, pedido do cliente)**: dobrado no
 * desktop (`size-14` → `md:size-28`, 56px → 112px) para mais destaque —
 * mantém o tamanho original no mobile (56px, já bem acima do mínimo de
 * 44px de alvo de toque exigido pela spec de a11y; dobrar no mobile
 * ocuparia espaço demais de uma tela pequena). Ícone escala junto
 * (`size-7` → `md:size-14`), preservando a mesma proporção ícone/botão
 * (50%) nos dois tamanhos.
 *
 * **Esconder no mobile quando a `StickyCTA` aparece** (mesmo dia,
 * achado ao verificar a responsividade após o ajuste acima): a
 * `StickyCTA` (barra opaca de largura total, mobile-only) ocupa a mesma
 * faixa inferior da tela e fica por cima na ordem do DOM — sem isso, o
 * FAB continuaria "vivo" mas completamente escondido atrás da barra
 * (ela já tem seu próprio ícone de WhatsApp, então não há perda de
 * funcionalidade). `useStickyCtaVisible` (extraído de `StickyCTA`) dá a
 * mesma condição de visibilidade aos dois componentes. No desktop
 * (`StickyCTA` é `md:hidden`) o FAB ignora esse estado — `md:flex`
 * sempre força a exibição a partir desse breakpoint.
 */
export function WhatsAppFAB() {
  const ramo = useCurrentRamo();
  const { open } = useContactModal();
  const stickyCtaVisible = useStickyCtaVisible();

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
        className={cn(
          "fixed right-5 bottom-5 z-30 size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-lg outline-none transition-transform duration-[var(--dur-fast)] hover:scale-105 focus-visible:ring-2 focus-visible:ring-whatsapp focus-visible:ring-offset-2 md:right-10 md:bottom-10 md:size-28 md:flex",
          stickyCtaVisible ? "hidden" : "flex"
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-whatsapp opacity-75 motion-safe:animate-ping motion-reduce:animate-none"
        />
        <WhatsAppIcon className="size-7 md:size-14" />
      </a>
    </div>
  );
}
