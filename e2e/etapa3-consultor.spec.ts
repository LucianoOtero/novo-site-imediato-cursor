import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Etapa 3 do LeadForm (2026-10-19): placa, CEP e CPF obrigatórios para
 * "Calcular meu seguro" e a saída "Prefiro que um consultor entre em
 * contato".
 *
 * `/api/lead` e as validações externas são interceptados: nada chega ao
 * Firebase, ao EspoCRM nem ao Octadesk. Roda em localhost ou no preview
 * (`SITE_BASE_URL`). A conferência de RTDB/Espo DEV/Octadesk fica na
 * matriz manual de UAT.
 */

const CTA_CALCULAR = "Calcular meu seguro";
const SAIDA_CONSULTOR = "Prefiro que um consultor entre em contato";
/** CPF sintético com dígitos verificadores válidos. */
const CPF_VALIDO = "529.982.247-25";

type LeadPost = Record<string, unknown> & { stage?: string };

async function prepararPagina(
  page: Page,
  opcoes: { atrasoProgressoMs?: number; linhaDoTempo?: string[] } = {}
): Promise<LeadPost[]> {
  const posts: LeadPost[] = [];
  const okJson = (route: Route, body: Record<string, unknown> = { ok: true }) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/lead", async (route) => {
    const body = (route.request().postDataJSON() ?? {}) as LeadPost;
    posts.push(body);
    opcoes.linhaDoTempo?.push(`chegou:${body.stage}`);
    if (body.stage === "progress" && opcoes.atrasoProgressoMs) {
      await new Promise((resolve) => setTimeout(resolve, opcoes.atrasoProgressoMs));
    }
    await okJson(route, { leadId: "e2e-etapa3" });
    opcoes.linhaDoTempo?.push(`respondeu:${body.stage}`);
  });
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.route("**/api/validate/phone", (route) => okJson(route));
  await page.route("**/api/validate/email", (route) => okJson(route));
  await page.route("**/api/validate/cep", (route) => okJson(route));
  await page.route("**/api/validate/placa", (route) =>
    okJson(route, {
      ok: true,
      marca: "VW - VolksWagen",
      modelo: "Golf 1.6",
      anoFabricacao: "2000",
      anoModelo: "2000",
    })
  );

  await page.goto("/cotacao", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const chip = page.getByRole("button", { name: "Auto", exact: true });
  if ((await chip.count()) > 0) await chip.first().click();
  return posts;
}

async function irParaEtapa3(page: Page, posts: LeadPost[]) {
  await page.locator("#telefone").fill("11987654321");
  await page.getByRole("button", { name: "Receber cotação" }).click();
  await expect(page.locator("#nome")).toBeVisible({ timeout: 30_000 });
  // O `leadId` da resposta do `initial` é reaproveitado nas etapas seguintes.
  await expect.poll(() => posts.some((p) => p.stage === "initial")).toBe(true);
  await page.waitForTimeout(300);
  await page.locator("#nome").fill("Teste Etapa Tres");
  await page.locator("#email").fill("teste.etapa3@example.com");
  await page.getByRole("button", { name: "Falta pouco" }).click();
  await expect(page.locator("#placa")).toBeVisible({ timeout: 30_000 });
}

