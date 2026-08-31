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
 * **Logotipo (2026-07-08, novo projeto de marca do cliente)**: o `Header`
 * passou a usar o arquivo `public/logos/imediato-seguros-2026.svg`
 * (lockup completo: ícone "M" + "IMEDIATO"/"SEGUROS" em duas linhas,
 * texto desenhado em `<path>`, não HTML). Antes, o logo era só o texto
 * `company.tradeName` — ver nota histórica em `docs/BRAND_ASSETS.md`.
 *
 * O conteúdo real do arquivo é quase quadrado (proporção ≈0,93:1), não
 * uma faixa larga como um logo de cabeçalho tradicional — por isso a
 * altura do Header aumentou (`h-14`/`md:h-24`, encolhendo para
 * `md:h-16` ao rolar) em vez de manter a altura compacta anterior, a
 * pedido explícito do cliente ("adapte o tamanho e a estrutura do
 * header para que o logotipo fique visível"). Mesmo assim, com cada
 * linha de texto ocupando ~8% da altura do lockup, o texto do logotipo
 * funciona mais como textura de marca do que como texto lido letra a
 * letra — por isso `aria-label` no link carrega o nome acessível real,
 * independente da legibilidade visual do desenho.
 *
 * **Identidade jurídica (2026-08-30):** a barra razão social/CNPJ/SUSEP
 * foi removida daqui; dados regulatórios ficam no Footer.
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
        scrolled ? "py-2" : "py-3"
      )}
    >
      <Container className="flex items-center justify-between gap-2 lg:gap-4">
        <Link
          href="/"
          className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-label={`${company.tradeName} — página inicial`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG local com gradientes; next/image não otimiza SVG, sem benefício da chamada extra ao endpoint de otimização aqui. */}
          <img
            src="/logos/imediato-seguros-2026.svg"
            alt=""
            className={cn(
              "w-auto transition-[height] duration-200",
              // Celular/tablet paisagem baixo: logo md:h-24 comia a dobra
              // (auditoria 2026-08-31). Compacta só quando a altura é crítica.
              scrolled
                ? "h-12 md:h-16 [@media(orientation:landscape)_and_(max-height:500px)]:h-10"
                : "h-14 md:h-24 [@media(orientation:landscape)_and_(max-height:500px)]:h-12"
            )}
          />
        </Link>

        <DesktopNav />

        {/* Texto/padding fluidos + nowrap (2026-08-09): entre md e ~lg o
            header ficava sem largura e "Cotar agora" quebrava em 2 linhas —
            mesmo tratamento dos itens do DesktopNav (ver MegaMenu.tsx). */}
        <div className="hidden shrink-0 items-center gap-1 md:flex lg:gap-2">
          <CallButton
            location="header"
            variant="ghost"
            size="sm"
            className="whitespace-nowrap px-[clamp(0.5rem,1.2vw,1rem)] text-[clamp(0.75rem,1.1vw,0.875rem)]"
          />
          <Button
            href="/cotacao"
            variant="primary"
            size="sm"
            className="whitespace-nowrap px-[clamp(0.625rem,1.3vw,1rem)] text-[clamp(0.75rem,1.1vw,0.875rem)]"
          >
            Cotar agora
          </Button>
        </div>

        <MobileDrawer />
      </Container>
    </header>
  );
}
