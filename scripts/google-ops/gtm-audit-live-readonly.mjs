/**
 * Auditoria somente leitura da versão Live do GTM.
 * Não cria workspace, versão ou publicação.
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const containerPath = config.gtm?.containerPath || config.containerPath;
if (!containerPath) throw new Error("containerPath ausente em config.local.json");

const auth = await getAuthorizedClient({ withAds: true });
const tm = getTagManager(auth);
const live = await tm.accounts.containers.versions.live({
  parent: containerPath,
});
const version = live.data || {};

const relevant = (name = "") =>
  name.includes("[NovoSite]") ||
  name.includes("form_initial_contact") ||
  name.includes("whatsapp_modal") ||
  name.includes("phone_modal") ||
  name.includes("form_quote_choice");

function label(tag) {
  const params = tag.parameter || [];
  return (
    params.find((p) => p.key === "conversionLabel")?.value ||
    params.find((p) => p.key === "eventName")?.value ||
    ""
  );
}

const result = {
  containerVersionId: version.containerVersionId,
  name: version.name,
  description: version.description,
  tags: (version.tag || [])
    .filter((x) => relevant(x.name))
    .map((x) => ({
      id: x.tagId,
      name: x.name,
      type: x.type,
      paused: x.paused || false,
      firingTriggerId: x.firingTriggerId || [],
      label: label(x),
    })),
  triggers: (version.trigger || [])
    .filter((x) => relevant(x.name))
    .map((x) => ({
      id: x.triggerId,
      name: x.name,
      type: x.type,
      customEventFilter: x.customEventFilter || [],
      filter: x.filter || [],
    })),
  variables: (version.variable || [])
    .filter((x) => relevant(x.name))
    .map((x) => ({ id: x.variableId, name: x.name, type: x.type })),
};

console.log(JSON.stringify(result, null, 2));
