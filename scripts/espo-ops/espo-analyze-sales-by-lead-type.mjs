/**
 * Join Firebase (novo + legado) × EspoCRM Opportunities e classifica
 * coortes de captura. Saída agregada sem PII.
 *
 * Uso (PowerShell):
 *   $env:ESPOCRM_API_CONFIG = gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo
 *   node espo-analyze-sales-by-lead-type.mjs
 *
 * Firebase: usa `firebase-tools database:get` (sessão firebase login).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveEspoConfig,
  espoListAll,
  isTestLead,
  siteBucket,
} from "./lib/espo-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "sales-by-lead-type.json");
const DOC = path.join(
  __dirname,
  "..",
  "..",
  "docs",
  "MEDICAO_VENDA_POR_TIPO_LEAD.md",
);

const OPP_SELECT = [
  "id",
  "name",
  "stage",
  "amount",
  "cPremioLiquido",
  "cDataVenda",
  "cDataDoLead",
  "cWebpage",
  "cEtapaFunil",
  "cEscolhaCalculo",
  "cGclid",
  "cLeadId",
  "cCelular",
  "createdAt",
];

const MATURITY_DAYS = [30, 60, 90];

function hashKey(value) {
  if (!value) return null;
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function normalizePhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits.slice(0, 13);
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const t0 = Date.parse(a);
  const t1 = Date.parse(b);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return Math.round((t1 - t0) / 86400000);
}

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function emptyCohort() {
  return {
    opportunities: 0,
    sold: 0,
    amountSum: 0,
    premioSum: 0,
    daysToSale: [],
    maturity: Object.fromEntries(
      MATURITY_DAYS.map((d) => [String(d), { eligible: 0, sold: 0 }]),
    ),
  };
}

function fetchFirebaseBackup(projectId) {
  const tmp = path.join(os.tmpdir(), `leads_backup_${projectId}_${Date.now()}.json`);
  try {
    execFileSync(
      "npx",
      [
        "firebase-tools",
        "database:get",
        "/leads_backup",
        `--project`,
        projectId,
        "-o",
        tmp,
      ],
      { stdio: ["ignore", "pipe", "pipe"], shell: true },
    );
    const raw = JSON.parse(fs.readFileSync(tmp, "utf8") || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function classifyNovoJourney(events) {
  // events: array of { stage, captureChannel, ts }
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const first = sorted[0] || {};
  const channel = first.captureChannel || "unknown";
  const stages = new Set(sorted.map((e) => e.stage).filter(Boolean));
  const maxRank = Math.max(
    0,
    ...[...stages].map((s) => {
      if (s === "initial") return 1;
      if (s === "progress") return 2;
      if (s === "complete" || s === "consultant_requested" || s === "rpa_result")
        return 3;
      return 0;
    }),
  );

  if (channel === "lead_form") {
    if (maxRank <= 1) return "novo_form_telefone";
    // progress: distinguir pessoais vs veículo exige placa/veículo — usa flag
    const hasVehicle = sorted.some((e) => e.hasVehicle);
    if (maxRank === 2) return hasVehicle ? "novo_form_veiculo" : "novo_form_pessoais";
    return "novo_form_calculo";
  }
  if (channel === "contact_modal") {
    if (stages.has("complete") || stages.has("rpa_result") || stages.has("consultant_requested")) {
      return "novo_modal_complete";
    }
    return "novo_modal_initial";
  }
  return "novo_unknown";
}

function classifyLegadoJourney(events) {
  const sources = events.map((e) => e.source || "").filter(Boolean);
  if (sources.some((s) => s.includes("webflow_modal_complete"))) {
    return "legado_modal_complete";
  }
  if (sources.some((s) => s.includes("webflow_modal_initial"))) {
    return "legado_modal_initial";
  }
  if (sources.some((s) => s.includes("webflow_modal"))) {
    return "legado_modal_other";
  }
  return "legado_other";
}

function indexNovoFirebase(raw) {
  /** @type {Map<string, object>} */
  const byEspoLead = new Map();
  const byEspoOpp = new Map();
  const byGclid = new Map();
  const byPhone = new Map();

  for (const [id, rec] of Object.entries(raw || {})) {
    if (!rec || typeof rec !== "object") continue;
    const data = rec.data || {};
    const ts = Date.parse(rec.timestamp || rec.syncedAt || "") || 0;
    const event = {
      firebaseId: id,
      stage: data.stage || null,
      captureChannel: data.captureChannel || null,
      hasVehicle: Boolean(
        data.placa || data.veiculoMarcaModelo || data.veiculoAno || data.veiculoMarca,
      ),
      ts,
      gclid: data.utm?.gclid || data.GCLID_FLD || null,
      phone: normalizePhone(data.phoneE164 || data.cCelular),
      espocrmLeadId: rec.espocrmLeadId || data.espocrmLeadId || null,
      espocrmOpportunityId:
        rec.espocrmOpportunityId || data.espocrmOpportunityId || null,
      environment: rec.environment || null,
    };
    if (event.environment && event.environment !== "production") continue;

    const push = (map, key) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    };
    push(byEspoLead, event.espocrmLeadId);
    push(byEspoOpp, event.espocrmOpportunityId);
    push(byGclid, event.gclid);
    push(byPhone, event.phone);
  }

  return { byEspoLead, byEspoOpp, byGclid, byPhone };
}

