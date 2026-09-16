/**
 * Cliente Espo para o dash — key do user api_dashboard_producao.
 * Preferência: ESPO_DASH_API_CONFIG JSON (prod/dev) → arquivo local → ESPO_BASE_URL+ESPO_API_KEY.
 */

import fs from "node:fs";
import path from "node:path";

export type EspoConfig = {
  baseUrl: string;
  apiKey: string;
  source: string;
};

function parseDashConfigJson(
  raw: string,
  prefer: string,
  source: string,
): EspoConfig | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, { baseUrl?: string; apiKey?: string }>;
    const block = parsed[prefer] || parsed.prod || parsed.dev;
    if (block?.baseUrl && block?.apiKey) {
      return {
        baseUrl: String(block.baseUrl).replace(/\/$/, ""),
        apiKey: block.apiKey,
        source: `${source}.${prefer in parsed ? prefer : "fallback"}`,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function loadFromLocalFile(prefer: string): EspoConfig | null {
  const candidates = [
    process.env.ESPO_DASH_API_CONFIG_PATH,
    process.platform === "win32" ? "C:\\AggerRpa\\config\\espo-dash-api.json" : null,
    path.join(process.cwd(), "espo-dash-api.json"),
  ].filter(Boolean) as string[];

  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const raw = fs.readFileSync(file, "utf8");
      const cfg = parseDashConfigJson(raw, prefer, `file:${file}`);
      if (cfg) return cfg;
    } catch {
      /* next */
    }
  }
  return null;
}

export function resolveEspoDashConfig(prefer = process.env.ESPO_PREFER || "prod"): EspoConfig {
  const raw = process.env.ESPO_DASH_API_CONFIG;
  if (raw) {
    const cfg = parseDashConfigJson(raw, prefer, "ESPO_DASH_API_CONFIG");
    if (cfg) return cfg;
  }
  const fromFile = loadFromLocalFile(prefer);
  if (fromFile) return fromFile;

  if (process.env.ESPO_BASE_URL && process.env.ESPO_API_KEY) {
    return {
      baseUrl: process.env.ESPO_BASE_URL.replace(/\/$/, ""),
      apiKey: process.env.ESPO_API_KEY,
      source: "ESPO_BASE_URL",
    };
  }
  throw new Error("Defina ESPO_DASH_API_CONFIG, arquivo espo-dash-api.json ou ESPO_BASE_URL+ESPO_API_KEY");
}

export async function espoRequest<T = unknown>(
  config: EspoConfig,
  method: string,
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`${config.baseUrl}/api/v1/${path.replace(/^\//, "")}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v != null) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.apiKey,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return json as T;
}

/** Valida user/password humano contra Espo (Basic). */
export async function espoLoginUser(
  baseUrl: string,
  userName: string,
  password: string,
): Promise<{ userId: string; userName: string; type: string }> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/App/user`;
  const basic = Buffer.from(`${userName}:${password}`, "utf8").toString("base64");
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basic}`,
      "Espo-Authorization": basic,
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: {
    user?: { id?: string; userName?: string; type?: string; isActive?: boolean };
  };
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Resposta Espo inválida no login");
  }
  if (!res.ok || !json.user?.id || !json.user?.userName) {
    const err = new Error("Credenciais inválidas");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (json.user.isActive === false) {
    const err = new Error("Usuário inativo");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  return {
    userId: json.user.id,
    userName: json.user.userName,
    type: json.user.type || "regular",
  };
}

export type EspoOpp = {
  id: string;
  name?: string;
  stage?: string;
  amount?: number | null;
  amountCurrency?: string;
  cDataDeEmisso?: string | null;
  cInicioVigncia?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  cCpftext?: string | null;
  cSeguradora?: string | null;
};

const OPP_SELECT = [
  "id",
  "name",
  "stage",
  "amount",
  "amountCurrency",
  "cDataDeEmisso",
  "cInicioVigncia",
  "assignedUserId",
  "assignedUserName",
  "cCpftext",
  "cSeguradora",
].join(",");

/** Lista Opps Vendido com cDataDeEmisso no mês YYYY-MM. */
export async function fetchVendidosMonth(
  config: EspoConfig,
  month: string,
): Promise<{ list: EspoOpp[]; fetchedAt: string }> {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;

  const where = JSON.stringify([
    { type: "equals", attribute: "stage", value: "Vendido" },
    { type: "greaterThanOrEquals", attribute: "cDataDeEmisso", value: start },
    { type: "lessThanOrEquals", attribute: "cDataDeEmisso", value: end },
  ]);

  const list: EspoOpp[] = [];
  let offset = 0;
  const maxSize = 200;
  for (let page = 0; page < 50; page++) {
    const data = await espoRequest<{ list?: EspoOpp[] }>(config, "GET", "Opportunity", {
      query: {
        maxSize: String(maxSize),
        offset: String(offset),
        orderBy: "cDataDeEmisso",
        order: "desc",
        select: OPP_SELECT,
        where,
      },
    });
    const batch = data.list || [];
    list.push(...batch);
    if (batch.length < maxSize) break;
    offset += maxSize;
  }
  return { list, fetchedAt: new Date().toISOString() };
}
