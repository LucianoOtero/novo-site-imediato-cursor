export const HOST_SUHAI = "suhai.segurosimediato.com.br";
export const CAMINHO_SUHAI = "/marca-suhai";
/** Páginas da Imediato (privacidade, termos) não abrem no host Suhai; o link vai para cá. */
export const SITE_PRINCIPAL = "https://www.segurosimediato.com.br";

const ROTAS_SUHAI = new Set([
  CAMINHO_SUHAI,
  `${CAMINHO_SUHAI}/moto`,
  `${CAMINHO_SUHAI}/carro`,
  `${CAMINHO_SUHAI}/caminhao`,
]);

export type DestinoSuhai =
  | { acao: "seguir" }
  | { acao: "rewrite"; pathname: string }
  | { acao: "redirect"; pathname: string };

/**
 * No host da landing Suhai, `/` mostra a página clonada.
 * Moto, carro e caminhão seguem nas subpáginas. Qualquer outro caminho
 * volta para `/`, para o visitante não cair no site da Imediato.
 * APIs e arquivos estáticos seguem direto. Outros hosts não são tocados.
 */
export function destinoHostSuhai(hostHeader: string | null, pathname: string): DestinoSuhai {
  const host = hostHeader?.split(":")[0]?.toLowerCase();
  if (host !== HOST_SUHAI) return { acao: "seguir" };

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/opengraph-image") ||
    pathname.includes(".")
  ) {
    return { acao: "seguir" };
  }
  const caminho = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (ROTAS_SUHAI.has(caminho)) return { acao: "seguir" };
  if (caminho === "/") return { acao: "rewrite", pathname: CAMINHO_SUHAI };
  return { acao: "redirect", pathname: "/" };
}
