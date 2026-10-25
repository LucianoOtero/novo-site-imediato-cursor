import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa 1 do LeadForm (2026-10-25, projeto funil v2): um só campo
 * `(11) 98765-4321`. Digitação com máscara, Backspace atravessando a
 * máscara, colagem e preenchimento automático com +55. Nenhuma chamada
 * sai da página (validações interceptadas).
 */

async function abrirFormulario(page: Page) {
  await page.route("**/api/validate/phone", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  );
  await page.route("**/api/lead", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"leadId":"ld_e2e"}' })
  );
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.goto("/cotacao", { waitUntil: "domcontentloaded" });
  const chip = page.getByRole("button", { name: "Auto", exact: true });
  if ((await chip.count()) > 0) await chip.first().click();
  await expect(page.locator("#telefone")).toBeVisible();
}

/** Simula colagem (`insertFromPaste`) ou preenchimento automático (sem `inputType`). */
async function inserirSemDigitar(page: Page, valor: string, inputType: "insertFromPaste" | null) {
  await page.locator("#telefone").focus();
  await page.evaluate(
    ({ valor, inputType }) => {
      const input = document.querySelector<HTMLInputElement>("#telefone")!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, valor);
      const evento = inputType
        ? new InputEvent("input", { bubbles: true, inputType })
        : new Event("input", { bubbles: true });
      input.dispatchEvent(evento);
    },
    { valor, inputType }
  );
}

test.describe("Telefone em campo único", () => {
  test("digitação aplica a máscara passo a passo", async ({ page }) => {
    await abrirFormulario(page);
    const campo = page.locator("#telefone");
    await campo.pressSequentially("1");
    await expect(campo).toHaveValue("(1");
    await page.keyboard.type("1");
    await expect(campo).toHaveValue("(11");
    await page.keyboard.type("9");
    await expect(campo).toHaveValue("(11) 9");
    await page.keyboard.type("87654321");
    await expect(campo).toHaveValue("(11) 98765-4321");
  });

  test("dígitos além de 11 são ignorados", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#telefone").pressSequentially("119876543210");
    await expect(page.locator("#telefone")).toHaveValue("(11) 98765-4321");
  });

  test("DDD 55 digitado não é confundido com o código do país", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#telefone").pressSequentially("55987654321");
    await expect(page.locator("#telefone")).toHaveValue("(55) 98765-4321");
  });

  test("Backspace atravessa a máscara", async ({ page }) => {
    await abrirFormulario(page);
    const campo = page.locator("#telefone");
    await campo.pressSequentially("119");
    await expect(campo).toHaveValue("(11) 9");
    await page.keyboard.press("Backspace");
    await expect(campo).toHaveValue("(11");
    await page.keyboard.press("Backspace");
    await expect(campo).toHaveValue("(1");
    await page.keyboard.press("Backspace");
    await expect(campo).toHaveValue("");
  });

  test("telefone colado com +55 é aceito", async ({ page }) => {
    await abrirFormulario(page);
    await inserirSemDigitar(page, "+55 (21) 91234-5678", "insertFromPaste");
    await expect(page.locator("#telefone")).toHaveValue("(21) 91234-5678");
  });

  test("preenchimento automático sem máscara é formatado", async ({ page }) => {
    await abrirFormulario(page);
    await inserirSemDigitar(page, "11987654321", null);
    await expect(page.locator("#telefone")).toHaveValue("(11) 98765-4321");
  });

  test("celular incompleto mostra erro e não avança", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#telefone").pressSequentially("1198765");
    await page.getByRole("button", { name: "Receber cotação" }).click();
    await expect(page.locator("#telefone-error")).toBeVisible();
    await expect(page.locator("#telefone")).toBeFocused();
  });

  test("número completo avança para a etapa 2", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#telefone").pressSequentially("11987654321");
    await page.getByRole("button", { name: "Receber cotação" }).click();
    await expect(page.locator("#nome")).toBeVisible();
  });
});