function indexLegadoFirebase(raw) {
  const byGclid = new Map();
  const byPhone = new Map();
  for (const [id, rec] of Object.entries(raw || {})) {
    if (!rec || typeof rec !== "object") continue;
    const data = rec.data || {};
    const ts = Date.parse(rec.timestamp || rec.d || "") || 0;
    if (rec.environment === "dev") continue;
    const event = {
      firebaseId: id,
      source: rec.source || null,
      ts,
      gclid: data.GCLID_FLD || data.gclid || null,
      phone: normalizePhone(data.phoneE164 || data.CELULAR || data.cCelular),
    };

    const push = (map, key) => {
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    };
    push(byGclid, event.gclid);
    push(byPhone, event.phone);
  }
  return { byGclid, byPhone };
}

function resolveNovoEvents(opp, idx) {
  if (opp.cLeadId && idx.byEspoLead.has(opp.cLeadId)) return idx.byEspoLead.get(opp.cLeadId);
  // try opp id against opportunity map — need opp.id
  if (opp.id && idx.byEspoOpp.has(opp.id)) return idx.byEspoOpp.get(opp.id);
  if (opp.cGclid && idx.byGclid.has(opp.cGclid)) return idx.byGclid.get(opp.cGclid);
  const phone = normalizePhone(opp.cCelular);
  if (phone && idx.byPhone.has(phone)) return idx.byPhone.get(phone);
  return [];
}

function resolveLegadoEvents(opp, idx) {
  if (opp.cGclid && idx.byGclid.has(opp.cGclid)) return idx.byGclid.get(opp.cGclid);
  const phone = normalizePhone(opp.cCelular);
  if (phone && idx.byPhone.has(phone)) return idx.byPhone.get(phone);
  return [];
}

function etapaFallbackCohort(site, etapa) {
  const e = String(etapa || "");
  if (site === "novo") {
    if (e === "Telefone informado") return "novo_form_telefone";
    if (e === "Dados pessoais") return "novo_form_pessoais";
    if (e === "Dados do veículo") return "novo_form_veiculo";
    if (
      e.includes("Cálculo") ||
      e.includes("Aguardando") ||
      e.includes("manual")
    ) {
      return "novo_form_calculo";
    }
    return "novo_espo_only";
  }
  return "legado_espo_only";
}

