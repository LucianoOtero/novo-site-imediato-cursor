/**
 * Garante custom dimensions (escopo evento) na property GA4 do site novo
 * para params de abandono / dismiss.
 *
 * Uso:
 *   node ga4-ensure-abandon-dimensions.mjs
 */
import fs from "node:fs";
import { getAuthorizedClient, getAnalyticsAdmin } from "./lib/auth.mjs";
import { CONFIG_PATH } from "./lib/paths.mjs";

const PROPERTY_ID = "281067607";

const DIMENSIONS = [
  { parameterName: "last_step", displayName: "Last Step (form)" },
  { parameterName: "max_step", displayName: "Max Step (form)" },
  { parameterName: "reason", displayName: "Abandon Reason" },
  { parameterName: "form_id", displayName: "Form ID" },
  { parameterName: "had_initial_contact", displayName: "Had Initial Contact" },
];

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const propertyId =
    String(config.ga4?.propertyId || PROPERTY_ID).replace(/\D/g, "") ||
    PROPERTY_ID;
  const parent = `properties/${propertyId}`;

  const oauth2 = await getAuthorizedClient({ withAnalytics: true });
  const admin = getAnalyticsAdmin(oauth2);

  const existing = await admin.properties.customDimensions.list({ parent });
  const items = existing.data.customDimensions || [];
  const byParam = new Map(
    items.map((d) => [String(d.parameterName || "").toLowerCase(), d]),
  );

  for (const dim of DIMENSIONS) {
    const key = dim.parameterName.toLowerCase();
    if (byParam.has(key)) {
      console.log("OK (já existe):", dim.parameterName, "→", byParam.get(key).name);
      continue;
    }
    const created = await admin.properties.customDimensions.create({
      parent,
      requestBody: {
        parameterName: dim.parameterName,
        displayName: dim.displayName,
        scope: "EVENT",
      },
    });
    console.log("Criada:", dim.parameterName, "→", created.data.name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
