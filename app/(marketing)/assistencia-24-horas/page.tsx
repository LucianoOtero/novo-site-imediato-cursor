import type { Metadata } from "next";

import { RamoLandingPage } from "@/components/ramo-lp/RamoLandingPage";
import { getRamo } from "@/lib/ramos";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * `/assistencia-24-horas` — LP do ramo "Assistência 24h e RCF" (Issue 16).
 * Rota estática dedicada (não cai em `/seguro-[ramo]`) — a URL oficial
 * deste ramo não segue o prefixo `seguro-` (`lib/ramos.ts`,
 * `canonicalPath: "/assistencia-24-horas"`, seção 4 do mapa do site).
 * Reaproveita o mesmo `RamoLandingPage` das demais LPs.
 */
const RAMO_SLUG = "assistencia-24-horas";

export const metadata: Metadata = (() => {
  const ramo = getRamo(RAMO_SLUG)!;
  return buildPageMetadata({ title: ramo.seo.title, description: ramo.seo.description, path: ramo.seo.canonicalPath });
})();

export default function Assistencia24hPage() {
  return <RamoLandingPage ramoSlug={RAMO_SLUG} />;
}
