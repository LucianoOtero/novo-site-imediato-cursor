import { Hero } from "@/components/home/Hero";
import { ComoFunciona } from "@/components/home/ComoFunciona";
import { Benefits } from "@/components/home/Benefits";
import { CoverageCards } from "@/components/home/CoverageCards";
import { InsurersGrid } from "@/components/home/InsurersGrid";
import { Arguments } from "@/components/ramo-lp/Arguments";
import { CTASection } from "@/components/cta/CTASection";
import { getRamo } from "@/lib/ramos";

/**
 * RamoLandingPage — template compartilhado das 10 LPs de ramo (Issue 16).
 * Fonte: ESPECIFICACAO v3.md, seção 6.2 ("Hero ramo · Argumentos ·
 * Coberturas · Como funciona · Diferenciais (Benefits · InsurersGrid ·
 * Testimonials) · FAQ do ramo · CTA final + Footer").
 *
 * Reaproveita ao máximo os blocos da Home (Issue 15) — `Hero`,
 * `ComoFunciona`, `Benefits`, `CoverageCards`, `InsurersGrid`,
 * `CTASection` já foram generalizados para aceitar `ramoSlug`/props em
 * vez de fixar "auto" — evita a duplicação explícita proibida pelo
 * critério de aceite "sem copy duplicada manual".
 *
 * `InsurersGrid` (Issue 15/16) adicionado na extensão de 2026-07-03 —
 * ver `lib/seguradoras.ts`.
 *
 * `CoverageCards` — as listas de `ramo.coverages` para os 9 ramos além
 * de "auto" eram vazias até 2026-07-08; agora têm um rascunho genérico
 * de mercado (ver comentário em `lib/ramos.ts`), e o cliente pediu
 * explicitamente para publicar já ao vivo (não aguardar revisão) — por
 * isso `CoverageCards` passou a renderizar conteúdo em todas as 10 LPs,
 * não só na de Auto.
 *
 * Ainda OMITIDOS desta versão (tratamento diferente do `CoverageCards`
 * acima — o cliente pediu para segurar estes até revisar):
 * - **Testimonials** (parte de "Diferenciais" no wireframe): é global na
 *   Home (Issue 15, API do Google Places), não teve uma versão por ramo
 *   definida na especificação.
 * - **FAQ do ramo** e **objeções**: `ramo.faq[].answer` e
 *   `ramo.objections[].response` ganharam um rascunho genérico em
 *   2026-07-08 (ver `lib/ramos.ts`), mas o cliente pediu para revisar
 *   antes de publicar — por isso continuam fora da renderização desta
 *   página, ao contrário de `CoverageCards`. `ramo.arguments` (usado em
 *   `Arguments`) é diferente: é conteúdo real da seção 31.2, não um
 *   rascunho — por isso é renderizado desde a Issue 16.
 */
export function RamoLandingPage({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  if (!ramo) return null;

  return (
    <>
      <Hero ramoSlug={ramoSlug} />
      <Arguments ramoSlug={ramoSlug} />
      <CoverageCards ramoSlug={ramoSlug} />
      <ComoFunciona />
      <Benefits />
      <InsurersGrid />
      <CTASection
        ctaId={`ramo_${ramoSlug}_cta_final`}
        location={`ramo_${ramoSlug}_final`}
        heading="Fale com um especialista agora"
        tone="neutral"
        showCallButton
        ramo={ramoSlug}
      />
    </>
  );
}
