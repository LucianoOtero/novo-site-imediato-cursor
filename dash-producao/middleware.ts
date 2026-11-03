import { NextResponse, type NextRequest } from "next/server";
import {
  CF_ACCESS_COOKIE,
  CF_ACCESS_HEADER,
  isValidAccessToken,
  resolveAccessConfig,
} from "./lib/cf-access";
import { decodeSession, SESSION_COOKIE } from "./lib/session";

function forbidden(pathname: string, message: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  return new NextResponse(message, {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let access;
  try {
    access = resolveAccessConfig();
  } catch {
    return forbidden(pathname, "Cloudflare Access mal configurado");
  }
  if (access) {
    const token =
      req.headers.get(CF_ACCESS_HEADER) || req.cookies.get(CF_ACCESS_COOKIE)?.value;
    if (!(await isValidAccessToken(token, access))) {
      return forbidden(pathname, "Acesso permitido somente via Cloudflare Access");
    }
  }

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  let session = null;
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    session = await decodeSession(token);
  } catch {
    session = null;
  }
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
