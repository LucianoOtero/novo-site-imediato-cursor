#!/usr/bin/env node
/**
 * Medição completa da Suhai no GTM (workspace próprio):
 * - variáveis de dataLayer dos parâmetros suhai_* (reaproveita as que existem);
 * - uma tag GA4 para todos os eventos ^suhai_, com nome {{Event}} e os
 *   parâmetros; remove as três tags GA4 por evento da versão anterior;
 * - três tags de conversão do Ads (Contato Suhai, Preço exibido, Proposta
 *   enviada) com dados fornecidos pelo usuário;
 * - a variável JS de user_data passa a devolver também o e-mail com hash.
 *
 *   node gtm-suhai-medicao-completa.mjs                    → lê a Live e relata
 *   node gtm-suhai-medicao-completa.mjs --apply            → workspace, sem publicar
 *   node gtm-suhai-medicao-completa.mjs --apply --publish  → cria a versão e publica
 */
import fs from "node:fs";
import { lerAcoesSuhai } from "./ads-suhai-conversion-actions.mjs";
import { adsSession } from "./lib/ads-rest.mjs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const APPLY = process.argv.includes("--apply");
const PUBLISH = process.argv.includes("--publish");
const WS_NAME = "Suhai - medição completa";
const MEASUREMENT_ID = "G-694K3F1XQ1";
const AW_ID = "815139667";
const HOSTNAME_REGEX =
  "comparaseguroonline\\.com\\.br|novo\\.segurosimediato\\.com\\.br|www\\.segurosimediato\\.com\\.br|suhai\\.segurosimediato\\.com\\.br";
const USER_DATA_VAR = "Dados fornecidos pelo usuário";
const JS_USER_DATA = "JS - user_data conversoes otimizadas";
const JS_USER_DATA_CODE = `function() {
  var u = {{DLV - user_data}};
  if (!u || typeof u !== 'object') return undefined;
  var out = {};
  if (u.sha256_phone_number) out.sha256_phone_number = u.sha256_phone_number;
  else if (u.phone_number) out.phone_number = u.phone_number;
  if (u.sha256_email_address) out.sha256_email_address = u.sha256_email_address;
  return Object.keys(out).length ? out : undefined;
}`;

const PARAMS_GA4 = [
  "form_id",
  "arm",
  "step",
  "field",
  "result",
  "http_status",
  "duration_ms",
  "slow",
  "recalc",
  "plans",
  "simulated",
  "level",
  "plan",
  "assist",
  "premium_band",
  "installments",
  "stage",
  "reason",
  "last_step",
];
const CHAVES_DLV = [...PARAMS_GA4, "method", "transaction_id"];

