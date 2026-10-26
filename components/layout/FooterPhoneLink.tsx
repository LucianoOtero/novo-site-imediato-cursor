"use client";

import { usePathname } from "next/navigation";

import { useContactModal } from "@/components/cta/ContactModalContext";
import { trackEvent } from "@/lib/analytics";
import { ramoPorCaminho } from "@/lib/ramo-por-caminho";

/**
 * FooterPhoneLink — link de telefone do rodapé, isolado em Client
 * Component (integrações 2026-07-08) para poder abrir o
 * `ContactLeadModal` sem forçar `Footer.tsx` (Server Component, Issue
 * 07) a virar client — mesmo padrão já usado em `CookiePreferencesLink`.
 */
export function FooterPhoneLink({
  phoneNumber,
  phoneDisplay,
  location,
  className,
}: {
  /** Número em E.164 (com "+"). */
  phoneNumber: string;
  phoneDisplay: string;
  location: string;
  className?: string;
}) {
  const { open } = useContactModal();
  const ramo = ramoPorCaminho(usePathname());

  return (
    <a
      href={`tel:${phoneNumber}`}
      onClick={(event) => {
        event.preventDefault();
        trackEvent("call_click", { location, ramo });
        open({ channel: "phone", location, ramo, phoneNumber });
      }}
      className={className}
    >
      {phoneDisplay}
    </a>
  );
}
