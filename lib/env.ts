import { z } from "zod";

/**
 * lib/env.ts — validação centralizada de variáveis de ambiente (Issue 03A).
 *
 * Fonte: seção 45 da especificação (`.env.example`).
 *
 * Regras:
 * - Nenhum segredo é lido/exposto fora deste módulo sem necessidade.
 * - Em desenvolvimento/staging, nenhuma variável é obrigatória — o projeto
 *   deve rodar com mocks controlados (ver `isMockMode`).
 * - Em produção, as variáveis marcadas como obrigatórias na seção 45 DEVEM
 *   existir; o boot falha com uma mensagem clara listando o que falta.
 * - `env` (objeto completo, com segredos) deve ser importado **apenas** em
 *   código server-only (Server Components, Route Handlers, Server Actions).
 *   Para código que também roda no client, use `publicEnv`.
 */

export type AppEnvironment = "development" | "staging" | "production";

/**
 * Detecta o ambiente da aplicação:
 * - Vercel expõe `VERCEL_ENV` automaticamente ("production" | "preview" | "development");
 *   "preview" é tratado como o nosso "staging" (ver Issue 23A).
 * - Pode ser sobrescrito manualmente via `NEXT_PUBLIC_APP_ENV` — e essa
 *   sobrescrita tem PRIORIDADE TOTAL sobre `VERCEL_ENV`, nos dois sentidos
 *   (promover OU rebaixar). Caso de uso real (2026-07-08): testar o site
 *   num domínio próprio ligado à branch `main`/deployment "Production" da
 *   Vercel, mas sem ainda ter todas as variáveis obrigatórias de produção
 *   (GTM/GA4/Ads/Turnstile/banco de dados reais) — `NEXT_PUBLIC_APP_ENV=
 *   staging` classifica esse deployment como "staging" mesmo com
 *   `VERCEL_ENV=production`, evitando a validação estrita antes da hora.
 *   Antes desta correção, a função dava prioridade a `VERCEL_ENV===
 *   "production"` mesmo com o override manual — o que não era uma
 *   sobrescrita de verdade, só um "OR" a favor de produção.
 *
 * Importante: NÃO usamos `NODE_ENV` como sinal de "produção real" aqui.
 * `next build` sempre define `NODE_ENV=production`, inclusive em builds
 * locais/CI sem nenhum secret configurado — se tratássemos isso como
 * produção, todo `next build` local falharia por falta de variáveis. A
 * validação estrita só deve valer quando há um sinal explícito e confiável
 * de que é um deploy de produção real (`VERCEL_ENV=production` ou
 * `NEXT_PUBLIC_APP_ENV=production` definido manualmente).
 */
