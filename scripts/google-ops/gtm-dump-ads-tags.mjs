#!/usr/bin/env node
/** Somente leitura: tags de conversão do Ads, variáveis awec e acionadores ligados, na versão Live. */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const containerPath = config.gtm?.containerPath || config.containerPath || config.workspacePath.split("/workspaces/")[0];
const tm = getTagManager(await getAuthorizedClient());
const live = (await tm.accounts.containers.versions.live({ parent: containerPath })).data;

const triggers = new Map((live.trigger || []).map((t) => [t.triggerId, t]));
const resumo = (lista) => (lista || []).map((p) => ({ key: p.key, type: p.type, value: p.value, list: p.list, map: p.map }));
console.log("Live", live.containerVersionId, live.name);
for (const tag of (live.tag || []).filter((t) => t.type === "awct" || t.type === "gclidw" || t.type === "googtag")) {
  console.log(
    JSON.stringify(
      {
        name: tag.name,
        type: tag.type,
        paused: tag.paused,
        parameter: resumo(tag.parameter),
        triggers: (tag.firingTriggerId || []).map((id) => {
          const t = triggers.get(id);
          return t ? { name: t.name, type: t.type, customEventFilter: t.customEventFilter, filter: t.filter } : id;
        }),
      },
      null,
      1,
    ),
  );
}
for (const v of (live.variable || []).filter((x) => x.type === "awec" || /user_data|enhanced/i.test(x.name))) {
  console.log(JSON.stringify({ variable: v.name, type: v.type, parameter: resumo(v.parameter) }, null, 1));
}
const ga4 = (live.tag || []).find((t) => t.name === "[NovoSite] GA4 - suhai_quote_price");
console.log(JSON.stringify({ ga4Exemplo: ga4 && { parameter: resumo(ga4.parameter), firingTriggerId: ga4.firingTriggerId } }, null, 1));
const builtIn = (live.builtInVariable || []).map((b) => b.name);
console.log("builtIn:", builtIn.join(", "));
