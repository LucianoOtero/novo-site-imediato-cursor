"use client";

import { MessageCircle } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useContactModal } from "@/components/cta/ContactModalContext";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";

/**
 * WhatsAppButton — botão de WhatsApp com tracking (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 20 ("whatsapp_click | clique
 * WhatsApp | location, ramo").
 *
 * Extraído de `ObrigadoContent` (Issue 14) — o mesmo padrão (Button +
 * `buildWhatsappUrl` + evento `whatsapp_click`) ia se repetir em
 * `CTASection` (Issue 15); centralizar aqui evita a 3ª cópia inline.
 * `StickyCTA` (Issue 19) mantém seu próprio anchor — é um ícone
 * quadrado de 44px sem label, um padrão visual diferente o suficiente
 * para não valer a pena forçar nesta mesma API.
 *
 * **Integrações 2026-07-08**: o clique não navega mais direto — abre o
 * `ContactLeadModal` (réplica do modal do site legado, decisão do
 * cliente). `href` continua apontando para a URL real do WhatsApp
 * (progressive enhancement: funciona com JS desabilitado, permite
 * "abrir em nova aba"/"copiar link" no botão direito do mouse) — o
 * `onClick` intercepta o clique padrão e abre o modal no lugar.
 */
export interface WhatsAppButtonProps extends Omit<ButtonProps, "href" | "onClick"> {
  location: string;
  ramo?: string;
}

export function WhatsAppButton({ location, ramo, children, iconLeft, variant, ...props }: WhatsAppButtonProps) {
  const { open } = useContactModal();

  return (
    <Button
      href={buildWhatsappUrl(ramo)}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant ?? "whatsapp"}
      iconLeft={iconLeft ?? <MessageCircle className="size-4" aria-hidden="true" />}
      onClick={(event) => {
        event.preventDefault();
        trackEvent("whatsapp_click", { location, ramo });
        open({ channel: "whatsapp", location, ramo });
      }}
      {...props}
    >
      {children ?? "Falar no WhatsApp"}
    </Button>
  );
}
