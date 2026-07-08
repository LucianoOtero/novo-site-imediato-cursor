/**
 * lib/company.ts — fonte única de dados institucionais/regulatórios/comerciais (Issue 04).
 *
 * Fonte: ESPECIFICACAO v3.md, seção 55 (contrato `CompanyConfig` e exemplo
 * preenchido, seção 55.1/55.2) + seção 64 (dados oficiais). Ver também
 * docs/DADOS_OFICIAIS.md para o estado de confirmação de cada item.
 *
 * Regra obrigatória (seção 55.2/48.1 da especificação): nenhum dado
 * institucional/regulatório/comercial recorrente pode aparecer diretamente
 * em JSX. Tudo vem deste arquivo. Lint/PR review deve rejeitar strings de
 * telefone, CNPJ, SUSEP ou preço em componentes.
 *
 * Todos os campos foram confirmados pelo cliente em 2026-07-03 (ver
 * docs/DADOS_OFICIAIS.md para o histórico completo, incluindo a
 * resolução das divergências de "anos de experiência", "nº de
 * seguradoras parceiras" e "% de satisfação" observadas no site legado).
 * Nenhum valor foi inventado — todos vêm de confirmação explícita do
 * responsável indicado em docs/DADOS_OFICIAIS.md.
 */

export type CompanyConfig = {
  legalName: string;
  tradeName: string;
  cnpj: string;
  susep: string;
  address: {
    street: string;
    number: string;
    floor?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    phoneDisplay: string;
    whatsapp: string;
    whatsappDisplay: string;
    emergencyPhone?: string;
    emergencyPhoneDisplay?: string;
    ombudsmanPhone?: string;
    ombudsmanPhoneDisplay?: string;
    email: string;
    fallbackEmail: string;
  };
  business: {
    yearsExperience: number;
    insurersCount: number;
    googleRating: number;
    googleReviewsCount: number;
    satisfactionRate?: number;
    /** Formato legível (ex.: rodapé, futura página `/contato`). */
    hoursDisplay?: string;
    /** Formato schema.org `openingHours` (ex.: `["Mo-Fr 09:00-18:00"]`) — usado em `lib/schema.ts`. */
    hoursSchema?: string[];
  };
  legalUrls: {
    privacyPolicy: string;
    terms: string;
    fraudAlert: string;
  };
  social?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  google?: {
    reviewUrl?: string;
    profileUrl?: string;
    placeId?: string;
  };
};

export const company: CompanyConfig = {
  legalName: "Imediato Corretora de Seguros Ltda.", // CONFIRMADO
  tradeName: "Imediato Seguros", // CONFIRMADO (2026-07-03)
  cnpj: "45.998.165/0001-32", // CONFIRMADO (2026-07-03)
  susep: "252174522", // CONFIRMADO (2026-07-03)
  address: {
    street: "Rua Barão de Itapetininga",
    number: "125",
    floor: "6º andar",
    district: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01042-001",
    country: "BR",
  }, // CONFIRMADO (2026-07-03)
  contact: {
    phone: "+551132301422", // CONFIRMADO (2026-07-03)
    phoneDisplay: "(11) 3230-1422", // CONFIRMADO (2026-07-03)
    whatsapp: "551132301422", // CONFIRMADO pelo cliente (2026-07-02) — mesmo número do telefone principal, sem o "9" extra que havia sido observado no site atual
    whatsappDisplay: "(11) 3230-1422", // CONFIRMADO pelo cliente (2026-07-02)
    emergencyPhone: "+5511953288466", // CONFIRMADO (2026-07-03)
    emergencyPhoneDisplay: "(11) 95328-8466", // CONFIRMADO (2026-07-03)
    ombudsmanPhone: "+5511976687668", // CONFIRMADO (2026-07-03)
    ombudsmanPhoneDisplay: "(11) 97668-7668", // CONFIRMADO (2026-07-03)
    email: "contato@imediatoseguros.com.br", // CONFIRMADO (2026-07-03)
    fallbackEmail: "lrotero@gmail.com", // CONFIRMADO
  },
  business: {
    yearsExperience: 25, // CONFIRMADO (2026-07-03) — resolve divergência 25 (hero) vs 35+ (rodapé) do site legado
    insurersCount: 18, // CONFIRMADO (2026-07-03) — resolve divergência 16 (texto) vs 18 (logos) do site legado
    googleRating: 4.8, // CONFIRMADO (2026-07-03)
    googleReviewsCount: 2200, // CONFIRMADO (2026-07-03) — "+2.200 avaliações"
    satisfactionRate: 98, // CONFIRMADO (2026-07-03) — resolve divergência 96% vs 98% do site legado
    hoursDisplay: "Seg-Sex, 9h-18h", // CONFIRMADO (2026-07-03)
    hoursSchema: ["Mo-Fr 09:00-18:00"], // CONFIRMADO (2026-07-03)
  },
  legalUrls: {
    privacyPolicy: "/politica-de-privacidade",
    terms: "/termos",
    fraudAlert: "/alerta-de-fraude",
  },
  social: {
    facebook: "https://web.facebook.com/imediatocorretora", // CONFIRMADO
    instagram: "https://www.instagram.com/imediato.seguros/", // CONFIRMADO
    linkedin: "https://www.linkedin.com/company/imediato-solu%C3%A7%C3%B5es-em-seguros/", // CONFIRMADO
  },
  google: {
    reviewUrl: "https://g.page/r/CSZR7jnTxayxEAE/review", // CONFIRMADO
    profileUrl: "https://www.google.com/maps/place/IMEDIATO+SOLU%C3%87%C3%95ES+EM+SEGUROS", // CONFIRMADO
    placeId: "0x94ce5849842c0001:0xb1acc5d339ee5126", // CONFIRMADO
  },
};

/** `sameAs` para JSON-LD (Issue 20) — apenas URLs confirmadas. */
export const companySameAs = [
  company.social?.facebook,
  company.social?.instagram,
  company.social?.linkedin,
  company.google?.profileUrl,
].filter(Boolean) as string[];
