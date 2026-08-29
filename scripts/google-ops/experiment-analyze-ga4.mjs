/**
 * Triangulação GA4 (read-only) — experimento por janela.
 *
 * Uso:
 *   node experiment-analyze-ga4.mjs --start 2026-08-17 --end 2026-08-21
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import { getAuthorizedClient } from "./lib/auth.mjs";
import { parseArgs, requireArg } from "./lib/cli-args.mjs";
import {
  CANONICAL_HOSTS,
  CONTROL_CAMPAIGN_ID,
  EXP_CAMPAIGN_ID,
} from "./lib/experiment-constants.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const PROPERTY_ID = "281067607";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EVENT_NAMES = [
  "session_start",
  "page_view",
  "form_start",
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
  const args = parseArgs();
  const START = requireArg(args, "start");
  const END = requireArg(args, "end");
  const OUT =
    args.out ||
    path.join(__dirname, `ga4-analysis-${START}_${END}.json`);

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const propertyId =
    String(config.ga4?.propertyId || PROPERTY_ID).replace(/\D/g, "") ||
    PROPERTY_ID;

  const oauth2 = await getAuthorizedClient({
    withAds: true,
    withAnalytics: true,
  });
  const analyticsdata = google.analyticsdata({ version: "v1beta", auth: oauth2 });

  const hostFilter = {
    filter: {
      fieldName: "hostName",
      inListFilter: { values: CANONICAL_HOSTS },
    },
  };

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
      dimensionFilter: hostFilter,
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
            hostFilter,
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
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
