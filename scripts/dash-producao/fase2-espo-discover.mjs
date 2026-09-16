/**
 * Fase 2 discovery — Espo Vendido sample + fill rates (read-only).
 * Env: ESPO_BASE_URL + ESPO_API_KEY (dash key ok)
 */
import fs from "node:fs";
import { resolveEspoConfig, espoRequest } from "../espo-ops/lib/espo-client.mjs";

const c = resolveEspoConfig({ prefer: "prod" });
console.log(JSON.stringify({ baseUrl: c.baseUrl, source: c.source }));

const select = [
  "id",
  "name",
  "stage",
  "amount",
  "amountCurrency",
  "cDataDeEmisso",
  "cDataVenda",
  "cInicioVigncia",
  "assignedUserId",
  "assignedUserName",
  "accountId",
  "accountName",
  "cCpftext",
  "cCPF",
  "cSeguradora",
  "cPremioLiquido",
  "cPlaca",
  "cCiapol",
  "cComisso",
];

const where = JSON.stringify([
  { type: "equals", attribute: "stage", value: "Vendido" },
  { type: "isNotNull", attribute: "cDataDeEmisso" },
  { type: "greaterThanOrEquals", attribute: "cDataDeEmisso", value: "2026-07-01" },
]);

const rows = [];
let offset = 0;
const maxSize = 200;
for (let page = 0; page < 20; page++) {
  const data = await espoRequest(c, "GET", "Opportunity", {
    query: {
      maxSize: String(maxSize),
      offset: String(offset),
      orderBy: "cDataDeEmisso",
      order: "desc",
      select: select.join(","),
      where,
    },
  });
  const batch = data?.list || [];
  rows.push(...batch);
  if (batch.length < maxSize) break;
  offset += maxSize;
}

const n = rows.length;
const filled = (k) => rows.filter((r) => r[k] != null && String(r[k]).trim() !== "").length;
const fillRates = Object.fromEntries(select.map((k) => [k, n ? `${filled(k)}/${n}` : "0/0"]));

const segDist = {};
for (const r of rows) {
  const s = r.cSeguradora || "(vazio)";
  segDist[s] = (segDist[s] || 0) + 1;
}

console.log(
  JSON.stringify(
    {
      sampleN: n,
      fillRates,
      segTop: Object.entries(segDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15),
      sample: rows.slice(0, 8).map((r) => ({
        id: r.id,
        emisso: r.cDataDeEmisso,
        seg: r.cSeguradora,
        hasAmount: r.amount != null,
        hasCpftext: !!(r.cCpftext && String(r.cCpftext).trim()),
        cpfLen: r.cCpftext ? String(r.cCpftext).replace(/\D/g, "").length : 0,
        hasPlaca: !!(r.cPlaca && String(r.cPlaca).trim()),
        hasCi: !!(r.cCiapol && String(r.cCiapol).trim()),
        hasAssigned: !!r.assignedUserName,
        hasAccount: !!r.accountId,
      })),
    },
    null,
    2,
  ),
);

const joinCandidates = rows.map((r) => ({
  id: r.id,
  cDataDeEmisso: r.cDataDeEmisso,
  cInicioVigncia: r.cInicioVigncia || null,
  cSeguradora: r.cSeguradora || null,
  docDigits: r.cCpftext ? String(r.cCpftext).replace(/\D/g, "") : "",
  placa: r.cPlaca ? String(r.cPlaca).replace(/[^A-Za-z0-9]/g, "").toUpperCase() : "",
  ci: r.cCiapol ? String(r.cCiapol).trim() : "",
  amount: r.amount,
  assignedUserName: r.assignedUserName || null,
}));

const out = new URL("./fase2-espo-vendido-sample.json", import.meta.url);
fs.writeFileSync(out, JSON.stringify({ asOf: new Date().toISOString(), n, joinCandidates }, null, 2));
console.log("WROTE", out.pathname.replace(/^\/([A-Za-z]:)/, "$1"), "n=", n);
