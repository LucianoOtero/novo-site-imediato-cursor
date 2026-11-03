/**
 * Cloudflare Access: toda requisição que passou pelo Access traz um JWT assinado pela equipe
 * Zero Trust. Exigir esse JWT impede acesso direto ao host da Vercel sem passar pela Cloudflare.
 * Desligado enquanto CF_ACCESS_TEAM_DOMAIN e CF_ACCESS_AUD não estiverem definidos.
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

export const CF_ACCESS_HEADER = "cf-access-jwt-assertion";
export const CF_ACCESS_COOKIE = "CF_Authorization";

export type AccessConfig = { issuer: string; audience: string };

export function resolveAccessConfig(): AccessConfig | null {
  const team = (process.env.CF_ACCESS_TEAM_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const audience = (process.env.CF_ACCESS_AUD || "").trim();
  if (!team && !audience) return null;
  if (!team || !audience) {
    throw new Error("CF_ACCESS_TEAM_DOMAIN e CF_ACCESS_AUD precisam ser definidos juntos");
  }
  return { issuer: `https://${team}`, audience };
}

let cachedKeys: { issuer: string; keys: ReturnType<typeof createRemoteJWKSet> } | null = null;

function accessKeys(issuer: string) {
  if (!cachedKeys || cachedKeys.issuer !== issuer) {
    cachedKeys = {
      issuer,
      keys: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)),
    };
  }
  return cachedKeys.keys;
}

export async function isValidAccessToken(
  token: string | undefined | null,
  config: AccessConfig,
): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, accessKeys(config.issuer), {
      issuer: config.issuer,
      audience: config.audience,
    });
    return true;
  } catch {
    return false;
  }
}
