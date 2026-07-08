import type { Metadata } from "next";

import { RamoLandingPage } from "@/components/ramo-lp/RamoLandingPage";
import { getRamo } from "@/lib/ramos";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * `/fianca` — LP do ramo "Seguro Fiança" (Issue 16).
 * Rota estática dedicada (não cai em `/seguro-[ramo]`) — a URL oficial
 * deste ramo não segue o prefixo `seguro-` (`lib/ramos.ts`,
 * `canonicalPath: "/fianca"`, seção 4 do mapa do site). Reaproveita o
 * mesmo `RamoLandingPage` das demais LPs.
 */
const RAMO_SLUG = "fianca";

export const metadata: Metadata = (() => {
  const ramo = getRamo(RAMO_SLUG)!;
  return buildPageMetadata({ title: ramo.seo.title, description: ramo.seo.description, path: ramo.seo.canonicalPath });
})();

export default function FiancaPage() {
  return <RamoLandingPage ramoSlug={RAMO_SLUG} />;
}
