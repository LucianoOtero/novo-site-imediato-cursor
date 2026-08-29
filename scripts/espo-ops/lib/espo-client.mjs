/**
 * scripts/espo-ops/lib/espo-client.mjs — cliente read-only / write mínimo
 * da API REST do EspoCRM (X-Api-Key). Credenciais via env:
 *   ESPOCRM_API_CONFIG (JSON do secret Firebase — preferido)
 *   ou ESPO_BASE_URL + ESPO_API_KEY (fallback)
 *
 * `prefer` ("dev"|"prod") seleciona o bloco em ESPOCRM_API_CONFIG e
 * **não** é mascarado por ESPO_BASE_URL (bug clássico: env DEV + --prefer=prod).
 */
export function resolveEspoConfig({ prefer = "prod" } = {}) {
  const raw = process.env.ESPOCRM_API_CONFIG;
  if (raw) {
    const parsed = JSON.parse(raw);
    const block =
      parsed[prefer] ||
      parsed.prod ||
      parsed.dev ||
      (parsed.baseUrl ? parsed : null);
    if (block?.baseUrl && block?.apiKey) {
      const usedKey =
        prefer in parsed ? prefer : parsed.prod ? "prod" : parsed.dev ? "dev" : "root";
      return {
        baseUrl: String(block.baseUrl).replace(/\/$/, ""),
        apiKey: block.apiKey,
        prefer,
        source: `ESPOCRM_API_CONFIG.${usedKey}`,
      };
    }
  }
  if (process.env.ESPO_BASE_URL && process.env.ESPO_API_KEY) {
    return {
      baseUrl: process.env.ESPO_BASE_URL.replace(/\/$/, ""),
      apiKey: process.env.ESPO_API_KEY,
      prefer,
      source: "ESPO_BASE_URL",
    };
  }
  throw new Error(
    "Defina ESPOCRM_API_CONFIG (JSON do secret Firebase) ou ESPO_BASE_URL+ESPO_API_KEY.",
  );
}

/** true se host é Espo produção (não DEV). */
export function isEspoProdBaseUrl(baseUrl) {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host === "flyingdonkeys.com.br" || host === "www.flyingdonkeys.com.br";
  } catch {
    return false;
  }
}

/** true se host é Espo DEV. */
export function isEspoDevBaseUrl(baseUrl) {
  try {
    return new URL(baseUrl).hostname.toLowerCase() === "dev.flyingdonkeys.com.br";
  } catch {
    return false;
  }
}

export async function espoRequest(config, method, path, { query, body } = {}) {
  const url = new URL(`${config.baseUrl}/api/v1/${path.replace(/^\//, "")}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.apiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text().catch(() => "");
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!response.ok) {
    const err = new Error(
      `${method} ${path} HTTP ${response.status}: ${text.slice(0, 400)}`,
    );
    err.status = response.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

/** Pagina todos os registros de uma entidade com select/where/order opcionais. */
export async function espoListAll(
  config,
  entityType,
  {
    select,
    where,
    orderBy = "createdAt",
    order = "desc",
    maxSize = 200,
    maxPages = 50,
  } = {},
) {
  const list = [];
  let offset = 0;
  for (let page = 0; page < maxPages; page++) {
    const query = {
      maxSize: String(maxSize),
      offset: String(offset),
      orderBy,
      order,
    };
    if (select?.length) query.select = select.join(",");
    if (where) {
      where.forEach((clause, i) => {
        for (const [k, v] of Object.entries(clause)) {
          query[`where[${i}][${k}]`] = v;
        }
      });
    }
    const data = await espoRequest(config, "GET", entityType, { query });
    const batch = data?.list || [];
    list.push(...batch);
    if (batch.length < maxSize) break;
    offset += maxSize;
  }
  return list;
}

export function isTestLead(row) {
  const name = String(row.name || row.firstName || "").toUpperCase();
  const email = String(row.emailAddress || row.cEmailAdress || row.cEmail || "").toLowerCase();
  if (name.includes("NOVO CLIENTE")) return true;
  if (name.includes("TESTE") || name.includes("TEST ")) return true;
  if (/@imediatoseguros\.com\.br$/i.test(email)) return true;
  if (email.startsWith("lrotero")) return true;
  return false;
}

export function siteBucket(webpage) {
  const w = String(webpage || "").toLowerCase().trim();
  if (
    w.includes("novo.segurosimediato") ||
    w.includes("comparaseguroonline")
  ) {
    return "novo";
  }
  if (w.includes("mdmidia")) return "legado";
  // www/apex sem marcador de experimento — trata como legado operacional
  if (w.includes("segurosimediato")) return "legado";
  if (!w) return "legado_or_unknown";
  return "other";
}
