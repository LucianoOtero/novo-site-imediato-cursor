/**
 * Agregação read-only de leads Firebase por janela e campanha Ads.
 *
 * Uso:
 *   node experiment-analyze-firebase-leads.mjs --start 2026-08-17 --end 2026-08-21 \
 *     --project imediato-seguros-site-novo --out leads-analysis-w2-novo.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, requireArg } from "./lib/cli-args.mjs";
import {
  CONTROL_CAMPAIGN_ID,
  EXP_CAMPAIGN_ID,
} from "./lib/experiment-constants.mjs";
import { fetchFirebaseBackup } from "./lib/firebase-fetch.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOVO_PROJECT = "imediato-seguros-site-novo";
const LEGACY_PROJECT = "leads-imediato-seguros";

function emptyBucket() {
  return {
    total: 0,
    records: 0,
    withGclid: 0,
    uniqueGclids: 0,
    uniqueContacts: 0,
    stages: {},
    days: {},
    channels: {},
    sources: {},
    ramos: {},
    statuses: {},
    synced: 0,
    espocrm: 0,
    octadesk: 0,
    octadeskCloudRun: 0,
  };
}

function inc(obj, key, n = 1) {
  if (!key) return;
  obj[key] = (obj[key] || 0) + n;
}

function dateInWindow(iso, start, end) {
  if (!iso) return false;
  const d = String(iso).slice(0, 10);
  return d >= start && d <= end;
}

function campaignBucket(utm, gclid, { legacyProject = false } = {}) {
  const camp = String(
    utm?.utm_campaign || utm?.utm_id || utm?.gad_campaignid || "",
  ).replace(/\D/g, "");
  if (camp === EXP_CAMPAIGN_ID) return "exp";
  if (camp === CONTROL_CAMPAIGN_ID) return "control";
  // Legado Webflow: RTDB só recebe tráfego do site legado (braço Controle do
  // experimento). Sem utm_campaign no payload, gclid ⇒ Controle.
  if (legacyProject && gclid) return "control";
  if (gclid) return "otherAds";
  return "organicOrUnknown";
}

function isSmokeTest(data, rec) {
  const nome = String(data.nome || "").toUpperCase();
  const email = String(data.email || "").toLowerCase();
  if (email.startsWith("lrotero")) return true;
  if (nome.includes("TESTE") || nome.includes("TEST ")) return true;
  if (rec.environment && rec.environment !== "production") return true;
  return false;
}

function analyzeNovo(raw, start, end) {
  const summary = {
    exp: emptyBucket(),
    control: emptyBucket(),
    otherAds: emptyBucket(),
    organicOrUnknown: emptyBucket(),
  };
  const gclidSets = {
    exp: new Set(),
    control: new Set(),
    otherAds: new Set(),
    organicOrUnknown: new Set(),
  };
  let scanned = 0;
  let inWindow = 0;

  for (const [, rec] of Object.entries(raw || {})) {
    if (!rec || typeof rec !== "object") continue;
    scanned++;
    const data = rec.data || {};
    const ts = rec.timestamp || rec.syncedAt || "";
    if (!dateInWindow(ts, start, end)) continue;
    if (isSmokeTest(data, rec)) continue;
    inWindow++;

    const utm = data.utm || {};
    const gclid = utm.gclid || data.GCLID_FLD || null;
    const bucket = campaignBucket(utm, gclid);
    const b = summary[bucket];
    const day = String(ts).slice(0, 10);

    b.total++;
    if (gclid) {
      b.withGclid++;
      gclidSets[bucket].add(gclid);
    }
    inc(b.days, day);
    inc(b.stages, data.stage);
    inc(b.channels, data.captureChannel);
    inc(b.ramos, data.ramo);
    if (rec.synced === true || rec.status === "synced") b.synced++;
    if (rec.espocrm_sent === true) b.espocrm++;
    if (rec.octadesk_sent === true) b.octadesk++;
  }

  for (const key of Object.keys(summary)) {
    summary[key].uniqueGclids = gclidSets[key].size;
  }

  return { scanned, inWindow, summary };
}

function analyzeLegacy(raw, start, end) {
  const summary = {
    exp: emptyBucket(),
    control: emptyBucket(),
    otherAds: emptyBucket(),
    organicOrUnknown: emptyBucket(),
  };
  const gclidSets = {
    exp: new Set(),
    control: new Set(),
    otherAds: new Set(),
    organicOrUnknown: new Set(),
  };
  const contactSets = {
    exp: new Set(),
    control: new Set(),
    otherAds: new Set(),
    organicOrUnknown: new Set(),
  };
  let scanned = 0;
  let inWindow = 0;

  for (const [, rec] of Object.entries(raw || {})) {
    if (!rec || typeof rec !== "object") continue;
    scanned++;
    const data = rec.data || {};
    const ts = rec.timestamp || rec.syncedAt || rec.d || "";
    if (!dateInWindow(ts, start, end)) continue;
    inWindow++;

    const utm = data.utm || {};
    const gclid =
      utm.gclid ||
      data.GCLID_FLD ||
      data.gclid ||
      rec.gclid ||
      null;
    const bucket = campaignBucket(utm, gclid, { legacyProject: true });
    const b = summary[bucket];
    const day = String(ts).slice(0, 10);
    const phone = data.phoneE164 || data.CELULAR || data.celular || "";
    const source = rec.source || data.source || "unknown";

    b.records++;
    b.total = b.records;
    if (gclid) {
      b.withGclid++;
      gclidSets[bucket].add(gclid);
    }
    if (phone) contactSets[bucket].add(phone);
    inc(b.days, day);
    inc(b.sources, source);
    inc(b.statuses, rec.status || "unknown");
    if (rec.synced === true || rec.status === "synced") b.synced++;
    if (rec.espocrm_sent === true) b.espocrm++;
    if (rec.octadesk_sent === true) b.octadesk++;
    if (rec.octadeskCloudRun === true) b.octadeskCloudRun++;
  }

  for (const key of Object.keys(summary)) {
    summary[key].uniqueGclids = gclidSets[key].size;
    summary[key].uniqueContacts = contactSets[key].size;
  }

  return { scanned, inWindow, summary };
}

async function main() {
  const args = parseArgs();
  const start = requireArg(args, "start");
  const end = requireArg(args, "end");
  const project = args.project || NOVO_PROJECT;
  const OUT =
    args.out ||
    path.join(
      __dirname,
      `${project === LEGACY_PROJECT ? "legacy-" : ""}leads-analysis-${start}_${end}.json`,
    );

  const raw = fetchFirebaseBackup(project);
  const isLegacy = project === LEGACY_PROJECT;
  const { scanned, inWindow, summary } = isLegacy
    ? analyzeLegacy(raw, start, end)
    : analyzeNovo(raw, start, end);

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sourceProject: project,
    window: { start, end },
    scanned,
    inWindow,
    summary,
    note: isLegacy
      ? "Agregado sem PII. uniqueGclids é a melhor aproximação read-only de usuários Ads únicos."
      : "Agregado sem PII. site_novo RTDB — legado usa outro projeto Firebase.",
  };

  fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2), "utf8");
  console.log(`Firebase snapshot: ${OUT}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
