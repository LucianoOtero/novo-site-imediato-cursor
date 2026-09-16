import fs from "node:fs";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __dashProducaoPool: Pool | undefined;
}

function needsSsl(url: string) {
  return (
    /sslmode=/i.test(url) ||
    /supabase\.co/i.test(url) ||
    /neon\.tech/i.test(url) ||
    /pooler\.supabase/i.test(url)
  );
}

function pgPoolOptions(url: string) {
  let connectionString = url;
  try {
    const u = new URL(url);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("uselibpqcompat");
    connectionString = u.toString();
  } catch {
    connectionString = url.replace(/([?&])sslmode=[^&]*/gi, "$1").replace(/[?&]$/, "");
  }
  return {
    connectionString,
    ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
    max: 5,
  };
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file =
    process.env.DATABASE_URL_FILE ||
    (process.platform === "win32" ? "C:\\AggerRpa\\config\\database.url" : "");
  if (file && fs.existsSync(file)) {
    return fs.readFileSync(file, "utf8").trim();
  }
  throw new Error("DATABASE_URL não definida (nem arquivo database.url)");
}

export function getPool(): Pool {
  const url = resolveDatabaseUrl();
  if (!global.__dashProducaoPool) {
    global.__dashProducaoPool = new Pool(pgPoolOptions(url));
  }
  return global.__dashProducaoPool;
}
