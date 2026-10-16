import { NextResponse, type NextRequest } from "next/server";

import { destinoHostSuhai } from "@/lib/suhai-host";

export function middleware(request: NextRequest) {
  const destino = destinoHostSuhai(request.headers.get("host"), request.nextUrl.pathname);
  if (destino.acao === "seguir") return NextResponse.next();

  // A query fica intacta: gclid e UTM do anúncio precisam chegar à landing.
  const url = request.nextUrl.clone();
  url.pathname = destino.pathname;
  return destino.acao === "rewrite" ? NextResponse.rewrite(url) : NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
