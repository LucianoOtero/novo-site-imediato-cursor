import { defineConfig, devices } from "@playwright/test";

/**
 * UAT do Lote 1 do funil v2 — o campo de telefone em desktop, iPhone
 * (WebKit) e Android. Mesmo servidor da `playwright.config.ts` (build de
 * produção local em :3000, ou `SITE_BASE_URL`).
 *
 *   npx playwright test --config e2e/playwright.uat.config.ts
 */
export default defineConfig({
  testDir: ".",
  testMatch: /uat-lote1-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.SITE_BASE_URL || "http://localhost:3000",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-safari", use: { ...devices["iPhone 13"] } },
    { name: "android-chrome", use: { ...devices["Pixel 7"] } },
  ],
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