async function eventosDataLayer(page: Page, nome: string) {
  return page.evaluate(
    (evento) =>
      ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? []).filter(
        (item) => item && item.event === evento
      ),
    nome
  );
}

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test("etapa 3 mostra placa, CEP e CPF nessa ordem, sem 'Opcional'", async ({ page }) => {
  const posts = await prepararPagina(page);
  await irParaEtapa3(page, posts);

  const ids = await page.locator("form input[id]").evaluateAll((els) => els.map((el) => el.id));
  expect(ids.filter((id) => ["placa", "cep", "cpf"].includes(id))).toEqual(["placa", "cep", "cpf"]);
  await expect(page.getByText("Opcional", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Para calcular seu seguro agora É FUNDAMENTAL preencher os 3 dados abaixo.")).toBeVisible();
  await expect(page.getByText("Prefere não informar esses dados agora?")).toBeVisible();
  await expect(page.getByRole("button", { name: CTA_CALCULAR })).toBeVisible();
  await expect(page.getByRole("button", { name: SAIDA_CONSULTOR })).toBeVisible();
});

test("'Calcular' com campo vazio mostra erro, foca o campo e não avança", async ({ page }) => {
  const posts = await prepararPagina(page);
  await irParaEtapa3(page, posts);

  await page.getByRole("button", { name: CTA_CALCULAR }).click();
  await expect(page.getByText("Informe a placa para calcular")).toBeVisible();
  await expect(page.locator("#placa")).toBeFocused();

  await page.locator("#placa").fill("DBO7B72");
  await page.locator("#placa").blur();
  await page.getByRole("button", { name: CTA_CALCULAR }).click();
  await expect(page.getByText("Informe o CEP para calcular")).toBeVisible();
  await expect(page.locator("#cep")).toBeFocused();

  await page.locator("#cep").fill("01310-100");
  await page.locator("#cep").blur();
  await page.getByRole("button", { name: CTA_CALCULAR }).click();
  await expect(page.getByText("Informe o CPF para calcular")).toBeVisible();
  await expect(page.locator("#cpf")).toBeFocused();
  await expect(page.locator("#placa")).toBeVisible();
});

test("saída pelo consultor com campos vazios vai para /obrigado e registra a escolha", async ({ page }) => {
  const posts = await prepararPagina(page);
  await irParaEtapa3(page, posts);

  await page.getByRole("button", { name: SAIDA_CONSULTOR }).click();
  await page.waitForURL(/\/obrigado/, { timeout: 30_000 });

  await expect.poll(() => posts.some((p) => p.stage === "consultant_requested")).toBe(true);
  const consultor = posts.find((p) => p.stage === "consultant_requested");
  expect(consultor?.rpaChoice).toBe("consultor");
  expect(consultor?.leadId).toBe("e2e-etapa3");
  const complete = posts.find((p) => p.stage === "complete");
  expect(complete?.skipStrictValidation).toBe(true);
  expect(complete?.cpf ?? null).toBeNull();

  const escolhas = await eventosDataLayer(page, "form_quote_choice");
  expect(escolhas).toEqual([expect.objectContaining({ choice: "consultor", step: 3 })]);
  expect(await eventosDataLayer(page, "form_abandon")).toHaveLength(0);
});

test("saída pelo consultor com CPF pela metade não trava", async ({ page }) => {
  const posts = await prepararPagina(page);
  await irParaEtapa3(page, posts);

  await page.locator("#cpf").fill("529.982");
  await page.getByRole("button", { name: SAIDA_CONSULTOR }).click();
  await page.waitForURL(/\/obrigado/, { timeout: 30_000 });
  expect(posts.some((p) => p.stage === "complete" && p.skipStrictValidation === true)).toBe(true);
  await expect.poll(() => posts.some((p) => p.stage === "consultant_requested")).toBe(true);
  const consultor = posts.find((p) => p.stage === "consultant_requested");
  expect(consultor?.skipStrictValidation).toBe(true);
  expect(consultor?.cpf).toBe("529982");
});

test("escolha do consultor é o último POST: depois do 'progress' e do 'complete'", async ({ page }) => {
  const linhaDoTempo: string[] = [];
  const posts = await prepararPagina(page, { atrasoProgressoMs: 2_500, linhaDoTempo });
  await irParaEtapa3(page, posts);

  await page.getByRole("button", { name: SAIDA_CONSULTOR }).click();
  await expect.poll(() => linhaDoTempo.includes("chegou:consultant_requested"), { timeout: 15_000 }).toBe(true);
  const chegadaConsultor = linhaDoTempo.indexOf("chegou:consultant_requested");
  expect(linhaDoTempo.indexOf("respondeu:progress")).toBeGreaterThan(-1);
  expect(linhaDoTempo.indexOf("respondeu:progress")).toBeLessThan(chegadaConsultor);
  expect(linhaDoTempo.indexOf("respondeu:complete")).toBeGreaterThan(-1);
  expect(linhaDoTempo.indexOf("respondeu:complete")).toBeLessThan(chegadaConsultor);
});

test("CPF inválido abre o diálogo; 'Corrigir' foca o CPF e o botão do consultor sai", async ({ page }) => {
  const posts = await prepararPagina(page);
  await irParaEtapa3(page, posts);

  await page.locator("#placa").fill("DBO7B72");
  await page.locator("#placa").blur();
  await page.locator("#cep").fill("01310-100");
  await page.locator("#cpf").fill("111.111.111-11");
  await page.getByRole("button", { name: CTA_CALCULAR }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Corrigir" }).click();
  await expect(page.locator("#cpf")).toBeFocused();

  await page.getByRole("button", { name: CTA_CALCULAR }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: SAIDA_CONSULTOR }).click();
  await page.waitForURL(/\/obrigado/, { timeout: 30_000 });
});

test("dados completos seguem para a etapa 4", async ({ page }) => {
  const posts = await prepararPagina(page);
  await irParaEtapa3(page, posts);

  await page.locator("#placa").fill("DBO7B72");
  await page.locator("#placa").blur();
  await page.locator("#cep").fill("01310-100");
  await page.locator("#cpf").fill(CPF_VALIDO);
  await page.getByRole("button", { name: CTA_CALCULAR }).click();

  await expect(page.getByText("Como você quer receber sua cotação?")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => posts.filter((p) => p.stage === "progress").length).toBe(2);
});

test("consultor na etapa 4 também sai depois do 'complete'", async ({ page }) => {
  const linhaDoTempo: string[] = [];
  const posts = await prepararPagina(page, { linhaDoTempo });
  await irParaEtapa3(page, posts);

  await page.locator("#placa").fill("DBO7B72");
  await page.locator("#placa").blur();
  await page.locator("#cep").fill("01310-100");
  await page.locator("#cpf").fill(CPF_VALIDO);
  await page.getByRole("button", { name: CTA_CALCULAR }).click();
  await page
    .getByRole("button", { name: /Prefiro receber o cálculo completo depois|Falar com um consultor/ })
    .click({ timeout: 30_000 });
  await page.waitForURL(/\/obrigado/, { timeout: 30_000 });

  await expect.poll(() => linhaDoTempo.includes("chegou:consultant_requested"), { timeout: 15_000 }).toBe(true);
  expect(linhaDoTempo.indexOf("respondeu:complete")).toBeGreaterThan(-1);
  expect(linhaDoTempo.indexOf("respondeu:complete")).toBeLessThan(linhaDoTempo.indexOf("chegou:consultant_requested"));
  const escolhas = await eventosDataLayer(page, "form_quote_choice");
  expect(escolhas).toEqual([expect.objectContaining({ choice: "consultor", step: 4 })]);
});

type PlanoRpaMock = { valor: string; parcelamento?: string; valor_franquia?: string };

function progressoRpaSucesso(recomendado: PlanoRpaMock, alternativo: PlanoRpaMock) {
  return {
    status: "success",
    etapa_atual: 16,
    fase_atual: 16,
    mensagem: "Concluído",
    resultados_finais: {
      dados: { dados_finais: { plano_recomendado: recomendado, plano_alternativo: alternativo } },
    },
  };
}

/** Etapas 3 e 4 até "Quero calcular agora", com o RPA respondendo `progress` em toda consulta. */
async function calcularComRpa(page: Page, posts: LeadPost[], progress: Record<string, unknown>) {
  const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  await page.route("**/api/rpa/start", (route) => route.fulfill(json({ success: true, session_id: "e2e-rpa" })));
  await page.route("**/api/rpa/progress/**", (route) => route.fulfill(json({ progress })));
  await irParaEtapa3(page, posts);

  await page.locator("#placa").fill("DBO7B72");
  await page.locator("#placa").blur();
  await page.locator("#cep").fill("01310-100");
  await page.locator("#cpf").fill(CPF_VALIDO);
  await page.getByRole("button", { name: CTA_CALCULAR }).click();
  await page.getByRole("button", { name: "Quero calcular agora" }).click({ timeout: 30_000 });
}

async function rpaResultadoEnviado(posts: LeadPost[]) {
  await expect.poll(() => posts.some((p) => p.stage === "rpa_result"), { timeout: 15_000 }).toBe(true);
  const enviados = posts.filter((p) => p.stage === "rpa_result");
  expect(enviados).toHaveLength(1);
  return enviados[0].rpaResultado as Record<string, unknown>;
}

async function esperarCalculoManual(page: Page, posts: LeadPost[]) {
  await expect(page.getByRole("heading", { name: "Vamos calcular manualmente para você" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator("[data-oferta-id]")).toHaveCount(0);
  await expect(page.getByText("100,00")).toHaveCount(0);
  const rpaResultado = await rpaResultadoEnviado(posts);
  // Sem valor no payload: a Cloud Function cria a tarefa de cálculo manual e manda `calculo_manual` no Octadesk.
  expect(rpaResultado.status).toBe("falha");
  expect(rpaResultado.valorRecomendado ?? null).toBeNull();
  expect(rpaResultado.valorAlternativo ?? null).toBeNull();
}

test("plano do RPA com 'N/A' não vira cartão", async ({ page }) => {
  const posts = await prepararPagina(page);
  await calcularComRpa(
    page,
    posts,
    progressoRpaSucesso(
      { valor: "R$ 2.929,61", parcelamento: "anual", valor_franquia: "R$ 2.143,00" },
      { valor: "N/A", parcelamento: "N/A", valor_franquia: "N/A" }
    )
  );

  await expect(page.getByRole("heading", { name: "Encontramos uma opção para você" })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-oferta-id]")).toHaveCount(1);
  await expect(page.locator('[data-oferta-id="rpa-recomendado"]')).toBeVisible();
  await expect(page.getByText("N/A")).toHaveCount(0);
  const rpaResultado = await rpaResultadoEnviado(posts);
  expect(rpaResultado.status).toBe("sucesso");
  expect(rpaResultado.valorRecomendado).toBe("R$ 2.929,61");
});

test("preço genérico R$ 100,00 nos dois planos vai para o cálculo manual", async ({ page }) => {
  const posts = await prepararPagina(page);
  // Formato exato que o RPA devolveu em produção de 21 a 23/10/2026 (conta do Tô Segurado sem login).
  await calcularComRpa(
    page,
    posts,
    progressoRpaSucesso(
      { valor: "R$100,00", parcelamento: "anual", valor_franquia: "R$\u00a05.268,32" },
      { valor: "R$100,00", parcelamento: "anual", valor_franquia: "R$\u00a04.994,19" }
    )
  );
  await esperarCalculoManual(page, posts);
});

test("um plano com R$ 100,00 invalida o resultado inteiro", async ({ page }) => {
  const posts = await prepararPagina(page);
  await calcularComRpa(
    page,
    posts,
    progressoRpaSucesso(
      { valor: "R$ 100,00", parcelamento: "anual", valor_franquia: "R$ 5.268,32" },
      { valor: "R$ 4.100,00", parcelamento: "anual", valor_franquia: "R$ 4.994,19" }
    )
  );
  await esperarCalculoManual(page, posts);
});

test("preços abaixo de R$ 300,00 vão para o cálculo manual", async ({ page }) => {
  const posts = await prepararPagina(page);
  await calcularComRpa(
    page,
    posts,
    progressoRpaSucesso(
      { valor: "R$ 250,00", parcelamento: "anual", valor_franquia: "R$ 5.268,32" },
      { valor: "R$ 120,50", parcelamento: "anual", valor_franquia: "R$ 4.994,19" }
    )
  );
  await esperarCalculoManual(page, posts);
});

test("erro 9005 do RPA (login do Tô Segurado recusado) vai para o cálculo manual", async ({ page }) => {
  const posts = await prepararPagina(page);
  // Formato observado no smoke de produção de 23/10/2026 depois do hotfix do RPA.
  await calcularComRpa(page, posts, {
    status: "error",
    etapa_atual: 15,
    mensagem: "RPA error",
    resultados_finais: { rpa_finalizado: true, dados: { status: "error", dados_finais: [] } },
  });
  await esperarCalculoManual(page, posts);
});

test("dois preços reais viram dois cartões e o resultado vai como sucesso", async ({ page }) => {
  const posts = await prepararPagina(page);
  await calcularComRpa(
    page,
    posts,
    progressoRpaSucesso(
      { valor: "R$ 3.896,07", parcelamento: "anual", valor_franquia: "R$ 5.268,32" },
      { valor: "R$4.100,00", parcelamento: "anual", valor_franquia: "R$ 4.994,19" }
    )
  );

  await expect(page.getByRole("heading", { name: "Encontramos 2 opções para você" })).toBeVisible({ timeout: 60_000 });
  await expect(page.locator("[data-oferta-id]")).toHaveCount(2);
  await expect(page.locator('[data-oferta-id="rpa-recomendado"]')).toContainText("3.896,07");
  await expect(page.locator('[data-oferta-id="rpa-alternativo"]')).toContainText("4.100,00");
  const rpaResultado = await rpaResultadoEnviado(posts);
  expect(rpaResultado.status).toBe("sucesso");
  expect(rpaResultado.valorRecomendado).toBe("R$ 3.896,07");
  expect(rpaResultado.valorAlternativo).toBe("R$4.100,00");
});

test("'Voltar' da etapa 3 mantém nome e e-mail", async ({ page }) => {
  const posts = await prepararPagina(page);
  await irParaEtapa3(page, posts);

  await page.locator("#placa").fill("DBO7B72");
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.locator("#nome")).toHaveValue("Teste Etapa Tres");
  await expect(page.locator("#email")).toHaveValue("teste.etapa3@example.com");
  await page.getByRole("button", { name: "Falta pouco" }).click();
  await expect(page.locator("#placa")).toHaveValue("DBO7B72");
});
