/**
 * Dump completo do acionador/tag form_quote_choice + variáveis built-in hostname.
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH, OPS_ROOT } from "./lib/paths.mjs";

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const auth = await getAuthorizedClient();
const tm = getTagManager(auth);
const ws = config.workspacePath;

const [triggersRes, tagsRes, varsRes, builtInRes] = await Promise.all([
  tm.accounts.containers.workspaces.triggers.list({ parent: ws }),
  tm.accounts.containers.workspaces.tags.list({ parent: ws }),
  tm.accounts.containers.workspaces.variables.list({ parent: ws }),
  tm.accounts.containers.workspaces.built_in_variables.list({ parent: ws }),
]);

const triggers = (triggersRes.data.trigger || []).filter((t) =>
  String(t.name || "").includes("form_quote_choice"),
);
const tags = (tagsRes.data.tag || []).filter((t) =>
  String(t.name || "").includes("form_quote_choice"),
);
const variables = (varsRes.data.variable || []).filter((v) =>
  /\[NovoSite\]|choice|modal_channel/i.test(String(v.name || "")),
);
const builtIns = builtInRes.data.builtInVariable || [];

const out = {
  workspacePath: ws,
  triggers,
  tags,
  variables,
  builtIns: builtIns.map((b) => ({ name: b.name, type: b.type, path: b.path })),
};

const outPath = `${OPS_ROOT}/_dump-form.json`;
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
console.log("\nWrote", outPath);
