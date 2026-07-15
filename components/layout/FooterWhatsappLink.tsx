"use client";

import { useWhatsappHref } from "@/lib/use-whatsapp-href";
import { trackEvent } from "@/lib/analytics";

/**
 * FooterWhatsappLink — link de telefone do rodapé que abre o WhatsApp
 * diretamente (sem o `ContactLeadModal`), a pedido do cliente (2026-07-15)
 * para o número da Ouvidoria. Mesmo padrão de `FooterPhoneLink`, mas sem
 * interceptar o clique para abrir o modal — só troca o `href` (progressive
 * enhancement: funciona com JS desabilitado, permite "abrir em nova aba").
 */
export function FooterWhatsappLink({
  phoneNumber,
  phoneDisplay,
  location,
  className,
}: {
  /** Número em E.164 (com "+") — normalizado internamente para o formato do `wa.me`. */
  phoneNumber: string;
  phoneDisplay: string;
  location: string;
  className?: string;
}) {
  const href = useWhatsappHref(undefined, phoneNumber);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp_click", { location })}
      className={className}
    >
      {phoneDisplay}
    </a>
  );
}
