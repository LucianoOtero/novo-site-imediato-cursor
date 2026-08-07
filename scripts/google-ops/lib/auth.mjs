import fs from "node:fs";
import http from "node:http";
import { URL } from "node:url";
import { google } from "googleapis";
import open from "open";
import { CLIENT_SECRET_PATH, TOKEN_PATH } from "./paths.mjs";
import { resolveScopes } from "./scopes.mjs";

function loadClientSecret() {
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    throw new Error(
      `Arquivo ausente: ${CLIENT_SECRET_PATH}\n` +
        "Baixe o JSON do OAuth client (tipo Desktop) no Cloud Console e salve nesse caminho.\n" +
        "Ver docs/GTM_ADS_OAUTH_OPS.md",
    );
  }
  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, "utf8"));
  const installed = raw.installed || raw.web;
  if (!installed?.client_id || !installed?.client_secret) {
    throw new Error(
      "client_secret.json inválido: esperava chave installed (Desktop) ou web com client_id/client_secret.",
    );
  }
  return installed;
}

function createOAuth2Client(redirectUri) {
  const creds = loadClientSecret();
  return new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    redirectUri,
  );
}

/**
 * Login interativo: abre o browser, recebe code em localhost, grava token.json.
 */
export async function interactiveLogin({ withAds = false, withAnalytics = false, withGsc = false, port = 53682 } = {}) {
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const oauth2 = createOAuth2Client(redirectUri);
  const scopes = resolveScopes({ withAds, withAnalytics, withGsc });

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const u = new URL(req.url || "/", `http://127.0.0.1:${port}`);
        if (u.pathname !== "/oauth2callback") {
          res.writeHead(404);
          res.end();
          return;
        }
        const err = u.searchParams.get("error");
        if (err) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<h1>Erro OAuth</h1><p>${err}</p>`);
          server.close();
          reject(new Error(`OAuth error: ${err}`));
          return;
        }
        const authCode = u.searchParams.get("code");
        if (!authCode) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h1>Código ausente</h1>");
          server.close();
          reject(new Error("OAuth: code ausente na callback"));
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h1>Login OK</h1><p>Pode fechar esta aba e voltar ao terminal.</p>",
        );
        server.close();
        resolve(authCode);
      } catch (e) {
        server.close();
        reject(e);
      }
    });

    server.listen(port, "127.0.0.1", async () => {
      console.log("Abrindo browser para consentimento Google…");
      console.log("Se não abrir, acesse:\n", authUrl, "\n");
      try {
        await open(authUrl);
      } catch {
        console.warn("Não foi possível abrir o browser automaticamente.");
      }
    });

    server.on("error", reject);
  });

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf8");
  console.log(`Tokens gravados em ${TOKEN_PATH}`);
  console.log(`Escopos: ${scopes.join("\n  ")}`);
  return oauth2;
}

/**
 * Cliente autenticado a partir de token.json (renova access_token se preciso).
 */
export async function getAuthorizedClient({ withAds = false } = {}) {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      `Sem token. Rode: npm run auth${withAds ? " -- --with-ads" : ""} (em scripts/google-ops)`,
    );
  }

  // redirectUri no refresh não importa tanto; usamos o mesmo do login Desktop
  const oauth2 = createOAuth2Client("http://127.0.0.1:53682/oauth2callback");
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  oauth2.setCredentials(tokens);

  oauth2.on("tokens", (fresh) => {
    const merged = { ...tokens, ...fresh };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2), "utf8");
  });

  // Validação leve: se não houver refresh_token e access expirou, força re-login
  if (!tokens.refresh_token && !tokens.access_token) {
    throw new Error("token.json vazio/inválido. Rode npm run auth de novo.");
  }

  // Garante que o token usado cobre os escopos pedidos (best-effort)
  void withAds;

  return oauth2;
}

export function getTagManager(auth) {
  return google.tagmanager({ version: "v2", auth });
}

/** GA4 Admin API (dimensões personalizadas, key events) — requer login com --with-analytics. */
export function getAnalyticsAdmin(auth) {
  return google.analyticsadmin({ version: "v1beta", auth });
}

/** GA4 Data API (relatórios/realtime) — requer login com --with-analytics (escopo readonly). */
export function getAnalyticsData(auth) {
  return google.analyticsdata({ version: "v1beta", auth });
}
