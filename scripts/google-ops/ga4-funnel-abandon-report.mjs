/**
 * Relatório de abandono do funil (LeadForm + modais) via GA4 Data API.
 *
 * Uso:
 *   node ga4-funnel-abandon-report.mjs
 *   node ga4-funnel-abandon-report.mjs --start 2026-09-01 --end 2026-09-08
 *   node ga4-funnel-abandon-report.mjs --days 28
 *
 * Saídas:
 *   scripts/google-ops/ga4-funnel-abandon-asof-YYYY-MM-DD.json
 *   docs/RELATORIO_ABANDONO_FUNIL_asof-YYYY-MM-DD.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { parseArgs } from "./lib/cli-args.mjs";
import { CANONICAL_HOSTS, NOVO_HOSTS } from "./lib/experiment-constants.mjs";
const CONFIG_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "config.local.json",
);

const PROPERTY_ID = "281067607";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const FUNNEL_EVENTS = [
  "form_start",
  "form_initial_contact",
  "form_step",
  "form_quote_choice",
  "generate_lead",
  "form_abandon",
  "whatsapp_modal_initial_contact",
  "phone_modal_initial_contact",
  "whatsapp_modal_submit",
  "whatsapp_modal_dismiss",
];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function defaultRange(days) {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));
  return { start: isoDate(start), end: isoDate(end) };
}

function rowsToObjects(report) {
  const dims = (report?.dimensionHeaders || []).map((h) => h.name);
  const mets = (report?.metricHeaders || []).map((h) => h.name);
  return (report?.rows || []).map((row) => {
    const o = {};
    (row.dimensionValues || []).forEach((v, i) => {
      o[dims[i]] = v.value;
    });
    (row.metricValues || []).forEach((v, i) => {
      o[mets[i]] = Number(v.value || 0);
    });
    return o;
  });
}

function sumBy(rows, keyFn, metric = "eventCount") {
  const map = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    map.set(k, (map.get(k) || 0) + (r[metric] || 0));
  }
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1]));
}

function dropOff(from, to) {
  if (!from || from <= 0) return null;
  return {
    from,
    to: to || 0,
    rate: Number((((from - (to || 0)) / from) * 100).toFixed(1)),
  };
}

function topGaps(drops) {
  return Object.entries(drops)
    .filter(([, v]) => v && typeof v.rate === "number")
    .sort((a, b) => b[1].rate - a[1].rate)
    .slice(0, 3)
    .map(([name, v]) => ({ gap: name, ...v }));
}

async function main() {
  const args = parseArgs();
  const days = Number(args.days || 7);
  const range = args.start && args.end
    ? { start: args.start, end: args.end }
    : defaultRange(Number.isFinite(days) ? days : 7);
  const asof = range.end;

  const config = fs.existsSync(CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
    : {};
  const propertyId =
    String(config.ga4?.propertyId || PROPERTY_ID).replace(/\D/g, "") ||
    PROPERTY_ID;

  const oauth2 = await getAuthorizedClient({ withAnalytics: true });
  const analyticsdata = google.analyticsdata({
    version: "v1beta",
    auth: oauth2,
  });

  const novoHosts = [...NOVO_HOSTS];
  const hostFilter = {
    filter: {
      fieldName: "hostName",
      inListFilter: { values: novoHosts.length ? novoHosts : CANONICAL_HOSTS },
    },
  };
  const eventFilter = {
    filter: {
      fieldName: "eventName",
      inListFilter: { values: FUNNEL_EVENTS },
    },
  };
  const andHostEvent = {
    andGroup: { expressions: [hostFilter, eventFilter] },
  };

  const dateRange = [{ startDate: range.start, endDate: range.end }];

  const [byEvent, abandonByStep, abandonByReason, formStepByStep, modalDismiss, modalSubmit, byDevice] =
    await Promise.all([
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: dateRange,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: andHostEvent,
        },
      }),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: dateRange,
          dimensions: [
            { name: "eventName" },
            { name: "customEvent:last_step" },
          ],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                hostFilter,
                {
                  filter: {
                    fieldName: "eventName",
                    stringFilter: {
                      matchType: "EXACT",
                      value: "form_abandon",
                    },
                  },
                },
              ],
            },
          },
        },
      }).catch(() => ({ data: { rows: [] } })),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: dateRange,
          dimensions: [
            { name: "eventName" },
            { name: "customEvent:reason" },
          ],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                hostFilter,
                {
                  filter: {
                    fieldName: "eventName",
                    inListFilter: {
                      values: ["form_abandon", "whatsapp_modal_dismiss"],
                    },
                  },
                },
              ],
            },
          },
        },
      }).catch(() => ({ data: { rows: [] } })),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: dateRange,
          dimensions: [{ name: "customEvent:step" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                hostFilter,
                {
                  filter: {
                    fieldName: "eventName",
                    stringFilter: { matchType: "EXACT", value: "form_step" },
                  },
                },
              ],
            },
          },
        },
      }).catch(() => ({ data: { rows: [] } })),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: dateRange,
          dimensions: [
            { name: "customEvent:modal_channel" },
            { name: "customEvent:modal_step" },
          ],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                hostFilter,
                {
                  filter: {
                    fieldName: "eventName",
                    stringFilter: {
                      matchType: "EXACT",
                      value: "whatsapp_modal_dismiss",
                    },
                  },
                },
              ],
            },
          },
        },
      }).catch(() => ({ data: { rows: [] } })),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: dateRange,
          dimensions: [
            { name: "customEvent:modal_channel" },
            { name: "customEvent:submit_mode" },
          ],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                hostFilter,
                {
                  filter: {
                    fieldName: "eventName",
                    stringFilter: {
                      matchType: "EXACT",
                      value: "whatsapp_modal_submit",
                    },
                  },
                },
              ],
            },
          },
        },
      }).catch(() => ({ data: { rows: [] } })),
      analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: dateRange,
          dimensions: [{ name: "deviceCategory" }, { name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: andHostEvent,
        },
      }).catch(() => ({ data: { rows: [] } })),
    ]);

  const eventRows = rowsToObjects(byEvent.data);
  const eventCounts = sumBy(eventRows, (r) => r.eventName);

  const stepRows = rowsToObjects(formStepByStep.data);
  const steps = {};
  for (const r of stepRows) {
    const s = String(r["customEvent:step"] || "(not set)");
    steps[s] = (steps[s] || 0) + (r.eventCount || 0);
  }

  const s1 = steps["1"] || eventCounts.form_start || 0;
  const s2 = steps["2"] || 0;
  const s3 = steps["3"] || 0;
  const s4 = steps["4"] || 0;
  const initial = eventCounts.form_initial_contact || 0;
  const choice = eventCounts.form_quote_choice || 0;
  const lead = eventCounts.generate_lead || 0;
  const abandon = eventCounts.form_abandon || 0;

  const drops = {
    "form_start→form_initial_contact": dropOff(eventCounts.form_start || 0, initial),
    "form_step1→form_step2": dropOff(s1, s2),
    "form_step2→form_step3": dropOff(s2, s3),
    "form_step3→form_step4": dropOff(s3, s4),
    "form_step4→form_quote_choice": dropOff(s4, choice),
    "form_quote_choice→generate_lead": dropOff(choice, lead),
  };

  const abandonStepRows = rowsToObjects(abandonByStep.data);
  const abandonByLastStep = sumBy(
    abandonStepRows,
    (r) => String(r["customEvent:last_step"] || "(not set)"),
  );

  const reasonRows = rowsToObjects(abandonByReason.data);
  const abandonReasons = sumBy(
    reasonRows.filter((r) => r.eventName === "form_abandon"),
    (r) => String(r["customEvent:reason"] || "(not set)"),
  );
  const dismissReasons = sumBy(
    reasonRows.filter((r) => r.eventName === "whatsapp_modal_dismiss"),
    (r) => String(r["customEvent:reason"] || "(not set)"),
  );

  const dismissRows = rowsToObjects(modalDismiss.data);
  const dismissByChannelStep = sumBy(
    dismissRows,
    (r) =>
      `${r["customEvent:modal_channel"] || "?"}/step${r["customEvent:modal_step"] || "?"}`,
  );
  const submitRows = rowsToObjects(modalSubmit.data);
  const submitByChannelMode = sumBy(
    submitRows,
    (r) =>
      `${r["customEvent:modal_channel"] || "?"}/${r["customEvent:submit_mode"] || "?"}`,
  );

  const dismissTotal = eventCounts.whatsapp_modal_dismiss || 0;
  const submitTotal = eventCounts.whatsapp_modal_submit || 0;
  const modalDenom = dismissTotal + submitTotal;
  const modalDismissRate =
    modalDenom > 0
      ? Number(((dismissTotal / modalDenom) * 100).toFixed(1))
      : null;

  const deviceRows = rowsToObjects(byDevice.data);
  const abandonByDevice = sumBy(
    deviceRows.filter((r) => r.eventName === "form_abandon"),
    (r) => r.deviceCategory || "(not set)",
  );

  const gaps = topGaps(drops);
  const notes = [];
  if (!abandon) {
    notes.push(
      "`form_abandon` ainda zerado nesta janela — esperado até o deploy do site + tag GTM Live + 24–48h de tráfego.",
    );
  }
  if (Object.keys(abandonByLastStep).every((k) => k === "(not set)") && abandon) {
    notes.push(
      "`last_step` aparece como (not set) — registrar custom dimension EVENT `last_step` no Admin GA4 (script ga4-ensure-abandon-dimensions.mjs com escopo analytics.edit).",
    );
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    propertyId,
    hosts: novoHosts,
    range,
    asof,
    eventCounts,
    formSteps: steps,
    dropOff: drops,
    abandonByLastStep,
    abandonReasons,
    abandonByDevice,
    modal: {
      dismissTotal,
      submitTotal,
      dismissRatePct: modalDismissRate,
      dismissByChannelStep,
      dismissReasons,
      submitByChannelMode,
    },
    topGaps: gaps,
    notes,
  };

  const jsonPath = path.join(
    __dirname,
    `ga4-funnel-abandon-asof-${asof}.json`,
  );
  fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), "utf8");

  const mdPath = path.join(
    REPO_ROOT,
    "docs",
    `RELATORIO_ABANDONO_FUNIL_asof-${asof}.md`,
  );
  const md = [
    `# Relatório abandono funil — asof ${asof}`,
    "",
    `Janela: **${range.start} → ${range.end}** · property \`${propertyId}\` · hosts novo site.`,
    "",
    "## Contagem por evento",
    "",
    "| Evento | Count |",
    "|---|---:|",
    ...FUNNEL_EVENTS.map(
      (e) => `| \`${e}\` | ${eventCounts[e] || 0} |`,
    ),
    "",
    "## Drop-off entre passos",
    "",
    "| Transição | De | Para | Drop % |",
    "|---|---:|---:|---:|",
    ...Object.entries(drops).map(([k, v]) =>
      v
        ? `| ${k} | ${v.from} | ${v.to} | ${v.rate}% |`
        : `| ${k} | — | — | n/d |`,
    ),
    "",
    "## Abandono (`form_abandon`)",
    "",
    `- Total: **${abandon}**`,
    `- Por \`last_step\`: ${JSON.stringify(abandonByLastStep)}`,
    `- Por \`reason\`: ${JSON.stringify(abandonReasons)}`,
    `- Por dispositivo: ${JSON.stringify(abandonByDevice)}`,
    "",
    "## Modais",
    "",
    `- Dismiss: **${dismissTotal}** · Submit: **${submitTotal}** · taxa dismiss: **${modalDismissRate ?? "n/d"}%**`,
    `- Dismiss por canal/step: ${JSON.stringify(dismissByChannelStep)}`,
    `- Submit por canal/mode: ${JSON.stringify(submitByChannelMode)}`,
    "",
    "## Top-3 gargalos (drop-off)",
    "",
    ...(gaps.length
      ? gaps.map(
          (g, i) =>
            `${i + 1}. **${g.gap}** — ${g.rate}% (${g.from} → ${g.to})`,
        )
      : ["_Sem volume suficiente para ranking._"]),
    "",
    "## Notas",
    "",
    ...(notes.length ? notes.map((n) => `- ${n}`) : ["- Sem alertas."]),
    "",
    `_Gerado por \`scripts/google-ops/ga4-funnel-abandon-report.mjs\`._`,
    "",
  ].join("\n");
  fs.writeFileSync(mdPath, md, "utf8");

  console.log("JSON:", jsonPath);
  console.log("MD:", mdPath);
  console.log("Top gaps:", gaps);
}

main().catch((err) => {
  console.error(err.response?.data || err);
  process.exit(1);
});
