import { company } from "@/lib/company";
import { publicEnv } from "@/lib/env";
import { ramos } from "@/lib/ramos";

/**
 * `/llms.txt` — resumo do site para buscadores de IA (formato llmstxt.org;
 * aviso da auditoria Semrush 2026-10-13). Gerado a partir de `lib/company.ts`
 * e `lib/ramos.ts` para não duplicar dados de negócio (regra anti-hardcode,
 * Issue 23B). `force-static`: resolvido no build, sem função em runtime.
 */
export const dynamic = "force-static";

export function GET() {
  const base = publicEnv.siteUrl || "http://localhost:3000";
  const { business, contact, address } = company;

  const lines = [
    `# ${company.tradeName}`,
    "",
    `> Corretora de seguros em ${address.city}/${address.state}, registro SUSEP ${company.susep}, com ${business.yearsExperience} anos de experiência. Compara ${business.insurersCount} seguradoras parceiras e faz a cotação grátis e sem compromisso, com atendimento de especialistas humanos.`,
    "",
    `Nota ${business.googleRating.toString().replace(".", ",")} no Google com mais de ${business.googleReviewsCount.toLocaleString("pt-BR")} avaliações. Atendimento: ${business.hoursDisplay}. Telefone e WhatsApp: ${contact.phoneDisplay}.`,
    "",
    "## Cotação",
    "",
    `- [Cotação de seguro grátis](${base}/cotacao): formulário em 3 etapas; comparamos as seguradoras parceiras.`,
    `- [Cotação Porto Seguro](${base}/cotacao-porto): cotação Porto Seguro comparada com outras seguradoras.`,
    "",
    "## Seguros",
    "",
    ...ramos.map((ramo) => `- [${ramo.name}](${base}${ramo.seo.canonicalPath}): ${ramo.seo.description}`),
    "",
    "## Institucional",
    "",
    `- [Sobre a ${company.tradeName}](${base}/a-imediato)`,
    `- [Equipe](${base}/equipe)`,
    `- [Seguradoras parceiras](${base}/seguradoras-parceiras): lista das seguradoras e canais de assistência 24h.`,
    `- [Coberturas de seguro auto](${base}/coberturas)`,
    `- [Reputação no Google](${base}/reputacao)`,
    `- [Contato](${base}/contato)`,
    `- [Alerta de fraude](${base}${company.legalUrls.fraudAlert})`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
