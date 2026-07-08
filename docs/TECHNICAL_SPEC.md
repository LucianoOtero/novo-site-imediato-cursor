# TECHNICAL_SPEC

## Finalidade
Arquitetura, estrutura de diretórios, convenções de código, contrato da API de leads, variáveis de ambiente e segurança.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 21–23, 43–45, 51. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

## 21. Estrutura de componentes React

Padrão: Server Components por padrão; `'use client'` só onde há interatividade (form, carrossel, sticky, drawer). Props tipadas; validação Zod.

### 21.1 LeadForm — contrato
```ts
const leadSchema = z.object({
  ramo: z.enum(['auto','moto','caminhao','uber','taxi','utilitario','frota','pet','fianca']),
  ddd: z.string().regex(/^\d{2}$/),
  celular: z.string().regex(/^\d{8,9}$/),
  cep: z.string().regex(/^\d{8}$/).optional(),
  nome: z.string().min(2).optional(),
  cpf: z.string().optional(),     // tardio, opcional
  placa: z.string().optional(),
  utm: utmSchema.optional(),      // capturado da URL
})
type LeadInput = z.infer<typeof leadSchema>

interface LeadFormProps {
  ramo: Ramo
  variant?: 'inline' | 'page'   // hero vs /cotacao
  onSuccess?: (lead: LeadInput) => void
}
// estados: idle · validating · submitting · success · error
// a11y: <label> ligado, aria-invalid, aria-describedby, foco ao 1º inválido, role=status no sucesso
```

- **Server (default):** Header, Hero (casca), Benefits, CoverageCards, InsurersGrid, FAQ, Footer, Section, Container, Breadcrumb.
- **Client ('use client'):** LeadForm, Testimonials (Embla), StickyCTA, Header drawer, WhatsAppFAB, CookieConsent, FAQ accordion.
- Animações via Framer Motion (≤240ms, respeita `prefers-reduced-motion`); ícones `lucide-react`; primitives shadcn/ui estendidos com `cva`; `cn()` (clsx + tailwind-merge).

## 22. Estrutura de diretórios

```
imediato-seguros/
├─ app/
│  ├─ (marketing)/
│  │  ├─ page.tsx                 # home
│  │  ├─ seguro-[ramo]/page.tsx   # LPs por ramo (dynamic)
│  │  ├─ coberturas/page.tsx
│  │  ├─ reputacao/page.tsx
│  │  ├─ a-imediato/page.tsx
│  │  ├─ equipe/page.tsx
│  │  ├─ contato/page.tsx
│  │  ├─ cotacao/page.tsx
│  │  └─ obrigado/page.tsx
│  ├─ (legal)/{politica,termos,alerta-de-fraude}/page.tsx
│  ├─ api/lead/route.ts           # recebe form → CRM/e-mail/WhatsApp API
│  ├─ layout.tsx                  # fonts, GTM, providers
│  ├─ sitemap.ts · robots.ts · opengraph-image.tsx
│  └─ globals.css
├─ components/
│  ├─ ui/            # shadcn (button, input, accordion, dialog…)
│  ├─ layout/        # Header, Footer, Container, Section
│  ├─ home/          # Hero, RamoGrid, ComoFunciona, Benefits…
│  ├─ lead/          # LeadForm, ProgressBar, fields
│  ├─ social/        # Testimonials, CredBar, InsurersGrid
│  ├─ cta/           # CTASection, StickyCTA, WhatsAppFAB, CallButton
│  └─ shared/        # FraudAlert, FAQ, Breadcrumb, SchemaJsonLd
├─ lib/
│  ├─ analytics.ts   # trackEvent → dataLayer
│  ├─ schema.ts      # JSON-LD builders
│  ├─ validators.ts  # zod schemas
│  ├─ company.ts     # dados institucionais (seção 55)
│  ├─ ramos.ts       # dados de produto (seção 56)
│  ├─ seguradoras.ts # lista de parceiros
│  ├─ whatsapp.ts    # mensagens por ramo
│  ├─ env.ts         # validação de env
│  └─ utils.ts       # cn(), formatters
├─ content/          # MDX — guias, glossário, institucional
├─ public/           # logos, og, fonts (self-hosted), llms.txt
├─ tailwind (CSS-first) · next.config.mjs · tsconfig.json
└─ .env.example
```

**Dados como fonte única:** os ramos vivem em `lib/ramos.ts`; dados institucionais em `lib/company.ts`. LPs e grids leem desses arquivos.

## 23. Convenções de código

