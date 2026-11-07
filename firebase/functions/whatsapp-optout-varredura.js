/**
 * firebase/functions/whatsapp-optout-varredura.js — captura o toque em
 * "Prefiro não receber" lendo as conversas do Octadesk pela API
 * (docs/GUIA_OCTADESK_TEMPLATES.md, 2026-11-07).
 *
 * O Octadesk não liga o botão de um modelo a um bot, e a conta não tem bot
 * no WhatsApp: o toque chega como mensagem comum do contato. A rotina
 * `whatsappOptOutVarredura` lista as conversas do WhatsApp atualizadas
 * desde a última passada, procura mensagens do contato com o texto do botão
 * e registra o pedido como a função HTTP `whatsappOptOut` (mesma regra de
 * bloqueio). Com `optoutAgentEmail` no `OCTADESK_API_CONFIG`, responde ao
 * cliente na conversa (a janela de 24 h está aberta, porque ele acabou de
 * escrever); sem ele, só registra.
 *
 * Estado em `whatsapp_optout_varredura`: `cursor` (início da última passada
 * completa) e `mensagens/{id}` (mensagens já tratadas, para não repetir).
 */

const optout = require("./whatsapp-optout");

const CAMINHO = "whatsapp_optout_varredura";
const ORIGEM = "octadesk_varredura";
/** Sobreposição entre passadas, para não perder conversa atualizada no limite. */
const MARGEM_MS = 2 * 60 * 1000;
/** Primeira passada (sem cursor): olha só os últimos minutos. */
const JANELA_INICIAL_MS = 15 * 60 * 1000;
/** Teto da janela quando uma conversa falha seguidas vezes e o cursor não avança. */
const JANELA_MAXIMA_MS = 6 * 60 * 60 * 1000;
const POR_PAGINA = 100;
const MAX_PAGINAS = 10;
const RESPOSTA =
  "Pronto. Não enviaremos mais mensagens automáticas sobre esta cotação. Se precisar, é só escrever aqui.";

function lista(corpo) {
  return Array.isArray(corpo) ? corpo : corpo?.data || corpo?.items || corpo?.results || [];
}

/** Dígitos 55 + DDD + número do contato da conversa (Octadesk grava `countryCode` e `number` separados). */
function telefoneDaConversa(chat) {
  for (const p of chat?.contact?.phoneContacts || []) {
    const numero = String(p?.number || "").replace(/\D/g, "");
    const pais = String(p?.countryCode || "").replace(/\D/g, "");
    const completo = pais && !(numero.length > 11 && numero.startsWith(pais)) ? `${pais}${numero}` : numero;
    const digitos = optout.digitosTelefone(completo);
    if (digitos) return digitos;
  }
  return null;
}

/** Mensagens do contato, posteriores a `desdeMs`, com o texto do botão. */
function pedidosNaConversa(mensagens, desdeMs) {
  return mensagens
    .filter((m) => m?.sentBy?.type === "contact" && Date.parse(m.time) > desdeMs && optout.opcaoValida(m.body))
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}

