/**
 * firebase/functions/espo-reserva.js — uma só criação de Lead/Opportunity
 * por registro do RTDB.
 *
 * O site grava as etapas da jornada no mesmo `leads_backup/{leadId}` com
 * poucos segundos de intervalo, e cada gravação dispara uma execução de
 * `deliverLead`. A do "initial" leva ~25 s (Octadesk e e-mails) e só
 * gravava os IDs do Espo no fim; as etapas seguintes não os encontravam e
 * criavam uma Opportunity cada (cotação Suhai em produção, 2026-10-16).
 *
 * A execução que precisa criar reserva a criação (`espo_criacao_em`, por
 * transação) e grava os IDs assim que o Espo responde; as demais esperam os
 * IDs aparecerem. Reserva mais velha que `RESERVA_VALIDA_MS` é de uma
 * execução que caiu e pode ser tomada.
 */

const CAMPO_RESERVA = "espo_criacao_em";
const RESERVA_VALIDA_MS = 60 * 1000;
const ESPERA_MAX_MS = 30 * 1000;
const INTERVALO_MS = 1000;

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function idsDe(registro) {
  return {
    leadId: (registro && registro.espocrmLeadId) || null,
    opportunityId: (registro && registro.espocrmOpportunityId) || null,
  };
}

async function reservar(ref, agora) {
  const resultado = await ref.child(CAMPO_RESERVA).transaction((atual) => {
    if (atual && agora - atual < RESERVA_VALIDA_MS) return undefined;
    return agora;
  });
  return resultado.committed;
}

/**
 * IDs já gravados no registro, ou `reservado: true` quando cabe a esta
 * execução criar o que falta. Enquanto outra execução cria, espera até
 * `esperaMaxMs`; esgotado o prazo, devolve o que houver
 * (`esperaEsgotada: true`) e o chamador segue sem a garantia.
 */
async function obterIdsOuReservar(
  ref,
  { agora = Date.now, esperar = dormir, esperaMaxMs = ESPERA_MAX_MS } = {},
) {
  const inicio = agora();
  for (;;) {
    const ids = idsDe((await ref.once("value")).val());
    if (ids.leadId && ids.opportunityId) return { ...ids, reservado: false };
    if (await reservar(ref, agora())) return { ...ids, reservado: true };
    if (agora() - inicio >= esperaMaxMs) return { ...ids, reservado: false, esperaEsgotada: true };
    await esperar(INTERVALO_MS);
  }
}

/** Grava os IDs criados e libera a reserva no mesmo update. */
async function concluirReserva(ref, { leadId, opportunityId }) {
  const campos = { [CAMPO_RESERVA]: null };
  if (leadId) campos.espocrmLeadId = leadId;
  if (opportunityId) campos.espocrmOpportunityId = opportunityId;
  await ref.update(campos);
}

function jsonCanonico(valor) {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const pares = Object.keys(valor)
      .sort()
      .map((chave) => `${JSON.stringify(chave)}:${jsonCanonico(valor[chave])}`);
    return `{${pares.join(",")}}`;
  }
  return JSON.stringify(valor);
}

/**
 * O site já gravou outra etapa em `data` depois da que disparou esta
 * execução. O snapshot do evento guarda as chaves na ordem em que o site
 * gravou e a releitura devolve em ordem alfabética, por isso a comparação
 * ignora a ordem.
 */
async function etapaSuperada(ref, dadosDoEvento) {
  const dadosAtuais = (await ref.child("data").once("value")).val();
  return jsonCanonico(dadosAtuais || {}) !== jsonCanonico(dadosDoEvento || {});
}

module.exports = {
  CAMPO_RESERVA,
  RESERVA_VALIDA_MS,
  obterIdsOuReservar,
  concluirReserva,
  etapaSuperada,
};
