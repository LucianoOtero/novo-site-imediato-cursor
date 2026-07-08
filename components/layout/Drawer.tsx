"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CallButton } from "@/components/cta/CallButton";
import { company } from "@/lib/company";
import { aImediatoNavLinks, mainNavLinks, segurosNavLinks, type NavLink } from "@/components/layout/nav-data";

const navLinkClass =
  "flex min-h-11 items-center rounded-md px-2 text-base text-neutral-900 outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-500";

/**
 * Drawer — menu mobile do Header (Issue 06).
 * Fonte: ESPECIFICACAO v3.md, seção 5.1 (mobile: logo + botão Cotar + menu
 * hambúrguer/drawer) e seção 29.3 ("Drawer/Sheet | ... | focus trap;
 * retorno de foco").
 *
 * Usa `@base-ui/react/drawer` (`modal` por padrão): focus trap, bloqueio
 * de scroll da página e fechamento por Esc já são nativos do primitivo —
 * não foram reimplementados manualmente.
 *
 * Nota de a11y: o estado `open` é controlado (em vez de usar
 * `DrawerPrimitive.Close` nos links de navegação) porque `Close` é
 * baseado no mesmo primitivo `Button` do Base UI, que força semântica de
 * botão (`role="button"`) mesmo quando renderizado como `<a>` via
 * `render`. Itens de navegação real devem manter `role="link"` — por
 * isso fecham o drawer via `onClick` (`setOpen(false)`), e `Close` é
 * usado apenas no botão "X", que é uma ação de fechar de fato.
 */
export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <DrawerPrimitive.Root modal swipeDirection="right" open={open} onOpenChange={setOpen}>
      <DrawerPrimitive.Trigger
        aria-label="Abrir menu"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-brand-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:hidden"
      >
        <Menu className="size-6" aria-hidden="true" />
      </DrawerPrimitive.Trigger>

      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Backdrop className="fixed inset-0 z-40 bg-neutral-900/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DrawerPrimitive.Viewport className="fixed inset-y-0 right-0 z-50 w-[min(20rem,85vw)]">
          <DrawerPrimitive.Popup className="flex h-full w-full flex-col overflow-y-auto bg-white shadow-lg outline-none transition-transform data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <DrawerPrimitive.Title className="font-display text-lg font-bold text-neutral-900">
                Menu
              </DrawerPrimitive.Title>
              <DrawerPrimitive.Close
                aria-label="Fechar menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <X className="size-5" aria-hidden="true" />
              </DrawerPrimitive.Close>
            </div>

            <nav aria-label="Navegação principal (mobile)" className="flex-1 px-5 py-4">
              <NavSection title="Seguros" links={segurosNavLinks} onNavigate={close} />
              <NavSection title="A Imediato" links={aImediatoNavLinks} onNavigate={close} />
              <ul className="mt-6 space-y-1 border-t border-neutral-200 pt-4">
                {mainNavLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={close} className={navLinkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-3 border-t border-neutral-200 px-5 py-4">
              <CallButton location="drawer" variant="secondary" size="md" fullWidth>
                Ligar {company.contact.phoneDisplay}
              </CallButton>
              <Button href="/cotacao" variant="primary" size="md" fullWidth onClick={close}>
                Cotar agora
              </Button>
            </div>
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}

function NavSection({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: NavLink[];
  onNavigate: () => void;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 text-xs font-bold tracking-[0.16em] text-neutral-500 uppercase">{title}</h3>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} onClick={onNavigate} className={navLinkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
