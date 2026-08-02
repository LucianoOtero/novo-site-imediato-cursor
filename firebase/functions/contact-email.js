/**
 * firebase/functions/contact-email.js — e-mail do formulário `/contato`.
 *
 * O site grava a mensagem em `contact_messages/{id}` e esta função envia
 * o e-mail formatado ao destino (adm@) com reply-to do cliente.
 *
 * Achado 2026-08-01:
 * - SMTP cPanel recusa login de IPs de datacenter (535)
 * - HTTP(S) no site também é bloqueado para IPs GCP (403)
 * - API cPanel :2083 aceita autenticação e grava arquivos
 *
 * Caminho principal: enfileira JSON via Fileman (cPanel API) em
 * `cotacaoseguroonline.com.br/contact-queue/`. Um cron local roda
 * `process-contact-queue.php` (Exim) e envia o HTML formatado.
 *
 * Fallbacks: endpoint PHP HTTP (se liberado) e SMTP direto.
 *
 * Secret `CONTACT_SMTP_CONFIG` (JSON):
 *   {"endpoint":"https://cotacaoseguroonline.com.br/site-contact-mailer.php",
 *    "endpointSecret":"...","originIp":"199.167.144.250",
 *    "cpanelHost":"mail.imediatoseguros.com.br","cpanelUser":"mdmidiac",
 *    "cpanelPass":"...","queueDir":"cotacaoseguroonline.com.br/contact-queue",
 *    "host":"mail.imediatoseguros.com.br","port":465,"user":"send@...",
 *    "pass":"...","from":"...","to":"adm@..."}
 */
const https = require("node:https");
const { URL } = require("node:url");
const { logger } = require("firebase-functions");
const nodemailer = require("nodemailer");

function parseSmtpConfig(raw) {
  if (!raw) return null;
  try {
    const config = JSON.parse(raw);
    return {
      endpoint: config.endpoint ? String(config.endpoint) : null,
      endpointSecret: config.endpointSecret ? String(config.endpointSecret) : null,
      originIp: config.originIp ? String(config.originIp) : null,
      cpanelHost: config.cpanelHost ? String(config.cpanelHost) : null,
      cpanelUser: config.cpanelUser ? String(config.cpanelUser) : null,
      cpanelPass: config.cpanelPass ? String(config.cpanelPass) : null,
      /** Token UAPI (`Tokens/create_full_access`) — preferível à senha. */
      cpanelToken: config.cpanelToken ? String(config.cpanelToken) : null,
      queueDir: config.queueDir
        ? String(config.queueDir)
        : "cotacaoseguroonline.com.br/contact-queue",
      /** Segredo do cron PHP que puxa pendentes via HTTPS. */
      pullSecret: config.pullSecret ? String(config.pullSecret) : null,
      host: config.host ? String(config.host) : null,
      port: Number(config.port || 465),
      user: config.user ? String(config.user) : null,
      pass: config.pass ? String(config.pass) : null,
      from: String(config.from || config.user || ""),
      to: config.to ? String(config.to) : null,
    };
  } catch (error) {
    logger.error("[contact-email] CONTACT_SMTP_CONFIG inválido:", error);
    return null;
  }
}

function postJson(urlString, payload, options = {}) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlString);
    } catch (error) {
      resolve({ ok: false, status: 0, text: String(error) });
      return;
    }

    const body = Buffer.from(payload, "utf8");
    const hostname = options.connectHost || url.hostname;
    const req = https.request(
      {
        hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        servername: url.hostname,
        rejectUnauthorized: options.rejectUnauthorized !== false,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": body.length,
          Host: url.hostname,
          "User-Agent": "Mozilla/5.0 (compatible; ImediatoSiteContato/1.0)",
          Accept: "application/json, text/plain, */*",
          ...(options.headers || {}),
        },
        timeout: 25000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 0,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (error) => {
      resolve({ ok: false, status: 0, text: error.message || String(error) });
    });
    req.write(body);
    req.end();
  });
}

