/**
 * Fase 3 da migração para novo.segurosimediato.com.br: troca os filtros de
 * hostname dos itens [NovoSite] no GTM de "contains comparaseguroonline.com.br"
 * para RegEx cobrindo os DOIS domínios (transição sem perda de disparos).
 *
 * Segurança:
 * - Trabalha num workspace NOVO criado a partir da versão Live.
 * - Só altera acionadores cujo nome começa com "[NovoSite]".
 * - Itens do legado nunca entram no diff.
 *
 * Uso:
 *   node gtm-migrate-hostname.mjs                → dry-run (só relata)
 *   node gtm-migrate-hostname.mjs --apply        → aplica no workspace novo
 *   node gtm-migrate-hostname.mjs --apply --publish → aplica + cria versão + publica
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const OLD_HOST = "comparaseguroonline.com.br";
const NEW_HOST = "novo.segurosimediato.com.br";
const REGEX_BOTH = "comparaseguroonline\\.com\\.br|novo\\.segurosimediato\\.com\\.br";

const APPLY = process.argv.includes("--apply");
const PUBLISH = process.argv.includes("--publish");
const WS_NAME = "Migracao hostname novo.segurosimediato";

function containerPathFromConfig(config) {
  // workspacePath = accounts/X/containers/Y/workspaces/Z → accounts/X/containers/Y
  return config.workspacePath.split("/workspaces/")[0];
}

function filterMentionsOldHost(condition) {
  return (condition.parameter || []).some(
    (p) => typeof p.value === "string" && p.value.includes(OLD_HOST),
  );
}

/** Converte a condição de hostname para matchRegex cobrindo os dois domínios. */
function toRegexCondition(condition) {
  return {
    type: "matchRegex",
    parameter: (condition.parameter || []).map((p) =>
      typeof p.value === "string" && p.value.includes(OLD_HOST)
        ? { ...p, value: REGEX_BOTH }
        : p,
    ),
  };
}

function stripReadOnly(body) {
  for (const k of [
    "path",
    "accountId",
    "containerId",
    "workspaceId",
    "triggerId",
    "fingerprint",
    "tagManagerUrl",
  ]) {
    delete body[k];
  }
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const auth = await getAuthorizedClient();
  const tm = getTagManager(auth);
  const containerPath = containerPathFromConfig(config);

  // 1) Workspace novo (reusa se já existir de execução anterior)
  const wsList = await tm.accounts.containers.workspaces.list({
    parent: containerPath,
  });
  let ws = (wsList.data.workspace || []).find((w) => w.name === WS_NAME);
  if (ws) {
    console.log("Workspace já existe (reusando):", ws.path);
  } else {
    const created = await tm.accounts.containers.workspaces.create({
      parent: containerPath,
      requestBody: {
        name: WS_NAME,
        description:
          "Fase 3 da migracao: filtros hostname [NovoSite] para RegEx com os dois dominios.",
      },
    });
    ws = created.data;
    console.log("Workspace criado:", ws.path);
  }

  // 2) Acionadores [NovoSite] com filtro no domínio antigo
  const trigRes = await tm.accounts.containers.workspaces.triggers.list({
    parent: ws.path,
  });
  const triggers = trigRes.data.trigger || [];

  const targets = [];
  for (const t of triggers) {
    if (!t.name.startsWith("[NovoSite]")) continue;
    const hasOld =
      (t.filter || []).some(filterMentionsOldHost) ||
      (t.customEventFilter || []).some(filterMentionsOldHost) ||
      (t.autoEventFilter || []).some(filterMentionsOldHost);
    if (hasOld) targets.push(t);
  }

  console.log(`\nAcionadores [NovoSite] com hostname ${OLD_HOST}: ${targets.length}`);
  for (const t of targets) {
    console.log(`- ${t.name} (${t.path})`);
    for (const f of t.filter || []) {
      if (filterMentionsOldHost(f)) {
        const arg0 = f.parameter?.find((p) => p.key === "arg0")?.value;
        const arg1 = f.parameter?.find((p) => p.key === "arg1")?.value;
        console.log(`    filtro atual: ${f.type} | ${arg0} | ${arg1}`);
      }
    }
  }

  // Sanity: variáveis e tags não devem referenciar o domínio antigo
  const [varRes, tagRes] = await Promise.all([
    tm.accounts.containers.workspaces.variables.list({ parent: ws.path }),
    tm.accounts.containers.workspaces.tags.list({ parent: ws.path }),
  ]);
  for (const v of varRes.data.variable || []) {
    if (JSON.stringify(v).includes(OLD_HOST)) {
      console.warn(`ATENÇÃO: variável menciona ${OLD_HOST}: ${v.name}`);
    }
  }
  for (const g of tagRes.data.tag || []) {
    if (JSON.stringify(g).includes(OLD_HOST)) {
      console.warn(`ATENÇÃO: tag menciona ${OLD_HOST}: ${g.name}`);
    }
  }

  if (!APPLY) {
    console.log("\nDry-run — nada alterado. Rode com --apply para aplicar.");
    return;
  }

  // 3) Aplicar a troca contains → matchRegex (dois domínios)
  for (const t of targets) {
    const body = { ...t };
    body.filter = (t.filter || []).map((f) =>
      filterMentionsOldHost(f) ? toRegexCondition(f) : f,
    );
    body.customEventFilter = t.customEventFilter;
    body.autoEventFilter = (t.autoEventFilter || []).map((f) =>
      filterMentionsOldHost(f) ? toRegexCondition(f) : f,
    );
    if (!body.autoEventFilter.length) delete body.autoEventFilter;
    const path = t.path;
    stripReadOnly(body);
    const updated = await tm.accounts.containers.workspaces.triggers.update({
      path,
      requestBody: body,
    });
    console.log(`Atualizado: ${updated.data.name}`);
  }

  console.log(`\n${targets.length} acionadores atualizados no workspace.`);

  if (PUBLISH) {
    const version = await tm.accounts.containers.workspaces.create_version({
      path: ws.path,
      requestBody: {
        name: "NovoSite hostname RegEx (migracao novo.segurosimediato)",
        notes: `Filtros hostname dos acionadores [NovoSite]: contains ${OLD_HOST} → matchRegex (${OLD_HOST}|${NEW_HOST}). Legado intocado.`,
      },
    });
    const versionPath = version.data.containerVersion?.path;
    console.log(
      "Versão criada:",
      versionPath,
      version.data.containerVersion?.containerVersionId,
    );
    if (!versionPath) throw new Error("create_version sem path");
    const pub = await tm.accounts.containers.versions.publish({
      path: versionPath,
    });
    console.log(
      "PUBLICADO:",
      pub.data.containerVersion?.containerVersionId,
      pub.data.containerVersion?.name,
    );
  } else {
    console.log("\nNÃO publicado. Rode com --apply --publish para publicar.");
  }
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.response?.data)
    console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
