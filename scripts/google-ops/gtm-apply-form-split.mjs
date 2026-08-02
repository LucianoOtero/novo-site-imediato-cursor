/**
 * Aplica split form_quote_choice consultor/RPA no workspace (só [NovoSite]*).
 *
 * Uso:
 *   node gtm-apply-form-split.mjs --prepare-only
 *   node gtm-apply-form-split.mjs --rpa-label=XXXXX
 *   node gtm-apply-form-split.mjs --rpa-label=XXXXX --publish
 *
 * Sem --rpa-label: cria DLV + 2 acionadores (não mexe na tag Live-path).
 * Com --rpa-label: rewire tag consultor, cria tag RPA, remove CE antigo sem filtro.
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const args = process.argv.slice(2);
const prepareOnly = args.includes("--prepare-only");
const doPublish = args.includes("--publish");
const rpaLabelArg = args.find((a) => a.startsWith("--rpa-label="));
const rpaLabel = rpaLabelArg ? rpaLabelArg.split("=")[1]?.trim() : "";

const HOSTNAME = "comparaseguroonline.com.br";
const NAMES = {
  dlv: "[NovoSite] DLV - choice",
  trigConsultor: "[NovoSite] CE - form_quote_choice - consultor",
  trigAguardar: "[NovoSite] CE - form_quote_choice - aguardar",
  trigOld: "[NovoSite] CE - form_quote_choice",
  tagConsultor: "[NovoSite] Ads - form_quote_choice - consultor",
  tagOld: "[NovoSite] Ads - form_quote_choice",
  tagAguardar: "[NovoSite] Ads - form_quote_choice - aguardar",
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

function containsFilter(arg0, arg1) {
  return {
    type: "contains",
    parameter: [
      { type: "template", key: "arg0", value: arg0 },
      { type: "template", key: "arg1", value: arg1 },
    ],
  };
}

function customEventFormQuote() {
  return [equalsFilter("{{_event}}", "form_quote_choice")];
}

function choiceAndHostFilters(choiceValue, dlvRef) {
  return [
    equalsFilter(dlvRef, choiceValue),
    containsFilter("{{Page Hostname}}", HOSTNAME),
  ];
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

async function main() {
  if (!prepareOnly && !rpaLabel) {
    console.error(
      "Informe --rpa-label=LABEL ou --prepare-only\nEx.: node gtm-apply-form-split.mjs --rpa-label=AbCdEfGhIjKlMnOpQrSt",
    );
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const auth = await getAuthorizedClient();
  const tm = getTagManager(auth);
  const ws = config.workspacePath;

  let { variables, triggers, tags } = await listAll(tm, ws);

  // 1) DLV choice
  let dlv = findByName(variables, NAMES.dlv);
  if (!dlv) {
    const created = await tm.accounts.containers.workspaces.variables.create({
      parent: ws,
      requestBody: {
        name: NAMES.dlv,
        type: "v",
        parameter: [
          { type: "integer", key: "dataLayerVersion", value: "2" },
          { type: "boolean", key: "setDefaultValue", value: "false" },
          { type: "template", key: "name", value: "choice" },
        ],
      },
    });
    dlv = created.data;
    console.log("Criada variável:", dlv.name, dlv.path);
  } else {
    console.log("Variável já existe:", dlv.name);
  }
  const dlvRef = `{{${NAMES.dlv}}}`;

  // 2) Triggers filtrados
  async function ensureTrigger(name, choiceValue) {
    let trig = findByName(triggers, name);
    if (trig) {
      console.log("Acionador já existe:", name);
      return trig;
    }
    const created = await tm.accounts.containers.workspaces.triggers.create({
      parent: ws,
      requestBody: {
        name,
        type: "customEvent",
        customEventFilter: customEventFormQuote(),
        filter: choiceAndHostFilters(choiceValue, dlvRef),
      },
    });
    console.log("Criado acionador:", name, created.data.path);
    return created.data;
  }

  const trigConsultor = await ensureTrigger(NAMES.trigConsultor, "consultor");
  ({ triggers } = await listAll(tm, ws));
  const trigAguardar = await ensureTrigger(NAMES.trigAguardar, "aguardar");

  if (prepareOnly) {
    console.log(
      "\n--prepare-only: DLV + acionadores ok. Tag ainda aponta ao CE antigo.",
    );
    console.log("Depois: node gtm-apply-form-split.mjs --rpa-label=SEU_LABEL");
    return;
  }

  ({ tags, triggers } = await listAll(tm, ws));

  // 3) Tag consultor (rename + rewire)
  let tagForm =
    findByName(tags, NAMES.tagConsultor) || findByName(tags, NAMES.tagOld);
  if (!tagForm) {
    throw new Error("Tag form_quote_choice não encontrada");
  }

  const consultorBody = {
    ...tagForm,
    name: NAMES.tagConsultor,
    firingTriggerId: [String(trigConsultor.triggerId)],
    // manter conversionLabel KL9b
  };
  stripTagReadOnly(consultorBody);
  const updated = await tm.accounts.containers.workspaces.tags.update({
    path: tagForm.path,
    requestBody: consultorBody,
  });
  console.log("Tag consultor atualizada:", updated.data.name, "→ trigger", trigConsultor.triggerId);

  // 4) Tag RPA
  ({ tags } = await listAll(tm, ws));
  let tagRpa = findByName(tags, NAMES.tagAguardar);
  if (!tagRpa) {
    const created = await tm.accounts.containers.workspaces.tags.create({
      parent: ws,
      requestBody: {
        name: NAMES.tagAguardar,
        type: "awct",
        parameter: [
          { type: "boolean", key: "enableNewCustomerReporting", value: "false" },
          { type: "boolean", key: "enableConversionLinker", value: "true" },
          { type: "boolean", key: "enableProductReporting", value: "false" },
          { type: "template", key: "conversionValue", value: "30" },
          { type: "boolean", key: "enableShippingData", value: "false" },
          { type: "template", key: "conversionId", value: "815139667" },
          { type: "template", key: "currencyCode", value: "BRL" },
          { type: "template", key: "conversionLabel", value: rpaLabel },
          { type: "boolean", key: "rdp", value: "false" },
        ],
        firingTriggerId: [String(trigAguardar.triggerId)],
        tagFiringOption: "oncePerEvent",
      },
    });
    tagRpa = created.data;
    console.log("Criada tag RPA:", tagRpa.name, "label=", rpaLabel);
  } else {
    console.log("Tag RPA já existe:", tagRpa.name);
  }

  // 5) Remover CE antigo sem filtro (se nenhuma tag usa)
  ({ tags, triggers } = await listAll(tm, ws));
  const oldTrig = findByName(triggers, NAMES.trigOld);
  if (oldTrig) {
    const stillUsed = tags.some((t) =>
      (t.firingTriggerId || []).includes(String(oldTrig.triggerId)),
    );
    if (stillUsed) {
      console.warn(
        "CE antigo ainda referenciado por alguma tag — NÃO removido:",
        oldTrig.path,
      );
    } else {
      await tm.accounts.containers.workspaces.triggers.delete({
        path: oldTrig.path,
      });
      console.log("Removido acionador antigo sem filtro:", NAMES.trigOld);
    }
  } else {
    console.log("CE antigo já ausente.");
  }

  // Sanity: nenhum item legado alterado — só logamos [NovoSite]
  console.log("\nDiff esperado: apenas itens [NovoSite]* (DLV choice, 2 CEs, 2 tags form).");

  if (doPublish) {
    const version = await tm.accounts.containers.workspaces.create_version({
      path: ws,
      requestBody: {
        name: "NovoSite split form consultor/RPA + hostname",
        notes:
          "Aditivo [NovoSite]: DLV choice; CE form filtrados consultor/aguardar + hostname comparaseguroonline.com.br; tags Ads form split; CE form sem filtro removido. Legado intocado.",
      },
    });
    const versionPath = version.data.containerVersion?.path;
    console.log("Versão criada:", versionPath, version.data.containerVersion?.containerVersionId);
    if (!versionPath) {
      throw new Error("create_version sem path");
    }
    const pub = await tm.accounts.containers.versions.publish({
      path: versionPath,
    });
    console.log(
      "PUBLICADO:",
      pub.data.containerVersion?.containerVersionId,
      pub.data.containerVersion?.name,
    );
  } else {
    console.log(
      "\nWorkspace atualizado (NÃO publicado). Revise no GTM Preview; depois:",
    );
    console.log(
      `  node gtm-apply-form-split.mjs --rpa-label=${rpaLabel} --publish`,
    );
    console.log("ou Publish manual na UI após smoke legado.");
  }
}

function stripTagReadOnly(body) {
  delete body.path;
  delete body.accountId;
  delete body.containerId;
  delete body.workspaceId;
  delete body.tagId;
  delete body.fingerprint;
  delete body.tagManagerUrl;
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
