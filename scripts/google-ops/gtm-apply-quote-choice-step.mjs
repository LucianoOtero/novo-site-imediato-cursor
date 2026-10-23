/**
 * GTM + GA4: parâmetro `step` (3 = saída pelo consultor na etapa 3; 4 = escolha na etapa 4)
 * na tag `[NovoSite] GA4 - form_quote_choice`, e dimensão personalizada `step` (escopo evento).
 *
 * Uso:
 *   node gtm-apply-quote-choice-step.mjs              # altera o workspace (sem publicar)
 *   node gtm-apply-quote-choice-step.mjs --publish    # altera + publica versão Live
 *
 * Com --publish, aborta se o workspace tiver outras mudanças pendentes.
 */
import fs from "node:fs";
import {
  getAnalyticsAdmin,
  getAuthorizedClient,
  getTagManager,
} from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const doPublish = process.argv.includes("--publish");
const PROPERTY_ID = "281067607";
const TAG_NAME = "[NovoSite] GA4 - form_quote_choice";
const DLV_STEP = "[NovoSite] DLV - step";

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

async function ensureStepDimension(auth, config) {
  const propertyId =
    String(config.ga4?.propertyId || PROPERTY_ID).replace(/\D/g, "") ||
    PROPERTY_ID;
  const admin = getAnalyticsAdmin(auth);
  const parent = `properties/${propertyId}`;
  const res = await admin.properties.customDimensions.list({ parent, pageSize: 200 });
  const found = (res.data.customDimensions || []).find(
    (d) => String(d.parameterName || "").toLowerCase() === "step",
  );
  if (found) {
    console.log("GA4: dimensão step já existe →", found.name, `(${found.displayName}, ${found.scope})`);
    return;
  }
  const created = await admin.properties.customDimensions.create({
    parent,
    requestBody: { parameterName: "step", displayName: "Step (form)", scope: "EVENT" },
  });
  console.log("GA4: criada dimensão step →", created.data.name);
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const auth = await getAuthorizedClient();
  const tm = getTagManager(auth);
  const containerPath = String(config.workspacePath || "").split("/workspaces/")[0];
  const workspaces =
    (await tm.accounts.containers.workspaces.list({ parent: containerPath })).data.workspace || [];
  const ws = workspaces.find((w) => /default/i.test(w.name || ""))?.path;
  if (!ws) throw new Error("Default Workspace não encontrado");
  console.log("Workspace:", ws);

  const [tagsRes, varsRes] = await Promise.all([
    tm.accounts.containers.workspaces.tags.list({ parent: ws }),
    tm.accounts.containers.workspaces.variables.list({ parent: ws }),
  ]);
  if (!(varsRes.data.variable || []).some((v) => v.name === DLV_STEP)) {
    throw new Error(`Variável ausente: ${DLV_STEP}`);
  }
  const tag = (tagsRes.data.tag || []).find((t) => t.name === TAG_NAME);
  if (!tag) throw new Error(`Tag ausente: ${TAG_NAME}`);

  const table = tag.parameter?.find((p) => p.key === "eventSettingsTable");
  const list = table?.list || [];
  const hasStep = list.some((row) =>
    row.map?.some((m) => m.key === "parameter" && m.value === "step"),
  );
  if (hasStep) {
    console.log("Tag já tem o parâmetro step");
  } else {
    list.push(eventParam("step", `{{${DLV_STEP}}}`));
    const body = stripTagReadOnly({ ...tag });
    const settings = body.parameter.find((p) => p.key === "eventSettingsTable");
    if (settings) settings.list = list;
    await tm.accounts.containers.workspaces.tags.update({
      path: tag.path,
      requestBody: body,
    });
    console.log("Tag atualizada com o parâmetro step");
  }

  await ensureStepDimension(auth, config);

  const status = await tm.accounts.containers.workspaces.getStatus({ path: ws });
  const changes = (status.data.workspaceChange || []).map((c) => {
    const item = c.tag || c.trigger || c.variable || c.folder || c.builtInVariable || {};
    return `${c.changeStatus}: ${item.name || item.type || "?"}`;
  });
  console.log("Mudanças pendentes no workspace:", changes.length ? `\n  ${changes.join("\n  ")}` : "nenhuma");

  if (!doPublish) {
    console.log("\nWorkspace atualizado (sem publicar). Use --publish para Live.");
    return;
  }
  const outras = changes.filter((c) => !c.endsWith(TAG_NAME));
  if (outras.length) {
    throw new Error("Workspace com outras mudanças pendentes; publicação abortada.");
  }

  const version = await tm.accounts.containers.workspaces.create_version({
    path: ws,
    requestBody: {
      name: "form_quote_choice + step",
      notes: "[NovoSite] GA4 form_quote_choice com o parâmetro step (3 = consultor na etapa 3; 4 = etapa 4).",
    },
  });
  const versionPath = version.data.containerVersion?.path;
  console.log("Versão criada:", versionPath);
  if (versionPath) {
    const pub = await tm.accounts.containers.versions.publish({ path: versionPath });
    console.log(
      "Publicada:",
      pub.data.containerVersion?.name || pub.data.containerVersion?.containerVersionId,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
