import { NextResponse, type NextRequest } from "next/server";

const HOST_SUHAI = "suhai.segurosimediato.com.br";
const CAMINHO = "/marca-suhai";
const ROTAS_SUHAI = new Set([CAMINHO, `${CAMINHO}/moto`, `${CAMINHO}/carro`, `${CAMINHO}/caminhao`]);

/**
 * No host da landing Suhai, `/` mostra a página clonada.
 * Moto, carro e caminhão seguem nas subpáginas. Qualquer outro caminho
 * volta para `/`, para o visitante não cair no site da Imediato.
 * APIs e arquivos estáticos seguem direto.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host !== HOST_SUHAI) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }
  const caminho = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (ROTAS_SUHAI.has(caminho)) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (caminho === "/") {
    url.pathname = CAMINHO;
    return NextResponse.rewrite(url);
  }
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