const TAGS_ANTIGAS = ["suhai_quote_start", "suhai_quote_price", "suhai_proposal_sent"].map((e) => `[NovoSite] GA4 - ${e}`);
const TAG_GA4 = "[NovoSite] GA4 - suhai_* (todos)";
const TRG_GA4 = "[NovoSite] CE - suhai_* (GA4)";
const TRG_CONTATO = "[NovoSite] CE - form_initial_contact - suhai";
const TRG_PRECO = "[NovoSite] CE - suhai_quote_price (Ads)";
const TRG_PROPOSTA = "[NovoSite] CE - suhai_proposal_sent (Ads)";
const TAGS_ADS = {
  contato: { name: "[NovoSite] Ads - Suhai - Contato inicial", trigger: TRG_CONTATO },
  preco: { name: "[NovoSite] Ads - Suhai - Preço exibido", trigger: TRG_PRECO },
  proposta: { name: "[NovoSite] Ads - Suhai - Proposta enviada", trigger: TRG_PROPOSTA, valor: "120" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tpl = (key, value) => ({ type: "template", key, value });
const filtro = (type, arg0, arg1) => ({ type, parameter: [tpl("arg0", arg0), tpl("arg1", arg1)] });
const dlvKey = (v) => (v.type === "v" ? (v.parameter || []).find((p) => p.key === "name")?.value : undefined);

function containerPathFromConfig(config) {
  return config.gtm?.containerPath || config.containerPath || config.workspacePath.split("/workspaces/")[0];
}

function stripReadOnly(body) {
  for (const k of ["path", "accountId", "containerId", "workspaceId", "variableId", "triggerId", "tagId", "fingerprint", "tagManagerUrl"]) {
    delete body[k];
  }
  return body;
}

function mapaDlv(variables) {
  const porChave = new Map();
  for (const v of variables) {
    const chave = dlvKey(v);
    if (chave && !porChave.has(chave)) porChave.set(chave, v.name);
  }
  return porChave;
}

function acionadorCE(name, eventoFiltro, extra = []) {
  return {
    name,
    type: "customEvent",
    customEventFilter: [eventoFiltro],
    filter: [filtro("matchRegex", "{{Page Hostname}}", HOSTNAME_REGEX), ...extra],
  };
}

function tagGa4(dlv, triggerId) {
  return {
    name: TAG_GA4,
    type: "gaawe",
    parameter: [
      { type: "boolean", key: "sendEcommerceData", value: "false" },
      {
        type: "list",
        key: "eventSettingsTable",
        list: PARAMS_GA4.map((p) => ({
          type: "map",
          map: [tpl("parameter", p), tpl("parameterValue", `{{${dlv.get(p)}}}`)],
        })),
      },
      tpl("eventName", "{{Event}}"),
      tpl("measurementIdOverride", MEASUREMENT_ID),
    ],
    firingTriggerId: [String(triggerId)],
    tagFiringOption: "oncePerEvent",
  };
}

function tagAds(def, label, triggerId, dlv) {
  const parameter = [
    { type: "boolean", key: "enableNewCustomerReporting", value: "false" },
    { type: "boolean", key: "enableConversionLinker", value: "true" },
    { type: "boolean", key: "enableProductReporting", value: "false" },
    { type: "boolean", key: "enableEnhancedConversion", value: "true" },
    tpl("cssProvidedEnhancedConversionValue", `{{${USER_DATA_VAR}}}`),
    { type: "boolean", key: "enableShippingData", value: "false" },
    tpl("conversionId", AW_ID),
    tpl("conversionLabel", label),
    { type: "boolean", key: "rdp", value: "false" },
  ];
  if (def.valor) {
    parameter.push(tpl("conversionValue", def.valor), tpl("currencyCode", "BRL"), tpl("orderId", `{{${dlv.get("transaction_id")}}}`));
  }
  return { name: def.name, type: "awct", parameter, firingTriggerId: [String(triggerId)], tagFiringOption: "oncePerEvent" };
}

function relatar(fonte, { tags, triggers, variables }) {
  const dlv = mapaDlv(variables);
  console.log(`${fonte}: ${tags.length} tags, ${triggers.length} acionadores, ${variables.length} variáveis`);
  console.log(`DLVs existentes reaproveitadas: ${CHAVES_DLV.filter((k) => dlv.has(k)).map((k) => `${k}=${dlv.get(k)}`).join(", ") || "-"}`);
  console.log(`DLVs a criar: ${CHAVES_DLV.filter((k) => !dlv.has(k)).join(", ") || "-"}`);
  console.log(`Tags GA4 antigas a remover: ${TAGS_ANTIGAS.filter((n) => tags.some((t) => t.name === n)).join(", ") || "-"}`);
  for (const n of [TAG_GA4, ...Object.values(TAGS_ADS).map((d) => d.name)]) {
    console.log(`${n}: ${tags.some((t) => t.name === n) ? "existe" : "a criar"}`);
  }
  const js = variables.find((v) => v.name === JS_USER_DATA);
  const codigo = (js?.parameter || []).find((p) => p.key === "javascript")?.value || "";
  console.log(`${JS_USER_DATA}: ${codigo.includes("sha256_email_address") ? "já devolve e-mail" : "a atualizar (incluir e-mail)"}`);
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const tm = getTagManager(await getAuthorizedClient());
  const containerPath = containerPathFromConfig(config);

  const acoes = await lerAcoesSuhai(await adsSession());
  const rotulos = {};
  for (const [chave, nome] of [
    ["contato", "Suhai - Contato inicial"],
    ["preco", "Suhai - Preço exibido"],
    ["proposta", "Suhai - Proposta enviada"],
  ]) {
    const snippet = (acoes.get(nome)?.tagSnippets || []).map((s) => s.eventSnippet || "").join(" ");
    rotulos[chave] = snippet.match(/send_to['"]?\s*:\s*['"]AW-\d+\/([^'"]+)['"]/)?.[1];
  }
  console.log("Rótulos do Ads:", JSON.stringify(rotulos));

  if (!APPLY) {
    const live = (await tm.accounts.containers.versions.live({ parent: containerPath })).data || {};
    console.log(`Live ${live.containerVersionId} ${live.name || ""}`);
    relatar("Live", { tags: live.tag || [], triggers: live.trigger || [], variables: live.variable || [] });
    console.log("Dry-run. Nada alterado.");
    return;
  }
  const faltaRotulo = Object.entries(rotulos).filter(([, v]) => !v).map(([k]) => k);
  if (faltaRotulo.length) throw new Error(`ações do Ads sem rótulo: ${faltaRotulo.join(", ")} (rode ads-suhai-conversion-actions.mjs --apply)`);

  const wsList = await tm.accounts.containers.workspaces.list({ parent: containerPath });
  let ws = (wsList.data.workspace || []).find((w) => w.name === WS_NAME);
  if (!ws) {
    ws = (
      await tm.accounts.containers.workspaces.create({
        parent: containerPath,
        requestBody: { name: WS_NAME, description: "Tag GA4 única para suhai_*, conversões Suhai no Ads e e-mail com hash no user_data." },
      })
    ).data;
    console.log("Workspace criado:", ws.path);
  } else {
    console.log("Workspace já existe:", ws.path);
  }

  const listar = async () => {
    const [v, t, g] = await Promise.all([
      tm.accounts.containers.workspaces.variables.list({ parent: ws.path }),
      tm.accounts.containers.workspaces.triggers.list({ parent: ws.path }),
      tm.accounts.containers.workspaces.tags.list({ parent: ws.path }),
    ]);
    return { variables: v.data.variable || [], triggers: t.data.trigger || [], tags: g.data.tag || [] };
  };
  let { variables, triggers, tags } = await listar();

  const dlv = mapaDlv(variables);
  for (const chave of CHAVES_DLV.filter((k) => !dlv.has(k))) {
    const name = `[NovoSite] DLV - ${chave}`;
    await tm.accounts.containers.workspaces.variables.create({
      parent: ws.path,
      requestBody: {
        name,
        type: "v",
        parameter: [
          { type: "integer", key: "dataLayerVersion", value: "2" },
          { type: "boolean", key: "setDefaultValue", value: "false" },
          tpl("name", chave),
        ],
      },
    });
    dlv.set(chave, name);
    console.log("Criada DLV:", name);
    await sleep(700);
  }

  const js = variables.find((v) => v.name === JS_USER_DATA);
  if (!js) throw new Error(`variável ${JS_USER_DATA} não encontrada`);
  const codigoAtual = (js.parameter || []).find((p) => p.key === "javascript")?.value || "";
  if (!codigoAtual.includes("sha256_email_address")) {
    const body = { ...js, parameter: [tpl("javascript", JS_USER_DATA_CODE)] };
    await tm.accounts.containers.workspaces.variables.update({ path: js.path, requestBody: stripReadOnly(body) });
    console.log("Atualizada:", JS_USER_DATA);
    await sleep(700);
  }

  const garantirAcionador = async (corpo) => {
    const atual = triggers.find((t) => t.name === corpo.name);
    if (atual) return atual.triggerId;
    const criado = (await tm.accounts.containers.workspaces.triggers.create({ parent: ws.path, requestBody: corpo })).data;
    console.log("Criado acionador:", corpo.name);
    await sleep(700);
    return criado.triggerId;
  };
  const trgGa4 = await garantirAcionador(acionadorCE(TRG_GA4, filtro("matchRegex", "{{_event}}", "^suhai_")));
  const trgIds = {
    contato: await garantirAcionador(
      acionadorCE(TRG_CONTATO, filtro("equals", "{{_event}}", "form_initial_contact"), [
        filtro("equals", `{{${dlv.get("method")}}}`, "suhai"),
      ]),
    ),
    preco: await garantirAcionador(acionadorCE(TRG_PRECO, filtro("equals", "{{_event}}", "suhai_quote_price"))),
    proposta: await garantirAcionador(acionadorCE(TRG_PROPOSTA, filtro("equals", "{{_event}}", "suhai_proposal_sent"))),
  };

  for (const nome of TAGS_ANTIGAS) {
    const tag = tags.find((t) => t.name === nome);
    if (!tag) continue;
    await tm.accounts.containers.workspaces.tags.delete({ path: tag.path });
    console.log("Removida tag:", nome);
    await sleep(700);
  }

  ({ tags } = await listar());
  if (!tags.some((t) => t.name === TAG_GA4)) {
    await tm.accounts.containers.workspaces.tags.create({ parent: ws.path, requestBody: tagGa4(dlv, trgGa4) });
    console.log("Criada tag:", TAG_GA4);
    await sleep(700);
  }
  for (const [chave, def] of Object.entries(TAGS_ADS)) {
    if (tags.some((t) => t.name === def.name)) continue;
    await tm.accounts.containers.workspaces.tags.create({
      parent: ws.path,
      requestBody: tagAds(def, rotulos[chave], trgIds[chave], dlv),
    });
    console.log("Criada tag:", def.name);
    await sleep(700);
  }

  const status = (await tm.accounts.containers.workspaces.getStatus({ path: ws.path })).data;
  console.log(
    "Mudanças no workspace:",
    (status.workspaceChange || []).map((c) => `${c.changeStatus} ${c.tag?.name || c.trigger?.name || c.variable?.name}`).join(" | "),
  );
  if ((status.mergeConflict || []).length) throw new Error("workspace com conflito de merge");

  if (!PUBLISH) {
    console.log(`Workspace pronto, não publicado: ${ws.path}`);
    return;
  }
  const version = await tm.accounts.containers.workspaces.create_version({
    path: ws.path,
    requestBody: {
      name: "Suhai - medição completa (GA4 + Ads)",
      notes:
        "Tag GA4 única para ^suhai_ com parâmetros (substitui as 3 tags por evento). Conversões Ads: Suhai - Contato inicial, Preço exibido, Proposta enviada (com transaction_id). user_data passa a incluir e-mail com hash.",
    },
  });
  const versionPath = version.data.containerVersion?.path;
  if (!versionPath) throw new Error("create_version sem path");
  console.log("Versão criada:", version.data.containerVersion?.containerVersionId);
  const pub = await tm.accounts.containers.versions.publish({ path: versionPath });
  console.log("PUBLICADO:", pub.data.containerVersion?.containerVersionId, pub.data.containerVersion?.name);
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
