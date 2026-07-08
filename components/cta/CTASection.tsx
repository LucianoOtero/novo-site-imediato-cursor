"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { WhatsAppButton } from "@/components/cta/WhatsAppButton";
import { CallButton } from "@/components/cta/CallButton";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * CTASection — chamada de meio/fim reutilizável (Issue 15).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("CTA-meio faixa azul 'Receba
 * sua cotação hoje' [Cotar] [WhatsApp]"; "CTA-final 'Fale com um
 * especialista agora' [WhatsApp] [Ligar]") e seção 7 ("CTASection |
 * Chamada de meio/fim | variantes").
 *
 * Um único componente parametrizado (em vez de 2 componentes quase
 * idênticos) — cobre as duas variantes do wireframe via props.
 * `tone="brand"` reusa o `Section` (Issue 08, `bg-brand-700` — o bloco
 * azul da seção 28.6), sem reinventar a cor de fundo aqui.
 */
export interface CTASectionProps {
  ctaId: string;
  location: string;
  heading: string;
  description?: string;
  tone?: "brand" | "neutral";
  showCotarButton?: boolean;
  showCallButton?: boolean;
  ramo?: string;
}

export function CTASection({
  ctaId,
  location,
  heading,
  description,
  tone = "brand",
  showCotarButton = false,
  showCallButton = false,
  ramo,
}: CTASectionProps) {
  const isBrand = tone === "brand";

  return (
    <Section tone={isBrand ? "brand" : "soft"}>
      <Container className="flex flex-col items-center gap-4 text-center">
        <h2 className={cn("font-display text-2xl font-bold md:text-3xl", isBrand ? "text-white" : "text-neutral-900")}>{heading}</h2>
        {description && <p className={cn("max-w-xl", isBrand ? "text-white/80" : "text-neutral-500")}>{description}</p>}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          {showCotarButton && (
            <Button
              render={<Link href="/cotacao" />}
              variant="secondary"
              onClick={() => trackEvent("cta_click", { cta_id: ctaId, location })}
            >
              Cotar agora
            </Button>
          )}
          <WhatsAppButton location={location} ramo={ramo} variant={isBrand ? "secondary" : "whatsapp"} />
          {showCallButton && (
            <CallButton location={location} ramo={ramo} variant={isBrand ? "secondary" : "ghost"} />
          )}
        </div>
      </Container>
    </Section>
  );
}
