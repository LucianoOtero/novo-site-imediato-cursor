import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const auth = await getAuthorizedClient();
const tm = getTagManager(auth);
const res = await tm.accounts.containers.workspaces.triggers.list({
  parent: config.workspacePath,
});
const triggers = (res.data.trigger || []).filter((t) =>
  String(t.name || "").includes("[NovoSite] CE - whatsapp_modal_submit - whatsapp"),
);
console.log(JSON.stringify(triggers, null, 2));
