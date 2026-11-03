import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Pasta scripts/google-ops */
export const OPS_ROOT = path.resolve(__dirname, "..");

/**
 * Pasta das credenciais (client_secret, token, config.local). Padrão: OPS_ROOT.
 * Num worktree, aponte GOOGLE_OPS_CREDENTIALS_DIR para o scripts/google-ops do workspace principal.
 */
const CREDENTIALS_DIR = process.env.GOOGLE_OPS_CREDENTIALS_DIR
  ? path.resolve(process.env.GOOGLE_OPS_CREDENTIALS_DIR)
  : OPS_ROOT;

/** JSON baixado do Cloud Console (Desktop app) — não versionar */
export const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, "client_secret.json");

/** Tokens OAuth (access + refresh) — não versionar */
export const TOKEN_PATH = path.join(CREDENTIALS_DIR, "token.json");

/** Config opcional (account/container IDs, Ads developer token) — não versionar se tiver segredos */
export const CONFIG_PATH = path.join(CREDENTIALS_DIR, "config.local.json");