| Tópico | Convenção |
|---|---|
| Linguagem | TypeScript estrito (`strict: true`), sem `any` |
| Componentes | PascalCase; 1 por arquivo; export nomeado |
| Arquivos/pastas | kebab-case nas rotas; PascalCase em componentes |
| Estilo | Tailwind only; sem CSS solto; tokens via config; `cn()` para variantes |
| Estado | RHF + Zod no form; React state local |
| Imports | alias `@/`; ordem externo → interno → tipos |
| Qualidade | ESLint + Prettier + `typecheck` no CI; Husky pre-commit |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`) |
| A11y | eslint-plugin-jsx-a11y; nenhum erro permitido |

## 43. Contrato técnico de captura de leads

### 43.1 Endpoint
```
POST /api/lead              # app/api/lead/route.ts
Content-Type: application/json
Headers: X-Idempotency-Key: <uuid>   # gerado no client por submissão
```

### 43.2 Payload & classificação
Legenda: **O**=obrigatório · **op**=opcional · **U**=usuário · **A**=automático · **S**=sensível · **CRM**/**AN**=enviado a CRM/analytics · **±**=armazenado / **∅**=não.

| Campo | Tipo | Classe | Notas |
|---|---|---|---|
| nome | string | op·U·CRM·± | min 2 |
| ddd | string(2) | O·U·CRM·± | `^\d{2}$` |
| celular | string | O·U·CRM·± | 8–9 dígitos |
| whatsapp | boolean | op·U·CRM·± | default true |
| email | string | op·U·S·CRM+AN(hash)·± | Enhanced Conversions |
| cep | string(8) | op·U·CRM·± | `^\d{8}$` |
| cpf | string | op·U·S·CRM·±mascarado | tardio; nunca em log claro |
| placa | string | op·U·CRM·± | Mercosul/antiga |
| ramo | enum | O·A·CRM+AN·± | auto…fianca |
| produto | string | op·A·CRM·± | variação/plano |
| origem | string | op·A·CRM+AN·± | google_ads/organico/direto |
| campanha·adgroup·keyword·creative | string | op·A·CRM+AN·± | de Ads |
| gclid·wbraid·gbraid | string | op·A·CRM+AN·± | click ids |
| utm_source/medium/campaign/content/term | string | op·A·CRM+AN·± | query/cookie 1st-party |
| landing_page·referrer | string | op·A·CRM+AN·± | URL de entrada/ref |
| device·user_agent | string | op·A·AN·± | mobile/desktop + UA |
| consent | object | O·A·CRM·± | {ad_storage, analytics_storage, ts} |
| timestamp | ISO8601 | O·A·CRM+AN·± | servidor define |
| ip_hash | string | op·A·S·∅claro·±hash | SHA-256(IP+salt) |
| wa_message | string | op·A·∅ | mensagem por ramo |
| honeypot | string | op·A·∅ | deve vir vazio |

### 43.3 Fluxo do handler
```
1. Rate limit + honeypot + Turnstile/reCAPTCHA → 429/400
2. Zod parse (leadSchema) → 422
3. Normalizar telefone → E.164; mascarar CPF; hash IP/email
4. Idempotency: X-Idempotency-Key já visto → 200 (mesma resposta)
5. Dedupe: telefone+ramo em 24h → 200 {duplicate:true}
6. Persistir (DB) + CRM (retry); fallback e-mail se CRM falha
7. dataLayer/Ads: generate_lead (server-side opc. via Measurement Protocol)
8. Responder 201 {leadId, redirect:'/obrigado'}
```

## 44. Validação, deduplicação & fallback

### 44.1 Validação
| Campo | Regra |
|---|---|
| DDD | 2 dígitos, na lista de DDDs válidos do BR; rejeitar inexistentes |
| Celular | 9 dígitos iniciando em 9 (ou 8 legado); remover máscara; rejeitar repetição trivial |
| Normalização | E.164: `+55 + DDD + número` → `+5511987654321` |
| CPF (opc.) | 11 dígitos + DV válidos; senão ignorar (não bloquear lead) |
| Placa (opc.) | Mercosul `^[A-Z]{3}\d[A-Z]\d{2}$` ou antiga `^[A-Z]{3}\d{4}$` |
| CEP (opc.) | 8 dígitos; enriquecer via ViaCEP no servidor (não bloqueante) |

### 44.2 Deduplicação
Chave `hash(telefone_e164 + ramo)` em janela 24h. Duplicado: atualiza o existente (novos UTMs) e responde `200 {duplicate:true}` (UX de sucesso normal). Idempotency key evita duplo-clique.

### 44.3 Resiliência
CRM com retry exponencial 3× (1s/4s/9s); falha → fallback e-mail + persistência `status:'pending_crm'` (fila). Falha total: ainda persiste e responde sucesso (nunca perder lead) + alerta (Sentry/Slack). DB é a fonte da verdade.

### 44.4 Exemplos
```jsonc
// VÁLIDO
{ "ddd":"11","celular":"987654321","ramo":"auto","whatsapp":true,
  "gclid":"Cj0K...","utm_source":"google","utm_medium":"cpc",
  "landing_page":"/seguro-auto","consent":{"ad_storage":"granted",
  "analytics_storage":"granted","ts":"2026-06-30T12:00:00Z"} }
