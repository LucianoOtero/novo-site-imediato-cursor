/**
 * Lista variáveis / acionadores / tags [NovoSite]* no workspace default (ou config.local.json).
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error("Rode antes: npm run gtm:whoami (gera config.local.json)");
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

async function resolveWorkspacePath(tagmanager, config) {
  if (config.workspacePath) return config.workspacePath;
  const wsRes = await tagmanager.accounts.containers.workspaces.list({
    parent: config.containerPath,
  });
  const workspaces = wsRes.data.workspace || [];
  const def =
    workspaces.find((w) => /default/i.test(w.name || "")) || workspaces[0];
  if (!def) throw new Error("Nenhum workspace no container");
  return def.path;
}

function printNamed(title, items, nameKey = "name") {
  console.log(`\n### ${title} (${items.length})`);
  for (const item of items) {
    const name = item[nameKey] || "(sem nome)";
    console.log(`- ${name}`);
  }
}

try {
  const config = loadConfig();
  const auth = await getAuthorizedClient();
  const tagmanager = getTagManager(auth);
  const workspacePath = await resolveWorkspacePath(tagmanager, config);

  console.log(`Workspace: ${workspacePath}`);

  const [varsRes, triggersRes, tagsRes] = await Promise.all([
    tagmanager.accounts.containers.workspaces.variables.list({
      parent: workspacePath,
    }),
    tagmanager.accounts.containers.workspaces.triggers.list({
      parent: workspacePath,
    }),
    tagmanager.accounts.containers.workspaces.tags.list({
      parent: workspacePath,
    }),
  ]);

  const variables = varsRes.data.variable || [];
  const triggers = triggersRes.data.trigger || [];
  const tags = tagsRes.data.tag || [];

  const filterNs = (list) =>
    list.filter((x) => String(x.name || "").includes("[NovoSite]"));

  printNamed("Variáveis [NovoSite]", filterNs(variables));
  printNamed("Acionadores [NovoSite]", filterNs(triggers));
  printNamed("Tags [NovoSite]", filterNs(tags));

  const formTriggers = triggers.filter((t) =>
    String(t.name || "").includes("form_quote_choice"),
  );
  const formTags = tags.filter((t) =>
    String(t.name || "").includes("form_quote_choice"),
  );

  console.log("\n### Form quote (todos os nomes contendo form_quote_choice)");
  for (const t of formTriggers) {
    console.log(
      `- trigger: ${t.name}  type=${t.type}  path=${t.path}`,
    );
  }
  for (const t of formTags) {
    const label = (t.parameter || []).find((p) => p.key === "conversionLabel");
    console.log(
      `- tag: ${t.name}  path=${t.path}  label=${label?.value || "?"}`,
    );
  }

  // Persiste workspacePath escolhido
  config.workspacePath = workspacePath;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
} catch (err) {
  console.error(err.message || err);
  if (err.response?.data) {
    console.error(JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
}
