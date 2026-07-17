import fs from "node:fs";
import path from "node:path";

import { test, expect, type Page, type Route } from "@playwright/test";

/**
 * Etapa 3 do teste de fidelidade RPA — executa os 50 casos no SITE NOVO.
 *
 * Para cada caso do manifesto `selecao_50.json` (mesma seleção usada na
 * bateria local), preenche os 4 passos do `LeadForm` em `/cotacao`, escolhe
 * "Aguardar o cálculo" e captura o resultado (2 planos ou cálculo manual),
 * gravando em `resultado_site.json` / `.csv` no repo do RPA (ao lado de
 * `resultado_local.json`, para o comparador cruzar as duas pontas).
 *
 * Interceptação (SÓ no teste, não altera o site nem o backend):
 * - `/api/validate/{phone,email,cep,placa}` -> `{ ok: true }`. Isso evita
 *   que a validação em tempo real do site (APILayer/ViaCEP/Placa Fipe,
 *   sujeita a chaves de ambiente) bloqueie o avanço e force o diálogo
 *   "Corrigir/Prosseguir" (que PULA o RPA). Não afeta a fidelidade: o site
 *   envia ao RPA apenas placa/cpf/cep/etc. como string — o backend faz seus
 *   próprios lookups independentemente do que essas rotas retornam.
 *
 * O CORS da chamada client-side para `rpaimediatoseguros.com.br` é resolvido
 * pelo `--disable-web-security` do Chromium (ver playwright.config.ts).
 */

const RPA_DATA_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "imediatoseguros-rpa-playwright",
  "data",
  "renovacao_teste_site_luciano",
);
const MANIFEST_PATH = path.join(RPA_DATA_DIR, "selecao_50.json");
const OUT_JSON = path.join(RPA_DATA_DIR, "resultado_site.json");
const OUT_CSV = path.join(RPA_DATA_DIR, "resultado_site.csv");

const RAMO_CHIP_LABEL: Record<string, string> = {
  auto: "Auto",
  moto: "Moto",
  caminhao: "Caminhão",
  uber: "Uber",
  taxi: "Táxi",
  utilitario: "Utilitário",
};

interface ManifestCaso {
  id: string;
  ramo: string;
  tipo_veiculo: string;
  session_id: string;
  formFields: {
    nome?: string;
    cpf?: string;
    ddd?: string;
    celular?: string;
    email?: string;
    cep?: string;
    placa?: string;
    ramo?: string;
    veiculoMarca?: string;
    veiculoModelo?: string;
    veiculoAnoFabricacao?: string;
    veiculoAnoModelo?: string;
  };
}

type SiteStatus =
  | "success"
  | "cotacao_manual"
  | "erro_infra"
  | "bloqueado_site"
  | "rpa_desabilitado"
  | "timeout"
  | "erro";

interface SiteResultado {
  id: string;
  ramo: string;
  status: SiteStatus;
  valor_recomendado: string | null;
  valor_alternativo: string | null;
  detalhe: string | null;
  duracao_s: number;
  rpa_start_http: number | null;
  rpa_session_id: string | null;
  rpa_progress_polls: number;
  rpa_last_status: string | null;
  rpa_last_mensagem: string | null;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8")) as {
  casos: ManifestCaso[];
};

const resultados: SiteResultado[] = [];

