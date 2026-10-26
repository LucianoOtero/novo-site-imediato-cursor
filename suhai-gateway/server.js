/**
 * suhai-gateway — único ponto autorizado a falar com a Suhai.
 *
 * Roda no Cloud Run com `--vpc-egress=all-traffic`, então todo tráfego de
 * saída passa pelo Cloud NAT `suhai-nat` e chega à Suhai com o IP fixo da
 * whitelist. As credenciais de Cotador e, futuramente, as chaves AES ficam
 * aqui — nunca no browser nem nas rotas da Vercel.
 *
 * O serviço é privado: o acesso é feito com token OIDC pelo Cloud Run.
 */

import http from "node:http";

import { consultarPendencias, consultarStatus, gerarPdf } from "./src/acompanhamento.js";
import { aesConfigurado, config, credenciaisPresentes } from "./src/config.js";
import { cotar } from "./src/cotacao.js";
import { consultarVeiculos } from "./src/fipe.js";
import { transmitir } from "./src/proposta.js";

const PORT = Number(process.env.PORT) || 8080;

const IP_ECHO_ENDPOINTS = ["https://api.ipify.org", "https://ifconfig.me/ip"];

async function resolveEgressIp() {
  const attempts = [];

  for (const url of IP_ECHO_ENDPOINTS) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const body = (await response.text()).trim();
      if (response.ok && /^\d{1,3}(\.\d{1,3}){3}$/.test(body)) {
        return { ip: body, source: url, attempts };
      }
      attempts.push({ url, status: response.status, body: body.slice(0, 120) });
    } catch (error) {
      attempts.push({ url, error: String(error) });
    }
  }

  return { ip: null, source: null, attempts };
}

function responder(res, status, corpo) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(corpo, null, 2));
}

async function lerCorpo(req) {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  if (partes.length === 0) return {};
  return JSON.parse(Buffer.concat(partes).toString("utf8"));
}

/**
 * Traduz a falha para uma resposta estável, sem vazar credencial nem XML
 * cru para o chamador.
 */
function tratarErro(res, erro, operacao) {
  if (erro.entradaInvalida || erro instanceof SyntaxError) {
    return responder(res, 400, { erro: "entrada_invalida", mensagem: erro.message });
  }
  console.error(`[${operacao}] ${erro.name}: ${erro.message}`, erro.codigoSuhai ?? "");
  const status = erro.codigoSuhai ? 422 : 502;
  responder(res, status, {
    erro: erro.codigoSuhai ? "suhai" : "indisponivel",
    mensagem: erro.message,
    codigoSuhai: erro.codigoSuhai ?? null,
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  // `/healthz` não serve: o Google Frontend intercepta esse caminho antes de
  // chegar ao container e devolve o próprio 404.
  if (url.pathname === "/status") {
    return responder(res, 200, {
      status: "ok",
      ambiente: config.ambiente,
      credenciais: credenciaisPresentes(),
      aes: aesConfigurado(),
    });
  }

  if (url.pathname === "/diag/ip") {
    const resultado = await resolveEgressIp();
    return responder(res, resultado.ip ? 200 : 502, {
      egressIp: resultado.ip,
      source: resultado.source,
      ambiente: config.ambiente,
      revision: process.env.K_REVISION ?? null,
      attempts: resultado.attempts,
    });
  }

  if (url.pathname === "/cotacao" && req.method === "POST") {
    if (!credenciaisPresentes()) {
      return responder(res, 503, {
        erro: "sem_credenciais",
        mensagem: "Credenciais de Cotador ainda não configuradas neste ambiente.",
      });
    }
    try {
      return responder(res, 200, await cotar(await lerCorpo(req)));
    } catch (erro) {
      return tratarErro(res, erro, "cotacao");
    }
  }

  if (url.pathname === "/proposta" && req.method === "POST") {
    if (!credenciaisPresentes()) {
      return responder(res, 503, {
        erro: "sem_credenciais",
        mensagem: "Credenciais de Cotador ainda não configuradas neste ambiente.",
      });
    }
    try {
      return responder(res, 200, await transmitir(await lerCorpo(req)));
    } catch (erro) {
      return tratarErro(res, erro, "proposta");
    }
  }

  const acompanhamento = {
    "/proposta/status": consultarStatus,
    "/proposta/pendencias": consultarPendencias,
    "/proposta/pdf": gerarPdf,
  }[url.pathname];

  if (acompanhamento && req.method === "POST") {
    if (!credenciaisPresentes()) {
      return responder(res, 503, {
        erro: "sem_credenciais",
        mensagem: "Credenciais de Cotador ainda não configuradas neste ambiente.",
      });
    }
    try {
      return responder(res, 200, await acompanhamento(await lerCorpo(req)));
    } catch (erro) {
      return tratarErro(res, erro, url.pathname.slice(1));
    }
  }

  if (url.pathname === "/fipe/consulta" && req.method === "POST") {
    if (!credenciaisPresentes()) {
      return responder(res, 503, {
        erro: "sem_credenciais",
        mensagem: "Credenciais de Cotador ainda não configuradas neste ambiente.",
      });
    }
    try {
      const parametros = await lerCorpo(req);
      const veiculos = await consultarVeiculos(parametros);
      return responder(res, 200, { total: veiculos.length, veiculos });
    } catch (erro) {
      return tratarErro(res, erro, "fipe");
    }
  }

  responder(res, 404, { erro: "not_found" });
});

server.listen(PORT, () => {
  console.log(`suhai-gateway ouvindo na porta ${PORT} (ambiente ${config.ambiente})`);
});
