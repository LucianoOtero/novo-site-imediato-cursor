#!/usr/bin/env node
/**
 * Contato da Suhai fora da tag genérica de contato do Ads (workspace próprio).
 *
 * O form da Suhai dispara form_initial_contact com method=suhai. A tag genérica
 * "[NovoSite] Ads - form initial contact" (ação "Envio de Formulário de Lead na
 * Página", principal na conta) disparava junto com "[NovoSite] Ads - Suhai -
 * Contato inicial": cada contato Suhai contava nas duas ações. O acionador
 * "[NovoSite] CE - form_initial_contact - suhai" vira exceção da tag genérica.
 *
 *   node gtm-suhai-excecao-contato.mjs                    → lê a Live e relata
 *   node gtm-suhai-excecao-contato.mjs --apply            → workspace, sem publicar
 *   node gtm-suhai-excecao-contato.mjs --apply --publish  → cria a versão e publica
 *
 * Rollback: remover o acionador das exceções da tag genérica e publicar.
 */
import fs from "node:fs";
import { getAuthorizedClient, getTagManager } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const APPLY = process.argv.includes("--apply");
const PUBLISH = process.argv.includes("--publish");
const WS_NAME = "Suhai - exceção na tag genérica de contato";
const TAG_GENERICA = "[NovoSite] Ads - form initial contact";
const TAG_SUHAI = "[NovoSite] Ads - Suhai - Contato inicial";
const TRG_SUHAI = "[NovoSite] CE - form_initial_contact - suhai";

function containerPathFromConfig(config) {
  return config.gtm?.containerPath || config.containerPath || config.workspacePath.split("/workspaces/")[0];
}

function stripReadOnly(body) {
  for (const k of ["path", "accountId", "containerId", "workspaceId", "tagId", "fingerprint", "tagManagerUrl"]) {
    delete body[k];
  }
  return body;
}

function relatar(fonte, { tags, triggers }) {
  const nomeTrg = (id) => triggers.find((t) => t.triggerId === String(id))?.name || `#${id}`;
  for (const nome of [TAG_GENERICA, TAG_SUHAI]) {
    const tag = tags.find((t) => t.name === nome);
    if (!tag) {
      console.log(`${fonte} | ${nome}: NÃO ENCONTRADA`);
      continue;
    }
    console.log(
      `${fonte} | ${nome}: ${tag.paused ? "PAUSADA " : ""}aciona=[${(tag.firingTriggerId || []).map(nomeTrg).join("; ")}] exceções=[${(tag.blockingTriggerId || []).map(nomeTrg).join("; ")}]`,
    );
  }
  const trg = triggers.find((t) => t.name === TRG_SUHAI);
  console.log(`${fonte} | ${TRG_SUHAI}: ${trg ? `id ${trg.triggerId}, tipo ${trg.type}` : "NÃO ENCONTRADO"}`);
  const generica = tags.find((t) => t.name === TAG_GENERICA);
  const ja = Boolean(trg && generica && (generica.blockingTriggerId || []).includes(trg.triggerId));
  console.log(`${fonte} | exceção da Suhai na tag genérica: ${ja ? "já existe" : "a incluir"}`);
  return { trg, generica, ja };
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const tm = getTagManager(await getAuthorizedClient());
  const containerPath = containerPathFromConfig(config);

  const live = (await tm.accounts.containers.versions.live({ parent: containerPath })).data || {};
  console.log(`Live ${live.containerVersionId} ${live.name || ""}`);
  relatar("Live", { tags: live.tag || [], triggers: live.trigger || [] });
  if (!APPLY) {
    console.log("Dry-run. Nada alterado.");
    return;
  }

  const wsList = await tm.accounts.containers.workspaces.list({ parent: containerPath });
  let ws = (wsList.data.workspace || []).find((w) => w.name === WS_NAME);
  if (!ws) {
    ws = (
      await tm.accounts.containers.workspaces.create({
        parent: containerPath,
        requestBody: { name: WS_NAME, description: "Contato da Suhai (method=suhai) como exceção da tag genérica de contato do Ads." },
      })
    ).data;
    console.log("Workspace criado:", ws.path);
  } else {
    console.log("Workspace já existe:", ws.path);
  }

  const [t, g] = await Promise.all([
    tm.accounts.containers.workspaces.triggers.list({ parent: ws.path }),
    tm.accounts.containers.workspaces.tags.list({ parent: ws.path }),
  ]);
  const { trg, generica, ja } = relatar("Workspace", { tags: g.data.tag || [], triggers: t.data.trigger || [] });
  if (!trg || !generica) throw new Error("tag genérica ou acionador da Suhai ausente no workspace");
  if (trg.type !== "customEvent") throw new Error(`acionador da Suhai com tipo ${trg.type}; exceção exige o mesmo tipo de evento`);

  if (!ja) {
    const body = { ...generica, blockingTriggerId: [...(generica.blockingTriggerId || []), trg.triggerId] };
    await tm.accounts.containers.workspaces.tags.update({ path: generica.path, requestBody: stripReadOnly(body) });
    console.log(`Exceção incluída em ${TAG_GENERICA}`);
  }

  const status = (await tm.accounts.containers.workspaces.getStatus({ path: ws.path })).data;
  console.log(
    "Mudanças no workspace:",
    (status.workspaceChange || []).map((c) => `${c.changeStatus} ${c.tag?.name || c.trigger?.name || c.variable?.name}`).join(" | ") || "-",
  );
  if ((status.mergeConflict || []).length) throw new Error("workspace com conflito de merge");

  if (!PUBLISH) {
    console.log(`Workspace pronto, não publicado: ${ws.path}`);
    return;
  }
  const version = await tm.accounts.containers.workspaces.create_version({
    path: ws.path,
    requestBody: {
      name: "Suhai - exceção na tag genérica de contato",
      notes: `${TRG_SUHAI} como exceção de ${TAG_GENERICA}: o contato da Suhai conta só em "Suhai - Contato inicial".`,
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
