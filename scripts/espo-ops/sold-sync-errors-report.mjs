/**
 * Somente leitura: agrupa os registros de `sold_sync_errors` (RTDB do site
 * novo) que pedem alerta, diz se a venda já está nos leads do Firebase e,
 * com ESPOCRM_API_CONFIG no ambiente, mostra o estado atual de cada
 * Opportunity no Espo PROD (etapa, Valor Comissão, data da venda). Não
 * imprime dados de cliente.
 *
 *   node --env-file=<.env com FIREBASE_*> scripts/espo-ops/sold-sync-errors-report.mjs [--hours 72]
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { espoRequest, resolveEspoConfig } from "./lib/espo-client.mjs";

const horasArg = process.argv.indexOf("--hours");
const HORAS = horasArg > -1 ? Number(process.argv[horasArg + 1]) : 72;

function initDb() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_DATABASE_URL) {
    throw new Error("FIREBASE_* incompleto no ambiente");
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      databaseURL: FIREBASE_DATABASE_URL,
    });
  }
  return getDatabase();
}

const detalheErro = (r) =>
  r.reason === "validation_error"
    ? String((r.results || []).find((x) => x?.error)?.error || "")
    : r.missClass || "";

async function main() {
  const db = initDb();
  const snap = await db.ref("sold_sync_errors").orderByKey().limitToLast(5000).once("value");
  const todos = Object.values(snap.val() || {});
  const corte = new Date(Date.now() - HORAS * 3600 * 1000).toISOString();

  const porDia = {};
  for (const r of todos) {
    if (r?.skipEmail === true) continue;
    const dia = String(r?.createdAt || "").slice(0, 10);
    const k = `${dia} | ${r.reason} ${detalheErro(r)}`.trim();
    porDia[k] = (porDia[k] || 0) + 1;
  }

  const recentes = todos.filter((r) => r && r.skipEmail !== true && String(r.createdAt || "") >= corte);
  const opps = new Map();
  for (const r of recentes) {
    const id = r.payload?.opportunityId || "sem id";
    const o = opps.get(id) || {
      motivo: `${r.reason} ${detalheErro(r)}`.trim(),
      vezes: 0,
      primeiro: r.createdAt,
      ultimo: r.createdAt,
      stagesPayload: new Set(),
      previousStages: new Set(),
      amountPayload: new Set(),
      temDataVenda: new Set(),
      temLead: Boolean(r.payload?.cLeadId),
      temClique: Boolean(r.payload?.cGclid || r.payload?.cGbraid || r.payload?.cWbraid),
      webpage: r.payload?.cWebpage ? String(r.payload.cWebpage).replace(/^https?:\/\//, "").split("/")[0] : null,
      leadSource: r.payload?.leadSource || null,
    };
    o.vezes += 1;
    if (r.createdAt < o.primeiro) o.primeiro = r.createdAt;
    if (r.createdAt > o.ultimo) o.ultimo = r.createdAt;
    o.stagesPayload.add(r.payload?.stage || "(vazio)");
    o.previousStages.add(r.payload?.previousStage || "(vazio)");
    o.amountPayload.add(r.payload?.amount == null ? "null" : String(r.payload.amount));
    o.temDataVenda.add(Boolean(r.payload?.cDataVenda));
    opps.set(id, o);
  }

  let espo = null;
  try {
    espo = process.env.ESPOCRM_API_CONFIG ? resolveEspoConfig({ prefer: "prod" }) : null;
  } catch {
    espo = null;
  }

  const linhas = [];
  for (const [id, o] of opps) {
    const linha = {
      opp: id,
      motivo: o.motivo,
      vezes: o.vezes,
      primeiro: o.primeiro,
      ultimo: o.ultimo,
      stagePayload: [...o.stagesPayload].join(","),
      previousStage: [...o.previousStages].join(","),
      amountPayload: [...o.amountPayload].join(","),
      dataVendaPayload: [...o.temDataVenda].join(","),
      temLead: o.temLead,
      temClique: o.temClique,
      webpage: o.webpage,
      leadSource: o.leadSource,
    };
    if (id !== "sem id") {
      const leads = await db.ref("leads_backup").orderByChild("espocrmOpportunityId").equalTo(id).get();
      const registros = Object.values(leads.val() || {});
      linha.firebaseLeads = registros.length;
      linha.firebaseVendido = registros.some((l) => l?.sold === true);
      linha.firebaseValor = registros.find((l) => l?.sold === true)?.soldCommissionAmount ?? null;
      linha.firebaseSincronizadoEm = registros.find((l) => l?.sold === true)?.soldSyncedAt ?? null;
    }
    if (espo && id !== "sem id") {
      try {
        const opp = await espoRequest(espo, "GET", `Opportunity/${encodeURIComponent(id)}`);
        Object.assign(linha, {
          espoStage: opp?.stage ?? null,
          espoAmount: opp?.amount ?? null,
          espoDataVenda: Boolean(opp?.cDataVenda),
          espoCriada: opp?.createdAt ?? null,
          espoModificada: opp?.modifiedAt ?? null,
        });
      } catch (e) {
        linha.espoErro = e.status || e.message;
      }
    }
    linhas.push(linha);
  }
  linhas.sort((a, b) => b.vezes - a.vezes);

  console.log(JSON.stringify({ horas: HORAS, espoConsultado: Boolean(espo), alertasPorDia: porDia, oportunidades: linhas }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
