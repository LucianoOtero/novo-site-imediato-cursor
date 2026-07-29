import fs from "node:fs";
import path from "node:path";

import { test, expect, request as pwRequest, type Page } from "@playwright/test";

/**
 * Plano de testes EspoCRM (2026-07-28) — 23 casos ponta a ponta no SITE
 * REAL (comparaseguroonline.com.br): 20 com cálculo automático + 3 com
 * "receber o cálculo depois". Identidade fixa (LUCIANO TESTE), só a
 * placa varia; o e-mail lrotero<PLACA>@gmail.com é a chave de auditoria.
 *
 * Após cada caso, consulta o EspoCRM dev pela API REST (X-Api-Key) para
 * validar Lead + Opportunity + campos do funil + Note + Task, grava um
 * snapshot no resultado incremental e apaga o Lead/Opportunity de teste
 * (o telefone é o mesmo em todos os casos; a limpeza garante que o
 * próximo caso exercite o caminho de criação, sem colidir no dedupe).
 *
 * Env:
 * - SITE_BASE_URL   (ex.: https://comparaseguroonline.com.br)
 * - ESPO_BASE_URL   (ex.: https://dev.flyingdonkeys.com.br)
 * - ESPO_API_KEY    (chave do api_dev)
 * - CASE_FILTER     (opcional; ex.: "1" roda só o caso 1 — piloto)
 */

const CASES_PATH = path.join(__dirname, "testes-espocrm.cases.json");
const OUT_JSON = path.join(__dirname, process.env.RESULT_FILE || "testes-espocrm.resultado.json");

const ESPO_BASE_URL = (process.env.ESPO_BASE_URL || "").replace(/\/$/, "");
const ESPO_API_KEY = process.env.ESPO_API_KEY || "";
const CASE_FILTER = process.env.CASE_FILTER ? process.env.CASE_FILTER.split(",").map((s) => s.trim()) : null;

interface Identidade {
  nome: string;
  ddd: string;
  celular: string;
  cpf: string;
  cep: string;
}
interface Caso {
  n: number;
  modo: "wait" | "consultor";
  placa: string;
  email: string;
  veiculoEsperado: string;
}

const manifest = JSON.parse(fs.readFileSync(CASES_PATH, "utf-8")) as {
  identidade: Identidade;
  casos: Caso[];
};
const identidade = manifest.identidade;
const casos = manifest.casos.filter((c) => !CASE_FILTER || CASE_FILTER.includes(String(c.n)));

type Desfecho =
  | "sucesso"
  | "manual"
  | "consultor_ok"
  | "erro_infra"
  | "bloqueado_site"
  | "rpa_desabilitado"
  | "timeout"
  | "erro";

interface CrmSnapshot {
  leadEncontrado: boolean;
  leadId: string | null;
  opportunityId: string | null;
  lead: Record<string, unknown> | null;
  opportunity: Record<string, unknown> | null;
  tasks: Array<Record<string, unknown>>;
  notesCount: number | null;
  erro?: string;
}

interface Resultado {
  n: number;
  placa: string;
  email: string;
  modo: string;
  veiculoEsperado: string;
  desfecho: Desfecho;
  valorRecomendado: string | null;
  valorAlternativo: string | null;
  detalhe: string | null;
  duracaoS: number;
  rpaStartHttp: number | null;
  rpaSessionId: string | null;
  rpaPolls: number;
  rpaLastStatus: string | null;
  rpaLastMensagem: string | null;
  crm: CrmSnapshot | null;
  purga: string | null;
  cleanup: string | null;
}

const resultados: Resultado[] = [];

function writeResults() {
  const contagem = resultados.reduce<Record<string, number>>((acc, r) => {
    acc[r.desfecho] = (acc[r.desfecho] ?? 0) + 1;
    return acc;
  }, {});
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      { meta: { geradoEm: new Date().toISOString(), n: resultados.length, contagem }, casos: resultados },
      null,
      2,
    ),
    "utf-8",
  );
}

async function fill(page: Page, id: string, value: string) {
  const input = page.locator(`#${id}`);
  await input.fill(value);
}

const LEAD_FIELDS = [
  "id",
  "name",
  "firstName",
  "emailAddress",
  "cCelular",
  "cCpftext",
  "addressPostalCode",
  "cPlaca",
  "cMarca",
  "cVeiculo",
  "cAnoFab",
  "cAnoMod",
  "source",
  "cWebpage",
  "cDataDoLead",
  "cUtmSource",
  "cEtapaFunil",
  "cEscolhaCalculo",
  "cStatusCalculo",
  "cValorRecomendado",
  "cValorAlternativo",
  "description",
];
const OPP_FIELDS = [
  "id",
  "name",
  "stage",
  "cLeadId",
  "cWebpage",
  "cEmailAdress",
  "cCEP",
  "cCpftext",
  "cCelular",
  "cPlaca",
  "cMarca",
  "cEtapaFunil",
  "cEscolhaCalculo",
  "cStatusCalculo",
  "cValorRecomendado",
  "cValorAlternativo",
];

