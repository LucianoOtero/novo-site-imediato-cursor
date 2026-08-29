/**
 * Triangulação GA4 (read-only) — hostname legado vs novo, 10–14/08/2026.
 * Uso: node ga4-analyze-5bd-2026-08-10-14.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const PROPERTY_ID = "281067607";
const START = "2026-08-10";
const END = "2026-08-14";
const CONTROL_CAMPAIGN_ID = "21287198336";
const EXP_CAMPAIGN_ID = "24095000558";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "ga4-analysis-5bd-2026-08-10-14.json");

const EVENT_NAMES = [
  "session_start",
  "page_view",
  "form_initial_contact",
  "generate_lead",
  "form_quote_choice",
  "whatsapp_modal_initial_contact",
  "whatsapp_modal_submit",
  "phone_modal_initial_contact",
  "phone_modal_submit",
  "rpa_result",
];

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const propertyId =
    String(config.ga4?.propertyId || PROPERTY_ID).replace(/\D/g, "") ||
    PROPERTY_ID;

  const oauth2 = await getAuthorizedClient({
    withAds: true,
    withAnalytics: true,
  });
  const analyticsdata = google.analyticsdata({ version: "v1beta", auth: oauth2 });

  const sessionsByHost = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: START, endDate: END }],
      dimensions: [{ name: "hostName" }, { name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "engagedSessions" },
        { name: "engagementRate" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "hostName",
          inListFilter: {
            values: [
              "segurosimediato.com.br",
              "www.segurosimediato.com.br",
              "novo.segurosimediato.com.br",
              "comparaseguroonline.com.br",
              "www.comparaseguroonline.com.br",
            ],
          },
        },
      },
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
  });

  const eventsByHost = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: START, endDate: END }],
      dimensions: [{ name: "hostName" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }, { name: "conversions" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: "hostName",
                inListFilter: {
                  values: [
                    "segurosimediato.com.br",
                    "www.segurosimediato.com.br",
                    "novo.segurosimediato.com.br",
                    "comparaseguroonline.com.br",
                    "www.comparaseguroonline.com.br",
                  ],
                },
              },
            },
            {
              filter: {
                fieldName: "eventName",
                inListFilter: { values: EVENT_NAMES },
              },
            },
          ],
        },
      },
    },
  });

  const campaignFilter = {
    filter: {
      fieldName: "sessionCampaignId",
      inListFilter: {
        values: [CONTROL_CAMPAIGN_ID, EXP_CAMPAIGN_ID],
      },
    },
  };

  const adsSessionsByCampaign = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: START, endDate: END }],
      dimensions: [
        { name: "sessionCampaignId" },
        { name: "hostName" },
        { name: "date" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "engagedSessions" },
        { name: "engagementRate" },
        { name: "averageSessionDuration" },
      ],
      dimensionFilter: campaignFilter,
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
  });

  const adsEventsByCampaign = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [{ startDate: START, endDate: END }],
      dimensions: [
        { name: "sessionCampaignId" },
        { name: "hostName" },
        { name: "eventName" },
      ],
      metrics: [{ name: "eventCount" }, { name: "conversions" }],
      dimensionFilter: campaignFilter,
    },
  });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    propertyId,
    window: { start: START, end: END },
    sessionsByHost: sessionsByHost.data,
    eventsByHost: eventsByHost.data,
    adsSessionsByCampaign: adsSessionsByCampaign.data,
    adsEventsByCampaign: adsEventsByCampaign.data,
  };
  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`GA4 snapshot: ${OUT}`);

  console.log("\n=== Sessions by host/date ===");
  for (const row of sessionsByHost.data.rows || []) {
    const [host, date] = row.dimensionValues.map((d) => d.value);
    const [sessions, users, engaged, engRate] = row.metricValues.map(
      (m) => m.value,
    );
    console.log(
      `${date} | ${host} | sessions=${sessions} users=${users} engaged=${engaged} engRate=${engRate}`,
    );
  }
  console.log("\n=== Events by host ===");
  for (const row of eventsByHost.data.rows || []) {
    const [host, event] = row.dimensionValues.map((d) => d.value);
    const [count, conv] = row.metricValues.map((m) => m.value);
    console.log(`${host} | ${event} | count=${count} conversions=${conv}`);
  }
  console.log("\n=== Ads sessions by campaign ===");
  for (const row of adsSessionsByCampaign.data.rows || []) {
    const [campaign, host, date] = row.dimensionValues.map((d) => d.value);
    const [sessions, users, engaged, engRate, duration] = row.metricValues.map(
      (m) => m.value,
    );
    console.log(
      `${date} | ${campaign} | ${host} | sessions=${sessions} users=${users} engaged=${engaged} engRate=${engRate} avgDuration=${duration}`,
    );
  }
  console.log("\n=== Ads events by campaign ===");
  for (const row of adsEventsByCampaign.data.rows || []) {
    const [campaign, host, event] = row.dimensionValues.map((d) => d.value);
    const [count, conv] = row.metricValues.map((m) => m.value);
    console.log(
      `${campaign} | ${host} | ${event} | count=${count} conversions=${conv}`,
    );
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