function writeResults() {
  const contagem = resultados.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const out = {
    meta: {
      fonte: "execucao no site novo (Playwright, localhost)",
      geradoEm: new Date().toISOString(),
      n: resultados.length,
      contagem,
    },
    casos: resultados,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf-8");

  const campos = [
    "id",
    "ramo",
    "status",
    "valor_recomendado",
    "valor_alternativo",
    "duracao_s",
    "rpa_start_http",
    "rpa_session_id",
    "rpa_progress_polls",
    "rpa_last_status",
    "rpa_last_mensagem",
    "detalhe",
  ];
  const linhas = [campos.join(",")];
  for (const r of resultados) {
    linhas.push(
      campos
        .map((c) => {
          const v = (r as unknown as Record<string, unknown>)[c];
          const s = v === null || v === undefined ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    );
  }
  fs.writeFileSync(OUT_CSV, "\uFEFF" + linhas.join("\n"), "utf-8");
}

async function stubValidations(page: Page, ff: ManifestCaso["formFields"]) {
  const okJson = (route: Route, body: Record<string, unknown> = { ok: true }) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/validate/phone", (route) => okJson(route));
  await page.route("**/api/validate/email", (route) => okJson(route));
  await page.route("**/api/validate/cep", (route) => okJson(route));
  // A Placa Fipe local depende de chave de ambiente; no teste devolvemos a
  // ficha do veiculo do proprio caso (do manifesto) para o formulario
  // preencher veiculoMarca/Modelo/Ano e o payload do RPA levar o bloco de
  // veiculo (marca/modelo/ano) — sem isso o backend usa veiculo padrao.
  await page.route("**/api/validate/placa", (route) =>
    okJson(route, {
      ok: true,
      marca: ff.veiculoMarca,
      modelo: ff.veiculoModelo,
      anoFabricacao: ff.veiculoAnoFabricacao,
      anoModelo: ff.veiculoAnoModelo,
    }),
  );
}

async function fillStep(page: Page, id: string, value: string | undefined) {
  if (!value) return;
  const input = page.locator(`#${id}`);
  await input.fill(value);
}

async function capturarValor(page: Page, label: "Recomendado" | "Alternativo"): Promise<string | null> {
  // Cabeçalho do cartão: <div ...><span>...{label}</span><span class="font-display ...">{valor}</span></div>
  const header = page.locator("div.flex.items-center.justify-between", { hasText: label }).first();
  if ((await header.count()) === 0) return null;
  const valorSpan = header.locator("span.font-display").first();
  if ((await valorSpan.count()) === 0) return null;
  const txt = (await valorSpan.textContent())?.trim() ?? "";
  return txt || null;
}

test.describe.configure({ mode: "serial" });

test.afterAll(() => {
  writeResults();
});

for (const caso of manifest.casos) {
  test(`fidelidade RPA — ${caso.id}`, async ({ page }) => {
    const started = Date.now();

    // --- Captura da rede do RPA (distingue manual real de falha de infra) ---
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
          const body = (await resp.json().catch(() => ({}))) as {
            sessionId?: string;
            session_id?: string;
          };
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

    const registrar = (status: SiteStatus, extra: Partial<SiteResultado> = {}) => {
      resultados.push({
        id: caso.id,
        ramo: caso.ramo,
        status,
        valor_recomendado: extra.valor_recomendado ?? null,
        valor_alternativo: extra.valor_alternativo ?? null,
        detalhe: extra.detalhe ?? null,
        duracao_s: Math.round((Date.now() - started) / 1000),
        rpa_start_http: rpa.startHttp,
        rpa_session_id: rpa.sessionId,
        rpa_progress_polls: rpa.polls,
        rpa_last_status: rpa.lastStatus,
        rpa_last_mensagem: rpa.lastMensagem,
      });
      // Grava incrementalmente para não perder progresso numa bateria longa.
      writeResults();
    };

    const ff = caso.formFields;
    await stubValidations(page, ff);

    await page.goto("/cotacao");

    // Seleciona o ramo (chip). caminhao -> "Caminhão".
    const chipLabel = RAMO_CHIP_LABEL[caso.ramo] ?? "Auto";
    const chip = page.getByRole("button", { name: chipLabel, exact: true });
    if ((await chip.count()) > 0) {
      await chip.first().click();
    }

    // Passo 1 — DDD + Celular
    await fillStep(page, "ddd", ff.ddd);
    await fillStep(page, "celular", ff.celular);
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 2 — Nome + E-mail
    await expect(page.locator("#nome")).toBeVisible();
    await fillStep(page, "nome", ff.nome);
    await fillStep(page, "email", ff.email);
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 3 — CPF + CEP + Placa
    await expect(page.locator("#cpf")).toBeVisible();
    await fillStep(page, "cpf", ff.cpf);
    await fillStep(page, "cep", ff.cep);
    await fillStep(page, "placa", ff.placa);
    await page.locator("#placa").blur();
    // Aguarda o onBlur da placa (stub) preencher veiculoMarca/Modelo/Ano
    // antes de prosseguir — esses campos entram no payload do RPA.
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Continuar" }).click();

    // Se o diálogo "Corrigir/Prosseguir" aparecer, o site nao chega ao RPA.
    const dialogProsseguir = page.getByRole("button", { name: "Prosseguir assim mesmo" });
    if (await dialogProsseguir.isVisible().catch(() => false)) {
      registrar("bloqueado_site", { detalhe: "Diálogo Corrigir/Prosseguir — não chegou ao passo 4" });
      return;
    }

    // Passo 4 — escolher "Aguardar o cálculo"
    const btnAguardar = page.getByRole("button", { name: "Aguardar o cálculo" });
    await expect(btnAguardar).toBeVisible({ timeout: 15_000 });
    // Criterios de habilitacao (2026-07-17): o botao fica DESABILITADO para
    // caminhao ou quando faltam dados validados. Nesse caso o site nao chama
    // o RPA por design — registramos e seguimos.
    if (await btnAguardar.isDisabled().catch(() => false)) {
      registrar("rpa_desabilitado", {
        detalhe: `Botão 'Aguardar o cálculo' desabilitado (ramo=${caso.ramo}: caminhão ou dados incompletos)`,
      });
      return;
    }
    await btnAguardar.click();

    // Aguarda desfecho: sucesso (2 cartões) ou cálculo manual.
    const sucesso = page.getByRole("heading", { name: "Encontramos 2 opções para você" });
    const manual = page.getByRole("heading", { name: "Vamos calcular manualmente para você" });

    const deadline = Date.now() + 11 * 60 * 1000; // 11 min (polling do site vai até 10)
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (await sucesso.isVisible().catch(() => false)) {
        // Sucesso = percorreu todas as etapas e apresentou o calculo final
        // (alvo do teste). Os valores capturados abaixo sao apenas
        // INFORMATIVOS: a diferenca de valor local vs. site e esperada
        // (o site estima parte do perfil quando o payload e minimo) e NAO
        // conta como falha na comparacao (ver scripts/comparar_resultados.py).
        const rec = await capturarValor(page, "Recomendado");
        const alt = await capturarValor(page, "Alternativo");
        registrar("success", { valor_recomendado: rec, valor_alternativo: alt });
        return;
      }
      if (await manual.isVisible().catch(() => false)) {
        // A UI mostra a MESMA tela de "cálculo manual" para qualquer erro,
        // inclusive falha de rede/CORS ao chamar o RPA. Usamos a rede
        // capturada para distinguir cálculo manual real de erro de infra.
        const startOk = rpa.startHttp !== null && rpa.startHttp >= 200 && rpa.startHttp < 300;
        const chegouAoRpa = startOk && !!rpa.sessionId && !rpa.startFailed;
        if (!chegouAoRpa) {
          registrar("erro_infra", {
            detalhe: `Falha ao chamar o RPA (start http=${rpa.startHttp}, sessionId=${rpa.sessionId}, requestfailed=${rpa.startFailed}). NAO e cotacao manual real.`,
          });
        } else {
          registrar("cotacao_manual", {
            detalhe: "Site exibiu 'Vamos calcular manualmente' apos polling do RPA",
          });
        }
        return;
      }
      if (Date.now() > deadline) {
        registrar("timeout", { detalhe: "Sem desfecho em 11 min" });
        return;
      }
      await page.waitForTimeout(2000);
    }
  });
}
