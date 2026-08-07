/**
 * Login OAuth Desktop → grava token.json
 *
 * Uso:
 *   npm run auth
 *   npm run auth -- --with-ads
 *   npm run auth -- --with-ads --with-analytics   (GA4 Admin API, v45)
 *   npm run auth -- --with-ads --with-analytics --with-gsc   (Search Console, 2026-08-07)
 */
import { interactiveLogin } from "./lib/auth.mjs";

const withAds = process.argv.includes("--with-ads");
const withAnalytics = process.argv.includes("--with-analytics");
const withGsc = process.argv.includes("--with-gsc");

try {
  await interactiveLogin({ withAds, withAnalytics, withGsc });
  console.log("\nPróximo: npm run gtm:whoami");
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
