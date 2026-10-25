import { expect, test, type Page } from "@playwright/test";

/**
 * Etapa 1 do LeadForm (2026-10-25): o foco pula do DDD para o celular ao
 * digitar o 2º dígito, Backspace com o celular vazio volta ao DDD, e o
 * telefone completo colado/preenchido automaticamente é separado em DDD +
 * número. Nenhuma chamada sai da página (validações interceptadas).
 */

async function abrirFormulario(page: Page) {
  await page.route("**/api/validate/phone", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  );
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
  await page.goto("/cotacao", { waitUntil: "domcontentloaded" });
  const chip = page.getByRole("button", { name: "Auto", exact: true });
  if ((await chip.count()) > 0) await chip.first().click();
  await expect(page.locator("#ddd")).toBeVisible();
}

/** Simula colagem (`insertFromPaste`) ou preenchimento automático (sem `inputType`). */
async function inserirSemDigitar(
  page: Page,
  seletor: string,
  valor: string,
  inputType: "insertFromPaste" | null
) {
  await page.locator(seletor).focus();
  await page.evaluate(
    ({ seletor, valor, inputType }) => {
      const input = document.querySelector<HTMLInputElement>(seletor)!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, valor);
      const evento = inputType
        ? new InputEvent("input", { bubbles: true, inputType })
        : new Event("input", { bubbles: true });
      input.dispatchEvent(evento);
    },
    { seletor, valor, inputType }
  );
}

test.describe("Telefone: DDD e celular", () => {
  test("digitar o 2º dígito do DDD leva ao celular", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#ddd").pressSequentially("1");
    await expect(page.locator("#ddd")).toBeFocused();
    await page.keyboard.type("1");
    await expect(page.locator("#celular")).toBeFocused();
    await page.keyboard.type("987654321");
    await expect(page.locator("#ddd")).toHaveValue("11");
    await expect(page.locator("#celular")).toHaveValue("98765-4321");
  });

  test("Backspace com o celular vazio volta ao fim do DDD", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#ddd").pressSequentially("21");
    await expect(page.locator("#celular")).toBeFocused();
    await page.keyboard.type("9");
    await page.keyboard.press("Backspace");
    await expect(page.locator("#celular")).toHaveValue("");
    await expect(page.locator("#celular")).toBeFocused();
    await page.keyboard.press("Backspace");
    await expect(page.locator("#ddd")).toBeFocused();
    await page.keyboard.press("Backspace");
    await expect(page.locator("#ddd")).toHaveValue("2");
    await expect(page.locator("#ddd")).toBeFocused();
  });

  test("o 10º dígito digitado no celular não mexe no DDD", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#ddd").pressSequentially("11");
    await page.keyboard.type("9876543210");
    await expect(page.locator("#ddd")).toHaveValue("11");
    await expect(page.locator("#celular")).toHaveValue("98765-4321");
  });

  test("telefone completo colado no celular é separado", async ({ page }) => {
    await abrirFormulario(page);
    await inserirSemDigitar(page, "#celular", "+55 (21) 91234-5678", "insertFromPaste");
    await expect(page.locator("#ddd")).toHaveValue("21");
    await expect(page.locator("#celular")).toHaveValue("91234-5678");
  });

  test("preenchimento automático do celular com DDD é separado", async ({ page }) => {
    await abrirFormulario(page);
    await page.locator("#ddd").fill("");
    await inserirSemDigitar(page, "#celular", "11987654321", null);
    await expect(page.locator("#ddd")).toHaveValue("11");
    await expect(page.locator("#celular")).toHaveValue("98765-4321");
  });

  test("telefone completo colado no DDD é separado e o foco vai ao celular", async ({ page }) => {
    await abrirFormulario(page);
    await inserirSemDigitar(page, "#ddd", "(31) 3333-4444", "insertFromPaste");
    await expect(page.locator("#ddd")).toHaveValue("31");
    await expect(page.locator("#celular")).toHaveValue("3333-4444");
    await expect(page.locator("#celular")).toBeFocused();
  });

  test("autofill só do DDD não pula o foco", async ({ page }) => {
    await abrirFormulario(page);
    await inserirSemDigitar(page, "#ddd", "11", null);
    await expect(page.locator("#ddd")).toHaveValue("11");
    await expect(page.locator("#ddd")).toBeFocused();
  });
});
