import { company, companySameAs } from "@/lib/company";

/**
 * lib/schema.ts — builders de JSON-LD (Issues 17 e 20).
 * Fonte: ESPECIFICACAO v3.md, seção 17 ("Schema.org (JSON-LD): ...
 * FAQPage...") e seção 32 ("InsuranceAgency (nome, logo, telefone,
 * endereço, geo, aggregateRating 4.8/2000, areaServed BR, priceRange,
 * sameAs); Organization (CNPJ, fundação); FAQPage; BreadcrumbList").
 *
 * Campos omitidos deliberadamente (não inventados): `geo` (coordenadas
 * lat/long — não existem em `lib/company.ts`), `logo`/`image` (o SVG
 * oficial ainda não foi migrado para `/public`, ver Issue P-10/
 * BRAND_ASSETS.md — referenciar um arquivo inexistente seria pior para
 * SEO do que omitir), `priceRange` (não há uma faixa de preço única
 * aplicável — a Imediato é uma corretora, não um produto de preço fixo)
 * e `foundingDate`/fundação da Organization (não confirmado em
 * `lib/company.ts`). Esses campos são opcionais no schema.org.
 *
 * `openingHours` (2026-07-03): incluído condicionalmente — só aparece
 * quando `company.business.hoursSchema` existir, no formato de string
 * exigido pelo schema.org (ex.: `"Mo-Fr 09:00-18:00"`).
 */
export type FaqSchemaItem = { question: string; answer: string };

/** Gera o JSON-LD `FAQPage` (schema.org) a partir de uma lista de perguntas/respostas. */
export function buildFaqSchema(items: FaqSchemaItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** Gera o JSON-LD `InsuranceAgency` (schema.org) a partir de `lib/company.ts`. */
export function buildInsuranceAgencySchema(siteUrl?: string) {
  const { address } = company;
  return {
    "@context": "https://schema.org",
    "@type": "InsuranceAgency",
    name: company.tradeName,
    legalName: company.legalName,
    telephone: company.contact.phone,
    email: company.contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${address.street}, ${address.number}${address.floor ? ` - ${address.floor}` : ""}`,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.zipCode,
      addressCountry: address.country,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: company.business.googleRating,
      reviewCount: company.business.googleReviewsCount,
    },
    areaServed: "BR",
    sameAs: companySameAs,
    ...(siteUrl ? { url: siteUrl } : {}),
    ...(company.business.hoursSchema ? { openingHours: company.business.hoursSchema } : {}),
  };
}

/** Gera o JSON-LD `Organization` (schema.org) a partir de `lib/company.ts`. */
export function buildOrganizationSchema(siteUrl?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.tradeName,
    legalName: company.legalName,
    identifier: {
      "@type": "PropertyValue",
      name: "CNPJ",
      value: company.cnpj,
    },
    sameAs: companySameAs,
    ...(siteUrl ? { url: siteUrl } : {}),
  };
}

export type BreadcrumbSchemaItem = { name: string; url: string };

/** Gera o JSON-LD `BreadcrumbList` (schema.org) a partir de uma trilha de páginas. */
export function buildBreadcrumbSchema(items: BreadcrumbSchemaItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
