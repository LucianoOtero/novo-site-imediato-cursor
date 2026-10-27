/**
 * firebase/functions/opp-dedupe.js — reaproveitar a Opportunity aberta
 * quando o prospect volta ao site (projeto funil v2, 2026-10-25).
 *
 * Desde 2026-08-04 cada registro do RTDB (uma jornada) cria a sua
 * Opportunity. Quem volta em poucos dias com o mesmo telefone e ramo
 * gerava um negócio novo no pipeline enquanto o anterior ainda estava em
 * atendimento. Agora, antes de criar, a CF consulta o índice
 * `opp_dedupe/{ambiente}/{sha256(telefone:ramo)}` = `{opportunityId, at}`:
 * se a última jornada tem menos de `oppReuseDays` dias e a Opportunity não
 * está em etapa fechada (Vendido/Perdido), ela é reaproveitada e recebe
 * uma nota "Nova jornada do site". O índice é regravado a cada entrega,
 * então a janela conta da jornada mais recente.
 *
 * `oppReuseDays` fica no bloco do ambiente em `ESPOCRM_API_CONFIG`
 * (ausente ou 0 = desligado, comportamento de 2026-08-04).
 */

const crypto = require("node:crypto");

const ETAPAS_FECHADAS = ["Vendido", "Perdido"];
const DIA_MS = 24 * 60 * 60 * 1000;

/** Mesma chave do índice `lead_dedupe` do site (`buildDedupeKey` em lib/leads/store.ts). */
function chaveDedupe(leadData) {
  if (!leadData || !leadData.phoneE164) return null;
  return crypto.createHash("sha256").update(`${leadData.phoneE164}:${leadData.ramo || ""}`).digest("hex");
}

function indiceRef(rootRef, ambiente, leadData) {
  const chave = chaveDedupe(leadData);
  return chave ? rootRef.child(`opp_dedupe/${ambiente || "development"}/${chave}`) : null;
}

function diasDeReuso(config) {
  const dias = Number(config && config.oppReuseDays);
  return Number.isFinite(dias) && dias > 0 ? dias : 0;
}

/**
 * `{opportunityId, stage}` da Opportunity a reaproveitar, ou `null`.
 * `buscarOpportunity(id)` devolve o registro do Espo (ou lança; 404/403
 * contam como "não existe mais").
 */
async function oppAbertaRecente(ref, { dias, buscarOpportunity, agora = Date.now() }) {
  if (!ref || !(dias > 0)) return null;
  const entrada = (await ref.once("value")).val();
  if (!entrada || !entrada.opportunityId) return null;
  const idade = agora - Date.parse(entrada.at);
  if (!(idade >= 0 && idade <= dias * DIA_MS)) return null;

  let opp;
  try {
    opp = await buscarOpportunity(entrada.opportunityId);
  } catch (error) {
    if (error && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
  if (!opp || !opp.id || ETAPAS_FECHADAS.includes(opp.stage)) return null;
  return { opportunityId: opp.id, stage: opp.stage };
}

async function registrar(ref, opportunityId, agora = Date.now()) {
  if (!ref || !opportunityId) return;
  await ref.set({ opportunityId, at: new Date(agora).toISOString() });
}

function notaNovaJornada(agora = Date.now()) {
  const data = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(agora));
  return `🔁 Nova jornada do site em ${data} — o prospect voltou e preencheu a cotação de novo. Esta oportunidade foi reaproveitada (estava aberta) e os dados foram atualizados.`;
}

module.exports = {
  ETAPAS_FECHADAS,
  chaveDedupe,
  indiceRef,
  diasDeReuso,
  oppAbertaRecente,
  registrar,
  notaNovaJornada,
};
