"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * ContactModalContext — estado global de qual `ContactLeadModal` está
 * aberto (integrações 2026-07-08, réplica decidida pelo cliente do
 * modal de captura de lead do site legado antes de abrir WhatsApp/
 * telefone — ver `docs/LEGACY_JS_AUDIT.md`).
 *
 * Um Context é necessário porque os pontos de disparo (`WhatsAppButton`,
 * `CallButton`, `WhatsAppFAB`, `StickyCTA`, links de telefone do
 * `Footer`) estão espalhados pela árvore de componentes, em Client
 * Components diferentes — sem um estado compartilhado, cada um teria
 * que renderizar sua própria instância do modal. Renderizado uma única
 * vez em `app/layout.tsx` (`ContactModalProvider` + `<ContactLeadModal />`).
 */
export type ContactModalChannel = "whatsapp" | "phone";

export type OpenContactModalOptions = {
  channel: ContactModalChannel;
  /** De onde o gatilho foi clicado (ex.: "header", "sticky", "fab", "footer_ouvidoria") — igual ao `location` de `trackEvent`. */
  location: string;
  ramo?: string;
  /** Número de telefone em E.164 (com "+") — só relevante para `channel: "phone"`. Se omitido, usa `company.contact.phone`. */
  phoneNumber?: string;
};

type ContactModalContextValue = {
  state: OpenContactModalOptions | null;
  open: (options: OpenContactModalOptions) => void;
  close: () => void;
};

const ContactModalContext = createContext<ContactModalContextValue | null>(null);

export function ContactModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OpenContactModalOptions | null>(null);

  const open = useCallback((options: OpenContactModalOptions) => setState(options), []);
  const close = useCallback(() => setState(null), []);
  const value = useMemo(() => ({ state, open, close }), [state, open, close]);

  return <ContactModalContext.Provider value={value}>{children}</ContactModalContext.Provider>;
}

export function useContactModal(): ContactModalContextValue {
  const context = useContext(ContactModalContext);
  if (!context) {
    throw new Error("useContactModal precisa ser usado dentro de <ContactModalProvider> (ver app/layout.tsx).");
  }
  return context;
}
