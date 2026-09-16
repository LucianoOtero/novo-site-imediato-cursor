import { NextResponse } from "next/server";
import { encodeSession, MAX_AGE_SEC, SESSION_COOKIE } from "@/lib/auth";
import { espoLoginUser, resolveEspoDashConfig } from "@/lib/espo";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userName?: string; password?: string };
    const userName = String(body.userName || "").trim();
    const password = String(body.password || "");
    if (!userName || !password) {
      return NextResponse.json({ error: "Informe usuário e senha" }, { status: 400 });
    }
    const cfg = resolveEspoDashConfig();
    const user = await espoLoginUser(cfg.baseUrl, userName, password);
    const token = await encodeSession({ userId: user.userId, userName: user.userName });
    const res = NextResponse.json({
      ok: true,
      userName: user.userName,
      type: user.type,
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SEC,
    });
    return res;
  } catch (e) {
    const status = (e as { status?: number }).status || 500;
    const msg = e instanceof Error ? e.message : "Falha no login";
    return NextResponse.json({ error: msg }, { status: status === 401 ? 401 : status });
  }
}