async function consultarCrm(email: string, modo: string): Promise<CrmSnapshot> {
  const ctx = await pwRequest.newContext({
    baseURL: ESPO_BASE_URL,
    extraHTTPHeaders: { "X-Api-Key": ESPO_API_KEY, "Content-Type": "application/json" },
  });
  const snap: CrmSnapshot = {
    leadEncontrado: false,
    leadId: null,
    opportunityId: null,
    lead: null,
    opportunity: null,
    tasks: [],
    notesCount: null,
  };
  try {
    // Poll: espera a Cloud Function terminar (dedupe/criação + campos do
    // funil) — até ~90s. Terminal = cEtapaFunil num estado final.
    const deadline = Date.now() + 90_000;
    let lead: Record<string, unknown> | null = null;
    while (Date.now() < deadline) {
      const params = new URLSearchParams({
        maxSize: "1",
        "where[0][type]": "equals",
        "where[0][attribute]": "emailAddress",
        "where[0][value]": email,
      });
      const r = await ctx.get(`/api/v1/Lead?${params.toString()}`);
      if (r.ok()) {
        const body = (await r.json()) as { list?: Array<Record<string, unknown>> };
        const found = body.list && body.list[0];
        if (found) {
          lead = found;
          const etapa = String(found.cEtapaFunil || "");
          const terminalWait = etapa === "Cálculo concluído" || etapa === "Cálculo manual pendente";
          const terminalConsult = etapa === "Cálculo manual pendente" && found.cEscolhaCalculo === "Receber depois";
          if ((modo === "wait" && terminalWait) || (modo === "consultor" && terminalConsult)) break;
        }
      }
      await new Promise((res) => setTimeout(res, 4000));
    }
    if (!lead) {
      snap.erro = "Lead não encontrado no EspoCRM em 90s";
      return snap;
    }
    snap.leadEncontrado = true;
    snap.leadId = String(lead.id);
    // Ficha completa do Lead.
    const leadFull = await ctx.get(`/api/v1/Lead/${lead.id}`);
    const leadObj = leadFull.ok() ? ((await leadFull.json()) as Record<string, unknown>) : lead;
    snap.lead = Object.fromEntries(LEAD_FIELDS.map((k) => [k, leadObj[k] ?? null]));

    // Opportunity via cLeadId.
    const oppParams = new URLSearchParams({
      maxSize: "1",
      "where[0][type]": "equals",
      "where[0][attribute]": "cLeadId",
      "where[0][value]": String(lead.id),
    });
    const oppR = await ctx.get(`/api/v1/Opportunity?${oppParams.toString()}`);
    if (oppR.ok()) {
      const oppBody = (await oppR.json()) as { list?: Array<Record<string, unknown>> };
      const opp = oppBody.list && oppBody.list[0];
      if (opp) {
        snap.opportunityId = String(opp.id);
        snap.opportunity = Object.fromEntries(OPP_FIELDS.map((k) => [k, opp[k] ?? null]));
      }
    }

    // Tasks vinculadas ao Lead.
    const taskParams = new URLSearchParams({
      maxSize: "5",
      "where[0][type]": "equals",
      "where[0][attribute]": "parentId",
      "where[0][value]": String(lead.id),
    });
    const taskR = await ctx.get(`/api/v1/Task?${taskParams.toString()}`);
    if (taskR.ok()) {
      const taskBody = (await taskR.json()) as { list?: Array<Record<string, unknown>>; total?: number };
      snap.tasks = (taskBody.list || []).map((t) => ({
        name: t.name,
        status: t.status,
        dateEnd: t.dateEnd,
        assignedUserName: t.assignedUserName,
      }));
    }

    // Contagem de Notes no Stream do Lead.
    const noteR = await ctx.get(`/api/v1/Lead/${lead.id}/stream?maxSize=20`);
    if (noteR.ok()) {
      const noteBody = (await noteR.json()) as { total?: number; list?: unknown[] };
      snap.notesCount = noteBody.total ?? (noteBody.list ? noteBody.list.length : null);
    }
  } catch (error) {
    snap.erro = `Falha na consulta ao CRM: ${(error as Error).message}`;
  } finally {
    await ctx.dispose();
  }
  return snap;
}