function resolveAppEnvironment(): AppEnvironment {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV;
  if (explicit === "production" || explicit === "staging" || explicit === "development") {
    return explicit;
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "staging";
  if (vercelEnv === "development") return "development";

  // Sem VERCEL_ENV nem override explícito (ex.: `next build` local, fora
  // da Vercel): tratamos como "development" para permitir mocks, mesmo
  // que NODE_ENV já esteja como "production" nesse momento do build.
  return "development";
}

export const appEnvironment: AppEnvironment = resolveAppEnvironment();
/** Exportado (Issue 23A) — usado por `StagingBanner`, `robots.ts` e `lib/metadata.ts` para decidir noindex/banner fora de produção. */
export const isProduction = appEnvironment === "production";

/**
 * Todas as variáveis são opcionais no schema Zod — isso permite rodar em
 * desenvolvimento sem nenhum valor real configurado. A obrigatoriedade
 * real em produção é verificada separadamente em `assertRequiredInProduction`,
 * o que permite uma mensagem de erro única e clara (em vez de um erro Zod
 * por variável).
 */
const envSchema = z.object({
  // Client-exposed (NEXT_PUBLIC_*) — nunca segredo.
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
  NEXT_PUBLIC_GA4_ID: z.string().optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  NEXT_PUBLIC_CONTACT_PHONE: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  // RPA (cotação automatizada, rpaimediatoseguros.com.br) — chamada
  // direta do navegador (confirmado em docs/WEBFLOW_CUSTOM_CODE_DEV.md),
  // por isso client-exposed. Mesma URL em todos os ambientes.
  NEXT_PUBLIC_RPA_ENABLED: z.string().optional(),
  NEXT_PUBLIC_RPA_API_BASE_URL: z.string().optional(),

  // Server-only.
  GOOGLE_ADS_CONVERSION_ID: z.string().optional(),
  GOOGLE_ADS_CONVERSION_LABEL: z.string().optional(),
  LEAD_WEBHOOK_URL: z.string().optional(),
  LEAD_WEBHOOK_SECRET: z.string().optional(),
  CRM_API_URL: z.string().optional(),
  CRM_API_KEY: z.string().optional(),
  LEAD_FALLBACK_EMAIL: z.string().optional(),
  EMAIL_API_KEY: z.string().optional(),
  IP_HASH_SALT: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // Integrações confirmadas em 2026-07-03 (docs/WEBFLOW_CUSTOM_CODE_DEV.md).
  // EspoCRM (CRM real, via proxy Cloud Run "FlyingDonkeys") e Octadesk
  // (comunicação via WhatsApp, via proxy "Webflow Octa") substituem o
  // destino genérico LEAD_WEBHOOK_URL/CRM_API_URL acima, que passa a ser
  // legado/opcional.
  //
  // EspoCRM tem URLs distintas por ambiente (dev/staging usam a mesma URL
  // "dev"; produção usa a URL "prod") — resolvidas automaticamente por
  // `appEnvironment` em `env.leadEspocrmWebhookUrl` (2026-07-12, projeto de
  // paridade com o legado — ver docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md).
  // Isso substitui a antiga `LEAD_ESPOCRM_WEBHOOK_URL` única.
  LEAD_ESPOCRM_WEBHOOK_URL_DEV: z.string().optional(),
  LEAD_ESPOCRM_WEBHOOK_URL_PROD: z.string().optional(),
  // Octadesk não tem ambiente de teste — uma única URL, sempre produção,
  // usada nos 3 ambientes (decisão do cliente, 2026-07-08).
  LEAD_OCTADESK_WEBHOOK_URL: z.string().optional(),
  // PH3A (enriquecimento de CPF) — server-side, via o mesmo proxy Cloud
  // Run que valida CPF no site legado. Desabilitado por padrão (mesmo
  // comportamento do ambiente DEV do Webflow).
  PH3A_ENRICHMENT_ENABLED: z.string().optional(),
  CPF_VALIDATE_PROXY_URL: z.string().optional(),

  // Testimonials (Google Places API, decisão do cliente 2026-07-03) —
  // ver lib/google-reviews.ts. Server-only (nunca expor a API key ao
  // client). GOOGLE_PLACE_ID é distinto de `company.google.placeId`
  // (formato CID, ex.: "0x...:0x...") — a Places API exige o formato
  // padrão de Place ID (geralmente iniciado em "ChIJ"), ainda não
  // confirmado nesta sessão.
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_PLACE_ID: z.string().optional(),

  // Firebase Realtime Database — backup de leads + gatilho para a Cloud
  // Function de reentrega assíncrona (projeto de paridade com o legado,
  // 2026-07-12; ver docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md).
  // Projeto Firebase dedicado ao site novo (não o `leads-imediato-seguros`
  // do legado). Opcional: sem essas 4 variáveis, o backup roda em modo mock
  // (só log, sem gravar nada) — nunca bloqueia o envio do lead.
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Só deveria ocorrer por erro de *formato* (ex.: NEXT_PUBLIC_SITE_URL
    // que não é uma URL válida) — obrigatoriedade é tratada separadamente.
    console.error("[lib/env] Formato inválido de variável de ambiente:", parsed.error.flatten().fieldErrors);
    throw new Error(
      "[lib/env] Uma ou mais variáveis de ambiente têm formato inválido. Ver logs acima e docs/TECHNICAL_SPEC.md (seção 45)."
    );
  }

  return parsed.data;
}

const parsed = parseEnv();

/**
 * Variáveis obrigatórias em produção (seção 45 da especificação, coluna
 * "Obrig.: Sim"). CRM_API_URL, CRM_API_KEY, EMAIL_API_KEY, SENTRY_DSN e
 * NEXT_PUBLIC_SENTRY_DSN são opcionais mesmo em produção.
 *
 * `LEAD_WEBHOOK_URL`/`LEAD_WEBHOOK_SECRET` saíram da lista (2026-07-03) —
 * eram um destino genérico inventado antes de se confirmar o CRM real.
 * Os destinos reais confirmados (EspoCRM/Octadesk, ver
 * `docs/WEBFLOW_CUSTOM_CODE_DEV.md`) entram no lugar.
 */
const REQUIRED_IN_PRODUCTION = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_GTM_ID",
  "NEXT_PUBLIC_GA4_ID",
  "GOOGLE_ADS_CONVERSION_ID",
  "GOOGLE_ADS_CONVERSION_LABEL",
  "NEXT_PUBLIC_WHATSAPP_NUMBER",
  "NEXT_PUBLIC_CONTACT_PHONE",
  "LEAD_ESPOCRM_WEBHOOK_URL_PROD",
  "LEAD_OCTADESK_WEBHOOK_URL",
  "LEAD_FALLBACK_EMAIL",
  "IP_HASH_SALT",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "DATABASE_URL",
] as const satisfies readonly (keyof typeof parsed)[];

function findMissingRequired(): string[] {
  return REQUIRED_IN_PRODUCTION.filter((key) => !parsed[key]);
}

function assertRequiredInProduction() {
  const missing = findMissingRequired();
  if (missing.length === 0) return;

  const message = [
    "[lib/env] Variáveis de ambiente obrigatórias faltando em produção:",
    ...missing.map((key) => `  - ${key}`),
    "Consulte .env.example (seção 45 da especificação) e configure-as antes do deploy.",
  ].join("\n");

  throw new Error(message);
}

if (isProduction) {
  assertRequiredInProduction();
} else if (typeof window === "undefined") {
  // Aviso não-fatal, só no servidor, só fora de produção — visibilidade
  // sem travar o desenvolvimento/staging local (Issue 03A: "o projeto
  // consegue rodar em desenvolvimento com mocks controlados").
  const missing = findMissingRequired();
  if (missing.length > 0) {
    console.warn(
      `[lib/env] Ambiente "${appEnvironment}": ${missing.length} variável(is) obrigatória(s) em produção ainda não configurada(s) (ok em dev/staging): ${missing.join(", ")}`
    );
  }
}

/** Variáveis client-safe (NEXT_PUBLIC_*) — seguras para importar no client. */
export const publicEnv = {
  siteUrl: parsed.NEXT_PUBLIC_SITE_URL || undefined,
  gtmId: parsed.NEXT_PUBLIC_GTM_ID,
  ga4Id: parsed.NEXT_PUBLIC_GA4_ID,
  whatsappNumber: parsed.NEXT_PUBLIC_WHATSAPP_NUMBER,
  contactPhone: parsed.NEXT_PUBLIC_CONTACT_PHONE,
  turnstileSiteKey: parsed.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  sentryDsnPublic: parsed.NEXT_PUBLIC_SENTRY_DSN,
  /** RPA (Issue de integrações 2026-07-03) — desabilitado por padrão, como no ambiente DEV do Webflow. */
  rpaEnabled: parsed.NEXT_PUBLIC_RPA_ENABLED === "true",
  rpaApiBaseUrl: parsed.NEXT_PUBLIC_RPA_API_BASE_URL || "https://rpaimediatoseguros.com.br",
} as const;

/**
 * Variáveis completas (client-safe + server-only).
 *
 * ⚠️ NUNCA importe `env` em Client Components — apenas em código
 * server-only (Server Components, Route Handlers, Server Actions).
 * Para código que também roda no client, use `publicEnv`.
 */
export const env = {
  ...publicEnv,
  googleAdsConversionId: parsed.GOOGLE_ADS_CONVERSION_ID,
  googleAdsConversionLabel: parsed.GOOGLE_ADS_CONVERSION_LABEL,
  leadWebhookUrl: parsed.LEAD_WEBHOOK_URL,
  leadWebhookSecret: parsed.LEAD_WEBHOOK_SECRET,
  crmApiUrl: parsed.CRM_API_URL,
  crmApiKey: parsed.CRM_API_KEY,
  leadFallbackEmail: parsed.LEAD_FALLBACK_EMAIL,
  emailApiKey: parsed.EMAIL_API_KEY,
  ipHashSalt: parsed.IP_HASH_SALT,
  turnstileSecretKey: parsed.TURNSTILE_SECRET_KEY,
  sentryDsn: parsed.SENTRY_DSN,
  databaseUrl: parsed.DATABASE_URL,
  /**
   * EspoCRM (via proxy "FlyingDonkeys") — destino real do lead (2026-07-03).
   * Resolvido automaticamente por `appEnvironment` (2026-07-12): produção usa
   * `LEAD_ESPOCRM_WEBHOOK_URL_PROD`; development e staging (UAT) usam
   * `LEAD_ESPOCRM_WEBHOOK_URL_DEV` (`dev.flyingdonkeys.com.br`) — mesma URL
   * para os dois, por decisão do cliente (UAT reaproveita o ambiente dev).
   * Isso troca automaticamente no dia do go-live real, sem reconfigurar o
   * Vercel: basta o override `NEXT_PUBLIC_APP_ENV` deixar de ser "staging".
   */
  leadEspocrmWebhookUrl: isProduction ? parsed.LEAD_ESPOCRM_WEBHOOK_URL_PROD : parsed.LEAD_ESPOCRM_WEBHOOK_URL_DEV,
  /** Octadesk (via proxy "Webflow Octa") — sem ambiente de dev, usa produção mesmo em testes, nos 3 ambientes. */
  leadOctadeskWebhookUrl: parsed.LEAD_OCTADESK_WEBHOOK_URL,
  /** PH3A — desabilitado por padrão, como no ambiente DEV do Webflow. */
  ph3aEnrichmentEnabled: parsed.PH3A_ENRICHMENT_ENABLED === "true",
  cpfValidateProxyUrl: parsed.CPF_VALIDATE_PROXY_URL,
  /** Testimonials via Google Places API — ver lib/google-reviews.ts. Sem valor real: usa fallback com avaliações reais extraídas manualmente. */
  googlePlacesApiKey: parsed.GOOGLE_PLACES_API_KEY,
  googlePlaceId: parsed.GOOGLE_PLACE_ID,
  /** Firebase Admin SDK (backup de leads) — ver lib/leads/firebase-admin.ts. */
  firebaseProjectId: parsed.FIREBASE_PROJECT_ID,
  firebaseClientEmail: parsed.FIREBASE_CLIENT_EMAIL,
  // `\n` literais viram quebra de linha real — necessário porque a chave
  // privada, ao ser colada como valor de variável de ambiente, tem suas
  // quebras de linha escapadas.
  firebasePrivateKey: parsed.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  firebaseDatabaseUrl: parsed.FIREBASE_DATABASE_URL,
} as const;

/**
 * `true` somente quando as 4 credenciais do Firebase Admin SDK estão
 * presentes — controla se `lib/leads/firebase-backup.ts` grava de fato no
 * Realtime Database ou só loga em modo mock (nunca bloqueia o envio do lead
 * em nenhum dos dois casos).
 */
export const firebaseBackupEnabled = Boolean(
  env.firebaseProjectId && env.firebaseClientEmail && env.firebasePrivateKey && env.firebaseDatabaseUrl
);

/**
 * `true` quando não há credenciais reais dos destinos de lead configuradas
 * fora de produção — sinaliza para `lib/leads/*` que deve usar um
 * mock/simulação em vez de chamar os serviços externos reais (EspoCRM/
 * Octadesk). Substitui a checagem anterior baseada em `LEAD_WEBHOOK_URL`/
 * `CRM_API_URL` (destino genérico, nunca confirmado como real).
 */
export const isMockMode = !isProduction && (!env.leadEspocrmWebhookUrl || !env.leadOctadeskWebhookUrl);