async function main() {
  const config = resolveEspoConfig({ prefer: "prod" });
  console.log("Espo:", config.baseUrl);
  console.log("Baixando Opportunities (recentes + site novo)…");
  const recent = await espoListAll(config, "Opportunity", {
    select: OPP_SELECT,
    orderBy: "createdAt",
    order: "desc",
    maxSize: 200,
    maxPages: 30,
  });
  const novoPages = [];
  for (const webpage of [
    "novo.segurosimediato.com.br",
    "comparaseguroonline.com.br",
  ]) {
    const chunk = await espoListAll(config, "Opportunity", {
      select: OPP_SELECT,
      where: [{ type: "equals", attribute: "cWebpage", value: webpage }],
      orderBy: "createdAt",
      order: "desc",
      maxSize: 200,
      maxPages: 10,
    });
    novoPages.push(...chunk);
  }
  const byId = new Map();
  for (const r of [...recent, ...novoPages]) byId.set(r.id, r);
  const opps = [...byId.values()];
  console.log("Opps:", opps.length, "(novo dedicado:", novoPages.length, ")");

  console.log("Firebase site novo…");
  const novoRaw = fetchFirebaseBackup("imediato-seguros-site-novo");
  console.log("Firebase legado…");
  const legadoRaw = fetchFirebaseBackup("leads-imediato-seguros");
  const novoIdx = indexNovoFirebase(novoRaw);
  const legadoIdx = indexLegadoFirebase(legadoRaw);
  console.log("Index novo leads:", Object.keys(novoRaw || {}).length);
  console.log("Index legado leads:", Object.keys(legadoRaw || {}).length);

  const cohorts = {};
  const joinStats = {
    matchedFirebase: 0,
    unmatched: 0,
    excludedTests: 0,
    byJoinKey: { espocrmLeadId: 0, espocrmOpportunityId: 0, gclid: 0, phone: 0, none: 0 },
  };

  const now = Date.now();

  for (const opp of opps) {
    if (isTestLead(opp)) {
      joinStats.excludedTests++;
      continue;
    }
    const site = siteBucket(opp.cWebpage);
    let cohort;
    let matched = false;
    let joinKey = "none";

    if (site === "novo") {
      let events = [];
      if (opp.cLeadId && novoIdx.byEspoLead.has(opp.cLeadId)) {
        events = novoIdx.byEspoLead.get(opp.cLeadId);
        joinKey = "espocrmLeadId";
      } else if (opp.id && novoIdx.byEspoOpp.has(opp.id)) {
        events = novoIdx.byEspoOpp.get(opp.id);
        joinKey = "espocrmOpportunityId";
      } else if (opp.cGclid && novoIdx.byGclid.has(opp.cGclid)) {
        events = novoIdx.byGclid.get(opp.cGclid);
        joinKey = "gclid";
      } else if (normalizePhone(opp.cCelular) && novoIdx.byPhone.has(normalizePhone(opp.cCelular))) {
        events = novoIdx.byPhone.get(normalizePhone(opp.cCelular));
        joinKey = "phone";
      }
      if (events.length) {
        matched = true;
        cohort = classifyNovoJourney(events);
      } else {
        cohort = etapaFallbackCohort("novo", opp.cEtapaFunil);
      }
    } else if (site === "legado" || site === "legado_or_unknown") {
      let events = [];
      if (opp.cGclid && legadoIdx.byGclid.has(opp.cGclid)) {
        events = legadoIdx.byGclid.get(opp.cGclid);
        joinKey = "gclid";
      } else if (normalizePhone(opp.cCelular) && legadoIdx.byPhone.has(normalizePhone(opp.cCelular))) {
        events = legadoIdx.byPhone.get(normalizePhone(opp.cCelular));
        joinKey = "phone";
      }
      if (events.length) {
        matched = true;
        cohort = classifyLegadoJourney(events);
      } else if (site === "legado_or_unknown") {
        cohort = "legado_webpage_vazio";
      } else {
        cohort = etapaFallbackCohort("legado", opp.cEtapaFunil);
      }
    } else {
      cohort = `other_${site}`;
    }

    joinStats.byJoinKey[joinKey]++;
    if (matched) joinStats.matchedFirebase++;
    else joinStats.unmatched++;

    if (!cohorts[cohort]) cohorts[cohort] = emptyCohort();
    const c = cohorts[cohort];
    c.opportunities++;

    const captureDate = opp.cDataDoLead || (opp.createdAt || "").slice(0, 10);
    const saleDate = opp.cDataVenda;
    const sold = Boolean(saleDate);
    if (sold) {
      c.sold++;
      const amt = Number(opp.amount) || 0;
      const premio = Number(opp.cPremioLiquido) || 0;
      c.amountSum += amt;
      c.premioSum += premio;
      const dts = daysBetween(captureDate, saleDate);
      if (dts != null && dts >= 0 && dts < 400) c.daysToSale.push(dts);
    }

    for (const d of MATURITY_DAYS) {
      const captureTs = Date.parse(captureDate);
      if (!Number.isFinite(captureTs)) continue;
      const ageDays = (now - captureTs) / 86400000;
      if (ageDays < d) continue;
      c.maturity[String(d)].eligible++;
      if (sold) {
        const dts = daysBetween(captureDate, saleDate);
        if (dts != null && dts <= d) c.maturity[String(d)].sold++;
      }
    }
  }

  // finalize metrics
  const summary = {};
  for (const [id, c] of Object.entries(cohorts)) {
    summary[id] = {
      opportunities: c.opportunities,
      sold: c.sold,
      saleRate: c.opportunities ? c.sold / c.opportunities : 0,
      amountSum: Math.round(c.amountSum * 100) / 100,
      amountAvgSold: c.sold ? Math.round((c.amountSum / c.sold) * 100) / 100 : null,
      premioSum: Math.round(c.premioSum * 100) / 100,
      medianDaysToSale: median(c.daysToSale),
      maturity: Object.fromEntries(
        Object.entries(c.maturity).map(([d, m]) => [
          d,
          {
            eligible: m.eligible,
            sold: m.sold,
            saleRate: m.eligible ? m.sold / m.eligible : null,
          },
        ]),
      ),
    };
  }

  const comparable = {
    modal: {
      novo_initial: summary.novo_modal_initial || null,
      novo_complete: summary.novo_modal_complete || null,
      legado_initial: summary.legado_modal_initial || null,
      legado_complete: summary.legado_modal_complete || null,
    },
    formNovoOnly: {
      telefone: summary.novo_form_telefone || null,
      pessoais: summary.novo_form_pessoais || null,
      veiculo: summary.novo_form_veiculo || null,
      calculo: summary.novo_form_calculo || null,
    },
  };

  const phoneOnlySold =
    (summary.novo_form_telefone?.sold || 0) + (summary.novo_modal_initial?.sold || 0);
  const phoneOnlyOpps =
    (summary.novo_form_telefone?.opportunities || 0) +
    (summary.novo_modal_initial?.opportunities || 0);
  const enrichedSold =
    (summary.novo_form_pessoais?.sold || 0) +
    (summary.novo_form_veiculo?.sold || 0) +
    (summary.novo_form_calculo?.sold || 0) +
    (summary.novo_modal_complete?.sold || 0);
  const enrichedOpps =
    (summary.novo_form_pessoais?.opportunities || 0) +
    (summary.novo_form_veiculo?.opportunities || 0) +
    (summary.novo_form_calculo?.opportunities || 0) +
    (summary.novo_modal_complete?.opportunities || 0);

  const out = {
    generatedAt: new Date().toISOString(),
    definition: {
      sale: "Opportunity.cDataVenda not empty",
      legacy: "read-only",
      note: "WA vs telefone agregados em novo_modal_* até Fase 4",
    },
    joinStats,
    cohorts: summary,
    comparable,
    hypothesis: {
      phoneOnly: {
        opportunities: phoneOnlyOpps,
        sold: phoneOnlySold,
        saleRate: phoneOnlyOpps ? phoneOnlySold / phoneOnlyOpps : null,
      },
      enriched: {
        opportunities: enrichedOpps,
        sold: enrichedSold,
        saleRate: enrichedOpps ? enrichedSold / enrichedOpps : null,
      },
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log("JSON:", OUT);
  console.log(JSON.stringify({ joinStats, cohorts: summary, hypothesis: out.hypothesis }, null, 2));

  // patch doc sections 2-3
  try {
    let md = fs.readFileSync(DOC, "utf8");
    const section = `
## 2. Descoberta Espo (Fase 1)

Ver snapshot: \`scripts/espo-ops/espo-discovery-snapshot.json\`.

Gate: **não** é possível separar formulário vs modal nem WA vs telefone só com campos Espo. Join Firebase obrigatório.

## 3. Classificação e métricas (Fases 2–3)

Gerado em: ${out.generatedAt}

### Join

| Métrica | Valor |
|---|---:|
| Opportunities analisadas (após excluir testes) | ${Object.values(summary).reduce((a, c) => a + c.opportunities, 0)} |
| Match Firebase | ${joinStats.matchedFirebase} |
| Sem match (fallback Espo) | ${joinStats.unmatched} |
| Testes excluídos | ${joinStats.excludedTests} |

### Placar por coorte (venda = \`cDataVenda\`)

| Coorte | Opps | Vendidas | Taxa | Comissão Σ | Dias medianos até venda |
|---|---:|---:|---:|---:|---:|
${Object.entries(summary)
  .sort((a, b) => b[1].opportunities - a[1].opportunities)
  .map(
    ([id, c]) =>
      `| \`${id}\` | ${c.opportunities} | ${c.sold} | ${(c.saleRate * 100).toFixed(1)}% | ${c.amountSum.toFixed(2)} | ${c.medianDaysToSale ?? "—"} |`,
  )
  .join("\n")}

### Hipótese: telefone-only vs enriquecido (site novo)

| Grupo | Opps | Vendidas | Taxa |
|---|---:|---:|---:|
| Só telefone (form initial + modal initial) | ${phoneOnlyOpps} | ${phoneOnlySold} | ${phoneOnlyOpps ? ((phoneOnlySold / phoneOnlyOpps) * 100).toFixed(1) : "—"}% |
| Enriquecido (form avançado + modal complete) | ${enrichedOpps} | ${enrichedSold} | ${enrichedOpps ? ((enrichedSold / enrichedOpps) * 100).toFixed(1) : "—"}% |

### Maturação 30/60/90 (quando elegível)

Detalhe por coorte no JSON \`scripts/espo-ops/sales-by-lead-type.json\` → \`cohorts.*.maturity\`.

### Leitura

- Comparável legado×novo com mais honestidade: coortes **modal**.
- Formulário multi-etapa: qualidade absoluta do site novo (legado sem paridade).
- Artefato completo sem PII: \`scripts/espo-ops/sales-by-lead-type.json\`.
`;
    md = md.replace(
      /## 2\. Descoberta Espo \(Fase 1\)[\s\S]*## 4\. Artefatos/,
      `${section}\n## 4. Artefatos`,
    );
    fs.writeFileSync(DOC, md, "utf8");
    console.log("Doc atualizado:", DOC);
  } catch (e) {
    console.warn("Falha ao atualizar doc:", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