async function limparCrm(snap: CrmSnapshot): Promise<string> {
  const ctx = await pwRequest.newContext({
    baseURL: ESPO_BASE_URL,
    extraHTTPHeaders: { "X-Api-Key": ESPO_API_KEY, "Content-Type": "application/json" },
  });
  const acoes: string[] = [];
  try {
    if (snap.opportunityId) {
      const r = await ctx.delete(`/api/v1/Opportunity/${snap.opportunityId}`);
      acoes.push(`opp ${snap.opportunityId}: ${r.status()}`);
    }
    if (snap.leadId) {
      const r = await ctx.delete(`/api/v1/Lead/${snap.leadId}`);
      acoes.push(`lead ${snap.leadId}: ${r.status()}`);
    }
  } catch (error) {
    acoes.push(`erro: ${(error as Error).message}`);
  } finally {
    await ctx.dispose();
  }
  return acoes.join("; ");
}

/**
 * Purga QUALQUER Lead/Opportunity com o telefone de teste antes de cada
 * caso — o telefone é o mesmo em todos os casos, então o dedupe por
 * telefone da Cloud Function reaproveitaria um lead de um caso anterior.
 * Limpar de antemão garante que cada caso exercite a criação do zero.
 */
async function purgarPorTelefone(celular: string): Promise<string> {
  const ctx = await pwRequest.newContext({
    baseURL: ESPO_BASE_URL,
    extraHTTPHeaders: { "X-Api-Key": ESPO_API_KEY, "Content-Type": "application/json" },
  });
  const acoes: string[] = [];
  try {
    for (const entity of ["Opportunity", "Lead"]) {
      const params = new URLSearchParams({
        maxSize: "50",
        "where[0][type]": "equals",
        "where[0][attribute]": "cCelular",
        "where[0][value]": celular,
      });
      const r = await ctx.get(`/api/v1/${entity}?${params.toString()}`);
      if (r.ok()) {
        const body = (await r.json()) as { list?: Array<{ id: string }> };
        for (const item of body.list || []) {
          const del = await ctx.delete(`/api/v1/${entity}/${item.id}`);
          acoes.push(`${entity} ${item.id}: ${del.status()}`);
        }
      }
    }
  } catch (error) {
    acoes.push(`erro: ${(error as Error).message}`);
  } finally {
    await ctx.dispose();
  }
  return acoes.length ? acoes.join("; ") : "nada a purgar";
}

test.describe.configure({ mode: "serial" });
test.afterAll(() => writeResults());

