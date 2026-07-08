# CURSOR_IMPLEMENTATION_PLAN

## Finalidade
Plano mestre de condução do Cursor e prompts recomendados por issue.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 24, 48–49, 54, 70. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

## 24. Recomendações de implementação para o Cursor

### 24.1 Ordem de construção (prompts)
1. **Scaffold:** Next.js 15 (App Router) + TS + Tailwind 4 + shadcn/ui; tokens da seção 8.
2. **Layout base:** fonts self-hosted (next/font), `layout.tsx` com GTM, Container, Section, Header, Footer.
3. **Dados:** `lib/company.ts`, `lib/ramos.ts`, `lib/seguradoras.ts`, `content/`.
4. **Componentes de seção:** Hero, CredBar, RamoGrid, Benefits, CoverageCards, InsurersGrid, Testimonials, FAQ, CTAs.
5. **LeadForm** (RHF+Zod) + `api/lead` + /cotacao + /obrigado.
6. **Home** compondo seções; depois **template de LP de ramo** dinâmico.
7. **SEO:** `generateMetadata`, JSON-LD, sitemap, robots, OG.
8. **Analytics:** `lib/analytics.ts`, eventos da seção 20, Consent Mode.
9. **Polimento:** animações leves, estados de loading/erro, Lighthouse.

### 24.2 Boas práticas de prompt
Colar esta spec no contexto e referenciar seções por número; um componente por vez; TypeScript estrito + tokens (proibir cores/spacings mágicos); após cada componente rodar typecheck + lint.

**Guard-rails de negócio (não violar):** sem checkout, pagamento, contratação automática. Toda conversão = contato humano. Dados regulatórios (SUSEP 252174522, CNPJ 45.998.165/0001-32) e preços vêm de `lib/company.ts` / `lib/ramos.ts` — nunca hard-coded.

## 48. Como conduzir o Cursor sem perder controle

### 48.1 Regras de ouro
- Nunca "implemente o projeto inteiro". Uma issue por vez.
- Cada prompt referencia 1–3 seções/arquivos — não o documento todo.
- Toda entrega passa por typecheck + lint + teste manual.
- Sem bibliotecas novas sem justificativa.
- Sem cores/espaçamentos fora dos tokens (8/28).
- Sem hardcode de telefone, SUSEP, CNPJ, preços (env / `lib/company.ts` / `lib/ramos.ts`).
- Proibido: checkout, pagamento, contratação automática.
- Fase 1: nada de CMS, blog ou pSEO.
- Antes de codar, listar arquivos a alterar; depois, explicar o que ficou fora.

### 48.2 Template de prompt
```
Você está implementando APENAS a issue [#X — título].
Referência: seções [A, B, C] da especificação (cole os trechos).
Escopo (MVP_SCOPE.md): NÃO implemente nada fora da issue.

Restrições:
- Tokens de design apenas (sem cor/spacing mágico).
- Sem libs novas sem justificar. Sem hardcode de telefone/SUSEP/CNPJ/preço.
- Sem checkout/pagamento. Sem CMS/blog/pSEO nesta fase.
- TypeScript estrito; componentes acessíveis (WCAG AA).

Antes de codar: liste os arquivos que serão criados/alterados e aguarde.
Depois de codar: rode `typecheck` e `lint` e cole o resultado.
Ao final: explique o que foi feito, eventos de analytics tocados, e o que ficou fora.
```

## 49. Issues implementáveis (Fase 1)

Ordem = dependência. (Prompts prontos na seção 54.)

