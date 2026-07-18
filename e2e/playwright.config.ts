import { defineConfig, devices } from "@playwright/test";

/**
 * Config do Playwright para o teste de fidelidade RPA (local vs. site novo).
 *
 * - `testDir: '.'` — os specs ficam nesta pasta `e2e/`.
 * - Execução SEQUENCIAL (`workers: 1`): mesmo login do Tô Segurado e para
 *   não sobrecarregar o backend `rpaimediatoseguros.com.br`; espelha a
 *   bateria local (também sequencial).
 * - `timeout` alto por caso: o polling do RPA vai até 10 min
 *   (`lib/leads/use-rpa-calculation.ts`, `MAX_POLLS=300 × 2s`).
 * - Chromium lançado com `--disable-web-security` porque a chamada ao RPA é
 *   client-side para outro domínio (CORS). Isso é SÓ no teste — não altera o
 *   site nem o backend.
 * - `webServer`: sobe o BUILD DE PRODUCAO (`npm run start`) em localhost:3000,
 *   reaproveitando se ja estiver rodando. Producao evita a instabilidade do
 *   dev server (recompilacao sob demanda -> chunks 400 e tela em branco)
 *   observada ao automatizar o formulario.
 *   PRE-REQUISITO: rodar `npm run build` UMA vez antes (o build nao entra no
 *   comando por causa de um EINVAL de readlink do Next ao reconstruir sobre
 *   um `.next` ja existente dentro do OneDrive; para rebuildar, apague o
 *   `.next` antes: `Remove-Item -Recurse -Force .next; npm run build`).
 */
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 12 * 60 * 1000, // 12 min por caso (RPA vai até ~10 min)
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.SITE_BASE_URL || "http://localhost:3000",
    headless: true,
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    launchOptions: {
      args: [
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process,BlockInsecurePrivateNetworkRequests",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Sobe o build local apenas quando o alvo é localhost. Para validar em
  // homologação, aponte `SITE_BASE_URL` (ex.: https://comparaseguroonline.com.br)
  // e o webServer é ignorado (testamos o deploy real). Lembre: com a flag
  // NEXT_PUBLIC_RPA_ENABLED wired (2026-07-18), a opção "Aguardar o cálculo"
  // só aparece se a flag estiver `true` no ambiente alvo — para rodar a
  // bateria em localhost, faça o build com NEXT_PUBLIC_RPA_ENABLED=true.
  webServer:
    process.env.SITE_BASE_URL && !process.env.SITE_BASE_URL.includes("localhost")
      ? undefined
      : {
          command: "npm run start",
          url: "http://localhost:3000",
          cwd: "..",
          reuseExistingServer: true,
          timeout: 120_000,
        },
});
