"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DesktopNav } from "@/components/layout/MegaMenu";
import { MobileDrawer } from "@/components/layout/Drawer";
import { CallButton } from "@/components/cta/CallButton";
import { company } from "@/lib/company";
import { cn } from "@/lib/utils";

/**
 * Header — cabeçalho principal do site (Issue 06).
 * Fonte: ESPECIFICACAO v3.md, seção 5.1 e seção 6.1 (wireframe da Home:
 * "Header Logo · nav · [Ligar] [Cotar agora] — sticky, encolhe ao rolar").
 *
 * Nota: o logo é renderizado como texto (`company.tradeName`) nesta issue.
 * O arquivo SVG oficial (`logotipo-imediato-seguros.svg`, classificado
 * "Migrar obrigatório" em docs/BRAND_ASSETS.md, Issue P-10) ainda não foi
 * copiado para `/public/logos/` — isso é uma migração de asset separada,
 * não parte desta issue (que é apenas estrutura/comportamento do Header).
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full border-b border-neutral-200 bg-white/95 backdrop-blur transition-[padding] duration-200",
        scrolled ? "py-2" : "py-4"
      )}
    >
      <Container className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="rounded-md font-display text-lg font-bold text-brand-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={`${company.tradeName} — página inicial`}
        >
          {company.tradeName}
        </Link>

        <DesktopNav />

        <div className="hidden items-center gap-2 md:flex">
          <CallButton location="header" variant="ghost" size="sm" />
          <Button href="/cotacao" variant="primary" size="sm">
            Cotar agora
          </Button>
        </div>

        <MobileDrawer />
      </Container>
    </header>
  );
}
