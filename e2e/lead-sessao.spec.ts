import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * Deduplicação durável (2026-10-25, projeto funil v2), lado do navegador:
 * o `leadId` do contato inicial fica no `sessionStorage` por telefone+ramo
 * e volta no próximo contato inicial da mesma aba; a `X-Idempotency-Key`
 * é o SHA-256 do corpo. Nenhuma chamada sai da página.
 */

async function prepararRotas(page: Page) {
  await page.route("**/api/validate/phone", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  );
  await page.route("**/api/lead", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: '{"leadId":"ld_sessao_1"}' })
  );
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
}

async function enviarTelefone(page: Page): Promise<Request> {
  await page.goto("/cotacao", { waitUntil: "domcontentloaded" });
  const chip = page.getByRole("button", { name: "Auto", exact: true });
  if ((await chip.count()) > 0) await chip.first().click();
  await page.locator("#telefone").pressSequentially("11987654321");
  const inicial = page.waitForRequest(
    (request) => request.url().endsWith("/api/lead") && request.postDataJSON()?.stage === "initial"
  );
  await page.getByRole("button", { name: "Receber cotação" }).click();
  return inicial;
}

test("contato inicial reaproveita o leadId da sessão depois de recarregar", async ({ page }) => {
  await prepararRotas(page);

  const primeiro = await enviarTelefone(page);
  expect(primeiro.postDataJSON().leadId).toBeUndefined();
  expect(primeiro.headers()["x-idempotency-key"]).toMatch(/^[0-9a-f]{64}$/);
  await expect(page.locator("#nome")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith("imediato_lead:")).length))
    .toBe(1);

  const segundo = await enviarTelefone(page);
  expect(segundo.postDataJSON().leadId).toBe("ld_sessao_1");
  expect(segundo.headers()["x-idempotency-key"]).not.toBe(primeiro.headers()["x-idempotency-key"]);
});

test("passo 2 preenchido antes da resposta do contato inicial leva o leadId", async ({ page }) => {
  await prepararRotas(page);
  await page.route("**/api/lead", async (route) => {
    if (route.request().postDataJSON()?.stage === "initial") await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"leadId":"ld_sessao_1"}' });
  });

  await enviarTelefone(page);
  await page.locator("#nome").fill("Teste Automatizado");
  await page.locator("#email").fill("teste.automatizado@example.com");
  const progresso = page.waitForRequest(
    (request) => request.url().endsWith("/api/lead") && request.postDataJSON()?.stage === "progress"
  );
  await page.getByRole("button", { name: "Falta pouco" }).click();
  expect((await progresso).postDataJSON().leadId).toBe("ld_sessao_1");
});
