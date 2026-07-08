"use client";

import { useEffect, useState } from "react";

/**
 * useStickyCtaVisible — mesma lógica de visibilidade do `StickyCTA`
 * (Issue 19), extraída para hook compartilhado (2026-07-08).
 *
 * Motivo: `WhatsAppFAB` e `StickyCTA` mostram o mesmo CTA de WhatsApp no
 * mobile — quando a `StickyCTA` (barra opaca de largura total) fica
 * visível, ela cobre completamente o `WhatsAppFAB` (mesma faixa inferior
 * da tela, `z-index` igual, `StickyCTA` depois no DOM). Sem coordenação,
 * o FAB fica "vivo" mas invisível atrás da barra. `WhatsAppFAB` usa este
 * hook para se esconder no mobile exatamente quando a `StickyCTA`
 * aparece — no desktop (`StickyCTA` é `md:hidden`) o FAB nunca depende
 * deste valor (ver `hidden md:...` de cada consumidor).
 */
export function useStickyCtaVisible(): boolean {
  const [pastHero, setPastHero] = useState(false);
  const [atFooter, setAtFooter] = useState(false);

  useEffect(() => {
    const handleScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setAtFooter(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return pastHero && !atFooter;
}
