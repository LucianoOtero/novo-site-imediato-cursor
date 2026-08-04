/**
 * Login OAuth Desktop → grava token.json
 *
 * Uso:
 *   npm run auth
 *   npm run auth -- --with-ads
 *   npm run auth -- --with-ads --with-analytics   (GA4 Admin API, v45)
 */
import { interactiveLogin } from "./lib/auth.mjs";

const withAds = process.argv.includes("--with-ads");
const withAnalytics = process.argv.includes("--with-analytics");

try {
  await interactiveLogin({ withAds, withAnalytics });
  console.log("\nPróximo: npm run gtm:whoami");
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
