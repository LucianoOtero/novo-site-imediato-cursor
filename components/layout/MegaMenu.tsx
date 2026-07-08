"use client";

import Link from "next/link";
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { ChevronDown } from "lucide-react";

import { aImediatoNavLinks, mainNavLinks, segurosNavLinks, type NavLink } from "@/components/layout/nav-data";

/**
 * MegaMenu — navegação desktop do Header (Issue 06).
 * Fonte: ESPECIFICACAO v3.md, seção 5.1 ("Seguros ▾ · Coberturas ·
 * A Imediato ▾ · Reputação · Contato") e seção 29.3 ("MegaMenu | desktop ·
 * drawer | colunas por categoria | focus trap; Esc; aria-expanded").
 *
 * Usa `@base-ui/react/navigation-menu`: `aria-expanded`, navegação por
 * teclado e fechamento por Esc já são nativos do primitivo.
 */
const triggerClass =
  "flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium text-neutral-900 outline-none " +
  "hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-500 data-[popup-open]:bg-neutral-50";

const linkClass =
  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-neutral-900 outline-none " +
  "hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-500";

export function DesktopNav() {
  return (
    <NavigationMenu.Root className="hidden md:block" aria-label="Navegação principal">
      <NavigationMenu.List className="flex items-center gap-1">
        <DropdownItem value="seguros" label="Seguros" links={segurosNavLinks} />

        {mainNavLinks
          .filter((link) => link.href === "/coberturas")
          .map((link) => (
            <NavigationMenu.Item key={link.href}>
              <NavigationMenu.Link render={<Link href={link.href} />} className={linkClass}>
                {link.label}
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          ))}

        <DropdownItem value="a-imediato" label="A Imediato" links={aImediatoNavLinks} />

        {mainNavLinks
          .filter((link) => link.href !== "/coberturas")
          .map((link) => (
            <NavigationMenu.Item key={link.href}>
              <NavigationMenu.Link render={<Link href={link.href} />} className={linkClass}>
                {link.label}
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          ))}
      </NavigationMenu.List>

      <NavigationMenu.Portal>
        <NavigationMenu.Positioner className="z-40" sideOffset={8}>
          <NavigationMenu.Popup className="w-56 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
            <NavigationMenu.Viewport />
          </NavigationMenu.Popup>
        </NavigationMenu.Positioner>
      </NavigationMenu.Portal>
    </NavigationMenu.Root>
  );
}

function DropdownItem({ value, label, links }: { value: string; label: string; links: NavLink[] }) {
  return (
    <NavigationMenu.Item value={value}>
      <NavigationMenu.Trigger className={triggerClass}>
        {label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </NavigationMenu.Trigger>
      <NavigationMenu.Content>
        <ul className="space-y-0.5">
          {links.map((link) => (
            <li key={link.href}>
              <NavigationMenu.Link render={<Link href={link.href} />} closeOnClick className={linkClass}>
                {link.label}
              </NavigationMenu.Link>
            </li>
          ))}
        </ul>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  );
}
