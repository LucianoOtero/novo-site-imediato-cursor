const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const ads = require("../ads-offline-conversion");

const sha = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

function config(extra = {}) {
  return JSON.stringify({
    enabled: true,
    clientId: "cid",
    clientSecret: "csecret",
    refreshToken: "rtoken",
    customerId: "123",
    conversionActionId: "456",
    ...extra,
  });
}

/** Google falso: OAuth + ingest; guarda os corpos enviados ao ingest. */
function googleFalso() {
  const original = global.fetch;
  const ingests = [];
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.startsWith("https://oauth2.googleapis.com")) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ access_token: "t" }) };
    }
    if (u.startsWith(ads.DATA_MANAGER_INGEST_URL)) {
      ingests.push(JSON.parse(opts.body));
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ requestId: "req1" }),
      };
    }
    return { ok: true, status: 200, text: async () => "{}" };
  };
  return { ingests, restaurar: () => (global.fetch = original) };
}

/** RTDB falso com um lead em leads_backup. */
function bancoFalso(lead) {
  const updates = [];
  return {
    updates,
    ref: () => ({
      get: async () => ({ exists: () => Boolean(lead), val: () => lead }),
      update: async (p) => updates.push(p),
    }),
  };
}

async function rodar({ lead, payload = {}, cfg = {}, contato = null }) {
  const google = googleFalso();
  const db = bancoFalso(lead);
  let chamadasEspo = 0;
  try {
    const res = await ads.handleAdsOfflineAfterSoldSet({
      payload: { opportunityId: "opp1", amount: 300, cDataVenda: "2026-11-02", ...payload },
      results: [{ projectId: "p1", ok: true, updated: [{ leadId: "L1" }], noop: [] }],
      adsConfigRaw: config(cfg),
      databases: { p1: db },
      loadOpportunityContact: async () => {
        chamadasEspo += 1;
        return contato;
      },
    });
    return { res, ingests: google.ingests, updates: db.updates, chamadasEspo };
  } finally {
    google.restaurar();
  }
}

test("telefone vira E.164 e e-mail é normalizado; e-mail falso é descartado", () => {
  assert.equal(ads.normalizePhoneBr("+5511987654321"), "+5511987654321");
  assert.equal(ads.normalizePhoneBr("(11) 98765-4321"), "+5511987654321");
  assert.equal(ads.normalizePhoneBr("1187654321"), "+551187654321");
  assert.equal(ads.normalizePhoneBr("987654321"), null);
  assert.equal(ads.normalizeEmail(" Foo.Bar@Gmail.com "), "foobar@gmail.com");
  assert.equal(ads.normalizeEmail("a.b@uol.com.br"), "a.b@uol.com.br");
  assert.equal(ads.normalizeEmail("11987654321@imediatoseguros.com.br"), null);
  assert.equal(ads.normalizeEmail("sem-arroba"), null);
});

test("contato do lead legado vem de DDD-CELULAR + CELULAR e Email", () => {
  const c = ads.extractContact({ data: { "DDD-CELULAR": "11", CELULAR: "987654321", Email: "X@Y.com" } });
  assert.deepEqual(c, { phone: "+5511987654321", email: "x@y.com" });
});

test("userData leva só SHA-256 hex, nunca o dado em claro", () => {
  const ud = ads.buildUserData({ phone: "11987654321", email: "Maria@Uol.com.br" });
  assert.deepEqual(ud, {
    userIdentifiers: [
      { phoneNumber: sha("+5511987654321") },
      { emailAddress: sha("maria@uol.com.br") },
    ],
  });
  assert.ok(!JSON.stringify(ud).includes("987654321"));
  assert.equal(ads.buildUserData({ phone: null, email: null }), null);
});

test("evento sem click leva só userData", () => {
  const ev = ads.buildDataManagerEvent({
    click: null,
    userData: { userIdentifiers: [{ phoneNumber: "h" }] },
    orderId: "o",
    conversionValue: 10,
    eventTimestamp: "2026-11-02T12:00:00.000Z",
  });
  assert.equal(ev.adIdentifiers, undefined);
  assert.deepEqual(ev.userData, { userIdentifiers: [{ phoneNumber: "h" }] });
});

