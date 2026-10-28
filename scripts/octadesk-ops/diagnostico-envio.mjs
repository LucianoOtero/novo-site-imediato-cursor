/**
 * scripts/octadesk-ops/diagnostico-envio.mjs — bateria de diagnóstico do
 * envio de templates WhatsApp pelo Octadesk (401 "Authentication is
 * required" com code NOT_MAPPED em /chat/send-template, 2026-10-28).
 *
 * Uso (na raiz do repositório, com gcloud autenticado):
 *   node scripts/octadesk-ops/diagnostico-envio.mjs                 # nível 0
 *   node scripts/octadesk-ops/diagnostico-envio.mjs --nivel 1 --confirmo-envio
 *
 * Nível 0 não entrega mensagem a ninguém: leituras, chamadas com chave
 * inválida (linha de base de um 401 de verdade), corpo vazio, template
 * inexistente e número de origem inexistente, mais os logs do GCP.
 * Nível 1 envia templates reais, só para o telefone de teste de
 * e2e/testes-espocrm.cases.json, direto na API e pelo proxy legado.
 *
 * A chave nunca é impressa; telefones e e-mails nas respostas saem
 * mascarados. O resultado completo vai para um JSON em %TEMP%, para
 * anexar a um chamado no suporte do Octadesk.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const nivel = Number(args[args.indexOf("--nivel") + 1] || 0) || 0;
const confirmado = args.includes("--confirmo-envio");
const versao = args.includes("--versao") ? args[args.indexOf("--versao") + 1] : "latest";
if (nivel >= 1 && !confirmado) {
  console.error("Nível 1 envia mensagens reais ao telefone de teste: repita com --confirmo-envio.");
  process.exit(2);
}

const PROJETO = "imediato-seguros-site-novo";
const PROJETO_PROXY = "leads-imediato-seguros";

function gcloud(cmd) {
  return execSync(`gcloud ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 20 * 1024 * 1024 }).trim();
}

function mascarar(texto) {
  return String(texto ?? "")
    .replace(/\+?55\d{10,11}/g, "<tel>")
    .replace(/\b\d{10,13}\b/g, "<num>")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/gi, "<email>");
}

const config = JSON.parse(gcloud(`secrets versions access ${versao} --secret=OCTADESK_API_CONFIG --project=${PROJETO}`));
const urlProxy = gcloud(`secrets versions access latest --secret=OCTADESK_URL --project=${PROJETO}`);
const base = config.baseUrl.replace(/\/$/, "");
const { identidade } = JSON.parse(readFileSync("e2e/testes-espocrm.cases.json", "utf8"));
const telefoneTeste = `+55${identidade.ddd}${identidade.celular}`.replace(/[^\d+]/g, "");

const resultados = [];

async function chamar(id, descricao, { metodo = "GET", caminho, chave = config.apiKey, corpo, url } = {}) {
  const destino = url || `${base}${caminho}`;
  const headers = { accept: "application/json" };
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (chave) headers["X-API-KEY"] = chave;
  const inicio = Date.now();
  let status = null;
  let texto = "";
  try {
    const r = await fetch(destino, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    status = r.status;
    texto = await r.text().catch(() => "");
  } catch (e) {
    texto = `erro de rede: ${e.message}`;
  }
  let resumo = mascarar(texto).slice(0, 400);
  try {
    const j = JSON.parse(texto);
    const err = j.error || j.response?.error || {};
    resumo = mascarar(JSON.stringify({
      code: j.code,
      status: j.status,
      message: err.message || j.message,
      customCode: err.customCode,
      correlationId: j.correlationId,
      id: err.id,
      success: j.success,
      details: j.details,
      itens: Array.isArray(j) ? j.length : undefined,
    }));
  } catch {
    // corpo não-JSON: fica o texto mascarado
  }
  const linha = { id, descricao, metodo, caminho: url ? new URL(url).host : caminho, status, ms: Date.now() - inicio, resumo };
  resultados.push(linha);
  console.log(`${id.padEnd(6)} ${String(status).padEnd(4)} ${descricao}\n       ${resumo}`);
  return linha;
}

function payloadTemplate(templateId, origem, destino, variaveis = []) {
  return {
    origin: { contact: { channel: "whatsapp", code: origem } },
    target: { contact: { channel: "whatsapp", code: destino } },
    content: {
      templateMessage: {
        id: templateId,
        variables: variaveis.map((value, i) => ({ key: `var-${i + 1}`, value })),
      },
    },
    options: { automaticAssign: false },
  };
}

function logs(id, descricao, projeto, filtro, limite = 200) {
  let linhas = [];
  try {
    const saida = gcloud(`logging read "${filtro.replace(/"/g, '\\"')}" --project=${projeto} --limit=${limite} --format="value(timestamp,textPayload)"`);
    linhas = saida ? saida.split(/\r?\n/) : [];
  } catch (e) {
    linhas = [`erro: ${String(e.stderr || e.message).slice(0, 200)}`];
  }
  const resumo = linhas.slice(0, 3).map((l) => mascarar(l).slice(0, 160));
  resultados.push({ id, descricao, total: linhas.length, primeiras: resumo });
  console.log(`${id.padEnd(6)} ${String(linhas.length).padEnd(4)} ${descricao}`);
  for (const l of resumo) console.log(`       ${l}`);
}

console.log(`Octadesk ${new URL(base).host} | OCTADESK_API_CONFIG ${versao} | origem final ${String(config.fromNumber).slice(-4)} | teste final ${telefoneTeste.slice(-4)} | nível ${nivel}\n`);

// ——— Nível 0: nada é entregue ———
const chaveFalsa = `diag-${randomUUID()}`;
await chamar("L0-1", "leitura com a chave atual (esperado 200)", { caminho: "/chat?limit=1" });
await chamar("L0-2", "leitura com chave inválida (linha de base de um 401 real)", { caminho: "/chat?limit=1", chave: chaveFalsa });
await chamar("L0-3", "leitura sem chave", { caminho: "/chat?limit=1", chave: null });
await chamar("L0-4", "send-template com a chave atual e corpo vazio (esperado 400 se a chave pode enviar)", { metodo: "POST", caminho: "/chat/send-template", corpo: {} });
await chamar("L0-5", "send-template com chave inválida e corpo vazio (linha de base)", { metodo: "POST", caminho: "/chat/send-template", chave: chaveFalsa, corpo: {} });
await chamar("L0-6", "send-template com template inexistente (não entrega)", {
  metodo: "POST",
  caminho: "/chat/send-template",
  corpo: payloadTemplate(randomUUID(), config.fromNumber, telefoneTeste),
});
await chamar("L0-7", "send-template com número de origem inexistente (não entrega)", {
  metodo: "POST",
  caminho: "/chat/send-template",
  corpo: payloadTemplate(config.templates.primeira_etapa, "+550000000000", telefoneTeste),
});
await chamar("L0-8", "endpoint antigo /chat/conversation/send-template, corpo vazio", { metodo: "POST", caminho: "/chat/conversation/send-template", corpo: {} });

console.log("");
const desde = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
logs("L0-9", `entregas com octadesk_sent=true desde ${desde.slice(0, 10)}`, PROJETO,
  `resource.type=cloud_run_revision AND resource.labels.service_name=deliverlead AND timestamp>="${desde}" AND textPayload:"octadesk_sent=true"`);
logs("L0-10", "falhas 401 no envio direto", PROJETO,
  `resource.type=cloud_run_revision AND resource.labels.service_name=deliverlead AND timestamp>="${desde}" AND textPayload:"send-template" AND textPayload:"401"`);
logs("L0-11", "respostas 5xx do proxy legado", PROJETO_PROXY,
  `resource.type=cloud_run_revision AND resource.labels.service_name=add-webflow-octa-prod AND timestamp>="${desde}" AND httpRequest.status>=500`);

// ——— Nível 1: envios reais ao telefone de teste ———
if (nivel >= 1) {
  console.log("\nNível 1: envios reais ao telefone de teste");
  await chamar("L1-1", "primeira_etapa direto na API (sem variáveis)", {
    metodo: "POST",
    caminho: "/chat/send-template",
    corpo: payloadTemplate(config.templates.primeira_etapa, config.fromNumber, telefoneTeste),
  });
  await chamar("L1-2", "calculo_manual direto na API (var-1 = Teste)", {
    metodo: "POST",
    caminho: "/chat/send-template",
    corpo: payloadTemplate(config.templates.calculo_manual, config.fromNumber, telefoneTeste, ["Teste"]),
  });
  const ddd = telefoneTeste.slice(3, 5);
  const celular = telefoneTeste.slice(5);
  await chamar("L1-3", "proxy legado com o payload da mensagem inicial", {
    metodo: "POST",
    url: urlProxy.trim(),
    chave: null,
    corpo: {
      data: { "DDD-CELULAR": ddd, CELULAR: celular, NOME: `${ddd}-${celular}-NOVO CLIENTE WHATSAPP`, Email: `${ddd}${celular}@imediatoseguros.com.br`, produto: "auto" },
      d: new Date().toISOString(),
      name: "Diagnóstico Octadesk — Mensagem Inicial",
    },
  });
}

const arquivo = path.join(os.tmpdir(), `octadesk-diagnostico-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(arquivo, JSON.stringify({ quando: new Date().toISOString(), host: new URL(base).host, versao, nivel, resultados }, null, 2));
console.log(`\nResultado completo: ${arquivo}`);
