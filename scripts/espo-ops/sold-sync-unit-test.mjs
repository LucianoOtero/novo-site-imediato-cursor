/**
 * Testes unitários locais (sem Firebase) para sold-sync.
 * Uso: node scripts/espo-ops/sold-sync-unit-test.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sold = require(path.join(
  __dirname,
  "../../firebase/functions/sold-sync.js"
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

const setPayload = sold.normalizePayload({
  action: "set",
  id: "opp123",
  stage: "Vendido",
  amount: "439,50",
  cDataVenda: "2026-09-04 15:00:00",
  cLeadId: "lead9",
  cGclid: "CjwK",
});
assert(setPayload.opportunityId === "opp123", "normalize opportunityId");
assert(setPayload.amount === 439.5, "normalize amount BR");
assert(
  sold.normalizePayload({ amount: "1.234,56" }).amount === 1234.56,
  "normalize amount milhar BR"
);
assert(setPayload.cDataVenda === "2026-09-04", "normalize cDataVenda date");
assert(sold.validateSetPayload(setPayload) === null, "set valid");
assert(
  sold.validateSetPayload({ ...setPayload, amount: null }) !== null,
  "set rejects missing amount"
);
assert(
  sold.validateClearPayload({ action: "clear", opportunityId: "x" }) === null,
  "clear valid"
);

const patch = sold.buildSetPatch(setPayload, "2026-09-05T12:00:00.000Z");
assert(patch.sold === true && patch.soldStatus === "vendido", "set patch flags");
assert(patch.soldCommissionAmount === 439.5, "set patch amount");
assert(!("autoSync" in patch), "set patch sem autoSync");

const clear = sold.buildClearPatch();
assert(
  sold.SOLD_FIELDS.every((k) => clear[k] === null),
  "clear nulls all sold fields"
);

assert(
  sold.isSetNoop(
    { sold: true, soldCommissionAmount: 439.5, soldDate: "2026-09-04", soldEspoOpportunityId: "opp123" },
    patch
  ),
  "set noop when same"
);
assert(sold.isClearNoop({ status: "synced" }), "clear noop without sold*");
assert(
  !sold.isClearNoop({ sold: true }),
  "clear not noop when sold present"
);

assert(
  sold.recordMatches(
    { espocrmOpportunityId: "opp123" },
    { opportunityId: "opp123", cLeadId: null, cGclid: null }
  ) === "espocrmOpportunityId",
  "match by opp id"
);
assert(
  sold.recordMatches(
    { data: { utm: { gclid: "CjwK" } } },
    { opportunityId: null, cLeadId: null, cGclid: "CjwK" }
  ) === "gclid",
  "match by gclid"
);
assert(
  sold.timingSafeEqualString("abc", "abc") &&
    !sold.timingSafeEqualString("abc", "abd"),
  "timingSafeEqualString"
);

assert(
  sold.expandRequestItems([{ id: "a" }, { id: "b" }]).length === 2,
  "expand Espo batch array"
);
assert(
  sold.expandRequestItems({ action: "clear", id: "x" })[0].id === "x",
  "expand single object"
);
assert(
  sold.normalizePayload({ id: "o1", stage: "Vendido" }).action === "set",
  "infer action set from stage"
);
assert(
  sold.normalizePayload({ id: "o1", stage: "Perdido" }).action === "clear",
  "infer action clear from stage"
);

const sig = sold.buildEspoSignatureV9("wh1", '[{"id":"x"}]', "secret");
assert(
  sold.authorizeRequest({
    req: {
      get: (h) => (h === "Signature" ? sig : null),
    },
    rawBody: '[{"id":"x"}]',
    sharedSecret: null,
    espoWebhookId: "wh1",
    espoWebhookSecretKey: "secret",
  }).ok === true,
  "authorize via Espo signature"
);
const sigLegacy = sold.buildEspoSignatureLegacy("wh1", '[{"id":"x"}]', "secret");
assert(
  sold.authorizeRequest({
    req: {
      get: (h) => (h === "X-Signature" ? sigLegacy : null),
    },
    rawBody: '[{"id":"x"}]',
    sharedSecret: null,
    espoWebhookId: "wh1",
    espoWebhookSecretKey: "secret",
  }).via === "espo_signature_legacy",
  "authorize via Espo X-Signature legacy"
);
assert(
  sold.authorizeRequest({
    req: {
      get: (h) =>
        h === "X-Espo-Webhook-Secret" ? "shared-xyz" : null,
    },
    rawBody: "{}",
    sharedSecret: "shared-xyz",
    espoWebhookId: "",
    espoWebhookSecretKey: "",
  }).via === "shared_secret",
  "authorize via shared secret"
);
const prodSig = sold.buildEspoSignatureV9("wh-prod", '[{"id":"x"}]', "prod-secret");
assert(
  sold.authorizeRequest({
    req: { get: (h) => (h === "Signature" ? prodSig : null) },
    rawBody: '[{"id":"x"}]',
    sharedSecret: null,
    espoWebhookAuths: sold.parseEspoWebhookAuth(
      JSON.stringify({
        dev: { id: "wh-dev", secretKey: "dev-secret" },
        prod: { id: "wh-prod", secretKey: "prod-secret" },
      })
    ).auths,
  }).environment === "prod",
  "assinatura prod libera ambiente prod"
);

assert(
  sold.shouldAttemptAdsOffline("set", 1) === true,
  "ads offline attempts on set with updates"
);
assert(
  sold.shouldAttemptAdsOffline("set", 0) === false,
  "ads offline skips set with zero updates"
);
assert(
  sold.shouldAttemptAdsOffline("set", 0, { needsAdsRetry: true }) === true,
  "ads offline retries noop when upload is not confirmed"
);
assert(
  sold.shouldAttemptAdsRetract("clear", [{ adsStatus: "uploaded" }]) === true,
  "retract when a confirmed upload exists"
);
assert(
  sold.shouldAttemptAdsRetract("clear", [{ adsStatus: "accepted" }]) === false,
  "no retract without confirmed upload"
);
assert(
  sold.shouldAttemptAdsOffline("clear", 2) === false,
  "ads offline never on clear"
);

// --- Controle: classify + enrich clear (2026-09-25) ---
assert(
  sold.classifyNoFirebaseMatch({
    cLeadId: null,
    cGclid: null,
  }).missClass === "expected_no_attribution" &&
    sold.classifyNoFirebaseMatch({ cLeadId: null, cGclid: null }).skipEmail ===
      true,
  "miss: no attribution → skip email"
);
assert(
  sold.classifyNoFirebaseMatch({
    cLeadId: null,
    cGclid: "Cjw",
    cWebpage: "mdmidia.com.br",
  }).missClass === "expected_legacy_or_unlinked" &&
    sold.classifyNoFirebaseMatch({
      cGclid: "Cjw",
      cWebpage: "mdmidia.com.br",
    }).skipEmail === true,
  "miss: legado webpage → skip email"
);
assert(
  sold.classifyNoFirebaseMatch({
    cLeadId: "lead1",
    cGclid: "Cjw",
    cWebpage: "novo.segurosimediato.com.br",
  }).missClass === "actionable_site_novo_gap" &&
    sold.classifyNoFirebaseMatch({
      cLeadId: "lead1",
      cWebpage: "novo.segurosimediato.com.br",
    }).skipEmail === false,
  "miss: site novo → email"
);
assert(
  sold.classifyNoFirebaseMatch({
    cLeadId: null,
    cGclid: "Cjw",
    leadSource: "Telefone",
  }).missClass === "expected_legacy_or_unlinked",
  "miss: Telefone source → expected"
);
assert(
  sold.normalizePayload({
    action: "clear",
    id: "o1",
    cWebpage: "novo.segurosimediato.com.br",
    leadSource: "Site",
  }).cWebpage === "novo.segurosimediato.com.br",
  "normalize cWebpage"
);

const origFetch = globalThis.fetch;
globalThis.fetch = async () => ({
  ok: true,
  text: async () =>
    JSON.stringify({
      id: "oppClear",
      stage: "Perdido",
      cLeadId: "leadFromEspo",
      cGclid: "gclidFromEspo",
      cWebpage: "novo.segurosimediato.com.br",
      leadSource: "Site",
    }),
});
try {
  const enriched = await sold.enrichPayloadFromEspo(
    {
      action: "clear",
      opportunityId: "oppClear",
      stage: "Perdido",
      cLeadId: null,
      cGclid: null,
    },
    JSON.stringify({
      prod: {
        baseUrl: "https://flyingdonkeys.com.br",
        apiKey: "test-key",
      },
    })
  );
  assert(
    enriched.cLeadId === "leadFromEspo" && enriched.cGclid === "gclidFromEspo",
    "enrich clear preenche cLeadId/cGclid"
  );
  assert(
    enriched.cWebpage === "novo.segurosimediato.com.br",
    "enrich clear preenche cWebpage"
  );
} finally {
  globalThis.fetch = origFetch;
}

assert(
  sold.recordMatches(
    {
      espocrmLeadId: "lead9",
      espocrmOpportunityId: "oppOLD",
    },
    { opportunityId: "oppNEW", cLeadId: "lead9", cGclid: null }
  ) === "espocrmLeadId",
  "match by leadId when oppId stale"
);

// --- E-mail leigo ---
{
  const amt = sold.explainSoldSyncErrorPlain({
    reason: "validation_error",
    results: [{ error: "amount required for action=set" }],
    payload: { opportunityId: "oppAmt" },
  });
  assert(
    /Valor da Comissão/i.test(amt) && /oppAmt/.test(amt) && !/JSON/.test(amt),
    "plain: amount required"
  );
  const gap = sold.explainSoldSyncErrorPlain({
    reason: "no_firebase_match",
    missClass: "actionable_site_novo_gap",
    payload: { opportunityId: "oppGap" },
  });
  assert(/site novo/i.test(gap) && /não encontramos/i.test(gap), "plain: site novo gap");
  const db = sold.explainSoldSyncErrorPlain({ reason: "database_error", payload: {} });
  assert(/Firebase/i.test(db) && /falha/i.test(db), "plain: database_error");
}

if (failed) {
  console.error(`\n${failed} falha(s)`);
  process.exit(1);
}
console.log("\nTodos os testes unitários passaram.");
