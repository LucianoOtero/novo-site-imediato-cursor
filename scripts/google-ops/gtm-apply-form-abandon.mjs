/**
 * GTM: tags/DLVs/triggers para abandono do funil (form_abandon + reason no dismiss).
 *
 * Uso:
 *   node gtm-apply-form-abandon.mjs              # cria no workspace (sem publicar)
 *   node gtm-apply-form-abandon.mjs --publish    # cria + publica versão Live
 *
 * Só itens [NovoSite]. Não marca Ads conversion.
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const doPublish = process.argv.includes("--publish");
/** Ambos os hostnames do braço Exp (pós-migração novo.segurosimediato). */
const HOSTNAME_REGEX =
  "(comparaseguroonline\\.com\\.br|novo\\.segurosimediato\\.com\\.br)";
const MEASUREMENT_ID = "G-694K3F1XQ1";

const NAMES = {
  dlvLastStep: "[NovoSite] DLV - last_step",
  dlvMaxStep: "[NovoSite] DLV - max_step",
  dlvReason: "[NovoSite] DLV - reason",
  dlvFormId: "[NovoSite] DLV - form_id",
  dlvHadInitial: "[NovoSite] DLV - had_initial_contact",
  trigAbandon: "[NovoSite] CE - form_abandon (GA4)",
  tagAbandon: "[NovoSite] GA4 - form_abandon",
  tagDismiss: "[NovoSite] GA4 - whatsapp_modal_dismiss",
  dlvModalChannel: "[NovoSite] DLV - modal_channel",
  dlvModalStep: "[NovoSite] DLV - modal_step",
  dlvLocation: "[NovoSite] DLV - location",
  dlvRamo: "[NovoSite] DLV - ramo",
};

function equalsFilter(arg0, arg1) {
  return {
    type: "equals",
    parameter: [
      { type: "template", key: "arg0", value: arg0 },
      { type: "template", key: "arg1", value: arg1 },
    ],
  };
}

function dlvBody(name, dataLayerKey) {
  return {
    name,
    type: "v",
    parameter: [
      { type: "integer", key: "dataLayerVersion", value: "2" },
      { type: "boolean", key: "setDefaultValue", value: "false" },
      { type: "template", key: "name", value: dataLayerKey },
    ],
  };
}

function eventParam(name, valueRef) {
  return {
    type: "map",
    map: [
      { type: "template", key: "parameter", value: name },
      { type: "template", key: "parameterValue", value: valueRef },
    ],
  };
}

function stripTagReadOnly(tag) {
  delete tag.path;
  delete tag.accountId;
  delete tag.containerId;
  delete tag.workspaceId;
  delete tag.tagId;
  delete tag.fingerprint;
  delete tag.tagManagerUrl;
  return tag;
}

async function listAll(tm, workspacePath) {
  const [v, t, g] = await Promise.all([
    tm.accounts.containers.workspaces.variables.list({ parent: workspacePath }),
    tm.accounts.containers.workspaces.triggers.list({ parent: workspacePath }),
    tm.accounts.containers.workspaces.tags.list({ parent: workspacePath }),
  ]);
  return {
    variables: v.data.variable || [],
    triggers: t.data.trigger || [],
    tags: g.data.tag || [],
  };
}

function findByName(list, name) {
  return list.find((x) => x.name === name);
}

async function ensureDlv(tm, ws, variables, name, key) {
  let dlv = findByName(variables, name);
  if (dlv) {
    console.log("DLV ok:", name);
    return dlv;
  }
  const created = await tm.accounts.containers.workspaces.variables.create({
    parent: ws,
    requestBody: dlvBody(name, key),
  });
  console.log("Criada DLV:", name);
  return created.data;
}

function matchRegexFilter(arg0, pattern) {
  return {
    type: "matchRegex",
    parameter: [
      { type: "template", key: "arg0", value: arg0 },
      { type: "template", key: "arg1", value: pattern },
    ],
  };
}

