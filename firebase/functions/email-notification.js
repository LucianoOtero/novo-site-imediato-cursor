/**
 * firebase/functions/email-notification.js — notificação admin por e-mail
 * via o mesmo Cloud Run do site legado (`SEND_EMAIL_NOTIFICATION_URL`).
 *
 * No legado o browser (`MODAL_WHATSAPP_DEFINITIVO.js`) fazia o POST após
 * EspoCRM/Octadesk no modo `endpoints`. Com Firebase-Only esse path
 * nunca rodava. Aqui a Cloud Function `deliverLead` comanda o mesmo
 * contrato (URL, User-Agent, payload) — best-effort, nunca bloqueia sync.
 */

const { logger } = require("firebase-functions");

const USER_AGENT = "Modal-WhatsApp-EmailNotification-v1.0";

const MOMENTO_META = {
  initial: {
    momento_descricao: "Primeiro Contato - Apenas Telefone",
    momento_emoji: "📞",
  },
  update: {
    momento_descricao: "Submissão Completa - Todos os Dados",
    momento_emoji: "✅",
  },
  initial_error: {
    momento_descricao: "Primeiro Contato - Erro",
    momento_emoji: "❌",
  },
  update_error: {
    momento_descricao: "Submissão Completa - Erro",
    momento_emoji: "❌",
  },
};

/**
 * Monta o payload idêntico ao `sendAdminEmailNotification` do modal legado.
 * Sem DDD/celular → `null` (caller não deve enviar).
 */
function buildEmailPayload(leadData, { momento, erro = null } = {}) {
  const phoneE164 = leadData.phoneE164 || "";
  const ddd = phoneE164.slice(3, 5);
  const celular = phoneE164.slice(5);
  if (!ddd || !celular) return null;

  const meta = MOMENTO_META[momento] || MOMENTO_META.update;
  const utm = leadData.utm || {};
  const fbNome = leadData.nome || `${ddd}-${celular}-NOVO CLIENTE WHATSAPP`;
  const fbEmail = leadData.email || `${ddd}${celular}@imediatoseguros.com.br`;

  return {
    ddd,
    celular,
    cpf: leadData.cpf || "",
    nome: fbNome,
    email: fbEmail,
    cep: leadData.cep || "",
    placa: leadData.placa || "",
    gclid: utm.gclid || "",
    momento,
    momento_descricao: meta.momento_descricao,
    momento_emoji: meta.momento_emoji,
    erro: erro || null,
  };
}

/**
 * POST 1 tentativa ao Cloud Run de e-mail admin. Devolve `{ success }`.
 * Nunca lança — falha só é logada.
 */
async function sendAdminEmail(url, payload, leadId) {
  if (!url || !payload) return { success: false, skipped: true };
  try {
    const response = await fetch(url.replace(/\/?$/, "/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text().catch(() => "");
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    const success = Boolean(response.ok && body && body.success === true);
    if (success) {
      logger.info(`[email-notification] Lead ${leadId}: Cloud Run OK (total_sent=${body.total_sent ?? "?"}).`);
    } else {
      logger.warn(
        `[email-notification] Lead ${leadId}: Cloud Run respondeu sem sucesso (HTTP ${response.status}): ${text.slice(0, 300)}`
      );
    }
    return { success };
  } catch (error) {
    logger.warn(`[email-notification] Lead ${leadId}: falha ao chamar Cloud Run.`, error);
    return { success: false, error: error.message };
  }
}

/** Normaliza objeto de erro para o campo `erro` do payload legado. */
function errorPayload(error, status) {
  if (!error && status == null) return null;
  return {
    message: (error && error.message) || String(error || "erro"),
    status: status ?? (error && error.status) ?? null,
    code: (error && error.code) || null,
    response_data: null,
  };
}

module.exports = {
  buildEmailPayload,
  sendAdminEmail,
  errorPayload,
  USER_AGENT,
};
