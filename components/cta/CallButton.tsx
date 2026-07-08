"use client";

import { Phone } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useContactModal } from "@/components/cta/ContactModalContext";
import { company } from "@/lib/company";
import { trackEvent } from "@/lib/analytics";

/**
 * CallButton — botão de ligação com tracking (Issue 19).
 * Fonte: ESPECIFICACAO v3.md, seção 20 ("call_click | clique telefone |
 * location, ramo"). Telefone sempre de `lib/company.ts` — nunca hardcoded
 * (seção 55).
 *
 * **Integrações 2026-07-08**: mesmo tratamento do `WhatsAppButton` — o
 * clique abre o `ContactLeadModal` em vez de discar direto (réplica do
 * modal do site legado, decisão do cliente). `href="tel:..."` continua
 * presente para progressive enhancement.
 */
export interface CallButtonProps extends Omit<ButtonProps, "href" | "onClick"> {
  /** De onde o botão é clicado (ex.: "header", "sticky", "obrigado"). */
  location: string;
  ramo?: string;
  /** Número em E.164 (com "+") — se omitido, usa o telefone principal (`company.contact.phone`). */
  phoneNumber?: string;
}

export function CallButton({ location, ramo, phoneNumber, children, iconLeft, ...props }: CallButtonProps) {
  const { open } = useContactModal();
  const numberToCall = phoneNumber ?? company.contact.phone;

  return (
    <Button
      href={`tel:${numberToCall}`}
      onClick={(event) => {
        event.preventDefault();
        trackEvent("call_click", { location, ramo });
        open({ channel: "phone", location, ramo, phoneNumber: numberToCall });
      }}
      iconLeft={iconLeft ?? <Phone className="size-4" aria-hidden="true" />}
      {...props}
    >
      {children ?? "Ligar"}
    </Button>
  );
}
