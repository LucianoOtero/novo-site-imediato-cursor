/**
 * Ramo da página a partir do caminho, para CTAs que ficam fora do conteúdo
 * da página (rodapé) e não recebem o ramo por prop.
 *
 * Fica separado de `lib/ramos.ts` porque roda em Client Component em todas
 * as páginas, e `ramos` traz o conteúdo inteiro dos ramos para o bundle.
 * `lib/ramo-por-caminho.test.mjs` confere estas listas contra `ramos`.
 */

const SLUGS_SEGURO = ["auto", "moto", "caminhao", "uber", "taxi", "utilitario", "frota", "pet"] as const;

const CAMINHOS_PROPRIOS: Record<string, string> = {
  "/fianca": "fianca",
  "/assistencia-24-horas": "assistencia-24-horas",
};

export function ramoPorCaminho(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  const primeiro = `/${pathname.split(/[?#]/)[0].split("/").filter(Boolean)[0] ?? ""}`;
  if (CAMINHOS_PROPRIOS[primeiro]) return CAMINHOS_PROPRIOS[primeiro];
  const slug = /^\/seguro-(.+)$/.exec(primeiro)?.[1];
  return slug && (SLUGS_SEGURO as readonly string[]).includes(slug) ? slug : undefined;
}

export const RAMOS_POR_CAMINHO = { SLUGS_SEGURO, CAMINHOS_PROPRIOS };
