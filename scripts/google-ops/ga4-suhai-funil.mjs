#!/usr/bin/env node
/**
 * Funil da cotação Suhai por braço (subdominio × site) via GA4 Data API.
 * Somente leitura. As dimensões arm/result/field/stage/plan/premium_band e a
 * métrica duration_ms só têm dados a partir de 2026-11-03 (criação no GA4).
 *
 *   node ga4-suhai-funil.mjs                       → últimos 7 dias
 *   node ga4-suhai-funil.mjs --days 14
 *   node ga4-suhai-funil.mjs --start 2026-11-04 --end 2026-11-10
 *
 * Saída: logs/ga4-suhai-funil-<fim>.json e resumo no console.
 */
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { parseArgs } from "./lib/cli-args.mjs";

const PROPERTY = "properties/281067607";
const ETAPAS = [
  "suhai_quote_start",
  "suhai_quote_step",
  "suhai_quote_price",
  "suhai_plan_select",
  "suhai_proposal_start",
  "suhai_proposal_sent",
];

const isoDate = (d) => d.toISOString().slice(0, 10);

function intervalo(args) {
  if (args.start && args.end) return { startDate: args.start, endDate: args.end };
  const dias = Number(args.days || 7);
  const fim = new Date();
  const inicio = new Date();
  inicio.setUTCDate(fim.getUTCDate() - (dias - 1));
  return { startDate: isoDate(inicio), endDate: isoDate(fim) };
}

function linhas(report) {
  const dims = (report.dimensionHeaders || []).map((h) => h.name);
  const mets = (report.metricHeaders || []).map((h) => h.name);
  return (report.rows || []).map((row) => {
    const o = {};
    (row.dimensionValues || []).forEach((v, i) => (o[dims[i]] = v.value));
    (row.metricValues || []).forEach((v, i) => (o[mets[i]] = Number(v.value || 0)));
    return o;
  });
}

const eventoComeca = (prefixo) => ({
  filter: { fieldName: "eventName", stringFilter: { matchType: "BEGINS_WITH", value: prefixo } },
});
const eventoIgual = (nome) => ({
  filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: nome } },
});

function taxa(de, para) {
  return de > 0 ? Math.round((para / de) * 1000) / 10 : null;
}

async function main() {
  const args = parseArgs();
  const dateRanges = [intervalo(args)];
  const data = google.analyticsdata({ version: "v1beta", auth: await getAuthorizedClient() });
  const rodar = async (requestBody) =>
    linhas((await data.properties.runReport({ property: PROPERTY, requestBody: { dateRanges, limit: 1000, ...requestBody } })).data);

  const porBraco = await rodar({
    dimensions: [{ name: "eventName" }, { name: "customEvent:arm" }, { name: "hostName" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    dimensionFilter: eventoComeca("suhai_"),
  });
  const detalhe = async (evento, dimensao) =>
    rodar({
      dimensions: [{ name: "customEvent:arm" }, { name: dimensao }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: eventoIgual(evento),
    });
  const [resultadoCotacao, resultadoVeiculo, errosCampo, abandonoOferta, planos, faixas, tempoPreco] = await Promise.all([
    detalhe("suhai_quote_result", "customEvent:result"),
    detalhe("suhai_vehicle_lookup", "customEvent:result"),
    detalhe("suhai_field_error", "customEvent:field"),
    detalhe("suhai_offer_abandon", "customEvent:stage"),
    detalhe("suhai_plan_select", "customEvent:plan"),
    detalhe("suhai_plan_select", "customEvent:premium_band"),
    rodar({
      dimensions: [{ name: "customEvent:arm" }],
      metrics: [{ name: "eventCount" }, { name: "averageCustomEvent:duration_ms" }],
      dimensionFilter: eventoIgual("suhai_quote_result"),
    }),
  ]);

  const bracos = [...new Set(porBraco.map((l) => l["customEvent:arm"]))].sort();
  const funil = {};
  for (const braco of bracos) {
    const usuarios = Object.fromEntries(
      ETAPAS.map((e) => [
        e,
        porBraco.filter((l) => l.eventName === e && l["customEvent:arm"] === braco).reduce((s, l) => s + l.totalUsers, 0),
      ]),
    );
    funil[braco] = {
      usuarios,
      precoSobreInicio: taxa(usuarios.suhai_quote_start, usuarios.suhai_quote_price),
      propostaSobrePreco: taxa(usuarios.suhai_quote_price, usuarios.suhai_proposal_sent),
      propostaSobreInicio: taxa(usuarios.suhai_quote_start, usuarios.suhai_proposal_sent),
    };
  }

  const relatorio = {
    periodo: dateRanges[0],
    funil,
    hosts: porBraco.reduce((acc, l) => {
      const k = `${l["customEvent:arm"]} | ${l.hostName}`;
      acc[k] = (acc[k] || 0) + l.eventCount;
      return acc;
    }, {}),
    resultadoCotacao,
    resultadoVeiculo,
    errosCampo,
    abandonoOferta,
    planos,
    faixas,
    tempoCotacaoMs: tempoPreco,
    eventos: porBraco,
  };

  const dir = path.resolve("logs");
  fs.mkdirSync(dir, { recursive: true });
  const arquivo = path.join(dir, `ga4-suhai-funil-${dateRanges[0].endDate}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(relatorio, null, 2));

  console.log(`Período ${dateRanges[0].startDate} a ${dateRanges[0].endDate}`);
  console.log(JSON.stringify({ funil, hosts: relatorio.hosts, tempoCotacaoMs: tempoPreco }, null, 2));
  console.log(`Relatório completo: ${arquivo}`);
}

main().catch((e) => {
  console.error(e?.response?.data?.error?.message || e?.message || e);
  process.exit(1);
});
