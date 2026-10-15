const test = require("node:test");
const assert = require("node:assert/strict");

const espo = require("../espocrm");

const config = { baseUrl: "https://espo.example", apiKey: "k" };

const leadData = {
  phoneE164: "+5511987654321",
  nome: "Maria Silva",
  cpf: "52998224725",
  placa: "ABC1D23",
};

function mockFetch(handler) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, init = {}) => {
    const path = url.replace(`${config.baseUrl}/api/v1/`, "");
    const call = { method: init.method, path, body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const { status = 200, body } = handler(call) || {};
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? "" : JSON.stringify(body)),
    };
  };
  return { calls, restore: () => (global.fetch = original) };
}

test("POST Lead 409 (duplicate check do Espo) adota o Lead existente e atualiza", async () => {
  const mock = mockFetch(({ method, path }) => {
    if (method === "GET" && path.startsWith("Lead?")) return { body: { total: 0, list: [] } };
    if (method === "POST" && path === "Lead") return { status: 409, body: [{ id: "lead-existente", name: "Outro" }] };
    if (method === "PUT" && path === "Lead/lead-existente") return { body: { id: "lead-existente" } };
    if (method === "POST" && path === "Opportunity") return { body: { id: "opp-1" } };
    return { status: 500 };
  });
  try {
    const out = await espo.deliverStage(config, leadData, {});
    assert.equal(out.leadId, "lead-existente");
    assert.equal(out.opportunityId, "opp-1");
    const put = mock.calls.find((c) => c.method === "PUT" && c.path === "Lead/lead-existente");
    assert.equal(put.body.cCpftext, "52998224725");
    assert.equal(put.body.firstName, "Maria Silva");
    const opp = mock.calls.find((c) => c.method === "POST" && c.path === "Opportunity");
    assert.equal(opp.body.leadId, "lead-existente");
  } finally {
    mock.restore();
  }
});

test("POST Lead com erro que não é duplicata continua lançando", async () => {
  const mock = mockFetch(({ method, path }) => {
    if (method === "GET" && path.startsWith("Lead?")) return { body: { total: 0, list: [] } };
    if (method === "POST" && path === "Lead") return { status: 400, body: { reason: "validationFailure" } };
    return { status: 500 };
  });
  try {
    await assert.rejects(espo.deliverStage(config, leadData, {}), /HTTP 400/);
  } finally {
    mock.restore();
  }
});
