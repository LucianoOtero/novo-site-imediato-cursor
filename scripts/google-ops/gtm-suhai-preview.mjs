#!/usr/bin/env node
/**
 * Somente leitura: compila o workspace "Suhai - medição completa" (quick_preview)
 * e grava em logs/ a URL do gtm.js de preview desse workspace, para testes no
 * navegador sem publicar. Os códigos de preview não são impressos.
 *
 *   node gtm-suhai-preview.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const WS_NAME = "Suhai - medição completa";
const GTM_PUBLIC_ID = "GTM-PD6J398";

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const tm = getTagManager(await getAuthorizedClient());
  const containerPath = config.gtm?.containerPath || config.containerPath || config.workspacePath.split("/workspaces/")[0];

  const { data: wsList } = await tm.accounts.containers.workspaces.list({ parent: containerPath });
  const ws = (wsList.workspace || []).find((w) => w.name === WS_NAME);
  if (!ws) throw new Error(`Workspace "${WS_NAME}" não encontrado`);

  const { data: preview } = await tm.accounts.containers.workspaces.quick_preview({ path: ws.path });
  const erros = preview.compilerError ? true : false;
  const versao = preview.containerVersion || {};

  const { data: envList } = await tm.accounts.containers.environments.list({ parent: containerPath });
  const env = (envList.environment || []).find((e) => e.type === "workspace" && e.workspaceId === ws.workspaceId);

  const saida = {
    workspace: ws.path,
    compilerError: erros,
    syncStatus: preview.syncStatus || null,
    tags: (versao.tag || []).length,
    triggers: (versao.trigger || []).length,
    variables: (versao.variable || []).length,
    suhaiTags: (versao.tag || []).filter((t) => /suhai/i.test(t.name)).map((t) => t.name),
    previewEnv: env ? { environmentId: env.environmentId, temAuth: Boolean(env.authorizationCode) } : null,
  };

  if (env?.authorizationCode) {
    const url =
      `https://www.googletagmanager.com/gtm.js?id=${GTM_PUBLIC_ID}` +
      `&gtm_auth=${encodeURIComponent(env.authorizationCode)}&gtm_preview=env-${env.environmentId}&gtm_cookies_win=x`;
    const dir = path.resolve("logs");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "gtm-suhai-preview-url.txt"), url + "\n");
    saida.previewUrlArquivo = path.join(dir, "gtm-suhai-preview-url.txt");
  }

  console.log(JSON.stringify(saida, null, 2));
}

main().catch((e) => {
  console.error(e?.response?.data || e);
  process.exit(1);
});