async function resolveEditableWorkspace(tm, config) {
  const containerPath =
    config.containerPath ||
    String(config.workspacePath || "")
      .split("/workspaces/")[0];
  if (!containerPath) {
    throw new Error("config.local.json sem containerPath/workspacePath");
  }

  const list = await tm.accounts.containers.workspaces.list({
    parent: containerPath,
  });
  const workspaces = list.data.workspace || [];
  const preferred =
    workspaces.find((w) => /default/i.test(w.name || "")) || workspaces[0];

  // Workspace apontado no config pode estar "submitted" (não editável).
  if (config.workspacePath) {
    const known = workspaces.find((w) => w.path === config.workspacePath);
    if (known) {
      try {
        // Probe: listar variáveis é ok em submitted; create falha. Preferimos Default.
        if (/default/i.test(known.name || "")) return known.path;
      } catch {
        /* fallthrough */
      }
    }
  }

  if (preferred) {
    config.workspacePath = preferred.path;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
    return preferred.path;
  }

  const created = await tm.accounts.containers.workspaces.create({
    parent: containerPath,
    requestBody: {
      name: `form-abandon-${Date.now()}`,
      description: "[NovoSite] form_abandon GA4 + dismiss reason",
    },
  });
  config.workspacePath = created.data.path;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  return created.data.path;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const auth = await getAuthorizedClient();
  const tm = getTagManager(auth);
  const ws = await resolveEditableWorkspace(tm, config);
  console.log("Workspace:", ws);

  let { variables, triggers, tags } = await listAll(tm, ws);

  const dlvSpecs = [
    [NAMES.dlvLastStep, "last_step"],
    [NAMES.dlvMaxStep, "max_step"],
    [NAMES.dlvReason, "reason"],
    [NAMES.dlvFormId, "form_id"],
    [NAMES.dlvHadInitial, "had_initial_contact"],
  ];
  for (const [name, key] of dlvSpecs) {
    const created = await ensureDlv(tm, ws, variables, name, key);
    if (!findByName(variables, name)) variables.push(created);
    await sleep(800);
  }

  let trig = findByName(triggers, NAMES.trigAbandon);
  if (!trig) {
    const created = await tm.accounts.containers.workspaces.triggers.create({
      parent: ws,
      requestBody: {
        name: NAMES.trigAbandon,
        type: "customEvent",
        customEventFilter: [equalsFilter("{{_event}}", "form_abandon")],
        filter: [matchRegexFilter("{{Page Hostname}}", HOSTNAME_REGEX)],
      },
    });
    trig = created.data;
    triggers.push(trig);
    console.log("Criado acionador:", NAMES.trigAbandon);
    await sleep(800);
  } else {
    console.log("Acionador ok:", NAMES.trigAbandon);
  }

  let tagAbandon = findByName(tags, NAMES.tagAbandon);
  const abandonParams = [
    eventParam("form_id", `{{${NAMES.dlvFormId}}}`),
    eventParam("last_step", `{{${NAMES.dlvLastStep}}}`),
    eventParam("max_step", `{{${NAMES.dlvMaxStep}}}`),
    eventParam("reason", `{{${NAMES.dlvReason}}}`),
    eventParam("ramo", `{{${NAMES.dlvRamo}}}`),
    eventParam("had_initial_contact", `{{${NAMES.dlvHadInitial}}}`),
  ];

  if (!tagAbandon) {
    const created = await tm.accounts.containers.workspaces.tags.create({
      parent: ws,
      requestBody: {
        name: NAMES.tagAbandon,
        type: "gaawe",
        parameter: [
          { type: "boolean", key: "sendEcommerceData", value: "false" },
          { type: "list", key: "eventSettingsTable", list: abandonParams },
          { type: "template", key: "eventName", value: "form_abandon" },
          {
            type: "template",
            key: "measurementIdOverride",
            value: MEASUREMENT_ID,
          },
        ],
        firingTriggerId: [String(trig.triggerId)],
        tagFiringOption: "oncePerEvent",
      },
    });
    tagAbandon = created.data;
    tags.push(tagAbandon);
    console.log("Criada tag:", NAMES.tagAbandon);
    await sleep(800);
  } else {
    console.log("Tag ok:", NAMES.tagAbandon);
  }

  // Atualiza dismiss com param `reason` (dismiss_ui | pagehide).
  const tagDismiss = findByName(tags, NAMES.tagDismiss);
  if (tagDismiss) {
    const table = tagDismiss.parameter?.find((p) => p.key === "eventSettingsTable");
    const list = table?.list || [];
    const hasReason = list.some((row) =>
      row.map?.some((m) => m.key === "parameter" && m.value === "reason"),
    );
    if (!hasReason) {
      list.push(eventParam("reason", `{{${NAMES.dlvReason}}}`));
      const body = stripTagReadOnly({ ...tagDismiss });
      const settings = body.parameter.find((p) => p.key === "eventSettingsTable");
      if (settings) settings.list = list;
      await tm.accounts.containers.workspaces.tags.update({
        path: tagDismiss.path,
        requestBody: body,
      });
      console.log("Atualizada tag dismiss com param reason");
      await sleep(800);
    } else {
      console.log("Tag dismiss já tem param reason");
    }
  } else {
    console.warn("Tag dismiss não encontrada — pulei update de reason");
  }

  if (!doPublish) {
    console.log("\nWorkspace atualizado (sem publicar). Use --publish para Live.");
    return;
  }

  const version = await tm.accounts.containers.workspaces.create_version({
    path: ws,
    requestBody: {
      name: `form_abandon + dismiss reason`,
      notes:
        "[NovoSite] GA4 form_abandon + DLVs + CE; dismiss + reason. Sem Ads conversion.",
    },
  });
  const versionPath = version.data.containerVersion?.path;
  console.log("Versão criada:", versionPath);

  if (versionPath) {
    await sleep(1000);
    const pub = await tm.accounts.containers.versions.publish({
      path: versionPath,
    });
    console.log(
      "Publicada:",
      pub.data.containerVersion?.name ||
        pub.data.containerVersion?.containerVersionId,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
