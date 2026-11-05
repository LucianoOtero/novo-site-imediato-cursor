#!/usr/bin/env node
/**
 * Somente leitura: eventos que disparam as conversões do Ads, por domínio, no GA4.
 * Mostra quanto do volume vem do site antigo (form_submit_valid,
 * whatsapp_modal_submit), que não manda dados do usuário no formato do site novo.
 *
 *   node ga4-conversoes-por-host.mjs              → últimos 7 dias
 *   node ga4-conversoes-por-host.mjs --days 14
 *   node ga4-conversoes-por-host.mjs --todos      → todos os eventos por domínio
 */
import { google } from "googleapis";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { parseArgs } from "./lib/cli-args.mjs";

const PROPERTY = "properties/281067607";
const EVENTOS = [
  "form_initial_contact",
  "whatsapp_modal_initial_contact",
  "phone_modal_initial_contact",
  "form_submit_valid",
  "whatsapp_modal_submit",
];

async function main() {
  const args = parseArgs();
  const dias = Number(args.days || 7);
  const data = google.analyticsdata({ version: "v1beta", auth: await getAuthorizedClient() });
  const { data: report } = await data.properties.runReport({
    property: PROPERTY,
    requestBody: {
      dateRanges: [{ startDate: `${dias}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "eventName" }, { name: "hostName" }],
      metrics: [{ name: "eventCount" }],
      ...(args.todos ? {} : { dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: EVENTOS } } } }),
      limit: 1000,
    },
  });
  const linhas = (report.rows || []).map((r) => ({
    evento: r.dimensionValues[0].value,
    host: r.dimensionValues[1].value,
    eventos: Number(r.metricValues[0].value),
  }));
  linhas.sort((a, b) => a.evento.localeCompare(b.evento) || b.eventos - a.eventos);
  console.log(`Últimos ${dias} dias`);
  console.table(linhas);
}

main().catch((e) => {
  console.error(e?.response?.data?.error?.message || e?.message || e);
  process.exit(1);
});
