/**
 * Login OAuth Desktop → grava token.json
 *
 * Uso:
 *   npm run auth
 *   npm run auth -- --with-ads
 */
import { interactiveLogin } from "./lib/auth.mjs";

const withAds = process.argv.includes("--with-ads");

try {
  await interactiveLogin({ withAds });
  console.log("\nPróximo: npm run gtm:whoami");
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
