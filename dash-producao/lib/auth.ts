import { cookies } from "next/headers";
import {
  decodeSession,
  encodeSession,
  MAX_AGE_SEC,
  SESSION_COOKIE,
  type SessionPayload,
} from "./session";

export {
  decodeSession,
  encodeSession,
  MAX_AGE_SEC,
  SESSION_COOKIE,
  type SessionPayload,
};

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const jar = await cookies();
    return decodeSession(jar.get(SESSION_COOKIE)?.value);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) {
    const err = new Error("unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return s;
}
