import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Pasta scripts/google-ops */
export const OPS_ROOT = path.resolve(__dirname, "..");

/** JSON baixado do Cloud Console (Desktop app) — não versionar */
export const CLIENT_SECRET_PATH = path.join(OPS_ROOT, "client_secret.json");

/** Tokens OAuth (access + refresh) — não versionar */
export const TOKEN_PATH = path.join(OPS_ROOT, "token.json");

/** Config opcional (account/container IDs, Ads developer token) — não versionar se tiver segredos */
export const CONFIG_PATH = path.join(OPS_ROOT, "config.local.json");