for (const caso of casos) {
  test(`EspoCRM E2E — caso ${caso.n} (${caso.placa}, ${caso.modo})`, async ({ page }) => {
    const started = Date.now();
    const rpa = {
      startHttp: null as number | null,
      sessionId: null as string | null,
      polls: 0,
      lastStatus: null as string | null,
      lastMensagem: null as string | null,
      startFailed: false,
    };
    page.on("response", async (resp) => {
      const url = resp.url();
      try {
        if (url.includes("/api/rpa/start")) {
          rpa.startHttp = resp.status();
          const body = (await resp.json().catch(() => ({}))) as { sessionId?: string; session_id?: string };
          const sid = body?.session_id ?? body?.sessionId;
          if (sid) rpa.sessionId = sid;
        } else if (url.includes("/api/rpa/progress/")) {
          rpa.polls += 1;
          const body = (await resp.json().catch(() => ({}))) as {
            progress?: { status?: string; mensagem?: string };
          };
          if (body?.progress?.status) rpa.lastStatus = body.progress.status;
          if (body?.progress?.mensagem) rpa.lastMensagem = body.progress.mensagem;
        }
      } catch {
        /* ignore */
      }
    });
    page.on("requestfailed", (req) => {
      if (req.url().includes("/api/rpa/")) rpa.startFailed = true;
    });

    let desfecho: Desfecho = "erro";
    let valorRecomendado: string | null = null;
    let valorAlternativo: string | null = null;
    let detalhe: string | null = null;

    // Slate limpa: remove qualquer lead/opp do telefone de teste antes deste caso.
    const purga = await purgarPorTelefone(`${identidade.ddd}${identidade.celular}`);

    await page.goto("/cotacao");
    const chip = page.getByRole("button", { name: "Auto", exact: true });
    if ((await chip.count()) > 0) await chip.first().click();

    // Passo 1
    await fill(page, "ddd", identidade.ddd);
    await fill(page, "celular", identidade.celular);
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 2
    await expect(page.locator("#nome")).toBeVisible();
    await fill(page, "nome", identidade.nome);
    await fill(page, "email", caso.email);
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 3
    await expect(page.locator("#cpf")).toBeVisible();
    await fill(page, "cpf", identidade.cpf);
    await fill(page, "cep", identidade.cep);
    await fill(page, "placa", caso.placa);
    await page.locator("#placa").blur();
    await page.waitForTimeout(8000); // Placa Fipe pode levar ~5–6s no cold start
    await page.getByRole("button", { name: "Continuar" }).click();

    const dialogProsseguir = page.getByRole("button", { name: "Prosseguir assim mesmo" });
    if (await dialogProsseguir.isVisible().catch(() => false)) {
      await dialogProsseguir.click();
    }

    if (caso.modo === "consultor") {
      const btn = page.getByRole("button", { name: "Prefiro receber o cálculo completo depois" });
      await expect(btn).toBeVisible({ timeout: 20_000 });
      await btn.click();
      // Sucesso = navegou para /obrigado.
      try {
        await page.waitForURL(/\/obrigado/, { timeout: 30_000 });
        desfecho = "consultor_ok";
      } catch {
        desfecho = "erro";
        detalhe = "Não navegou para /obrigado após escolher consultor";
      }
    } else {
      const btnAguardar = page.getByRole("button", { name: "Quero calcular agora" });
      await expect(btnAguardar).toBeVisible({ timeout: 20_000 });
      // O botão só habilita quando as validações assíncronas terminam E o
      // veículo é identificado pela placa (rpaDisabledReason em LeadForm).
      // Aguarda até 45s por essa habilitação antes de concluir desabilitado.
      const enableDeadline = Date.now() + 45_000;
      while ((await btnAguardar.isDisabled().catch(() => true)) && Date.now() < enableDeadline) {
        await page.waitForTimeout(2000);
      }
      if (await btnAguardar.isDisabled().catch(() => false)) {
        desfecho = "rpa_desabilitado";
        // Veículo não identificado pela placa é o motivo esperado aqui (o
        // site não roda o cálculo automático sem marca/modelo).
        const infoVisivel = await page
          .getByText(/dados|incompleto|veículo/i)
          .first()
          .isVisible()
          .catch(() => false);
        detalhe = `Botão 'Quero calcular agora' seguiu desabilitado após 45s (veículo não identificado pela placa? infoVisivel=${infoVisivel})`;
      } else {
        await btnAguardar.click();
        const sucesso = page.getByRole("heading", { name: "Encontramos 2 opções para você" });
        const manual = page.getByRole("heading", { name: "Vamos calcular manualmente para você" });
        const deadline = Date.now() + 11 * 60 * 1000;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (await sucesso.isVisible().catch(() => false)) {
            desfecho = "sucesso";
            const rec = page
              .locator("div.flex.items-center.justify-between", { hasText: "Recomendado" })
              .first()
              .locator("span.font-display")
              .first();
            const alt = page
              .locator("div.flex.items-center.justify-between", { hasText: "Alternativo" })
              .first()
              .locator("span.font-display")
              .first();
            valorRecomendado = (await rec.count()) ? ((await rec.textContent()) || "").trim() || null : null;
            valorAlternativo = (await alt.count()) ? ((await alt.textContent()) || "").trim() || null : null;
            break;
          }
          if (await manual.isVisible().catch(() => false)) {
            const startOk = rpa.startHttp !== null && rpa.startHttp >= 200 && rpa.startHttp < 300;
            const chegouAoRpa = startOk && !!rpa.sessionId && !rpa.startFailed;
            desfecho = chegouAoRpa ? "manual" : "erro_infra";
            detalhe = chegouAoRpa
              ? "Site exibiu cálculo manual após polling do RPA"
              : `Falha de infra ao chamar o RPA (start=${rpa.startHttp}, sid=${rpa.sessionId}, reqFailed=${rpa.startFailed})`;
            break;
          }
          if (Date.now() > deadline) {
            desfecho = "timeout";
            detalhe = "Sem desfecho em 11 min";
            break;
          }
          await page.waitForTimeout(2000);
        }
      }
    }

    // Espera curta para a Cloud Function processar o último estágio.
    await page.waitForTimeout(8000);
    const crm = await consultarCrm(caso.email, caso.modo);
    const cleanup = crm.leadEncontrado ? await limparCrm(crm) : "sem lead para limpar";

    resultados.push({
      n: caso.n,
      placa: caso.placa,
      email: caso.email,
      modo: caso.modo,
      veiculoEsperado: caso.veiculoEsperado,
      desfecho,
      valorRecomendado,
      valorAlternativo,
      detalhe,
      duracaoS: Math.round((Date.now() - started) / 1000),
      rpaStartHttp: rpa.startHttp,
      rpaSessionId: rpa.sessionId,
      rpaPolls: rpa.polls,
      rpaLastStatus: rpa.lastStatus,
      rpaLastMensagem: rpa.lastMensagem,
      crm,
      purga,
      cleanup,
    });
    writeResults();
  });
}
