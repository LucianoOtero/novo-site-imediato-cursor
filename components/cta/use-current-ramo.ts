"use client";

import { usePathname } from "next/navigation";

import { ramos } from "@/lib/ramos";

/**
 * useCurrentRamo — infere o ramo a partir da URL atual (Issue 19).
 * Usado por componentes de CTA globais (WhatsAppFAB, StickyCTA), que
 * são renderizados no layout compartilhado sem receber `ramo` como prop
 * — em uma LP de ramo (`/seguro-auto`, Issue 16, ainda não construída),
 * a URL já identifica o produto univocamente via `seo.canonicalPath`.
 * Fica em `components/cta/` (não em `lib/ramos.ts`) porque usa
 * `usePathname` (client-only) — `lib/ramos.ts` também é importado por
 * Server Components e não deve virar client-only.
 */
export function useCurrentRamo(): string | undefined {
  const pathname = usePathname();
  return ramos.find((ramo) => ramo.seo.canonicalPath === pathname)?.slug;
}
