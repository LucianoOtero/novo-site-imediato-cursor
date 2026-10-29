/**
 * firebase/functions/sold-sync-resumo.js — resumo diário dos problemas do
 * sincronizador de vendas (Espo → Firebase), por e-mail admin.
 *
 * O SMTP do cPanel recusa conexões vindas do GCP (desde 2026-09-25 nenhum
 * alerta do sold-sync saiu). Os registros continuam em `sold_sync_errors`;
 * esta rotina lê os novos desde a última rodada e manda UM e-mail pelo
 * Cloud Run de e-mail admin (o mesmo dos alertas de sistema da Suhai).
 * Só entram os registros que pedem alerta (`skipEmail !== true`).
 */

const emailNotif = require("./email-notification");

const ERROS_PATH = "sold_sync_errors";
const ESTADO_PATH = "sold_sync_resumo";
const PRIMEIRA_JANELA_MS = 24 * 60 * 60 * 1000;
const MAX_REGISTROS = 5000;
const MAX_OPPS_POR_GRUPO = 15;

const ROTULOS = {
  validation_error: "venda rejeitada por dado faltando ou inválido no Espo",
  database_error: "falha ao gravar a venda no Firebase",
  internal_error: "erro interno do sincronizador",
  no_firebase_match: "venda sem lead correspondente no Firebase",
};

function rotuloGrupo(registro) {
  const base = ROTULOS[registro.reason] || registro.reason || "problema";
  const detalhe =
    registro.reason === "validation_error"
      ? String((registro.results || []).find((r) => r && r.error)?.error || "").trim()
      : registro.missClass || "";
  return detalhe ? `${base} (${detalhe})` : base;
}

/**
 * Texto do resumo a partir dos registros de `sold_sync_errors`, ou `null`
 * quando nenhum pede alerta.
 */
function montarResumo(registros) {
  const alertas = (registros || []).filter((r) => r && r.skipEmail !== true);
  if (alertas.length === 0) return null;

  const grupos = new Map();
  for (const r of alertas) {
    const rotulo = rotuloGrupo(r);
    if (!grupos.has(rotulo)) grupos.set(rotulo, new Map());
    const opp = r.payload?.opportunityId || "sem id";
    const opps = grupos.get(rotulo);
    opps.set(opp, (opps.get(opp) || 0) + 1);
  }

  const totalOpps = new Set(alertas.map((r) => r.payload?.opportunityId || "sem id")).size;
  const partes = [...grupos.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .map(([rotulo, opps]) => {
      const lista = [...opps.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_OPPS_POR_GRUPO)
        .map(([opp, n]) => (n > 1 ? `${opp} (${n}x)` : opp))
        .join(", ");
      const resto = opps.size > MAX_OPPS_POR_GRUPO ? ` e mais ${opps.size - MAX_OPPS_POR_GRUPO}` : "";
      return `${rotulo}: ${opps.size} oportunidade(s) — ${lista}${resto}`;
    });

  return `${alertas.length} ocorrência(s) em ${totalOpps} oportunidade(s). ${partes.join(" | ")}. Detalhes em sold_sync_errors no Firebase.`;
}

/**
 * Lê os registros novos desde a última rodada, envia o resumo e avança o
 * marcador só depois do envio (falha de envio entra no próximo resumo).
 */
async function resumirErros({ rootRef, emailUrl, agora = Date.now(), logger }) {
  const estadoRef = rootRef.child(ESTADO_PATH);
  const estado = (await estadoRef.once("value")).val() || {};
  const errosRef = rootRef.child(ERROS_PATH).orderByKey();
  const consulta = estado.ultimaChave
    ? errosRef.startAfter(estado.ultimaChave).limitToFirst(MAX_REGISTROS)
    : errosRef.limitToLast(MAX_REGISTROS);
  const lidos = Object.entries((await consulta.once("value")).val() || {});

  const corte = new Date(agora - PRIMEIRA_JANELA_MS).toISOString();
  const novos = estado.ultimaChave ? lidos : lidos.filter(([, r]) => String(r?.createdAt || "") >= corte);
  const ultimaChave = lidos.length ? lidos[lidos.length - 1][0] : estado.ultimaChave || null;
  const rodada = new Date(agora).toISOString();

  const detalhe = montarResumo(novos.map(([, r]) => r));
  if (!detalhe) {
    await estadoRef.update({ ultimaChave, ultimaRodada: rodada });
    return "sem alertas";
  }

  const payload = emailNotif.buildAlertaSistemaPayload({ momento: "sold_sync_resumo", detalhe });
  const resultado = await emailNotif.sendAdminEmail(emailUrl, payload, "sold-sync-resumo");
  if (!resultado.success) {
    await estadoRef.update({ ultimaRodada: rodada });
    logger.warn("[sold-sync-resumo] resumo não foi enviado; os registros entram no próximo.");
    return "falha no envio";
  }
  await estadoRef.update({ ultimaChave, ultimaRodada: rodada, ultimoEnvio: rodada });
  return "enviado";
}

module.exports = { montarResumo, resumirErros };
