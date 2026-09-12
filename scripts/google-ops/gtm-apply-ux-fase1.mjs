/**
 * GTM Gate C — Fase 1 UX telemetria (só GA4, zero Ads).
 *
 * Cria/atualiza DLVs, CEs e tags [NovoSite] para:
 *   form_step_timing, rpa_wait_start, rpa_wait_end, scroll_depth
 * Enrich da tag existente form_abandon: focus_field + had_filled_field.
 *
 * Uso:
 *   node gtm-apply-ux-fase1.mjs              # workspace (sem publicar)
 *   node gtm-apply-ux-fase1.mjs --publish    # + versão Live
 *
 * Transport unload: mesmas tags gaawe que form_abandon (gtag usa beacon
 * em pagehide). Validar no Preview; PR 1.1 só se perda iOS.
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const doPublish = process.argv.includes("--publish");
const HOSTNAME_REGEX =
  "(comparaseguroonline\\.com\\.br|novo\\.segurosimediato\\.com\\.br)";
const MEASUREMENT_ID = "G-694K3F1XQ1";

const NAMES = {
  dlvFormId: "[NovoSite] DLV - form_id",
  dlvRamo: "[NovoSite] DLV - ramo",
  dlvStep: "[NovoSite] DLV - step",
  dlvAction: "[NovoSite] DLV - action",
  dlvDwellMs: "[NovoSite] DLV - dwell_ms",
  dlvFocusField: "[NovoSite] DLV - focus_field",
  dlvHadFilled: "[NovoSite] DLV - had_filled_field",
  dlvWaitMs: "[NovoSite] DLV - wait_ms",
  dlvOutcome: "[NovoSite] DLV - outcome",
  dlvPercent: "[NovoSite] DLV - percent",
  dlvPagePath: "[NovoSite] DLV - page_path",
  dlvScope: "[NovoSite] DLV - scope",

  trigTiming: "[NovoSite] CE - form_step_timing (GA4)",
  trigRpaStart: "[NovoSite] CE - rpa_wait_start (GA4)",
  trigRpaEnd: "[NovoSite] CE - rpa_wait_end (GA4)",
  trigScroll: "[NovoSite] CE - scroll_depth (GA4)",

  tagTiming: "[NovoSite] GA4 - form_step_timing",
  tagRpaStart: "[NovoSite] GA4 - rpa_wait_start",
  tagRpaEnd: "[NovoSite] GA4 - rpa_wait_end",
  tagScroll: "[NovoSite] GA4 - scroll_depth",
  tagAbandon: "[NovoSite] GA4 - form_abandon",
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

function matchRegexFilter(arg0, pattern) {
  return {
    type: "matchRegex",
    parameter: [
      { type: "template", key: "arg0", value: arg0 },
      { type: "template", key: "arg1", value: pattern },
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

function ga4TagBody(name, eventName, params, triggerId) {
  return {
    name,
    type: "gaawe",
    parameter: [
      { type: "boolean", key: "sendEcommerceData", value: "false" },
      { type: "list", key: "eventSettingsTable", list: params },
      { type: "template", key: "eventName", value: eventName },
      {
        type: "template",
        key: "measurementIdOverride",
        value: MEASUREMENT_ID,
      },
    ],
    firingTriggerId: [String(triggerId)],
    tagFiringOption: "oncePerEvent",
  };
}

function stripTagReadOnly(tag) {
  const body = { ...tag };
  delete body.path;
  delete body.accountId;
  delete body.containerId;
  delete body.workspaceId;
  delete body.tagId;
  delete body.fingerprint;
  delete body.tagManagerUrl;
  return body;
}

function findByName(list, name) {
  return list.find((x) => x.name === name);
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

async function ensureTrigger(tm, ws, triggers, name, eventName) {
  let trig = findByName(triggers, name);
  if (trig) {
    console.log("Acionador ok:", name);
    return trig;
  }
  const created = await tm.accounts.containers.workspaces.triggers.create({
    parent: ws,
    requestBody: {
      name,
      type: "customEvent",
      customEventFilter: [equalsFilter("{{_event}}", eventName)],
      filter: [matchRegexFilter("{{Page Hostname}}", HOSTNAME_REGEX)],
    },
  });
  console.log("Criado acionador:", name);
  return created.data;
}

async function ensureGa4Tag(tm, ws, tags, name, eventName, params, triggerId) {
  let tag = findByName(tags, name);
  if (tag) {
    console.log("Tag ok:", name);
    return tag;
  }
  const created = await tm.accounts.containers.workspaces.tags.create({
    parent: ws,
    requestBody: ga4TagBody(name, eventName, params, triggerId),
  });
  console.log("Criada tag:", name);
  return created.data;
}

async function resolveEditableWorkspace(tm, config) {
  const containerPath =
    config.containerPath ||
    String(config.workspacePath || "").split("/workspaces/")[0];
  if (!containerPath) {
    throw new Error("config.local.json sem containerPath/workspacePath");
  }

  const list = await tm.accounts.containers.workspaces.list({
    parent: containerPath,
  });
  const workspaces = list.data.workspace || [];
  const preferred =
    workspaces.find((w) => /default/i.test(w.name || "")) || workspaces[0];

  if (preferred) {
    config.workspacePath = preferred.path;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
    return preferred.path;
  }

  const created = await tm.accounts.containers.workspaces.create({
    parent: containerPath,
    requestBody: {
      name: `ux-fase1-${Date.now()}`,
      description: "[NovoSite] UX Fase 1 GA4 Gate C",
    },
  });
  config.workspacePath = created.data.path;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  return created.data.path;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function paramExists(list, paramName) {
  return list.some((row) =>
    row.map?.some((m) => m.key === "parameter" && m.value === paramName),
  );
}

async function enrichFormAbandon(tm, tags) {
  const tag = findByName(tags, NAMES.tagAbandon);
  if (!tag) {
    console.warn("Tag form_abandon não encontrada — skip enrich");
    return;
  }
  const table = tag.parameter?.find((p) => p.key === "eventSettingsTable");
  const list = table?.list || [];
  const additions = [];
  if (!paramExists(list, "focus_field")) {
    additions.push(eventParam("focus_field", `{{${NAMES.dlvFocusField}}}`));
  }
  if (!paramExists(list, "had_filled_field")) {
    additions.push(eventParam("had_filled_field", `{{${NAMES.dlvHadFilled}}}`));
  }
  if (additions.length === 0) {
    console.log("Tag form_abandon já tem focus_field + had_filled_field");
    return;
  }
  const body = stripTagReadOnly({ ...tag });
  const settings = body.parameter.find((p) => p.key === "eventSettingsTable");
  if (!settings) {
    console.warn("form_abandon sem eventSettingsTable");
    return;
  }
  settings.list = [...list, ...additions];
  await tm.accounts.containers.workspaces.tags.update({
    path: tag.path,
    requestBody: body,
  });
  console.log(
    "Atualizada form_abandon com:",
    additions.map((a) => a.map.find((m) => m.key === "parameter")?.value).join(", "),
  );
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const auth = await getAuthorizedClient();
  const tm = getTagManager(auth);
  const ws = await resolveEditableWorkspace(tm, config);
  console.log("Workspace:", ws);

  let { variables, triggers, tags } = await listAll(tm, ws);

  const dlvSpecs = [
    [NAMES.dlvFormId, "form_id"],
    [NAMES.dlvRamo, "ramo"],
    [NAMES.dlvStep, "step"],
    [NAMES.dlvAction, "action"],
    [NAMES.dlvDwellMs, "dwell_ms"],
    [NAMES.dlvFocusField, "focus_field"],
    [NAMES.dlvHadFilled, "had_filled_field"],
    [NAMES.dlvWaitMs, "wait_ms"],
    [NAMES.dlvOutcome, "outcome"],
    [NAMES.dlvPercent, "percent"],
    [NAMES.dlvPagePath, "page_path"],
    [NAMES.dlvScope, "scope"],
  ];
  for (const [name, key] of dlvSpecs) {
    const created = await ensureDlv(tm, ws, variables, name, key);
    if (!findByName(variables, name)) variables.push(created);
    await sleep(600);
  }

  const trigTiming = await ensureTrigger(
    tm,
    ws,
    triggers,
    NAMES.trigTiming,
    "form_step_timing",
  );
  if (!findByName(triggers, NAMES.trigTiming)) triggers.push(trigTiming);
  await sleep(600);

  const trigRpaStart = await ensureTrigger(
    tm,
    ws,
    triggers,
    NAMES.trigRpaStart,
    "rpa_wait_start",
  );
  if (!findByName(triggers, NAMES.trigRpaStart)) triggers.push(trigRpaStart);
  await sleep(600);

  const trigRpaEnd = await ensureTrigger(
    tm,
    ws,
    triggers,
    NAMES.trigRpaEnd,
    "rpa_wait_end",
  );
  if (!findByName(triggers, NAMES.trigRpaEnd)) triggers.push(trigRpaEnd);
  await sleep(600);

  const trigScroll = await ensureTrigger(
    tm,
    ws,
    triggers,
    NAMES.trigScroll,
    "scroll_depth",
  );
  if (!findByName(triggers, NAMES.trigScroll)) triggers.push(trigScroll);
  await sleep(600);

  const timingParams = [
    eventParam("form_id", `{{${NAMES.dlvFormId}}}`),
    eventParam("step", `{{${NAMES.dlvStep}}}`),
    eventParam("action", `{{${NAMES.dlvAction}}}`),
    eventParam("dwell_ms", `{{${NAMES.dlvDwellMs}}}`),
    eventParam("ramo", `{{${NAMES.dlvRamo}}}`),
  ];
  const rpaStartParams = [eventParam("ramo", `{{${NAMES.dlvRamo}}}`)];
  const rpaEndParams = [
    eventParam("ramo", `{{${NAMES.dlvRamo}}}`),
    eventParam("wait_ms", `{{${NAMES.dlvWaitMs}}}`),
    eventParam("outcome", `{{${NAMES.dlvOutcome}}}`),
  ];
  const scrollParams = [
    eventParam("percent", `{{${NAMES.dlvPercent}}}`),
    eventParam("page_path", `{{${NAMES.dlvPagePath}}}`),
    eventParam("scope", `{{${NAMES.dlvScope}}}`),
  ];

  for (const [name, eventName, params, trig] of [
    [NAMES.tagTiming, "form_step_timing", timingParams, trigTiming],
    [NAMES.tagRpaStart, "rpa_wait_start", rpaStartParams, trigRpaStart],
    [NAMES.tagRpaEnd, "rpa_wait_end", rpaEndParams, trigRpaEnd],
    [NAMES.tagScroll, "scroll_depth", scrollParams, trigScroll],
  ]) {
    const created = await ensureGa4Tag(
      tm,
      ws,
      tags,
      name,
      eventName,
      params,
      trig.triggerId,
    );
    if (!findByName(tags, name)) tags.push(created);
    await sleep(600);
  }

  // Refresh tags after creates so enrich sees latest list path
  ({ tags } = await listAll(tm, ws));
  await enrichFormAbandon(tm, tags);
  await sleep(600);

  if (!doPublish) {
    console.log("\nWorkspace atualizado (sem publicar). Use --publish para Live.");
    return;
  }

  const version = await tm.accounts.containers.workspaces.create_version({
    path: ws,
    requestBody: {
      name: "UX Fase 1 — Gate C GA4",
      notes:
        "[NovoSite] form_step_timing, rpa_wait_*, scroll_depth (scope), enrich form_abandon focus_field/had_filled_field. Só GA4 G-694K3F1XQ1; zero Ads. Transport = gaawe padrão (beacon no unload).",
    },
  });
  const versionPath = version.data.containerVersion?.path;
  const versionId = version.data.containerVersion?.containerVersionId;
  console.log("Versão criada:", versionId || versionPath);

  if (versionPath) {
    await sleep(1000);
    const pub = await tm.accounts.containers.versions.publish({
      path: versionPath,
    });
    console.log(
      "Publicada Live:",
      pub.data.containerVersion?.name ||
        pub.data.containerVersion?.containerVersionId,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