function multipartUpload({ host, user, pass, token, dir, filename, content }) {
  return new Promise((resolve) => {
    const boundary = `----ImediatoBoundary${Date.now()}`;
    const preamble =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file-1"; filename="${filename}"\r\n` +
      `Content-Type: application/json\r\n\r\n`;
    const closing = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([
      Buffer.from(preamble, "utf8"),
      Buffer.from(content, "utf8"),
      Buffer.from(closing, "utf8"),
    ]);
    // Token UAPI: `Authorization: cpanel user:TOKEN`
    // Senha: Basic auth tradicional.
    const authorization = token
      ? `cpanel ${user}:${token}`
      : `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
    const path = `/execute/Fileman/upload_files?dir=${encodeURIComponent(dir)}`;

    const req = https.request(
      {
        hostname: host,
        port: 2083,
        path,
        method: "POST",
        rejectUnauthorized: false,
        headers: {
          Authorization: authorization,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          "User-Agent": "ImediatoSiteContato/1.0",
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300 && json && json.status === 1,
            status: res.statusCode || 0,
            text,
          });
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (error) => {
      resolve({ ok: false, status: 0, text: error.message || String(error) });
    });
    req.write(body);
    req.end();
  });
}

async function sendViaPhpEndpoint(config, message, messageId) {
  if (!config.endpoint || !config.endpointSecret) {
    return { success: false, error: "endpoint não configurado" };
  }

  const payload = JSON.stringify({
    secret: config.endpointSecret,
    nome: message.nome || "",
    email: message.email || "",
    telefone: message.telefone || "",
    assunto: message.assunto || "",
    mensagem: message.mensagem || "",
    createdAt: message.createdAt || "",
  });

  const attempts = [{ label: "public", url: config.endpoint }];
  if (config.originIp) {
    attempts.push({
      label: "origin",
      url: config.endpoint,
      connectHost: config.originIp,
      rejectUnauthorized: false,
    });
  }

  let lastError = "endpoint falhou";
  for (const attempt of attempts) {
    const response = await postJson(attempt.url, payload, {
      connectHost: attempt.connectHost,
      rejectUnauthorized: attempt.rejectUnauthorized,
    });
    let body = null;
    try {
      body = response.text ? JSON.parse(response.text) : null;
    } catch {
      body = null;
    }
    if (response.ok && body && body.success === true) {
      logger.info(`[contact-email] ${messageId}: enviado via endpoint PHP (${attempt.label}).`);
      return { success: true };
    }
    lastError = `endpoint ${attempt.label} HTTP ${response.status}`;
    logger.warn(
      `[contact-email] ${messageId}: ${lastError}: ${String(response.text || "").slice(0, 160)}`
    );
    if (attempt.label === "public" && response.status !== 403 && response.status !== 0) break;
  }
  return { success: false, error: lastError };
}

/**
 * Enfileira a mensagem no cPanel; o cron local envia com mail()/Exim.
 */
async function enqueueViaCpanel(config, message, messageId) {
  if (!config.cpanelHost || !config.cpanelUser || (!config.cpanelToken && !config.cpanelPass)) {
    return { success: false, error: "cpanel não configurado" };
  }

  const content = JSON.stringify({
    nome: message.nome || "",
    email: message.email || "",
    telefone: message.telefone || "",
    assunto: message.assunto || "",
    mensagem: message.mensagem || "",
    createdAt: message.createdAt || new Date().toISOString(),
    messageId,
  });

  const safeId = String(messageId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeId}.json`;

  try {
    const result = await multipartUpload({
      host: config.cpanelHost,
      user: config.cpanelUser,
      pass: config.cpanelPass,
      token: config.cpanelToken,
      dir: config.queueDir,
      filename,
      content,
    });

    if (result.ok) {
      logger.info(
        `[contact-email] ${messageId}: enfileirado no cPanel (${filename}); cron enviará em até ~1 min.`
      );
      return { success: true };
    }

    logger.warn(
      `[contact-email] ${messageId}: fila cPanel falhou HTTP ${result.status}: ${String(result.text || "").slice(0, 200)}`
    );
    return { success: false, error: `cpanel queue HTTP ${result.status}` };
  } catch (error) {
    logger.warn(`[contact-email] ${messageId}: fila cPanel erro:`, error);
    return { success: false, error: error.message || String(error) };
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmail(message) {
  const telefone = message.telefone || "(não informado)";
  const dataHora = message.createdAt
    ? new Date(message.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const text = [
    "Nova mensagem pelo formulário de contato do site (comparaseguroonline.com.br)",
    "",
    `Nome: ${message.nome}`,
    `E-mail: ${message.email}`,
    `Telefone: ${telefone}`,
    `Assunto: ${message.assunto}`,
    `Data/hora: ${dataHora}`,
    "",
    "Mensagem:",
    message.mensagem,
  ].join("\n");

  const row = (label, value) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;white-space:nowrap;"><strong>${label}</strong></td>` +
    `<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#222;">${value}</td></tr>`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;">
    <div style="background:#0b3b8c;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
      <h2 style="margin:0;font-size:18px;">Nova mensagem — formulário de contato do site</h2>
      <p style="margin:4px 0 0;font-size:13px;opacity:.85;">comparaseguroonline.com.br → página /contato</p>
    </div>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #eee;border-top:none;">
      ${row("Nome", escapeHtml(message.nome))}
      ${row("E-mail", `<a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a>`)}
      ${row("Telefone", escapeHtml(telefone))}
      ${row("Assunto", escapeHtml(message.assunto))}
      ${row("Data/hora", escapeHtml(dataHora))}
    </table>
    <div style="background:#f7f8fa;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px;">
      <p style="margin:0 0 8px;color:#666;font-size:13px;"><strong>Mensagem</strong></p>
      <p style="margin:0;color:#222;white-space:pre-wrap;">${escapeHtml(message.mensagem)}</p>
    </div>
    <p style="color:#999;font-size:12px;margin-top:12px;">Responda diretamente a este e-mail para falar com o cliente (reply-to configurado).</p>
  </div>`.trim();

  return { text, html };
}

async function sendContactMessageEmail(rawConfig, message, messageId) {
  const config = parseSmtpConfig(rawConfig);
  if (!config) {
    logger.warn(`[contact-email] ${messageId}: CONTACT_SMTP_CONFIG ausente/inválido — e-mail não enviado.`);
    return { success: false, error: "config ausente" };
  }

  // 1) Fila cPanel (funciona de IPs GCP via :2083)
  const viaQueue = await enqueueViaCpanel(config, message, messageId);
  if (viaQueue.success) return viaQueue;

  // 2) Endpoint PHP HTTP (se o firewall liberar)
  if (config.endpoint && config.endpointSecret) {
    const viaEndpoint = await sendViaPhpEndpoint(config, message, messageId);
    if (viaEndpoint.success) return viaEndpoint;
  }

  // 3) SMTP direto (costuma falhar com 535 de datacenter)
  if (!config.host || !config.user || !config.pass || !config.to) {
    return { success: false, error: viaQueue.error || "nenhum provedor respondeu" };
  }

  const { text, html } = buildEmail(message);
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000,
    });

    const info = await transporter.sendMail({
      from: config.from,
      to: config.to,
      replyTo: message.email || undefined,
      subject: `[Contato site] ${message.assunto || "(sem assunto)"} — ${message.nome || ""}`.trim(),
      text,
      html,
    });

    logger.info(`[contact-email] ${messageId}: enviado SMTP (${info.messageId || "sem id"}).`);
    return { success: true };
  } catch (error) {
    logger.error(`[contact-email] ${messageId}: falha SMTP:`, error);
    return { success: false, error: error.message || String(error) };
  }
}

function getPullSecret(rawConfig) {
  const config = parseSmtpConfig(rawConfig);
  return config && config.pullSecret ? config.pullSecret : null;
}

module.exports = { sendContactMessageEmail, getPullSecret };