| # | Issue | Arquivos prováveis | Seções | Aceite |
|---|---|---|---|---|
| 1 | Scaffold Next 15 + Tailwind 4 + shadcn/ui + TS | raiz, tsconfig, globals.css, next.config | 22,23,24 | build limpo; lint/typecheck |
| 2 | Tokens DS (`@theme`) | globals.css, lib/utils | 8,12,13,28 | tokens; sem valor mágico |
| 3 | Layout base, fontes, providers, GTM | app/layout.tsx, lib/analytics | 11,19,20 | fonts next/font; GTM; Consent |
| 4 | lib/company.ts | lib/company.ts | 55 | tipo completo; nada hardcoded |
| 5 | lib/ramos.ts | lib/ramos.ts | 31,56 | 10 ramos; getRamo(slug) |
| 6 | Header + Drawer mobile | components/layout/Header | 5,29,30 | sticky; focus trap; Esc |
| 7 | Footer legal/comercial | components/layout/Footer | 5,9,55 | SUSEP/CNPJ de company |
| 8 | Base: Button, Section, Container, Badge, Chip | components/ui/* | 29 | cva; a11y; ≥44px |
| 9 | CredBar | components/social/CredBar | 16,29,55 | números com contexto |
| 10 | InsuranceCard + RamoGrid | components/home/* | 29,31,56 | lê de ramos; hover lift |
| 11 | LeadForm multi-step (RHF+Zod) | components/lead/*, lib/validators | 21,29,30,44 | 2 campos viram lead; eventos |
| 12 | /api/lead | app/api/lead/route.ts, lib/leads | 43,44,51 | idempotency; retry+fallback |
| 13 | /cotacao | app/(marketing)/cotacao | 6,21 | form page variant |
| 14 | /obrigado | app/(marketing)/obrigado | 6,15,20 | SuccessState; dispara conversão; noindex |
| 15 | Home | app/(marketing)/page.tsx | 6,16 | reutiliza blocos; LCP hero; 1 H1 |
| 16 | Template /seguro-[ramo] | app/(marketing)/seguro-[ramo] | 31,56 | generateStaticParams; message match |
| 17 | FAQ + schema | components/shared/FAQ, lib/schema | 29,32 | ARIA; Rich Results |
| 18 | GTM/dataLayer | lib/analytics.ts | 19,20 | eventos com ramo; DebugView |
| 19 | WhatsApp/call tracking + FAB + StickyCTA | components/cta/*, lib/whatsapp | 16,29,34 | wa.me por ramo; eventos |
| 20 | SEO metadata + JSON-LD | lib/schema, metadata, opengraph-image | 17,32 | title/desc únicos; OG |
| 21 | sitemap.ts + robots.ts | app/sitemap, app/robots | 17,32 | URLs corretas; bloqueios |
| 22 | FraudAlert (banner + página) | components/shared/FraudAlert, app/(legal)/alerta-de-fraude | 1,29,55 | único uso do vermelho; dismiss persiste |
| 23 | QA mobile-first + a11y | testes/ajustes | 14,26,37,53 | 0 a11y crítica; ≥44px; sem CLS |
| 24 | Deploy + env + redirects | next.config, lib/env | 45,47 | env validado; 301s no ar |

**Fora de escopo (todas):** blog, glossário, calculadoras, pSEO, área do cliente, portal do corretor, CMS, Storybook completo, A/B, IA, integrações.

## 54. Prompts prontos por issue (Cursor)

### 54.0 Bloco de regras padrão (vale para toda issue)
```
REGRAS OBRIGATÓRIAS (bloco padrão):
- Não implemente nada fora do escopo desta issue.
- Não crie componentes ou páginas não solicitadas.
- Não adicione bibliotecas novas sem justificar antes.
- TypeScript estrito. Tailwind CSS 4 + tokens do Design System (seções 8/28).
- Sem valores mágicos de cor, espaçamento ou sombra.
- Sem hardcode de dados institucionais/regulatórios/telefones/preços/CNPJ
  → tudo vem de lib/company.ts, lib/ramos.ts ou env (seções 55/56/45).
- Sem checkout, pagamento ou contratação automática.
- Sem CMS, blog ou pSEO nesta fase (MVP_SCOPE, seção 41).
- Antes de alterar arquivos: liste o plano de execução e aguarde.
- Depois de implementar: rode `typecheck` e `lint` e cole o resultado.
- Ao final: explique o que foi feito, o que ficou fora e os arquivos alterados.
```

### 54.1 Prompts
```
### Issue 01 — Scaffold Next.js 15 + Tailwind 4 + shadcn/ui
Referência: seções 22, 23, 24.   Regras: bloco padrão.
Objetivo: criar o projeto base (App Router, TS estrito, Tailwind 4,
  shadcn/ui, ESLint/Prettier, alias @/).
Arquivos: package.json, tsconfig.json, next.config.mjs, app/globals.css,
  app/layout.tsx, components.json, .eslintrc, .prettierrc.
Aceite: build limpo; typecheck/lint ok; shadcn inicializado.
Fora: qualquer componente de UI de negócio; conteúdo.

### Issue 02 — Tokens do Design System
Referência: seções 8, 12, 13, 28.   Regras: bloco padrão.
Objetivo: declarar tokens (cores, raios, sombras, fontes, gradientes,
  motion) via @theme no globals.css; helper cn() em lib/utils.ts.
Arquivos: app/globals.css, lib/utils.ts.
Aceite: tokens utilizáveis em classes; sem valor mágico; contraste AA.
Fora: aplicar em componentes (vem depois).

### Issue 03 — Layout base, fontes self-hosted, providers, GTM
Referência: seções 11, 19, 20.   Regras: bloco padrão.
Objetivo: app/layout.tsx com next/font (Manrope+Inter), GTM, Consent
  Mode v2 default, providers; metadata base.
Arquivos: app/layout.tsx, lib/analytics.ts, components/consent/*.
Aceite: fonts sem requisição externa; GTM carrega; consent default 'denied'.
Fora: banner visual completo além do necessário.

### Issue 04 — lib/company.ts (dados institucionais)
Referência: seção 55.   Regras: bloco padrão.
Objetivo: criar a fonte única tipada (CompanyConfig) com valores
  observados, marcando os 'A CONFIRMAR' antes de produção.
Arquivos: lib/company.ts.
Aceite: tipo completo; export const company; nada hardcoded em JSX.
Fora: consumo nos componentes.

### Issue 05 — lib/ramos.ts (dados de produto)
Referência: seções 31, 56.   Regras: bloco padrão.
Objetivo: array tipado InsuranceBranch[] com os 10 ramos (slug, preço,
  headline, SEO, ads, benefícios, objeções, coberturas, FAQ, whatsapp).
Arquivos: lib/ramos.ts.
Aceite: 10 ramos tipados; getRamo(slug) helper; preços de company/config.
Fora: renderização.

### Issue 06 — Header + Drawer mobile
Referência: seções 5, 29, 30.   Regras: bloco padrão.
Objetivo: Header sticky/scrolled + MegaMenu desktop + Drawer mobile,
  CTAs Cotar/Ligar de lib/company.
Arquivos: components/layout/Header.tsx, Drawer, nav data.
Aceite: focus trap; Esc fecha; ≥44px; encolhe no scroll.
Fora: footer; conteúdo de páginas.

### Issue 07 — Footer legal/comercial
Referência: seções 5, 9, 55.   Regras: bloco padrão.
Objetivo: Footer com SUSEP/CNPJ/endereço/ouvidoria/legais/social de
  lib/company; bloco de fraude resumido.
Arquivos: components/layout/Footer.tsx.
Aceite: zero hardcode; links legais corretos; acessível.
Fora: página de fraude (issue 22).

### Issue 08 — Base: Button, Section, Container, Badge, Chip
Referência: seção 29.   Regras: bloco padrão.
Objetivo: primitives com cva (variantes/estados) sobre shadcn.
Arquivos: components/ui/{button,section,container,badge,chip}.tsx.
Aceite: variantes da seção 29; foco visível; a11y.
Fora: componentes de negócio.

### Issue 09 — CredBar
Referência: seções 16, 29, 55.   Regras: bloco padrão.
Objetivo: barra de prova social (nota, avaliações, anos, SUSEP, nº
  seguradoras) de lib/company.
Arquivos: components/social/CredBar.tsx.
Aceite: números com contexto textual (SR); responsivo.
Fora: carrossel de reviews.

### Issue 10 — InsuranceCard + RamoGrid
Referência: seções 29, 31, 56.   Regras: bloco padrão.
Objetivo: card de ramo + grid lendo lib/ramos; Auto em destaque.
Arquivos: components/home/{InsuranceCard,RamoGrid}.tsx.
Aceite: preço 'a partir de' da lib; hover lift; link 'Cotar {ramo}'.
Fora: página da Home.

### Issue 11 — LeadForm multi-step
Referência: seções 21, 29, 30, 44.   Regras: bloco padrão.
Objetivo: form 3 passos (RHF+Zod), só DDD+celular obrigatórios; UTM/gclid
  capturados; estados idle/validating/submitting/success/error; eventos.
Arquivos: components/lead/{LeadForm,ProgressBar,fields}.tsx, lib/validators.ts.
Aceite: 2 campos viram lead; valida sem reload; emite form_start/step/lead.
Fora: a rota /api/lead (issue 12).

### Issue 12 — /api/lead
Referência: seções 43, 44, 51.   Regras: bloco padrão.
Objetivo: Route Handler com Zod, normalização E.164, idempotency, dedupe
  24h, persistência, retry+fallback e-mail, rate limit, honeypot, Turnstile.
Arquivos: app/api/lead/route.ts, lib/leads/*, lib/env.ts.
Aceite: respostas 201/422/200-dup/429; lead nunca perdido; alerta em falha.
Fora: UI; CRM real (mockar via env).

### Issue 13 — /cotacao
Referência: seções 6, 21.   Regras: bloco padrão.
Objetivo: página com LeadForm variant 'page' + lateral de confiança.
Arquivos: app/(marketing)/cotacao/page.tsx.
Aceite: form funcional; metadata; mobile-first.

### Issue 14 — /obrigado
Referência: seções 6, 15, 20.   Regras: bloco padrão.
Objetivo: SuccessState + próximos passos; dispara generate_lead/Ads;
  página noindex.
Arquivos: app/(marketing)/obrigado/page.tsx.
Aceite: conversão dispara 1×; noindex; CTA WhatsApp.

### Issue 15 — Home
Referência: seções 6, 16.   Regras: bloco padrão.
Objetivo: compor seções (Hero, CredBar, RamoGrid, ComoFunciona, Benefits,
  CTA-meio, InsurersGrid, CoverageCards, Testimonials, FAQ, CTA-final).
Arquivos: app/(marketing)/page.tsx, components/home/*.
Aceite: 1 H1; LCP no hero; reutiliza blocos prontos.
Fora: criar novos componentes do zero (devem existir).

### Issue 16 — Template /seguro-[ramo]
Referência: seções 31, 56.   Regras: bloco padrão.
Objetivo: rota dinâmica + generateStaticParams; renderiza de lib/ramos
  (message match, coberturas, objeções, FAQ do ramo).
Arquivos: app/(marketing)/seguro-[ramo]/page.tsx.
Aceite: 10 LPs geradas; sem copy duplicada manual; metadata por ramo.
Fora: pSEO (cidade/modelo).

### Issue 17 — FAQ + schema
Referência: seções 29, 32.   Regras: bloco padrão.
Objetivo: Accordion acessível + FAQPage JSON-LD de lib/ramos/content.
Arquivos: components/shared/FAQ.tsx, lib/schema.ts.
Aceite: ARIA correto; Rich Results válido; faq_open dispara.

### Issue 18 — GTM/dataLayer
Referência: seções 19, 20.   Regras: bloco padrão.
Objetivo: lib/analytics.ts (trackEvent → dataLayer) + todos os eventos
  da seção 20 com parâmetro ramo.
Arquivos: lib/analytics.ts.
Aceite: eventos no DebugView; tipados; sem PII em claro.

### Issue 19 — WhatsApp/call tracking + FAB + StickyCTA
Referência: seções 16, 29, 34.   Regras: bloco padrão.
Objetivo: WhatsAppFAB, StickyCTA, CallButton; wa.me por ramo (lib/whatsapp);
  eventos whatsapp_click/call_click.
Arquivos: components/cta/*, lib/whatsapp.ts.
Aceite: msg pré-preenchida por ramo; abre no celular; eventos disparam.

### Issue 20 — SEO metadata + JSON-LD
Referência: seções 17, 32.   Regras: bloco padrão.
Objetivo: generateMetadata por página + JSON-LD (InsuranceAgency,
  Organization, Breadcrumb) de lib/company/ramos.
Arquivos: lib/schema.ts, metadata helpers, opengraph-image.tsx.
Aceite: title/desc únicos; OG por página; Rich Results válido.
Fora: Article/blog schema (Fase 3).

### Issue 21 — sitemap.ts + robots.ts
Referência: seções 17, 32.   Regras: bloco padrão.
Objetivo: sitemap dinâmico (home, ramos, institucionais) + robots
  (bloquear /api, /obrigado noindex).
Arquivos: app/sitemap.ts, app/robots.ts.
Aceite: URLs corretas; lastmod; aponta sitemap.
Fora: pSEO.

### Issue 22 — FraudAlert (banner + página)
Referência: seções 1, 29, 55.   Regras: bloco padrão.
Objetivo: banner dismissível (cookie) + /alerta-de-fraude; texto atual
  preservado; único uso do vermelho.
Arquivos: components/shared/FraudAlert.tsx, app/(legal)/alerta-de-fraude/page.tsx.
Aceite: dismiss persiste; página indexável; acessível.

### Issue 23 — QA mobile-first + a11y
Referência: seções 14, 26, 37, 53.   Regras: bloco padrão.
Objetivo: varredura 360→1440, teclado, axe; corrigir o que falhar.
Aceite: 0 violação a11y crítica; alvos ≥44px; sem CLS.
Fora: Storybook completo (Fase 2).

### Issue 24 — Preparar deploy + env + redirects
Referência: seções 45, 47.   Regras: bloco padrão.
Objetivo: .env.example + validação (lib/env.ts) + redirects 301 do
  mapa de migração em next.config.
Arquivos: .env.example, lib/env.ts, next.config.mjs.
Aceite: env validado no boot; 301s ativos; build de produção ok.
Fora: go-live (checklist seção 60).
```

> **Uso:** copie o bloco padrão (54.0) + o prompt da issue. Rode uma por vez, na ordem. Não inicie issue com dependência aberta (Ready, seção 53).

## 70. Prompts de preparação antes da Issue 01

Mesmo padrão da seção 54 (objetivo · arquivos · regras · aceite · fora).

```
### Prompt A — Dividir a especificação em arquivos /docs
Objetivo: criar os arquivos da seção 40 a partir de ESPECIFICACAO.md,
  preservando conteúdo e SEM alterar decisões.
Arquivos: /docs/{PRODUCT_SPEC,MVP_SCOPE,DESIGN_SYSTEM,TECHNICAL_SPEC,
  SEO_ANALYTICS_SPEC,CONTENT_STRATEGY,CURSOR_IMPLEMENTATION_PLAN,QA_CHECKLIST,ROADMAP}.md
Regras: não resumir nem reinterpretar; copiar as seções indicadas no índice 40.
Aceite: cada arquivo contém exatamente as seções mapeadas; nada perdido.
Fora: escrever código; mudar conteúdo.

### Prompt B — Criar DECISIONS.md
Objetivo: registrar os ADRs iniciais (seção 67.1) no modelo padrão.
Arquivos: /docs/DECISIONS.md
Regras: status 'Aceita' para decisões já firmadas; uma ADR por decisão.
Aceite: 8 ADRs presentes e datados.
Fora: novas decisões não listadas.

### Prompt C — Criar .env.example
Objetivo: gerar .env.example a partir da seção 45, marcando segredos.
Arquivos: .env.example
Regras: nenhum valor real; segredos nunca com NEXT_PUBLIC_; comentar cada var.
Aceite: todas as variáveis da seção 45 presentes com placeholders.
Fora: .env.local; valores reais.

### Prompt D — Criar checklist de dados oficiais
Objetivo: gerar /docs/DADOS_OFICIAIS.md a partir da seção 64.
Arquivos: /docs/DADOS_OFICIAIS.md
Regras: manter coluna Confirmado? como ☐; preservar marcações CRÍTICO/RESOLVER.
Aceite: tabela completa; regra final incluída.
Fora: preencher dados não confirmados.

### Prompt E — Criar inventário de URLs
Objetivo: gerar /docs/INVENTARIO_URLS.md a partir da seção 65.
Arquivos: /docs/INVENTARIO_URLS.md
Regras: coluna Ação só com valores permitidos; incluir checklist 65.2.
Aceite: tabela + checklist; regra final incluída.
Fora: decidir ações sem dados de tráfego.

### Prompt F — Criar backlog inicial (issues)
Objetivo: transformar as seções 49/54 em issues GitHub/Linear.
Arquivos: /docs/BACKLOG.md (ou exportação para a ferramenta).
Regras: 1 issue por linha da seção 49; incluir aceite e 'fora de escopo'.
Aceite: 24 issues da Fase 1, na ordem de dependência.
Fora: issues de fases 2+.
```

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. **Nota importante:** o `PLANO_IMPLEMENTACAO.md` (rev. 4.1) já incorpora e amplia a ordem de execução acima (adicionando as Issues 03A, 03B, 23A, 23B, P-09 e P-10) — em caso de qualquer diferença de ordem, prevalece o `PLANO_IMPLEMENTACAO.md` como plano operacional vigente. Nenhum conteúdo desta extração foi resumido, reinterpretado ou inventado.