→ 201 { "leadId":"ld_8f3a","redirect":"/obrigado" }
// INVÁLIDO
{ "ddd":"1","celular":"123","ramo":"auto" }
→ 422 { "error":"validation","fields":{"ddd":"DDD inválido","celular":"Número inválido"} }
// DUPLICADO
→ 200 { "duplicate":true,"leadId":"ld_8f3a","redirect":"/obrigado" }
// ERRO (CRM caiu, lead salvo)
→ 201 { "leadId":"ld_9c2b","redirect":"/obrigado","queued":true }
```

## 45. Variáveis de ambiente

`NEXT_PUBLIC_*` é exposto ao client (não-secreto); o resto é server-only.

| Variável | Finalidade | Obrig. | Exemplo | Client? | Risco |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL canônica | Sim | https://segurosimediato.com.br | Sim | Baixo |
| `NEXT_PUBLIC_GTM_ID` | Container GTM | Sim | GTM-PD6J398 | Sim | Baixo |
| `NEXT_PUBLIC_GA4_ID` | GA4 | Sim | G-XXXXXXX | Sim | Baixo |
| `GOOGLE_ADS_CONVERSION_ID` | ID conversão Ads | Sim | AW-123456789 | via GTM | Baixo |
| `GOOGLE_ADS_CONVERSION_LABEL` | label | Sim | abcDEFgh123 | via GTM | Baixo |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | WhatsApp E.164 | Sim | 5511932301422 | Sim | Baixo |
| `NEXT_PUBLIC_CONTACT_PHONE` | telefone exibido | Sim | +551132301422 | Sim | Baixo |
| `LEAD_WEBHOOK_URL` | destino do lead | Sim | https://hook.crm/... | **Não** | Médio |
| `LEAD_WEBHOOK_SECRET` | HMAC do webhook | Sim | whsec_•••• | **Não** | **Alto** |
| `CRM_API_URL` | endpoint CRM | op | https://api.crm/v1 | **Não** | Médio |
| `CRM_API_KEY` | auth CRM | op | crm_•••• | **Não** | **Alto** |
| `LEAD_FALLBACK_EMAIL` | e-mail de fallback | Sim | leads@imediato... | **Não** | Médio |
| `EMAIL_API_KEY` | provedor e-mail | op | re_•••• | **Não** | **Alto** |
| `IP_HASH_SALT` | salt p/ hash de IP | Sim | random-32-bytes | **Não** | **Alto** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | anti-spam | Sim | 0x4AAA... | Sim | Baixo |
| `TURNSTILE_SECRET_KEY` | verificação server | Sim | 0x4AAA-secret | **Não** | **Alto** |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | observabilidade | op | https://...@sentry | parcial | Baixo |
| `DATABASE_URL` | persistência de leads | Sim | postgres://... | **Não** | **Alto** |

> **Segurança:** nenhum segredo recebe `NEXT_PUBLIC_`. `.env.example` versionado com placeholders; `.env.local` nunca commitado. Validar env no boot com Zod (`lib/env.ts`).

## 51. Observabilidade & segurança

**Observabilidade:** Sentry (client+server); logs sem dados sensíveis (CPF mascarado, telefone parcial, IP em hash); monitor de webhook + alerta em falha de lead; Web Vitals RUM → GA4; backup de leads (DB = verdade).

**Segurança de /api/lead:**
| Camada | Implementação |
|---|---|
| Rate limiting | por IP-hash + janela (ex.: 5/min, 30/h); 429 |
| Honeypot | campo oculto → descarta silenciosamente |
| Challenge | Cloudflare Turnstile (preferido) ou reCAPTCHA v3; verificação server |
| Assinatura | webhook ao CRM com HMAC (`LEAD_WEBHOOK_SECRET`) |
| Validação | Zod no servidor; sanitização |
| Idempotência | `X-Idempotency-Key` |

**LGPD:** Consent Mode v2 + banner; tags só após consentimento (estado gravado com o lead); base legal (consentimento/legítimo interesse); minimização (CPF/placa opcionais/tardios); retenção (ex.: 24 meses) + exclusão a pedido; anonimização (IP hash, CPF mascarado, e-mail hasheado p/ Enhanced Conversions).

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Nenhum conteúdo foi resumido, reinterpretado ou inventado nesta extração.
