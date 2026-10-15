/**
 * Testes unitários locais (sem Ads/Firebase) para ads-offline-conversion.
 * Uso: node scripts/espo-ops/ads-offline-unit-test.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ads = require(path.join(
  __dirname,
  "../../firebase/functions/ads-offline-conversion.js"
));

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("OK:", msg);
  }
}

const disabled = ads.parseAdsConfig(
  JSON.stringify({
    enabled: false,
    customerId: "9947918772",
    conversionActionId: "303889427",
  })
);
assert(disabled && disabled.enabled === false, "parse enabled=false");
assert(disabled.customerId === "9947918772", "parse customerId");
assert(!ads.configReadyForUpload(disabled), "not ready when disabled");

const enabledIncomplete = ads.parseAdsConfig(
  JSON.stringify({
    enabled: true,
    customerId: "9947918772",
    conversionActionId: "303889427",
  })
);
assert(
  !ads.configReadyForUpload(enabledIncomplete),
  "not ready without OAuth fields"
);

const enabledFull = ads.parseAdsConfig(
  JSON.stringify({
    enabled: true,
    developerToken: "tok",
    clientId: "cid",
    clientSecret: "sec",
    refreshToken: "ref",
    customerId: "994-791-8772",
    loginCustomerId: "432-160-2293",
    conversionActionId: "303889427",
    currencyCode: "BRL",
    timezoneOffset: "-03:00",
  })
);
assert(ads.configReadyForUpload(enabledFull), "ready when complete");
assert(enabledFull.customerId === "9947918772", "customerId digits only");
assert(enabledFull.loginCustomerId === "4321602293", "loginCustomerId digits");

const enabledNoDevToken = ads.parseAdsConfig(
  JSON.stringify({
    enabled: true,
    clientId: "cid",
    clientSecret: "sec",
    refreshToken: "ref",
    customerId: "9947918772",
    conversionActionId: "303889427",
  })
);
assert(
  ads.configReadyForUpload(enabledNoDevToken),
  "ready without developerToken (Data Manager)"
);

const dmEvent = ads.buildDataManagerEvent({
  click: { type: "gclid", value: "Cjw" },
  orderId: "opp1",
  conversionValue: 100.5,
  currencyCode: "BRL",
  eventTimestamp: "2026-09-05T18:00:00.000Z",
});
assert(dmEvent.adIdentifiers.gclid === "Cjw", "DM event gclid");
assert(dmEvent.transactionId === "opp1", "DM event transactionId");
assert(dmEvent.eventSource === "WEB", "DM eventSource WEB");
assert(dmEvent.currency === "BRL", "DM currency");

const dest = ads.buildDataManagerDestination(enabledFull);
assert(
  dest.operatingAccount.accountType === "GOOGLE_ADS" &&
    dest.operatingAccount.accountId === "9947918772",
  "DM destination operatingAccount"
);
assert(dest.productDestinationId === "303889427", "DM productDestinationId");
assert(dest.loginAccount?.accountId === "4321602293", "DM loginAccount");

const ts = ads.toEventTimestampRfc3339(
  "2026-09-05T18:00:00.000Z",
  null,
  "-03:00"
);
assert(ts === "2026-09-05T18:00:00.000Z", `RFC3339 from soldSyncedAt (got ${ts})`);

assert(ads.parseAdsConfig(null) === null, "null config");
assert(ads.parseAdsConfig("{") === null, "invalid JSON");

const siteNovo = {
  data: { utm: { gclid: "G1", gbraid: "GB", wbraid: "WB" } },
};
assert(
  ads.extractClickId(siteNovo)?.type === "gclid" &&
    ads.extractClickId(siteNovo)?.value === "G1",
  "prefer gclid over gbraid/wbraid"
);

const gbraidOnly = { data: { utm: { gbraid: "GB1" } } };
assert(ads.extractClickId(gbraidOnly)?.type === "gbraid", "gbraid fallback");

const wbraidOnly = { data: { utm: { wbraid: "WB1" } } };
assert(ads.extractClickId(wbraidOnly)?.type === "wbraid", "wbraid fallback");

const legacy = { data: { GCLID_FLD: "LEGACY_G" } };
assert(ads.extractClickId(legacy)?.value === "LEGACY_G", "legado GCLID_FLD");

assert(ads.extractClickId({ data: {} }) === null, "no click id → null");

const dt = ads.formatConversionDateTime(
  "2026-09-05T18:00:00.000Z",
  null,
  "-03:00"
);
assert(
  dt === "2026-09-05 15:00:00-03:00",
  `datetime from soldSyncedAt (got ${dt})`
);

const dtDate = ads.formatConversionDateTime(null, "2026-09-04", "-03:00");
assert(
  dtDate.startsWith("2026-09-04 ") && dtDate.endsWith("-03:00"),
  `datetime from soldDate (got ${dtDate})`
);

const resource = ads.conversionActionResource("9947918772", "303889427");
assert(
  resource === "customers/9947918772/conversionActions/303889427",
  "conversionAction resource"
);

const conv = ads.buildClickConversion({
  click: { type: "gclid", value: "Cjw" },
  cfg: enabledFull,
  orderId: "opp1",
  conversionValue: 100.5,
  conversionDateTime: dt,
});
assert(conv.gclid === "Cjw", "conversion has gclid");
assert(conv.orderId === "opp1", "conversion orderId");
assert(conv.conversionValue === 100.5, "conversion value");
assert(conv.currencyCode === "BRL", "currency BRL");
assert(!("gbraid" in conv) && !("wbraid" in conv), "only one click id field");

assert(
  ads.alreadyUploaded(
    {
      adsOfflineConversionStatus: "uploaded",
      adsOfflineOrderId: "opp1",
    },
    "opp1"
  ),
  "idempotent uploaded same orderId"
);
assert(
  !ads.alreadyUploaded(
    {
      adsOfflineConversionStatus: "accepted",
      adsOfflineOrderId: "opp1",
    },
    "opp1"
  ),
  "accepted ainda não é uploaded"
);
assert(
  !ads.alreadyUploaded(
    {
      adsOfflineConversionStatus: "error",
      adsOfflineOrderId: "opp1",
    },
    "opp1"
  ),
  "error permite reenvio"
);
assert(
  !ads.alreadyUploaded(
    {
      adsOfflineConversionStatus: "uploaded",
      adsOfflineOrderId: "opp-other",
    },
    "opp1"
  ),
  "not idempotent different orderId"
);
assert(
  ads.isInvalidGclid({ errorCounts: [{ reason: "PROCESSING_ERROR_REASON_INVALID_GCLID" }] }),
  "detecta INVALID_GCLID"
);
assert(
  ads.classifyRequestStatus({
    requestStatusPerDestination: [{ requestStatus: "SUCCESS" }],
  }).kind === "success",
  "SUCCESS confirma uploaded"
);
assert(
  ads.classifyRequestStatus({
    requestStatusPerDestination: [{ requestStatus: "FAILED" }],
  }).kind === "failed",
  "FAILED não confirma"
);
const pastSale = ads.formatConversionDateTime(
  "2026-09-05T18:00:00.000Z",
  "2026-09-04",
  "-03:00",
  new Date("2026-09-21T15:00:00.000Z")
);
assert(
  pastSale === "2026-09-04 23:59:59-03:00",
  `data passada vence o webhook (got ${pastSale})`
);

const skipPatch = ads.adsFlagsPatch({
  status: "skipped",
  clickType: null,
  orderId: "opp1",
  adsJobId: 2026090501,
  adsOfflineAuditKey: "auditKey1",
});
assert(skipPatch.adsOfflineConversionStatus === "skipped", "flags skipped");
assert(skipPatch.adsOfflineOrderId === "opp1", "flags orderId");
assert(skipPatch.adsOfflineJobId === 2026090501, "flags adsOfflineJobId");
assert(
  skipPatch.adsOfflineAuditKey === "auditKey1",
  "flags adsOfflineAuditKey"
);

const jobId = ads.buildDailyJobId(
  "-03:00",
  new Date("2026-09-05T18:00:00.000Z")
);
assert(jobId === 2026090501, `daily jobId (got ${jobId})`);
assert(jobId < 2 ** 31, "jobId < 2^31");

const long = "x".repeat(ads.AUDIT_RESPONSE_SNIPPET_MAX + 50);
const truncated = ads.truncateSnippet(long);
assert(
  truncated.endsWith("…") &&
    truncated.length === ads.AUDIT_RESPONSE_SNIPPET_MAX + 1,
  "truncateSnippet caps length"
);

const audit = ads.buildAuditEntry({
  status: "uploaded",
  reason: "upload_ok",
  opportunityId: "opp1",
  leadId: "lead1",
  projectId: "imediato-seguros-site-novo",
  clickIdType: "gclid",
  clickId: "Cjw",
  conversionValue: 100.5,
  currencyCode: "BRL",
  conversionDateTime: "2026-09-05 15:00:00-03:00",
  conversionActionId: "303889427",
  customerId: "9947918772",
  adsJobId: 2026090501,
});
assert(audit.status === "uploaded", "audit status");
assert(audit.orderId === "opp1", "audit orderId from opportunityId");
assert(audit.clickId === "Cjw", "audit clickId");
assert(audit.adsJobId === 2026090501, "audit adsJobId");
assert(audit.error === null, "audit error null when ok");

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log("\nTodos os testes OK");
