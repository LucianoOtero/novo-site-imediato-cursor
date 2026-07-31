/**
 * lib/seguradoras.ts — catálogo de seguradoras parceiras.
 *
 * Histórico: lista original de 18 (Issue 15/16, extensão 2026-07-03) veio da
 * auditoria dos logos do site legado (`docs/BRAND_ASSETS.md`, Tabela 2).
 * Atualizada em 2026-07-31 para **21 parceiras** por confirmação do cliente
 * (ver `docs/DADOS_OFICIAIS.md`): saem Darwin, Liberty e Usebens; entram
 * Aliro (grafia oficial — o pedido citava "Alliro"), BP Seguradora, Ituran,
 * Mitsui Sumitomo, Suhai e Yelum (nova marca da antiga Liberty no Brasil).
 *
 * Ordem do array = ordem de exibição no `InsurersGrid`, definida com o
 * cliente por reputação de mercado (2026-07-31): grandes tradicionais
 * primeiro, depois múltis internacionais, depois especializadas/insurtechs.
 *
 * Logos em `/public/logos/seguradoras/` — todos vetores SVG puros (sem
 * `<image>` raster embutida), com as cores originais da marca no arquivo;
 * a uniformização em cinza é feita via CSS (`grayscale` + `hover:grayscale-0`
 * no `InsurersGrid`). Origem dos 6 novos arquivos em `docs/BRAND_ASSETS.md`.
 *
 * `company.business.insurersCount` (lib/company.ts) é o dado confirmado
 * oficialmente pelo cliente (21) — este array é a lista *nomeada* dessas
 * mesmas parceiras. Os dois devem ficar em sincronia; se o cliente
 * confirmar uma seguradora a mais/a menos no futuro, atualizar os dois.
 */
export type Seguradora = {
  slug: string;
  nome: string;
  /** Caminho do arquivo em `/public/logos/seguradoras/`. */
  logo: string;
};

export const seguradoras: Seguradora[] = [
  { slug: "porto", nome: "Porto Seguro", logo: "/logos/seguradoras/porto.svg" },
  { slug: "azul", nome: "Azul Seguros", logo: "/logos/seguradoras/azul.svg" },
  { slug: "itau", nome: "Itaú Seguros", logo: "/logos/seguradoras/itau.svg" },
  { slug: "bradesco", nome: "Bradesco Seguros", logo: "/logos/seguradoras/bradesco.svg" },
  { slug: "allianz", nome: "Allianz", logo: "/logos/seguradoras/allianz.svg" },
  { slug: "tokio-marine", nome: "Tokio Marine", logo: "/logos/seguradoras/tokio-marine.svg" },
  { slug: "mapfre", nome: "Mapfre", logo: "/logos/seguradoras/mapfre.svg" },
  { slug: "hdi", nome: "HDI Seguros", logo: "/logos/seguradoras/hdi.svg" },
  { slug: "sompo", nome: "Sompo Seguros", logo: "/logos/seguradoras/sompo.svg" },
  { slug: "yelum", nome: "Yelum Seguros", logo: "/logos/seguradoras/yelum.svg" },
  { slug: "mitsui", nome: "Mitsui Sumitomo Seguros", logo: "/logos/seguradoras/mitsui.svg" },
  { slug: "suhai", nome: "Suhai Seguradora", logo: "/logos/seguradoras/suhai.svg" },
  { slug: "youse", nome: "Youse", logo: "/logos/seguradoras/youse.svg" },
  { slug: "justos", nome: "Justos", logo: "/logos/seguradoras/justos.svg" },
  { slug: "pier", nome: "Pier Seguradora", logo: "/logos/seguradoras/pier.svg" },
  { slug: "aliro", nome: "Aliro Seguro", logo: "/logos/seguradoras/aliro.svg" },
  { slug: "ezze", nome: "Ezze Seguros", logo: "/logos/seguradoras/ezze.svg" },
  { slug: "bp-seguradora", nome: "BP Seguradora", logo: "/logos/seguradoras/bp-seguradora.svg" },
  { slug: "ituran", nome: "Ituran com Seguro", logo: "/logos/seguradoras/ituran.svg" },
  { slug: "loovi", nome: "Loovi", logo: "/logos/seguradoras/loovi.svg" },
  { slug: "novo-seguros", nome: "Novo Seguros", logo: "/logos/seguradoras/novo-seguros.svg" },
];