test("config: padrão é completo e envio real; aceita complementar e validateOnly", () => {
  const padrao = ads.parseAdsConfig(config());
  assert.equal(padrao.mode, "completo");
  assert.equal(padrao.validateOnly, false);
  const novo = ads.parseAdsConfig(config({ mode: "complementar", validateOnly: true }));
  assert.equal(novo.mode, "complementar");
  assert.equal(novo.validateOnly, true);
});

test("complementar: venda com cGclid fica para o CSV e não chama o Google", async () => {
  const r = await rodar({
    lead: { data: { phoneE164: "+5511987654321", utm: { gclid: "g1" } } },
    payload: { cGclid: "g1" },
    cfg: { mode: "complementar", validateOnly: true },
  });
  assert.equal(r.res.reason, "gclid_via_csv");
  assert.equal(r.ingests.length, 0);
});

test("complementar + validateOnly: gbraid com hash vai em validação e o lead não é marcado", async () => {
  const r = await rodar({
    lead: { data: { phoneE164: "+5511987654321", email: "a@b.com", utm: { gbraid: "gb1" } } },
    cfg: { mode: "complementar", validateOnly: true },
  });
  assert.equal(r.ingests.length, 1);
  assert.equal(r.ingests[0].validateOnly, true);
  const ev = r.ingests[0].events[0];
  assert.deepEqual(ev.adIdentifiers, { gbraid: "gb1" });
  assert.equal(ev.userData.userIdentifiers.length, 2);
  assert.equal(r.res.leadResults[0].status, "validated");
  assert.equal(r.updates.length, 0);
  assert.equal(r.chamadasEspo, 0);
});

test("venda sem click sobe só com hash; e-mail que falta vem da Opportunity", async () => {
  const r = await rodar({
    lead: { data: { phoneE164: "+5511987654321" } },
    cfg: { mode: "complementar", validateOnly: true },
    contato: { phone: "11900000000", email: "cliente@uol.com.br" },
  });
  assert.equal(r.chamadasEspo, 1);
  const ev = r.ingests[0].events[0];
  assert.equal(ev.adIdentifiers, undefined);
  assert.deepEqual(ev.userData.userIdentifiers, [
    { phoneNumber: sha("+5511987654321") },
    { emailAddress: sha("cliente@uol.com.br") },
  ]);
  assert.equal(r.res.leadResults[0].clickIdType, "user_data");
});

test("marketing recusado: sem hash, e sem click a venda é pulada", async () => {
  const r = await rodar({
    lead: { data: { phoneE164: "+5511987654321", consent: { marketing: false } } },
    cfg: { mode: "complementar", validateOnly: true },
    contato: { phone: "11900000000", email: "cliente@uol.com.br" },
  });
  assert.equal(r.ingests.length, 0);
  assert.equal(r.res.leadResults[0].reason, "no_click_id");
});

test("validateOnly não manda estorno ao Google", async () => {
  const google = googleFalso();
  try {
    const r = await ads.handleAdsOfflineRetract({
      payload: { opportunityId: "opp1" },
      results: [{ projectId: "p1", ok: true, updated: [{ leadId: "L1", adsStatus: "uploaded" }] }],
      adsConfigRaw: config({ validateOnly: true, developerToken: "dt" }),
      databases: { p1: bancoFalso({}) },
    });
    assert.equal(r.reason, "validate_only");
    assert.equal(google.ingests.length, 0);
  } finally {
    google.restaurar();
  }
});

test("modo completo sem validateOnly continua enviando o gclid, agora com hash", async () => {
  const r = await rodar({
    lead: { data: { phoneE164: "+5511987654321", email: "a@b.com", utm: { gclid: "g1" } } },
    payload: { cGclid: "g1" },
  });
  assert.equal(r.ingests[0].validateOnly, false);
  assert.deepEqual(r.ingests[0].events[0].adIdentifiers, { gclid: "g1" });
  assert.equal(r.ingests[0].events[0].userData.userIdentifiers.length, 2);
  assert.equal(r.updates.length, 1);
});
