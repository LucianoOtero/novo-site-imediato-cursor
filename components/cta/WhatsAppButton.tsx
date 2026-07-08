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
 *
 * **Exceção `skipModal`** (2026-07-08, decisão do cliente): em
 * `/obrigado` (`ObrigadoContent`), o usuário acabou de preencher DDD/
 * celular no `LeadForm` segundos antes — reabrir o modal ali pedindo os
 * mesmos dados é fricção redundante. `skipModal` restaura a navegação
 * direta (sem `ContactLeadModal`) só para esse caso pontual; em todos os
 * outros lugares o padrão (`skipModal` ausente/`false`) continua abrindo
 * o modal.
 */
export interface WhatsAppButtonProps extends Omit<ButtonProps, "href" | "onClick"> {
  location: string;
  ramo?: string;
  /** `true` pula o `ContactLeadModal` e navega direto para o WhatsApp — ver nota acima. */
  skipModal?: boolean;
}

export function WhatsAppButton({ location, ramo, skipModal, children, iconLeft, variant, ...props }: WhatsAppButtonProps) {
  const { open } = useContactModal();

  return (
    <Button
      href={buildWhatsappUrl(ramo)}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant ?? "whatsapp"}
      iconLeft={iconLeft ?? <MessageCircle className="size-4" aria-hidden="true" />}
      onClick={(event) => {
        trackEvent("whatsapp_click", { location, ramo });
        if (!skipModal) {
          event.preventDefault();
          open({ channel: "whatsapp", location, ramo });
        }
      }}
      {...props}
    >
      {children ?? "Falar no WhatsApp"}
    </Button>
  );
}