/** Chave válida no RTDB (sem `.`, `#`, `$`, `[`, `]` ou `/`). */
function chaveMensagem(id) {
  return String(id).replace(/[.#$[\]/]/g, "_");
}

async function octa(config, fetchImpl, metodo, caminho, corpo, extraHeaders = {}) {
  const resposta = await fetchImpl(`${config.baseUrl.replace(/\/$/, "")}${caminho}`, {
    method: metodo,
    headers: {
      accept: "application/json",
      "X-API-KEY": config.apiKey,
      ...(corpo ? { "Content-Type": "application/json" } : {}),
      ...extraHeaders,
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => "");
    throw new Error(`Octadesk ${metodo} ${caminho.split("?")[0]} HTTP ${resposta.status}: ${texto.slice(0, 200)}`);
  }
  return resposta.json().catch(() => null);
}

async function tratarConversa({ chat, desdeMs, octaConfig, espoConfig, rootRef, estadoRef, agora, fetchImpl, logger, resumo }) {
  const mensagens = lista(
    await octa(octaConfig, fetchImpl, "GET", `/chat/${encodeURIComponent(chat.id)}/messages?page=1&limit=50&property=time&direction=desc`),
  );
  const pedidos = pedidosNaConversa(mensagens, desdeMs);
  if (!pedidos.length) return;
  const digitos = telefoneDaConversa(chat);
  if (!digitos) {
    logger.warn(`[whatsappOptOutVarredura] conversa ${chat.id}: pedido sem telefone reconhecível — ignorado.`);
    return;
  }
  for (const msg of pedidos) {
    const marca = estadoRef.child(`mensagens/${chaveMensagem(msg.id)}`);
    if ((await marca.once("value")).val()) continue;
    const momento = Number.isFinite(Date.parse(msg.time)) ? Date.parse(msg.time) : agora;
    const { repetido, nota } = await optout.registrarPedido({ rootRef, digitos, espoConfig, agora: momento, logger, origem: ORIGEM });
    resumo.pedidos += 1;
    let respondido = false;
    if (octaConfig.optoutAgentEmail && !repetido) {
      try {
        await octa(
          octaConfig,
          fetchImpl,
          "POST",
          `/chat/${encodeURIComponent(chat.id)}/messages`,
          { chatId: chat.id, type: "public", channel: "whatsapp", body: RESPOSTA },
          { "octa-agent-email": octaConfig.optoutAgentEmail },
        );
        respondido = true;
        resumo.respostas += 1;
      } catch (error) {
        logger.warn(`[whatsappOptOutVarredura] conversa ${chat.id}: resposta ao cliente falhou (best-effort).`, error);
      }
    }
    await marca.update({ em: new Date(agora).toISOString(), nota, respondido });
  }
}

/**
 * Uma passada. Devolve `{ conversas, pedidos, respostas, erros }`. O cursor só
 * avança quando todas as conversas foram lidas; a marca por mensagem evita
 * registrar ou responder duas vezes na passada seguinte.
 */
async function varrer({ octaConfig, espoConfig, rootRef, agora = Date.now(), fetchImpl = fetch, logger }) {
  const estadoRef = rootRef.child(CAMINHO);
  const cursorMs = Date.parse((await estadoRef.child("cursor").once("value")).val() || "");
  const desdeMs = Number.isFinite(cursorMs)
    ? Math.max(cursorMs - MARGEM_MS, agora - JANELA_MAXIMA_MS)
    : agora - JANELA_INICIAL_MS;
  const resumo = { conversas: 0, pedidos: 0, respostas: 0, erros: 0 };

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina += 1) {
    const qs = new URLSearchParams({
      "filters[0][property]": "updatedAt",
      "filters[0][operator]": "gt",
      "filters[0][value]": new Date(desdeMs).toISOString(),
      limit: String(POR_PAGINA),
      page: String(pagina),
    });
    const chats = lista(await octa(octaConfig, fetchImpl, "GET", `/chat?${qs}`));
    for (const chat of chats) {
      if (chat?.channel !== "whatsapp" || !chat.id) continue;
      resumo.conversas += 1;
      try {
        await tratarConversa({ chat, desdeMs, octaConfig, espoConfig, rootRef, estadoRef, agora, fetchImpl, logger, resumo });
      } catch (error) {
        resumo.erros += 1;
        logger.warn(`[whatsappOptOutVarredura] conversa ${chat.id}: leitura falhou.`, error);
      }
    }
    if (chats.length < POR_PAGINA) break;
  }

  if (resumo.erros === 0) await estadoRef.update({ cursor: new Date(agora).toISOString() });
  return resumo;
}

module.exports = {
  CAMINHO,
  RESPOSTA,
  telefoneDaConversa,
  pedidosNaConversa,
  chaveMensagem,
  varrer,
};
