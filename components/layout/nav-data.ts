import { ramos } from "@/lib/ramos";

/**
 * nav-data.ts — estrutura de navegação do Header (Issue 06).
 * Fonte: ESPECIFICACAO v3.md, seção 5.1 ("Navegação principal").
 *
 * Nota de fidelidade: a seção 5.1 lista o menu "Seguros" com 9 itens
 * (Auto · Moto · Caminhão · Uber/Apps · Táxi · Utilitário · Frota · Pet ·
 * Fiança — sem "Assistência 24h/RCF"). A Issue 05, porém, já estabeleceu
 * `lib/ramos.ts` como fonte única dos 10 ramos (seção 22: "os ramos vivem
 * em lib/ramos.ts"), e a seção 4 (mapa do site) lista `/assistencia-24-horas`
 * como rota própria. Para não hardcodar uma lista paralela e divergente de
 * `lib/ramos.ts`, o menu abaixo é **derivado de `lib/ramos.ts`** (10 itens,
 * não 9) — uma decisão de engenharia, não uma alteração de dado de negócio.
 */

export type NavLink = { label: string; href: string };

/**
 * Submenu "Seguros" — derivado de lib/ramos.ts (fonte única, seção 22).
 * Usa `seo.canonicalPath` (já correto por ramo, ex.: `/fianca` em vez de
 * `/seguro-fianca`) em vez de reconstruir a URL a partir do slug.
 */
export const segurosNavLinks: NavLink[] = ramos.map((ramo) => ({
  label: ramo.shortName,
  href: ramo.seo.canonicalPath,
}));

/** Submenu "A Imediato" (seção 5.1) — rotas institucionais, não são dados de negócio. */
export const aImediatoNavLinks: NavLink[] = [
  { label: "Sobre", href: "/a-imediato" },
  { label: "Equipe", href: "/equipe" },
  { label: "Seguradoras parceiras", href: "/seguradoras-parceiras" },
  { label: "Alerta de fraude", href: "/alerta-de-fraude" },
];

/** Itens de topo sem dropdown (seção 5.1). */
export const mainNavLinks: NavLink[] = [
  { label: "Coberturas", href: "/coberturas" },
  { label: "Reputação", href: "/reputacao" },
  { label: "Contato", href: "/contato" },
];
