import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * UAT do Lote 1 do funil v2, bloco A (2026-10-25): o campo único de
 * telefone em cada ponto de entrada do site. Roda pela
 * `playwright.uat.config.ts` em desktop, iPhone (WebKit) e Android.
 * Nenhuma chamada sai da página.
 */

type Entrada = { nome: string; abrir: (page: Page) => Promise<Locator> };

async function escolherAuto(page: Page) {
  const chip = page.getByRole("button", { name: "Auto", exact: true });
  if ((await chip.count()) > 0) await chip.first().click();
}

const ENTRADAS: Entrada[] = [
  {
    nome: "formulário /cotacao",
    abrir: async (page) => {
      await page.goto("/cotacao", { waitUntil: "domcontentloaded" });
      await escolherAuto(page);
      return page.locator("#telefone");
    },
  },
  {
    nome: "formulário da Home",
    abrir: async (page) => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await escolherAuto(page);
      return page.locator("#telefone").first();
    },
  },
  {
    nome: "modal do WhatsApp",
    abrir: async (page) => {
      await page.goto("/seguro-auto", { waitUntil: "domcontentloaded" });
      await page.getByRole("link", { name: /WhatsApp/i }).filter({ visible: true }).first().click();
      return page.locator("#modal-telefone");
    },
  },
  {
    nome: "modal de telefone do rodapé",
    abrir: async (page) => {
      await page.goto("/seguro-auto", { waitUntil: "domcontentloaded" });
      await page.locator('footer a[href^="tel:"]').first().click();
      return page.locator("#modal-telefone");
    },
  },
  {
    nome: "/cotacao-suhai",
    abrir: async (page) => {
      await page.goto("/cotacao-suhai", { waitUntil: "domcontentloaded" });
      return page.locator("#suhai-telefone");
    },
  },
];

async function colar(page: Page, campo: Locator, valor: string) {
  await campo.focus();
  await campo.evaluate((input: HTMLInputElement, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "");
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    setter.call(input, v);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertFromPaste" }));
  }, valor);
}

async function autofill(campo: Locator, valor: string) {
  await campo.evaluate((input: HTMLInputElement, v) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setter.call(input, v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, valor);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/validate/phone", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' })
  );
  await page.route("**/api/lead", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: '{"leadId":"ld_uat"}' })
  );
  await page.route("https://challenges.cloudflare.com/**", (route) => route.abort());
});

for (const entrada of ENTRADAS) {
  test.describe(entrada.nome, () => {
    test("A1/A7 digitação com máscara e teclado de telefone", async ({ page }) => {
      const campo = await entrada.abrir(page);
      await expect(campo).toBeVisible();
      await expect(campo).toHaveAttribute("inputmode", "tel");
      await expect(campo).toHaveAttribute("type", "tel");
      await campo.pressSequentially("11987654321");
      await expect(campo).toHaveValue("(11) 98765-4321");
      await campo.pressSequentially("0");
      await expect(campo).toHaveValue("(11) 98765-4321");
    });

    test("A2 Backspace atravessa a máscara", async ({ page }) => {
      const campo = await entrada.abrir(page);
      await campo.pressSequentially("119");
      await expect(campo).toHaveValue("(11) 9");
      for (const esperado of ["(11", "(1", ""]) {
        await campo.press("Backspace");
        await expect(campo).toHaveValue(esperado);
      }
    });

    // Colagem e preenchimento automático chegam sem digitação; repete até a
    // página terminar de hidratar (no WebKit isso leva alguns segundos).
    test("A3 colar com +55", async ({ page }) => {
      const campo = await entrada.abrir(page);
      await expect(async () => {
        await colar(page, campo, "+55 (21) 91234-5678");
        await expect(campo).toHaveValue("(21) 91234-5678", { timeout: 1000 });
      }).toPass({ timeout: 20_000 });
    });

    test("A4 preenchimento automático com +55", async ({ page }) => {
      const campo = await entrada.abrir(page);
      await expect(async () => {
        await autofill(campo, "+5511987654321");
        await expect(campo).toHaveValue("(11) 98765-4321", { timeout: 1000 });
      }).toPass({ timeout: 20_000 });
    });

    test("A5 DDD 55 digitado à mão", async ({ page }) => {
      const campo = await entrada.abrir(page);
      await campo.pressSequentially("55987654321");
      await expect(campo).toHaveValue("(55) 98765-4321");
    });
  });
}

test("A6 número incompleto mostra erro e devolve o foco (/cotacao)", async ({ page, browserName }) => {
  const campo = await ENTRADAS[0].abrir(page);
  await campo.pressSequentially("1198765");
  await page.getByRole("button", { name: "Receber cotação" }).click();
  await expect(page.locator("#telefone-error")).toBeVisible();
  await expect(page.locator("#nome")).toHaveCount(0);
  // No WebKit o foco fica no botão, igual à versão anterior com DDD separado.
  if (browserName !== "webkit") await expect(campo).toBeFocused();
});
