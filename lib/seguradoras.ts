/**
 * lib/seguradoras.ts — catálogo de seguradoras parceiras (Issue 15/16, extensão 2026-07-03).
 *
 * Fonte: `docs/BRAND_ASSETS.md` (Tabela 2 — auditoria real dos logos
 * hospedados no CDN do Webflow, `cdn.prod.website-files.com`) e
 * confirmação visual feita nesta rodada (baixados diretamente do domínio
 * de produção da Imediato, arquivos públicos, sem necessidade de
 * credenciais).
 *
 * Todos os 18 logos são vetores SVG reais em tom de cinza (cores
 * `#838383`/`#353535` etc. — não é um filtro CSS aplicado sobre um SVG
 * colorido). A auditoria original especulava que a versão colorida do
 * hover poderia ser um arquivo separado — **não existe tal arquivo**: só
 * a versão cinza foi encontrada em produção. Por isso `InsurersGrid`
 * usa um efeito de hover diferente do "cinza → colorido" da spec
 * original (ver comentário no próprio componente).
 *
 * O 18º logo ("novo svg.svg", não identificado na auditoria original)
 * foi identificado nesta rodada, extraindo a imagem embutida no SVG:
 * é a seguradora real **Novo Seguros**.
 *
 * Nome do arquivo "justus" vs. grafia oficial "Justos": mantido o nome
 * de exibição "Justos" (seção 1.1 da especificação), arquivo local
 * renomeado para `justos.svg` para evitar o erro de digitação do
 * arquivo de origem.
 *
 * `company.business.insurersCount` (lib/company.ts) é o dado
 * confirmado oficialmente pelo cliente (18) — este array é a lista
 * *nomeada* dessas mesmas parceiras, para uso no `InsurersGrid`. Os dois
 * devem ficar em sincronia; se o cliente confirmar uma seguradora a
 * mais/a menos no futuro, atualizar os dois.
 */
export type Seguradora = {
  slug: string;
  nome: string;
  /** Caminho do arquivo em `/public/logos/seguradoras/`. */
  logo: string;
};

export const seguradoras: Seguradora[] = [
  { slug: "porto", nome: "Porto Seguro", logo: "/logos/seguradoras/porto.svg" },
  { slug: "bradesco", nome: "Bradesco Seguros", logo: "/logos/seguradoras/bradesco.svg" },
  { slug: "azul", nome: "Azul Seguros", logo: "/logos/seguradoras/azul.svg" },
  { slug: "itau", nome: "Itaú Seguros", logo: "/logos/seguradoras/itau.svg" },
  { slug: "hdi", nome: "HDI Seguros", logo: "/logos/seguradoras/hdi.svg" },
  { slug: "tokio-marine", nome: "Tokio Marine", logo: "/logos/seguradoras/tokio-marine.svg" },
  { slug: "sompo", nome: "Sompo Seguros", logo: "/logos/seguradoras/sompo.svg" },
  { slug: "mapfre", nome: "Mapfre", logo: "/logos/seguradoras/mapfre.svg" },
  { slug: "liberty", nome: "Liberty Seguros", logo: "/logos/seguradoras/liberty.svg" },
  { slug: "allianz", nome: "Allianz", logo: "/logos/seguradoras/allianz.svg" },
  { slug: "loovi", nome: "Loovi", logo: "/logos/seguradoras/loovi.svg" },
  { slug: "pier", nome: "Pier Seguradora", logo: "/logos/seguradoras/pier.svg" },
  { slug: "justos", nome: "Justos", logo: "/logos/seguradoras/justos.svg" },
  { slug: "darwin", nome: "Darwin Seguros", logo: "/logos/seguradoras/darwin.svg" },
  { slug: "usebens", nome: "Usebens", logo: "/logos/seguradoras/usebens.svg" },
  { slug: "novo-seguros", nome: "Novo Seguros", logo: "/logos/seguradoras/novo-seguros.svg" },
  { slug: "youse", nome: "Youse", logo: "/logos/seguradoras/youse.svg" },
  { slug: "ezze", nome: "Ezze Seguros", logo: "/logos/seguradoras/ezze.svg" },
];
