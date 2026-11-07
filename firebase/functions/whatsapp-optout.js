/**
 * firebase/functions/whatsapp-optout.js — botão "Não quero receber" da
 * primeira mensagem do WhatsApp (plano "Botão de opt-out WhatsApp",
 * 2026-11-07; docs/GUIA_OCTADESK_TEMPLATES.md).
 *
 * O bot do Octadesk chama a função `whatsappOptOut` quando o cliente toca no
 * botão: `POST` com o header `X-Imediato-Token` (secret
 * `OCTADESK_OPTOUT_SECRET`) e o corpo `{ telefone, opcao }`. O pedido fica em
 * `whatsapp_optout/{digitos}` (`{ em, origem }`) e vira uma Note no Lead do
 * Espo de produção com aquele celular.
 *
 * Regra: o pedido bloqueia os modelos automáticos dos leads daquele telefone
 * criados até o momento do pedido (`timestamp` do registro em
 * `leads_backup`). Um formulário preenchido depois é uma nova autorização. A
 * primeira mensagem de um lead novo não passa pelo bloqueio.
 */

const crypto = require("node:crypto");

const espo = require("./espocrm");

const CAMINHO = "whatsapp_optout";
const OPCAO = "nao quero receber";
const ORIGEM = "octadesk_botao";
/** Toques repetidos nesse intervalo são o mesmo pedido: não repetem a Note. */
const JANELA_REPETICAO_MS = 10 * 60 * 1000;
const NOTA =
  "🚫 Cliente pediu pelo WhatsApp (botão \"Não quero receber\") para não receber mensagens automáticas sobre esta cotação. Os modelos automáticos deste lead foram bloqueados; o atendimento pode continuar se o cliente escrever.";

/** Dígitos no formato 55 + DDD + número, ou `null`. Aceita com ou sem +55, máscara e espaços. */
function digitosTelefone(valor) {
  const d = String(valor == null ? "" : valor).replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(d)) return d;
  if (/^\d{10,11}$/.test(d)) return `55${d}`;
  return null;
}

function mascarar(digitos) {
  return digitos ? `${digitos.slice(0, 4)}…${digitos.slice(-2)}` : "?";
}

function tokenValido(recebido, esperado) {
  if (!recebido || !esperado) return false;
  const a = crypto.createHash("sha256").update(String(recebido)).digest();
  const b = crypto.createHash("sha256").update(String(esperado)).digest();
  return crypto.timingSafeEqual(a, b);
}

function opcaoValida(opcao) {
  const texto = String(opcao == null ? "" : opcao)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return texto === OPCAO;
}

/**
 * Grava o pedido. Devolve `{ repetido }`: `true` quando já havia pedido do
 * mesmo telefone nos últimos `JANELA_REPETICAO_MS`. Um pedido novo sempre
 * atualiza `em`, para bloquear também um lead criado depois do pedido anterior.
 */
async function registrarOptOut(rootRef, digitos, agora) {
  const ref = rootRef.child(`${CAMINHO}/${digitos}`);
  const atual = (await ref.once("value")).val();
  const anterior = atual && Date.parse(atual.em);
  const repetido = Number.isFinite(anterior) && agora - anterior < JANELA_REPETICAO_MS;
  await ref.update({ em: new Date(agora).toISOString(), origem: ORIGEM });
  return { repetido };
}

/**
 * `true` quando há pedido para o telefone e o lead foi criado até o pedido.
 * Lead sem data é tratado como anterior ao pedido.
 */
async function optOutBloqueia(rootRef, phoneE164, leadTimestamp) {
  const digitos = digitosTelefone(phoneE164);
  if (!digitos) return false;
  const pedido = (await rootRef.child(`${CAMINHO}/${digitos}`).once("value")).val();
  const em = pedido && Date.parse(pedido.em);
  if (!Number.isFinite(em)) return false;
  const criado = Date.parse(leadTimestamp || "");
  return !Number.isFinite(criado) || criado <= em;
}

/**
 * Trata a chamada do bot. Devolve `{ status, corpo }` para a resposta HTTP.
 * A Note no Espo é best-effort: falha não muda a resposta.
 */
async function processarPedido({ token, corpo, segredo, rootRef, espoConfig, agora = Date.now(), logger }) {
  if (!tokenValido(token, segredo)) return { status: 401, corpo: { ok: false, error: "unauthorized" } };
  const dados = corpo && typeof corpo === "object" ? corpo : {};
  const digitos = digitosTelefone(dados.telefone ?? dados.phone);
  if (!digitos) return { status: 400, corpo: { ok: false, error: "telefone_invalido" } };
  if (!opcaoValida(dados.opcao ?? dados.option)) return { status: 400, corpo: { ok: false, error: "opcao_invalida" } };

  const { repetido } = await registrarOptOut(rootRef, digitos, agora);
  let nota = repetido ? "repetido" : "sem_lead";
  if (!repetido && espoConfig) {
    try {
      const espoLeadId = await espo.findExistingLead(espoConfig, { phoneE164: `+${digitos}` });
      if (espoLeadId) {
        await espo.postNote(espoConfig, espoLeadId, NOTA, `optout-${mascarar(digitos)}`);
        nota = "ok";
      }
    } catch (error) {
      nota = "falhou";
      logger.warn(`[whatsappOptOut] ${mascarar(digitos)}: Note no Espo falhou (best-effort).`, error);
    }
  }
  logger.info(`[whatsappOptOut] ${mascarar(digitos)}: pedido gravado (repetido=${repetido}, nota=${nota}).`);
  return { status: 200, corpo: { ok: true, repetido, nota } };
}

module.exports = {
  CAMINHO,
  JANELA_REPETICAO_MS,
  digitosTelefone,
  tokenValido,
  opcaoValida,
  registrarOptOut,
  optOutBloqueia,
  processarPedido,
};
