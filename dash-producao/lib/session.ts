/** Sessão HMAC (Web Crypto) — safe para Edge middleware e Route Handlers. */

export const SESSION_COOKIE = "dash_producao_session";
export const MAX_AGE_SEC = 60 * 60 * 12; // 12h

export type SessionPayload = {
  userId: string;
  userName: string;
  exp: number;
};

function secretBytes(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET ausente ou curta demais (≥16)");
  }
  return new TextEncoder().encode(s);
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  const raw = secretBytes();
  return crypto.subtle.importKey(
    "raw",
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(body: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return b64url(sig);
}

async function verify(body: string, sig: string): Promise<boolean> {
  try {
    const key = await hmacKey();
    const sigBytes = fromB64url(sig);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer.slice(
        sigBytes.byteOffset,
        sigBytes.byteOffset + sigBytes.byteLength,
      ) as ArrayBuffer,
      new TextEncoder().encode(body),
    );
  } catch {
    return false;
  }
}

export async function encodeSession(
  payload: Omit<SessionPayload, "exp">,
  maxAgeSec = MAX_AGE_SEC,
): Promise<string> {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const body = b64url(new TextEncoder().encode(JSON.stringify(full)));
  return `${body}.${await sign(body)}`;
}

export async function decodeSession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !(await verify(body, sig))) return null;
  try {
    const json = new TextDecoder().decode(fromB64url(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.userId || !payload.userName) return null;
    return payload;
  } catch {
    return null;
  }
}
