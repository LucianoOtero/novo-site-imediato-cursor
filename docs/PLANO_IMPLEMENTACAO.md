# Plano de Implementação — Imediato Seguros

> **Documento canônico consolidado (rev. 4.1).** Este é o único plano vigente — os arquivos intermediários (`_v2`, `_v4`, `_rev4_1`) foram descontinuados e o histórico está preservado nas seções "Alterações" ao final. Revisão estrutural e operacional sobre a rev. 4 (aprovada); estrutura principal preservada, apenas correções de inconsistências, dependências e reforços operacionais.
> Consolida: base (v1) + correção estrutural (v2: env, analytics mínimo, staging seguro, anti-hardcode) + auditoria de JavaScript legado do Webflow (v3, Issue P-09) + auditoria e migração seletiva de SVGs/assets visuais (v4, Issue P-10) + **consolidação operacional (rev. 4.1: papel bloqueante de P-09/P-10, antecipação de 23A/23B, ADR-0009 Cloudinary, Cloudinary como dependência externa, QA e prontidão)**.
> Documento de engenharia/produto derivado da fonte canônica `ESPECIFICACAO v3.md` (72 seções, Partes I–V).
> Esta é uma etapa de **planejamento**: não contém código de produção e não substitui a especificação.
> Regras de dados: nada é inventado. Toda informação não confirmada aparece como `TODO` / `PENDING` / `A_CONFIRMAR`.
> Stack alvo: Next.js 15 (App Router) · TypeScript estrito · Tailwind CSS 4 · shadcn/ui · Framer Motion · React Hook Form · Zod · GTM/GA4/Google Ads · Consent Mode v2 · Sentry (se aplicável) · Vercel.

---

## 1. Resumo executivo do projeto

**O que será construído.** Um novo site institucional e de conversão para a Imediato Soluções em Seguros, em Next.js 15, substituindo o site atual em Webflow. A Fase 1 entrega: Home, landing pages por ramo via template dinâmico (`/seguro-[ramo]`), `/cotacao`, `/obrigado`, páginas institucionais (`/a-imediato`, `/equipe`, `/reputacao`, `/contato`), páginas legais (`/politica-de-privacidade`, `/termos`, `/alerta-de-fraude`) e 404/500.

**Qual problema o redesign resolve.** O site atual tem credibilidade real (25+ anos, SUSEP, nota 4.8 com +2.000 avaliações), mas a "embalagem" está defasada: performance fraca no mobile (LCP/TBT altos), formulário com fricção (pede CPF/placa cedo demais), CTAs insuficientes, prova social diluída, ausência de Schema.org e instrumentação de tracking rasa. O redesign é de **forma e engenharia**, não de substância.

**Objetivo comercial.** Aumentar a conversão de visitantes (majoritariamente vindos de Google Ads no celular) em **leads** entregues ao time comercial, reduzir CPC/CPA via melhor Quality Score (performance + message match) e preservar o SEO atual durante a migração.

**Modelo de conversão.** Lead → contato humano. Toda conversão termina em **formulário**, **WhatsApp** ou **telefone**. Não há checkout, pagamento online nem contratação automática. O vendedor compara seguradoras e fecha fora do site.

**Fora do escopo da Fase 1.** Blog, glossário, calculadoras, pSEO (cidade/estado/montadora/modelo/perfil), área do cliente, portal do corretor, CMS headless, Storybook completo, testes A/B, assistente de IA e integrações diretas com seguradoras. Tudo isso é Fase 2+.

**Estratégia geral de implementação.** Documentar primeiro (`/docs`), travar escopo (`MVP_SCOPE.md`), confirmar dados oficiais (gate da seção 64/68 da spec), criar dados como fonte única (`lib/company.ts`, `lib/ramos.ts`) e então implementar **uma issue por vez** na ordem de dependência (seção 49/54 da spec), começando pela fundação/tokens/dados/componentes — **nunca pela Home**. Cada entrega passa por typecheck, lint, revisão de diff e checagem de hardcode. Migração com redirects 301 e plano de rollback de até 30 minutos.

---

## 2. Premissas e restrições obrigatórias

Estas premissas são inegociáveis e derivam das seções 41, 48, 55, 56 e 72 da especificação:

- **Modelo lead → contato humano.** O site captura e encaminha; humanos fecham.
- **Sem checkout.** Nenhuma etapa de carrinho/seleção de plano com finalização.
- **Sem pagamento online.** Nenhuma cobrança, PIX, cartão ou boleto no site.
- **Sem contratação automática.** Nenhuma emissão de apólice ou contrato pelo site.
- **Fase 1 sem:** blog, CMS headless, pSEO, área logada, IA ou integrações com seguradoras.
- **Dados institucionais vêm de `lib/company.ts`.** Razão social, CNPJ, SUSEP, endereço, telefones, WhatsApp, ouvidoria, e-mail, horário, nota/avaliações, anos de experiência, links sociais e URLs legais.
- **Dados dos ramos vêm de `lib/ramos.ts`.** Slug, preço "a partir de", headline, SEO, ads, benefícios, objeções, coberturas, FAQ e mensagem de WhatsApp por ramo.
- **Uso obrigatório de tokens de design.** Cores, raios, sombras, fontes, gradientes e motion via `@theme` (Tailwind 4 CSS-first). Proibido valor mágico de cor/spacing/sombra.
- **Proibição de hardcode em JSX** de telefone, CNPJ, SUSEP, preços e WhatsApp. Tudo vem de `lib/company.ts`, `lib/ramos.ts` ou variáveis de ambiente. Lint/PR review rejeita.
- **Implementação por issues pequenas.** Cada prompt referencia 1–3 seções/arquivos, nunca o documento inteiro.
- **Uma issue por vez.** Nunca "implemente o projeto inteiro".
- **Não começar pela Home.** A Home (Issue 15) só é montada depois que fundação, tokens, dados e componentes reutilizáveis existirem; caso contrário o Cursor recria componentes inline e quebra a consistência.

**Guard-rails de negócio adicionais:** sem bibliotecas novas sem justificativa; antes de codar, listar arquivos a alterar; depois de codar, rodar typecheck + lint; ao final, explicar o que ficou fora.

---

## 3. Arquitetura geral proposta

**Framework.** Next.js 15 com **App Router**, renderização SSG/ISR para HTML pronto ao crawler e Core Web Vitals verdes. Server Components por padrão; `'use client'` somente onde há interatividade (LeadForm, Testimonials/Embla, StickyCTA, Drawer do Header, WhatsAppFAB, CookieConsent, FAQ accordion).

**Rotas públicas e grupos de rotas.**
- Grupo `(marketing)`: Home, `/seguro-[ramo]` (template dinâmico), `/coberturas`, `/seguradoras-parceiras`, `/reputacao`, `/a-imediato`, `/equipe`, `/contato`, `/cotacao`, `/obrigado`.
- Grupo `(legal)`: `/politica-de-privacidade`, `/termos`, `/alerta-de-fraude`.
- API: `app/api/lead/route.ts` (POST) — recebe o formulário, valida, deduplica, persiste e encaminha a CRM/e-mail.

**Camadas.**
- `lib/` — fonte de dados e lógica de plataforma: `company.ts`, `ramos.ts`, `seguradoras.ts`, `whatsapp.ts`, `analytics.ts`, `schema.ts`, `validators.ts`, `env.ts`, `utils.ts`, `motion.ts`, `assets.ts` (centraliza caminhos de logos/imagens/Cloudinary — ver Issue P-10).
- `components/` — `ui/` (shadcn estendido com `cva`), `layout/`, `home/`, `lead/`, `social/`, `cta/`, `shared/`.
- `content/` — MDX para conteúdo estável (institucional, glossário/guias quando aplicável). Na Fase 1 é mínimo.

**Estratégia de metadata.** `generateMetadata` por página (title < 60c, description < 155c sem keyword stuffing); canonical em todas; Open Graph + Twitter Cards com `opengraph-image.tsx`. Dados de SEO por ramo vêm de `lib/ramos.ts` (`seo.{title,description,canonicalPath}`).

**Estratégia de JSON-LD.** Builders tipados em `lib/schema.ts`: `InsuranceAgency` (raiz, com `aggregateRating` 4.8/2000 — `A_CONFIRMAR`), `Organization` (CNPJ/fundação — `A_CONFIRMAR`), `FAQPage`, `BreadcrumbList`. Schema de `Article`/`Person` fica para a Fase 3.

**Estratégia de analytics.** `lib/analytics.ts` expõe `trackEvent(event, params)` que faz `window.dataLayer.push(...)`. GA4 é a fonte de verdade; GTM (`GTM-PD6J398` — `A_CONFIRMAR`) é a camada de tags; o `dataLayer` é o contrato. Eventos nomeados em `snake_case` (seção 20 da spec).

**Estratégia de Consent Mode.** Consent Mode v2 com defaults `denied` antes de qualquer tag; banner LGPD com "Aceitar todos · Rejeitar · Preferências"; `gtag('consent','update',...)` ao escolher. O **formulário sempre funciona**, mesmo sem consentimento de marketing (finalidade = contato solicitado).

### 3.1 Árvore de diretórios inicial

```
imediato-seguros/
├─ app/
│  ├─ (marketing)/
│  │  ├─ page.tsx                 # Home
│  │  ├─ seguro-[ramo]/page.tsx   # LPs por ramo (dynamic + generateStaticParams)
│  │  ├─ coberturas/page.tsx
│  │  ├─ seguradoras-parceiras/page.tsx
│  │  ├─ reputacao/page.tsx
│  │  ├─ a-imediato/page.tsx
│  │  ├─ equipe/page.tsx
│  │  ├─ contato/page.tsx
│  │  ├─ cotacao/page.tsx
│  │  └─ obrigado/page.tsx        # noindex
│  ├─ (legal)/
│  │  ├─ politica-de-privacidade/page.tsx
│  │  ├─ termos/page.tsx
│  │  └─ alerta-de-fraude/page.tsx
│  ├─ api/lead/route.ts           # captura de leads
│  ├─ layout.tsx                  # fonts (next/font), GTM, Consent, providers
│  ├─ sitemap.ts · robots.ts · opengraph-image.tsx
│  ├─ not-found.tsx               # 404
│  └─ globals.css                 # @theme (tokens Tailwind 4 CSS-first)
├─ components/
│  ├─ ui/            # shadcn: button, input, accordion, dialog, badge, chip…
│  ├─ layout/        # Header, Drawer, Footer, Container, Section
│  ├─ home/          # Hero, RamoGrid, InsuranceCard, ComoFunciona, Benefits…
│  ├─ lead/          # LeadForm, ProgressBar, fields
│  ├─ social/        # Testimonials, CredBar, InsurersGrid
│  ├─ cta/           # CTASection, StickyCTA, WhatsAppFAB, CallButton
│  ├─ consent/       # CookieConsent banner
│  └─ shared/        # FraudAlert, FAQ, Breadcrumb, SchemaJsonLd
├─ lib/
│  ├─ analytics.ts · schema.ts · validators.ts
│  ├─ company.ts · ramos.ts · seguradoras.ts · whatsapp.ts
│  ├─ env.ts · utils.ts · motion.ts · assets.ts · leads/
├─ content/          # MDX (institucional; mínimo na Fase 1)
├─ public/           # ver estrutura de assets (Issue P-10)
│  ├─ logos/         # imediato-logo.svg + seguradoras/*.svg
│  ├─ icons/custom/  # ícones proprietários (não cobertos por Lucide)
│  ├─ decorative/    # elementos decorativos aprovados no novo DS
│  ├─ images/        # fotos reais + images/fallback/
│  └─ og · fonts (self-hosted) · llms.txt
├─ docs/             # artefatos de produto/engenharia (ver seção 4)
├─ next.config.mjs · tsconfig.json · components.json
└─ .env.example
```

> **Dados como fonte única:** ramos vivem em `lib/ramos.ts`; institucional em `lib/company.ts`. LPs e grids leem desses arquivos — nunca duplicam copy/dados em JSX.

---

## 4. Documentação a criar em `/docs`

Estes arquivos fatiam a especificação canônica em documentos focados (cada prompt do Cursor referencia 1–3, nunca o todo). Para cada arquivo: **finalidade · seções de origem · quando é usado · quem atualiza · bloqueante?**

- **`/docs/PRODUCT_SPEC.md`** — Finalidade: contexto de produto/negócio, jornada, conversão e LPs. Origem: seções 1–7, 15–16, 31. Quando: sempre em contexto de prompts de produto/UX. Atualiza: Produto. Bloqueante: Não (mas recomendado antes de páginas).
- **`/docs/MVP_SCOPE.md`** — Finalidade: trava de escopo da Fase 1 (incluído vs fora). Origem: seção 41. Quando: em **todo** prompt. Atualiza: Tech Lead. Bloqueante: **Sim** (gate seção 68).
- **`/docs/DESIGN_SYSTEM.md`** — Finalidade: identidade, tokens, componentes, motion, imagens. Origem: seções 8–14, 28–30, 35. Quando: issues de UI. Atualiza: Design. Bloqueante: Não (necessário antes de componentes).
- **`/docs/TECHNICAL_SPEC.md`** — Finalidade: arquitetura, diretórios, convenções, API de leads, env, segurança. Origem: seções 21–23, 43–45, 51. Quando: issues técnicas/infra. Atualiza: Dev. Bloqueante: Não (necessário antes de `/api/lead`).
- **`/docs/SEO_ANALYTICS_SPEC.md`** — Finalidade: SEO técnico, schema, GTM/GA4/Ads, eventos, GEO. Origem: seções 17–20, 32–33. Quando: issues de SEO/analytics. Atualiza: SEO/Marketing. Bloqueante: Não.
- **`/docs/CONTENT_STRATEGY.md`** — Finalidade: voz, microcopy, estratégia de CMS. Origem: seções 34, 36. Quando: textos/copy. Atualiza: Marketing. Bloqueante: Não.
- **`/docs/CURSOR_IMPLEMENTATION_PLAN.md`** — Finalidade: plano mestre + prompts por issue. Origem: seções 24, 48–49, 54, 70. Quando: execução. Atualiza: Tech Lead. Bloqueante: Não (mas guia toda a execução).
- **`/docs/QA_CHECKLIST.md`** — Finalidade: testes, checklists e Ready/Done. Origem: seções 25–27, 37, 53, 58, 60. Quando: gate de entrega de cada issue. Atualiza: QA. Bloqueante: Não (mas bloqueia merge/go-live).
- **`/docs/ROADMAP.md`** — Finalidade: fases, critérios de saída, migração, riscos, baseline. Origem: seções 38, 42, 46–47, 52, 62, 66. Quando: planejamento. Atualiza: Produto. Bloqueante: Não.
- **`/docs/DECISIONS.md`** — Finalidade: ADRs (decisões arquiteturais). Origem: seção 67.1 + ADR-0009 (rev. 4.1). Quando: a cada decisão. Atualiza: Tech Lead. Bloqueante: Não (recomendado registrar os 9 ADRs iniciais, incluindo **ADR-0009 — Uso de Cloudinary**, status Proposta).
- **`/docs/CHANGELOG.md`** — Finalidade: histórico de mudanças (Conventional Commits). Origem: convenção da seção 23/58. Quando: a cada release. Atualiza: Dev. Bloqueante: Não.
- **`/docs/DADOS_OFICIAIS.md`** — Finalidade: checklist de dados oficiais a confirmar. Origem: seção 64. Quando: gate antes de páginas comerciais. Atualiza: Comercial/Jurídico/Marketing. Bloqueante: **Sim** (itens CRÍTICO/RESOLVER).
- **`/docs/INVENTARIO_URLS.md`** — Finalidade: inventário e mapa de redirects da migração. Origem: seções 47, 59, 65. Quando: antes do go-live. Atualiza: SEO/Dev. Bloqueante: Importante (não 100% bloqueante para scaffold).
- **`/docs/BASELINE_METRICS.md`** — Finalidade: coleta de baseline (CWV, conversão, CPA, orgânico). Origem: seções 46, 66. Quando: antes do go-live (medir o site atual). Atualiza: Dev/Marketing/SEO. Bloqueante: Importante (métricas obrigatórias antes do go-live).
- **`/docs/LEGACY_JS_AUDIT.md`** — Finalidade: mapa completo do JavaScript legado do Webflow (scripts, custom code, GTM, dataLayer, integrações). Origem: seção "Auditoria do JavaScript legado do Webflow" (complementa a seção 13) + Issue P-09. Quando: **antes** de LeadForm/`/api/lead`/GTM/WhatsApp e de páginas comerciais. Atualiza: Dev/Mkt. Bloqueante: **Sim** (bloqueia paridade de comportamento na migração).
- **`/docs/INTEGRACOES_ATUAIS.md`** — Finalidade: catálogo das integrações ativas hoje (CRM, webhook, WhatsApp, Ads, terceiros). Origem: Issue P-09. Quando: antes de `/api/lead` e tracking. Atualiza: Dev/Comercial. Bloqueante: **Sim** para paridade de leads.
- **`/docs/DATA_LAYER_ATUAL.md`** — Finalidade: inventário dos `dataLayer.push`/eventos GTM atuais. Origem: Issue P-09. Quando: antes da Issue 18 (GTM/dataLayer). Atualiza: Mkt/Dev. Bloqueante: Importante (evita perda de eventos/conversões).
- **`/docs/FORMULARIOS_ATUAIS.md`** — Finalidade: comportamento atual dos formulários (campos, máscaras, validações, pós-envio, regras por ramo). Origem: Issue P-09. Quando: antes da Issue 11 (LeadForm). Atualiza: Dev. Bloqueante: **Sim** para paridade do form.
- **`/docs/API_CALLS_ATUAIS.md`** — Finalidade: mapa de chamadas de rede (`fetch`/XHR/`sendBeacon`), webhooks e endpoints atuais. Origem: Issue P-09. Quando: antes de `/api/lead` e tracking. Atualiza: Dev. Bloqueante: **Sim** para paridade de captura de leads.
- **`/docs/SVG_ASSETS_AUDIT.md`** — Finalidade: auditoria e classificação de todos os SVGs/assets visuais do site atual (tabelas 1–5). Origem: seção "Auditoria e migração de SVGs e assets visuais do Webflow" + Issue P-10. Quando: **antes** da identidade visual final, Header/Footer/InsurersGrid e páginas visuais. Atualiza: Design/Dev. Bloqueante: **Sim** para a versão final dos componentes/páginas visuais (placeholders permitidos antes).
- **`/docs/IMAGE_ASSETS_INVENTORY.md`** — Finalidade: inventário de imagens (fotos de equipe/escritório, PNG/WebP, hero) com dimensões, peso e prioridade. Origem: Issue P-10. Quando: antes de finalizar páginas visuais. Atualiza: Design/Mkt. Bloqueante: Importante (LCP/CLS).
- **`/docs/BRAND_ASSETS.md`** — Finalidade: catálogo dos logos de marca (Imediato + seguradoras) com formato atual/ideal e decisão de migração. Origem: Issue P-10. Quando: antes de InsurersGrid/Footer/Header. Atualiza: Design/Comercial. Bloqueante: **Sim** para uso de logos de seguradoras.
- **`/docs/CLOUDINARY_ASSETS.md`** *(se Cloudinary for utilizado)* — Finalidade: registro de assets hospedados no Cloudinary (URL, uso, dimensões, prioridade). Origem: Issue P-10. Quando: antes de configurar `next/image` para domínio externo. Atualiza: Dev/Mkt. Bloqueante: Condicional (só se Cloudinary for usado).

> Observação: a especificação (seção 40) propõe 9 desses arquivos como o "núcleo"; os demais (`DECISIONS`, `CHANGELOG`, `DADOS_OFICIAIS`, `INVENTARIO_URLS`, `BASELINE_METRICS`) aparecem nas seções 64–70; os 5 arquivos de auditoria de JS legado (`LEGACY_JS_AUDIT`, `INTEGRACOES_ATUAIS`, `DATA_LAYER_ATUAL`, `FORMULARIOS_ATUAIS`, `API_CALLS_ATUAIS`) foram acrescentados na v3 (Issue P-09); os arquivos de auditoria de assets visuais (`SVG_ASSETS_AUDIT`, `IMAGE_ASSETS_INVENTORY`, `BRAND_ASSETS`, `CLOUDINARY_ASSETS`) foram acrescentados na v4 (Issue P-10). Este plano consolida os **arquivos listados na seção 4** (documentos base, de dados, de auditoria de JS legado e de auditoria de SVGs/assets, além do condicional `CLOUDINARY_ASSETS.md`) + o próprio `PLANO_IMPLEMENTACAO.md`. A contagem exata pode variar conforme os documentos condicionais aplicáveis; a referência canônica é a lista da seção 4, não um número fixo.

---

## 5. Dados oficiais e placeholders

Tabela derivada **integralmente** da seção 64 da spec. Nenhum valor é inventado: os "valores observados" vêm do site atual e **precisam de confirmação** antes da produção. Classificação dupla: estado de confirmação (`CONFIRMADO` / `A_CONFIRMAR`) e impacto (`BLOQUEANTE` / `NÃO_BLOQUEANTE`).

| Dado | Valor observado (não confirmado salvo indicação) | Estado | Impacto |
|---|---|---|---|
| Razão social | Imediato Corretora de Seguros Ltda. | CONFIRMADO | NÃO_BLOQUEANTE |
| Nome fantasia | Imediato Seguros | A_CONFIRMAR | NÃO_BLOQUEANTE |
| CNPJ | 45.998.165/0001-32 | A_CONFIRMAR | BLOQUEANTE |
| SUSEP | 252174522 | A_CONFIRMAR | BLOQUEANTE |
| Endereço | Rua Barão de Itapetininga 125, 6º andar, Centro, SP, 01042-001 | A_CONFIRMAR | BLOQUEANTE |
| Telefone principal | (11) 3230-1422 | A_CONFIRMAR | BLOQUEANTE |
| WhatsApp oficial | (11) 3230-1422 — **link do site atual usa `#`** | A_CONFIRMAR (CRÍTICO) | BLOQUEANTE |
| Emergência | (11) 95328-8466 | A_CONFIRMAR | NÃO_BLOQUEANTE |
| Ouvidoria | (11) 97668-7668 | A_CONFIRMAR | NÃO_BLOQUEANTE |
| E-mail comercial | contato@imediatoseguros.com.br | A_CONFIRMAR | NÃO_BLOQUEANTE |
| E-mail fallback de leads | lrotero@gmail.com | CONFIRMADO | BLOQUEANTE |
| Horário de atendimento | — (não informado) | A_CONFIRMAR | NÃO_BLOQUEANTE |
| Anos de experiência | 25 (hero) vs 35+ (rodapé) — **divergente** | A_CONFIRMAR (RESOLVER) | NÃO_BLOQUEANTE (mas resolver antes de claims) |
| Seguradoras parceiras | 16 (texto) vs 18 (logos) | A_CONFIRMAR | NÃO_BLOQUEANTE |
| Nota Google | 4.8 | A_CONFIRMAR | NÃO_BLOQUEANTE (BLOQUEANTE em `aggregateRating`) |
| Avaliações Google | +2.000 | A_CONFIRMAR | NÃO_BLOQUEANTE (BLOQUEANTE em `aggregateRating`) |
| Satisfação | 96% vs 98% — **divergente** | A_CONFIRMAR (RESOLVER) | NÃO_BLOQUEANTE |
| Preços por ramo | Auto 79,90 · Moto 49,90 · Cam. 99,90 · Uber 84,90 · Util. 94,90 · Táxi 99,90 · Pet 99,90 · Fiança 99,90 · Ass24h 39,90 | A_CONFIRMAR | BLOQUEANTE (para LPs comerciais) |
| Redes sociais | FB `web.facebook.com/imediatocorretora` · IG `instagram.com/imediato.seguros` · LinkedIn `imediato-soluções-em-seguros` | CONFIRMADO | NÃO_BLOQUEANTE |
| Google Business Profile | place id `0x94ce5849842c0001:0xb1acc5d339ee5126` | CONFIRMADO | NÃO_BLOQUEANTE |
| Link de avaliações Google | `g.page/r/CSZR7jnTxayxEAE/review` | CONFIRMADO | NÃO_BLOQUEANTE |
| Política de privacidade | (verificar se existe) | A_CONFIRMAR | BLOQUEANTE (para go-live/LGPD) |
| Termos | (verificar se existe) | A_CONFIRMAR | NÃO_BLOQUEANTE (recomendado) |
| Alerta de fraude (texto oficial) | presente no site (golpe PIX/rastreador) | A_CONFIRMAR | NÃO_BLOQUEANTE |
| Destino primário dos leads (CRM/webhook) | — (não definido) | A_CONFIRMAR | BLOQUEANTE |

### 5.1 Recomendação prática

- **Impedem páginas comerciais (e go-live):** WhatsApp oficial, telefone principal, SUSEP, CNPJ, endereço, preços por ramo, destino dos leads (CRM/webhook), e-mail de fallback (já confirmado), política de privacidade. Enquanto pendentes, **não publicar** páginas com claims/CTAs finais nem `aggregateRating`/`Organization` schema com dados regulatórios.
- **Permitem apenas scaffold/documentação/componentes com placeholders:** o restante. É possível avançar em `company.ts`/`ramos.ts` com valores observados **marcados como `A_CONFIRMAR`**, montar componentes, páginas em staging e skeleton de tracking — desde que nada com claim regulatório/comercial final vá para produção.
- **Resolver divergências antes de qualquer claim público:** anos de experiência (25 vs 35+) e satisfação (96% vs 98%).

---

## 6. Plano dos arquivos de configuração iniciais

Para cada arquivo: **finalidade · conteúdo esperado · dependências · dados pendentes · critérios de aceite.** Nenhum código é implementado aqui.

### `.env.example`
- **Finalidade:** documentar todas as variáveis de ambiente com placeholders, marcando segredos. Origem: seção 45.
- **Conteúdo esperado:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID`, `GOOGLE_ADS_CONVERSION_ID`, `GOOGLE_ADS_CONVERSION_LABEL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CONTACT_PHONE`, `LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_SECRET`, `CRM_API_URL`, `CRM_API_KEY`, `LEAD_FALLBACK_EMAIL`, `EMAIL_API_KEY`, `IP_HASH_SALT`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, `DATABASE_URL`. Cada var comentada.
- **Dependências:** nenhuma (é o ponto de partida).
- **Dados pendentes:** valores reais de GA4 ID, Ads conversion ID/label, WhatsApp, webhook/CRM, salt, Turnstile, DB — todos `A_CONFIRMAR`.
- **Critérios de aceite:** todas as variáveis da seção 45 presentes com placeholders; nenhum segredo com prefixo `NEXT_PUBLIC_`; nenhum valor real commitado.

### `lib/env.ts`
- **Finalidade:** validar variáveis de ambiente no boot com Zod.
- **Conteúdo esperado:** schema Zod separando `NEXT_PUBLIC_*` (client) de server-only; parse com erro claro em falta de var obrigatória.
- **Dependências:** `.env.example` (contrato), Zod.
- **Dados pendentes:** quais vars são obrigatórias em cada ambiente (dev/staging/prod) — confirmar.
- **Critérios de aceite:** build falha com mensagem útil se faltar var obrigatória; tipos exportados e usados pelo restante do app.

### `lib/company.ts`
- **Finalidade:** fonte única tipada de dados institucionais/regulatórios/comerciais. Origem: seção 55.
- **Conteúdo esperado:** tipo `CompanyConfig` (legalName, tradeName, cnpj, susep, address, contact, business, legalUrls, social, google) + `export const company` + `companySameAs`.
- **Dependências:** nenhuma de código; depende de `DADOS_OFICIAIS.md`.
- **Dados pendentes:** CNPJ, SUSEP, telefone, WhatsApp, endereço, anos de experiência, satisfação, nota/avaliações — marcados `A_CONFIRMAR` inline.
- **Critérios de aceite:** tipo completo; nada hardcoded em JSX consome valores fora deste arquivo; itens `A_CONFIRMAR` claramente sinalizados em comentário.

### `lib/ramos.ts`
- **Finalidade:** fonte única tipada dos produtos (ramos). Origem: seções 31, 56.
- **Conteúdo esperado:** tipo `InsuranceBranch` + array com os 10 ramos (slug, name, shortName, category, icon, priceFrom/priceLabel, headline/subheadline/eyebrow, seo, ads, benefits, arguments, objections, coverages, faq, trustSignals, whatsappMessage, analytics) + helper `getRamo(slug)`.
- **Dependências:** `lib/company.ts` (preços podem referenciar config), `lib/whatsapp.ts` (mensagens).
- **Dados pendentes:** preços por ramo (`A_CONFIRMAR`); textos de FAQ/objeções a revisar com Marketing.
- **Critérios de aceite:** 10 ramos tipados; `getRamo(slug)` funcional; preços vindos de config/lib, nunca de JSX.

### `lib/seguradoras.ts`
- **Finalidade:** lista de seguradoras parceiras (nome, logo SVG, ordem). Origem: seção 1/18.
- **Conteúdo esperado:** array tipado com as 16–18 seguradoras observadas (Porto, Bradesco, Azul, Itaú, HDI, Tokio, Sompo, Mapfre, Liberty, Allianz, Loovi, Pier, Justos, Darwin, Usebens, Youse, Ezze).
- **Dependências:** assets SVG em `public/`.
- **Dados pendentes:** número oficial (16 vs 18) e logos re-exportados em SVG — `A_CONFIRMAR`.
- **Critérios de aceite:** lista tipada; usada por `InsurersGrid`; sem hardcode de nomes em JSX.

### `lib/whatsapp.ts`
- **Finalidade:** montar links `wa.me/<numero>?text=...` com mensagem por ramo e contexto (UTM/origem). Origem: seção 34.4.
- **Conteúdo esperado:** mapa de mensagens por ramo + função que anexa origem/ramo; número vem de env (`NEXT_PUBLIC_WHATSAPP_NUMBER`).
- **Dependências:** `lib/env.ts`, `lib/ramos.ts`.
- **Dados pendentes:** **número oficial de WhatsApp (CRÍTICO/BLOQUEANTE)**.
- **Critérios de aceite:** link abre conversa no celular; mensagem pré-preenchida por ramo; nenhum número hardcoded.

### `lib/analytics.ts`
- **Finalidade:** `trackEvent(event, params)` → `dataLayer.push`. Origem: seções 19, 20.
- **Conteúdo esperado:** tipos dos eventos da seção 20 (`page_view`, `form_start`, `form_step`, `generate_lead`, `whatsapp_click`, `call_click`, `scroll_depth`, `engaged_time`, `cta_click`, `faq_open`) com parâmetros (inclui `ramo`).
- **Dependências:** GTM carregado no `layout.tsx`; Consent Mode.
- **Dados pendentes:** GTM/GA4/Ads IDs (`A_CONFIRMAR`).
- **Critérios de aceite:** eventos aparecem no GA4 DebugView; tipados; sem PII em claro.

### `lib/schema.ts`
- **Finalidade:** builders de JSON-LD. Origem: seções 17, 32.
- **Conteúdo esperado:** funções para `InsuranceAgency`, `Organization`, `FAQPage`, `BreadcrumbList`, lendo de `company`/`ramos`.
- **Dependências:** `lib/company.ts`, `lib/ramos.ts`.
- **Dados pendentes:** SUSEP/CNPJ/endereço/nota/avaliações para schema final — `A_CONFIRMAR` (não publicar `aggregateRating`/`Organization` final sem confirmação).
- **Critérios de aceite:** Rich Results válido; sem dados regulatórios hardcoded.

### `lib/validators.ts`
- **Finalidade:** schemas Zod do lead e helpers de validação BR. Origem: seções 21.1, 44.
- **Conteúdo esperado:** `leadSchema`, `utmSchema`, validação de DDD (lista BR), celular (9 dígitos), CPF (DV, opcional), placa (Mercosul/antiga, opcional), CEP (opcional), normalização E.164.
- **Dependências:** Zod.
- **Dados pendentes:** nenhum (regras já especificadas).
- **Critérios de aceite:** valida exemplos VÁLIDO/INVÁLIDO da seção 44.4; tipos inferidos exportados.

### `lib/utils.ts`
- **Finalidade:** utilitários (`cn()` = clsx + tailwind-merge, formatters). Origem: seções 21, 23.
- **Conteúdo esperado:** `cn()`, formatadores de telefone/preço (consumindo dados de lib, não constantes mágicas).
- **Dependências:** clsx, tailwind-merge.
- **Dados pendentes:** nenhum.
- **Critérios de aceite:** `cn()` usado nos componentes; sem valores mágicos.

### `lib/motion.ts`
- **Finalidade:** presets de animação Framer Motion alinhados aos tokens de motion. Origem: seção 30.
- **Conteúdo esperado:** `fadeUp`, `staggerGroup` e variantes; durações 160–240ms; respeitar `prefers-reduced-motion`.
- **Dependências:** tokens de `globals.css` (durations/eases).
- **Dados pendentes:** nenhum.
- **Critérios de aceite:** anima só `transform`/`opacity`; nunca >320ms; reduced-motion respeitado.

---

## 7. Roadmap de implementação por fases

> Mapeamento: esta seção operacionaliza a ordem das seções 24.1/49/54 da spec e o gate da seção 68. "Fase" aqui é uma fase **operacional de execução da Fase 1 do produto** — não confundir com o roadmap de produto (Fases 1–8 da seção 38, que tratam de blog, área do cliente, IA etc., todas **fora** desta entrega).

### Fase 0 — Preparação do repositório e documentação
- **Objetivo:** criar a base de governança antes de qualquer código.
- **Entregáveis:** repositório; estrutura `/docs`; especificação dividida (seção 40); `.env.example`; ADRs (`DECISIONS.md`); `DADOS_OFICIAIS.md`; `INVENTARIO_URLS.md`; `BASELINE_METRICS.md`; **auditoria de JS legado (Issue P-09) → `LEGACY_JS_AUDIT.md` + `INTEGRACOES_ATUAIS.md` + `DATA_LAYER_ATUAL.md` + `FORMULARIOS_ATUAIS.md` + `API_CALLS_ATUAIS.md`**; **auditoria de SVGs/assets (Issue P-10) → `SVG_ASSETS_AUDIT.md` + `BRAND_ASSETS.md` + `IMAGE_ASSETS_INVENTORY.md` + `CLOUDINARY_ASSETS.md` (se aplicável)**; `MVP_SCOPE.md` validado; backlog criado.
- **Pré-requisitos:** acesso ao repositório; acesso ao Webflow/GTM para a P-09 (senão, auditar HTML publicado + rede); acesso ao Webflow Asset Manager/Export para a P-10 (senão, auditar HTML publicado + URLs públicas).
- **Critérios de aceite:** todos os artefatos da seção 4 existem; `MVP_SCOPE.md` aprovado; backlog na ferramenta (GitHub/Linear); **auditoria de JS legado (P-09) concluída antes de LeadForm/`/api/lead`/GTM/WhatsApp**; **auditoria de assets (P-10) concluída antes da versão final de identidade visual/Header/Footer/InsurersGrid/páginas** (ou marcada PENDING com escopo parcial justificado).
- **Riscos:** começar a codar antes de travar escopo (excesso de escopo); migrar sem auditar o JS legado (perda de integrações); copiar assets mecanicamente sem auditar (perda de logos/inconsistência visual) — ver seções de auditoria e riscos.
- **Fora de escopo:** qualquer componente/página.

### Fase 1 — Fundação técnica
- **Objetivo:** projeto Next.js base funcional e instrumentado.
- **Entregáveis:** scaffold Next.js 15 (App Router); TypeScript estrito; Tailwind 4; shadcn/ui; ESLint/Prettier/Husky; tokens (`@theme`); fontes self-hosted; `layout.tsx` base; providers; GTM + Consent default; **validação de ambiente (`.env.example` + `lib/env.ts`, Issue 03A)**; **analytics mínimo (`lib/analytics.ts` seguro, Issue 03B)**.
- **Pré-requisitos:** Fase 0; `GTM_ID` (placeholder aceitável).
- **Critérios de aceite:** build limpo; typecheck/lint ok; fonts sem requisição externa; GTM carrega; consent default `denied`; tokens sem valor mágico; **env validado no boot (falha clara se faltar var obrigatória); `trackEvent()` tipado e seguro sem `window`/`dataLayer`**.
- **Riscos:** inconsistência de tokens se aplicados cedo demais.
- **Fora de escopo:** componentes de negócio, páginas, conteúdo; integração real de GTM/GA4/Ads (fica na Issue 18).

### Fase 2 — Dados e configuração
- **Objetivo:** estabelecer as fontes únicas de dados.
- **Entregáveis:** `company.ts`, `ramos.ts`, `seguradoras.ts`, `whatsapp.ts`, `validators.ts`, `env.ts`.
- **Pré-requisitos:** Fase 1; `DADOS_OFICIAIS.md` (placeholders aceitáveis).
- **Critérios de aceite:** tipos completos; `getRamo(slug)`; env validado no boot; itens pendentes marcados `A_CONFIRMAR`.
- **Riscos:** preços/WhatsApp pendentes — usar placeholders, nunca publicar.
- **Fora de escopo:** renderização/consumo nos componentes.

### Fase 3 — Componentes base e layout
- **Objetivo:** primitives e estrutura de layout.
- **Entregáveis (nesta ordem):** **primeiro** os componentes base (Button, Section, Container, Badge/Chip — Issue 08); **depois** Header + Drawer (Issue 06), Footer (Issue 07), CredBar (Issue 09) e FraudAlert (Issue 22). Header/Footer/CredBar consomem os primitives e não devem ser iniciados antes deles.
- **Pré-requisitos:** Fases 1–2.
- **Critérios de aceite:** variantes via `cva`; foco visível; alvos ≥44px; Header com focus trap/Esc; Footer e CredBar lendo de `company`; FraudAlert é o único uso do vermelho.
- **Riscos:** componentes recriando dados inline (proibido); Header/Footer implementados antes dos primitives → recriação de botões/containers inline.
- **Fora de escopo:** páginas; componentes comerciais avançados.

### Fase 4 — Componentes comerciais
- **Objetivo:** blocos de conversão reutilizáveis.
- **Entregáveis:** InsuranceCard, RamoGrid, Hero, Benefits, CoverageCards, InsurersGrid, Testimonials, FAQ, CTASection, StickyCTA, WhatsAppFAB, CallButton.
- **Pré-requisitos:** Fases 2–3.
- **Critérios de aceite:** todos lêem de `ramos`/`company`; hover lift; FAQ acessível com `faq_open`; WhatsApp/Call com eventos; Testimonials (Embla) com autoplay pausável.
- **Riscos:** dependência de dados pendentes (preços) — placeholders.
- **Fora de escopo:** composição em páginas.

### Fase 5 — LeadForm e API de leads
- **Objetivo:** captura de leads ponta a ponta.
- **Entregáveis:** LeadForm multi-step (RHF+Zod); captura UTM/GCLID; `/api/lead` com idempotência, dedupe 24h, retry+fallback e-mail, rate limit, honeypot, Turnstile; logs sem PII em claro.
- **Pré-requisitos:** `validators.ts`, `env.ts`, `analytics.ts`.
- **Critérios de aceite:** 2 campos viram lead; respostas 201/422/200-dup/429; lead nunca perdido; alerta em falha; eventos `form_start/step/generate_lead`.
- **Riscos:** destino real do lead pendente — mockar via env; spam (mitigar com Turnstile/rate limit).
- **Fora de escopo:** CRM real (mock até definição).

### Fase 6 — Páginas
- **Objetivo:** montar as páginas a partir de blocos prontos.
- **Entregáveis:** `/cotacao`, `/obrigado` (noindex), Home, template `/seguro-[ramo]`, `/a-imediato`, `/equipe`, `/reputacao`, `/contato`, páginas legais, 404/500.
- **Pré-requisitos:** Fases 3–5; **staging seguro/não indexável ativo (Issue 23A)** e **auditoria anti-hardcode ativa (Issue 23B)** — ambas **antes** da Home (15) e do template `/seguro-[ramo]` (16), conforme a ordem de execução da rev. 4.1; gate de dados (seção 68) para claims comerciais finais.
- **Critérios de aceite:** 1 H1 por página; LCP no hero; `generateStaticParams` para ramos; message match; reutiliza blocos (não recria inline); páginas comerciais só em staging noindex enquanto houver dados `A_CONFIRMAR`.
- **Riscos:** publicar páginas comerciais sem dados confirmados — manter em staging seguro (23A).
- **Fora de escopo:** blog/pSEO.

### Fase 7 — SEO, Analytics e tracking
- **Objetivo:** instrumentação e indexação corretas.
- **Entregáveis:** `generateMetadata`; JSON-LD; `sitemap.ts`; `robots.ts`; OG; `dataLayer`/eventos GA4; conversões Google Ads; Consent Mode v2 completo.
- **Pré-requisitos:** páginas e `analytics.ts`/`schema.ts`.
- **Critérios de aceite:** title/desc únicos; Rich Results válido; sitemap correto; `/obrigado` noindex; eventos no DebugView; conversão de teste no Ads.
- **Riscos:** acesso real a GA4/Ads/Search Console pendente — placeholders até liberar.
- **Fora de escopo:** Article/blog schema (Fase 3 de produto).

### Fase 8 — QA, homologação e deploy
- **Objetivo:** validar e publicar com segurança.
- **Entregáveis:** Lighthouse ≥95 mobile; a11y (axe/teclado); responsivo 360→1440; **auditoria anti-hardcode (Issue 23B) verde**; GTM Preview; GA4 DebugView; teste de lead real; **staging seguro validado (Issue 23A)**; deploy + redirects 301 e validação de env em produção (Issue 24); deploy Vercel; plano de rollback.
- **Pré-requisitos:** todas as fases anteriores; gate seções 68/60.
- **Critérios de aceite:** checklist comercial (seção 60) completo; CWV verdes; lead chega ao destino; 301s no ar; anti-hardcode sem violações; produção sem banner de staging; rollback preparado.
- **Riscos:** perda de SEO/tracking quebrado/lead não chegando — mitigações da seção 16.
- **Fora de escopo:** otimizações de Fase 2 de produto (Storybook completo, CI gates avançados).

---

## 8. Backlog detalhado de issues

### 8.1 Issues preparatórias (antes da Issue 01)

#### P-01 — Criar `/docs`
- **Objetivo:** criar a estrutura de documentação.
- **Contexto da spec:** seções 40, 67. Docs relacionados: todos de `/docs`.
- **Arquivos prováveis:** `docs/` (pasta) e arquivos vazios/estrutura.
- **Dependências:** repositório criado.
- **Passos:** 1) criar `docs/`; 2) criar arquivos da seção 4; 3) adicionar cabeçalhos/índices.
- **Critérios de aceite:**
  - [ ] pasta criada;
  - [ ] todos os arquivos obrigatórios listados na seção 4 foram criados;
  - [ ] os documentos condicionais, como `CLOUDINARY_ASSETS.md`, foram criados apenas se aplicável;
  - [ ] cada documento contém título, finalidade e origem;
  - [ ] nenhum conteúdo foi inventado; quando houver ausência de dados, usar `PENDING`, `TODO` ou `A_CONFIRMAR`.
- **Fora de escopo:** preencher conteúdo final (vem nos prompts seguintes).
- **Riscos:** baixo.
- **Prompt recomendado:** "Crie a estrutura `/docs` com os arquivos da seção 4 do PLANO_IMPLEMENTACAO; apenas cabeçalhos e finalidade; não escreva código."

#### P-02 — Dividir especificação em arquivos menores
- **Objetivo:** fatiar `ESPECIFICACAO v3.md` nos docs da seção 40, sem alterar conteúdo.
- **Contexto da spec:** seções 40, 70 (Prompt A).
- **Arquivos prováveis:** `docs/{PRODUCT_SPEC,MVP_SCOPE,DESIGN_SYSTEM,TECHNICAL_SPEC,SEO_ANALYTICS_SPEC,CONTENT_STRATEGY,CURSOR_IMPLEMENTATION_PLAN,QA_CHECKLIST,ROADMAP}.md`.
- **Dependências:** P-01.
- **Passos:** 1) copiar seções mapeadas; 2) preservar texto; 3) validar nada perdido.
- **Critérios de aceite:** [ ] cada arquivo contém exatamente as seções mapeadas; [ ] sem resumo/reinterpretação.
- **Fora de escopo:** código; mudar decisões.
- **Riscos:** perda/alteração de conteúdo — revisar diff.
- **Prompt recomendado:** Prompt A da seção 70.

#### P-03 — Criar `DECISIONS.md`
- **Objetivo:** registrar os **9 ADRs iniciais** (os 8 da spec + **ADR-0009 — Uso de Cloudinary**).
- **Contexto da spec:** seção 67.1.
- **Arquivos prováveis:** `docs/DECISIONS.md`.
- **Dependências:** P-01.
- **Passos:** 1) usar modelo ADR; 2) registrar Next 15, Tailwind 4, shadcn, MDX→Payload, lead→humano, Consent v2, company.ts, ramos.ts (status "Aceita"); 3) registrar **ADR-0009 — Uso de Cloudinary** (status "Proposta").
- **Critérios de aceite:** [ ] 9 ADRs datados; [ ] ADRs 1–8 com status "Aceita"; [ ] ADR-0009 presente com status "Proposta".
- **Fora de escopo:** decisões novas não listadas.
- **Riscos:** baixo.
- **Prompt recomendado:** Prompt B da seção 70 (incluir ADR-0009 como proposta).

> **Texto de referência — ADR-0009** (a ser inserido em `docs/DECISIONS.md`):
>
> ```md
> # ADR-0009 — Uso de Cloudinary para imagens não vetoriais
>
> ## Status
> Proposta
>
> ## Contexto
> O projeto possui imagens já geradas e hospedadas no Cloudinary. Elas podem ser úteis para páginas comerciais, institucionais, hero images, fotos de apoio e materiais visuais não vetoriais. Porém URLs externas espalhadas pelo JSX prejudicam manutenção, performance, SEO e governança visual.
>
> ## Decisão
> O Cloudinary poderá ser usado para imagens não vetoriais, desde que:
> - cada asset esteja registrado em `CLOUDINARY_ASSETS.md`, quando aplicável;
> - cada asset esteja centralizado em `lib/assets.ts`;
> - cada imagem tenha `src`, `alt`, `width`, `height`, `usage`, `priority` quando aplicável e fallback;
> - o domínio Cloudinary esteja configurado em `next.config.mjs` quando usado com `next/image`;
> - nenhuma URL Cloudinary apareça diretamente em JSX;
> - imagens críticas de hero respeitem orçamento de performance e LCP;
> - imagens geradas por IA passem por revisão de confiança, autenticidade e alinhamento com a marca;
> - fotos reais da equipe e do escritório tenham prioridade sobre imagens genéricas ou geradas por IA.
>
> ## Consequências
> - facilita troca e otimização de imagens sem espalhar URLs;
> - melhora governança visual;
> - reduz risco de quebra por URL externa;
> - exige inventário e disciplina de uso;
> - cria dependência externa quando Cloudinary for usado;
> - exige fallback para assets críticos.
>
> ## Alternativas consideradas
> - hospedar todas as imagens localmente em `/public`;
> - usar apenas imagens locais otimizadas;
> - usar Cloudinary sem centralização;
> - migrar imagens para outro CDN;
> - usar imagens Cloudinary apenas temporariamente em staging.
>
> ## Data
> TODO
>
> ## Responsável
> TODO
> ```

#### P-04 — Criar `.env.example`
- **Objetivo:** gerar `.env.example` da seção 45 com placeholders.
- **Contexto da spec:** seções 45, 70 (Prompt C).
- **Arquivos prováveis:** `.env.example`.
- **Dependências:** P-01.
- **Passos:** 1) listar todas as vars; 2) marcar segredos (sem `NEXT_PUBLIC_`); 3) comentar cada uma.
- **Critérios de aceite:** [ ] todas as vars da seção 45; [ ] nenhum valor real; [ ] segredos protegidos.
- **Fora de escopo:** `.env.local`.
- **Riscos:** vazar segredo — revisar.
- **Prompt recomendado:** Prompt C da seção 70.

#### P-05 — Criar `DADOS_OFICIAIS.md`
- **Objetivo:** gerar checklist de dados oficiais da seção 64.
- **Contexto da spec:** seções 64, 70 (Prompt D).
- **Arquivos prováveis:** `docs/DADOS_OFICIAIS.md`.
- **Dependências:** P-01.
- **Passos:** 1) copiar tabela 64; 2) manter "Confirmado?" como ☐; 3) preservar CRÍTICO/RESOLVER.
- **Critérios de aceite:** [ ] tabela completa; [ ] regra final incluída.
- **Fora de escopo:** preencher dados não confirmados.
- **Riscos:** inventar dados — proibido.
- **Prompt recomendado:** Prompt D da seção 70.

#### P-06 — Criar `INVENTARIO_URLS.md`
- **Objetivo:** gerar inventário/redirects das seções 59/65.
- **Contexto da spec:** seções 47, 59, 65, 70 (Prompt E).
- **Arquivos prováveis:** `docs/INVENTARIO_URLS.md`.
- **Dependências:** P-01.
- **Passos:** 1) copiar tabela 65.1; 2) coluna Ação só com valores permitidos; 3) incluir checklist 65.2.
- **Critérios de aceite:** [ ] tabela + checklist; [ ] regra final.
- **Fora de escopo:** decidir ações sem dados de tráfego.
- **Riscos:** decidir 301 sem dados — manter `investigar`.
- **Prompt recomendado:** Prompt E da seção 70.

#### P-07 — Criar `BASELINE_METRICS.md`
- **Objetivo:** estruturar a coleta de baseline da seção 66.
- **Contexto da spec:** seções 46, 66.
- **Arquivos prováveis:** `docs/BASELINE_METRICS.md`.
- **Dependências:** P-01.
- **Passos:** 1) copiar tabela 66 com `TBD`; 2) marcar métricas Obrigatórias; 3) regra de go-live.
- **Critérios de aceite:** [ ] tabela completa; [ ] obrigatórias destacadas.
- **Fora de escopo:** coletar números (depende de acesso).
- **Riscos:** medir sem acesso — registrar dependência externa.
- **Prompt recomendado:** "Gere `docs/BASELINE_METRICS.md` a partir da seção 66, mantendo valores como TBD."

#### P-08 — Criar backlog no GitHub/Linear
- **Objetivo:** transformar as 24 issues em itens rastreáveis.
- **Contexto da spec:** seções 49, 54, 70 (Prompt F).
- **Arquivos prováveis:** `docs/BACKLOG.md` e/ou export para a ferramenta.
- **Dependências:** P-01..P-05.
- **Passos:** 1) 1 issue por linha da seção 49; 2) incluir aceite e fora de escopo; 3) ordem de dependência.
- **Critérios de aceite:** [ ] 24 issues na ordem; [ ] cada uma com aceite/fora.
- **Fora de escopo:** issues de fases 2+.
- **Riscos:** baixo.
- **Prompt recomendado:** Prompt F da seção 70.

#### P-09 — Auditoria do JavaScript legado do Webflow
- **Objetivo:** mapear, documentar e classificar todo o JavaScript atualmente usado no site Webflow (`https://www.segurosimediato.com.br`) antes da migração para Next.js, garantindo paridade de comportamento (formulários, tracking, integrações, regras por ramo).
- **Contexto da spec:** seção 47 (migração Webflow→Next), 43/44 (contrato/validação de leads), 20 (eventos dataLayer), 51 (segurança/observabilidade). Seção do plano: "Auditoria do JavaScript legado do Webflow" (complementa a seção 13).
- **Arquivos/documentos prováveis:** `/docs/LEGACY_JS_AUDIT.md`, `/docs/INTEGRACOES_ATUAIS.md`, `/docs/DATA_LAYER_ATUAL.md`, `/docs/FORMULARIOS_ATUAIS.md`, `/docs/API_CALLS_ATUAIS.md`.
- **Dependências:** P-01 (`/docs`); acesso ao Webflow (Custom Code) e ao GTM atual (senão, auditar só o HTML publicado + rede). **Deve concluir antes das Issues 11, 12, 18 e 19 e de qualquer página comercial.**
- **Fontes a analisar:** HTML publicado das principais páginas; arquivos `.js` externos; Custom Code global do Webflow; Custom Code por página; Embed blocks; GTM atual (tags/triggers/variables/Custom HTML/conversões); formulários Webflow; rede de chamadas no navegador; eventos ao preencher/enviar formulário; eventos ao clicar em WhatsApp e telefone.
- **Procedimento sugerido:**
  1. Abrir o site atual no navegador.
  2. Exportar o HTML renderizado das principais páginas (home, uma LP de ramo, contato, obrigado se existir).
  3. Listar todos os scripts carregados.
  4. Identificar scripts inline.
  5. Identificar arquivos `.js` externos.
  6. Buscar por: `fetch(`, `XMLHttpRequest`, `sendBeacon`, `dataLayer.push`, `gtag(`, `fbq(`, `gtm`, `utm`, `gclid`, `wbraid`, `gbraid`, `localStorage`, `sessionStorage`, `document.cookie`, `Webflow.push`, `form`, `submit`, `whatsapp`, `wa.me`, `api`, `webhook`, `crm`.
  7. Usar DevTools → Network para registrar chamadas durante: carregamento da home; carregamento de uma LP; preenchimento do formulário; envio do formulário; clique em WhatsApp; clique em telefone; chegada à página de obrigado (se existir).
  8. Exportar HAR, se possível.
  9. Inspecionar o GTM atual: tags, triggers, variables, Custom HTML tags, conversões, eventos.
  10. Documentar tudo nas tabelas abaixo.
- **Tabelas obrigatórias (em `/docs/LEGACY_JS_AUDIT.md` e correlatos):**

  Tabela 1 — Scripts encontrados
  | Origem | URL/Local | Tipo | Carrega em | Finalidade aparente | Crítico? | Migrar? | Observações |
  |---|---|---|---|---|---|---|---|

  Tabela 2 — Integrações e chamadas de rede (`INTEGRACOES_ATUAIS.md` / `API_CALLS_ATUAIS.md`)
  | Gatilho | Método (`fetch`/XHR/`sendBeacon`) | Endpoint/URL | Payload/params | Autenticação | Destino (CRM/webhook/tracking) | Crítico? | Paridade no Next |
  |---|---|---|---|---|---|---|---|

  Tabela 3 — Eventos de dataLayer/GTM (`DATA_LAYER_ATUAL.md`)
  | Evento/`dataLayer.push` | Quando dispara | Parâmetros | Tag/Trigger no GTM | Conversão Ads/GA4? | Migrar para seção 20? | Observações |
  |---|---|---|---|---|---|---|

  Tabela 4 — Formulários (`FORMULARIOS_ATUAIS.md`)
  | Formulário | Campos (obrig./opc.) | Máscaras | Validações | Hidden fields (UTM/GCLID…) | Pós-envio (redirect/obrigado) | Regras por ramo | Crítico? |
  |---|---|---|---|---|---|---|---|

  Tabela 5 — Cookies/Storage e parâmetros capturados
  | Item | Tipo (cookie/local/session) | Chave | Origem (script/GTM) | Finalidade | Consentimento? | Migrar? |
  |---|---|---|---|---|---|---|

- **Critérios de aceite:** [ ] todos os scripts listados (origem, tipo, criticidade, migrar?); [ ] toda chamada de rede/webhook/integração documentada; [ ] todos os `dataLayer.push`/eventos GTM catalogados; [ ] comportamento completo dos formulários (campos, máscaras, validações, hidden fields, pós-envio, regras por ramo) documentado; [ ] cookies/storage/params capturados listados; [ ] HAR anexado quando possível; [ ] cada item marcado como Crítico? e Migrar?; [ ] docs `LEGACY_JS_AUDIT`/`INTEGRACOES_ATUAIS`/`DATA_LAYER_ATUAL`/`FORMULARIOS_ATUAIS`/`API_CALLS_ATUAIS` criados.
- **Fora de escopo:** reimplementar o comportamento (isso ocorre nas Issues 11/12/18/19); auditar conteúdo/URLs (isso é P-06/seção 13).
- **Riscos:** sem acesso ao Webflow/GTM, a auditoria fica parcial — registrar como dependência externa (seção 69) e auditar ao menos o HTML publicado + rede; scripts de terceiros ocultos podem passar despercebidos — usar DevTools Network + HAR.
- **Prompt recomendado:** "Execute a auditoria da Issue P-09. Não escreva código de produção. Produza `/docs/LEGACY_JS_AUDIT.md` (+ correlatos) com as Tabelas 1–5 preenchidas a partir do HTML publicado, dos `.js` externos, do GTM e do HAR. Marque cada item como Crítico?/Migrar?. Bloco de regras padrão (seção 10)."

#### P-10 — Auditoria e migração seletiva de SVGs/assets do Webflow
- **Objetivo:** mapear, classificar e migrar **seletivamente** os SVGs e assets visuais atuais do site Webflow para o novo projeto Next.js, preservando apenas o que agrega valor visual, institucional ou comercial (logo da Imediato, logos de seguradoras, fotos reais) e substituindo/descartando o genérico, datado, duplicado ou pesado.
- **Contexto da spec:** seção 8 (Design System/tokens), 9–12 (identidade/tipografia/cores), 28 (identidade exclusiva), 35 (sistema de imagens). Seção do plano: "Auditoria e migração de SVGs e assets visuais do Webflow".
- **Arquivos/documentos prováveis:** `/docs/SVG_ASSETS_AUDIT.md`, `/docs/IMAGE_ASSETS_INVENTORY.md`, `/docs/BRAND_ASSETS.md`, `/docs/CLOUDINARY_ASSETS.md` (se Cloudinary), `/public/logos/`, `/public/logos/seguradoras/`, `/public/icons/custom/`, `/public/decorative/`, `lib/assets.ts`.
- **Dependências:** P-01 (`/docs`); acesso ao Webflow (Asset Manager/Export) — senão, auditar HTML publicado + URLs públicas. **Deve concluir antes da versão final** da Issue 02 (quando houver dependência visual), 06 (Header), 07 (Footer), 10 (InsuranceCard/RamoGrid), InsurersGrid, Testimonials, páginas institucionais/comerciais e da configuração final de `next/image`.
- **Fontes a analisar:** site publicado; HTML renderizado; Webflow export (se disponível); Asset Manager do Webflow; URLs públicas de SVG; SVGs inline; Embed blocks; CSS (`background-image`); Cloudinary; GTM/custom HTML (se houver inserção visual); páginas principais: Home, Seguro Auto, Seguro Moto, Seguro Caminhão, Seguro Uber, Fiança, Reputação, Equipe, Contato, Alerta de Fraude.
- **Classificação de cada asset:** `Migrar obrigatório` · `Migrar opcional` · `Substituir por Lucide` · `Substituir por novo Design System` · `Descartar` · `Investigar` · `Cloudinary` (ver seção "Auditoria e migração de SVGs e assets visuais do Webflow" → item 2).
- **Regras de migração:** aplicar as 15 regras da seção correspondente (não copiar tudo; logos em SVG local; genéricos → Lucide; sem SVG inline grande em JSX; caminhos em `lib/assets.ts`; nenhuma URL espalhada; `alt`/`aria-hidden` corretos; Cloudinary registrado + domínio em `next.config.mjs`; hero dentro do orçamento de LCP; fotos reais > genéricas; etc.). **O uso de Cloudinary deve estar coberto pela ADR-0009 (ver P-03) e tratado como dependência externa (ver "Dependências externas").**
- **Tabelas obrigatórias (em `/docs/SVG_ASSETS_AUDIT.md` e correlatos):**

  Tabela 1 — SVGs encontrados
  | Asset | Origem | Tipo | Local atual | Uso atual | Tamanho | Duplicado? | Crítico? | Decisão | Observações |
  |---|---|---|---|---|---|---|---|---|---|

  Tabela 2 — Logos de marca (`BRAND_ASSETS.md`) — Imediato, Porto, Bradesco, Azul, Itaú, HDI, Tokio, Sompo, Mapfre, Liberty, Allianz, Loovi, Pier, Justos, Darwin, Usebens, Youse, Ezze
  | Marca | Tipo | Formato atual | Formato ideal | Origem | Uso novo | Migrar? | Observações |
  |---|---|---|---|---|---|---|---|

  Tabela 3 — Ícones e elementos genéricos
  | Ícone/asset | Uso atual | Pode ser substituído por Lucide? | Lucide sugerido | Migrar? | Observações |
  |---|---|---|---|---|---|

  Tabela 4 — Assets decorativos
  | Asset | Uso atual | Peso | Combina com novo Design System? | Migrar? | Substituir por quê? | Observações |
  |---|---|---|---|---|---|---|

  Tabela 5 — Assets no Cloudinary (`CLOUDINARY_ASSETS.md`)
  | Asset | URL Cloudinary | Uso previsto | Alt text | Width | Height | Formato | Peso estimado | Priority? | Migrar para `lib/assets.ts`? | Observações |
  |---|---|---|---|---|---|---|---|---|---|---|

- **Critérios de aceite:** [ ] todos os SVGs listados e classificados (decisão explícita); [ ] logos de marca catalogados com formato atual/ideal e decisão; [ ] ícones genéricos com sugestão de Lucide; [ ] decorativos avaliados vs novo DS; [ ] assets Cloudinary (se houver) registrados; [ ] estrutura de pastas definida em `/public`; [ ] `lib/assets.ts` planejado como fonte única de caminhos/alt/dimensões; [ ] nenhuma decisão de "copiar tudo"; [ ] nada baixado/copiado antes da classificação.
- **Fora de escopo:** implementar componentes visuais (Issues 02/06/07/10/InsurersGrid); baixar/otimizar assets em massa sem classificação; auditoria de comportamento JS (Issue P-09) e de URLs (P-06).
- **Riscos:** copiar SVGs pesados/duplicados; perder logo proprietário; uso indevido de marca de seguradora; sem acesso ao Webflow → auditoria parcial (registrar dependência externa, seção 69).
- **Prompt recomendado:** "Execute a auditoria da Issue P-10. Não escreva código, não baixe assets, não invente nomes de arquivo, não espalhe URLs de Cloudinary. Produza `/docs/SVG_ASSETS_AUDIT.md` (+ `BRAND_ASSETS`/`IMAGE_ASSETS_INVENTORY`/`CLOUDINARY_ASSETS`) com as Tabelas 1–5 e a decisão de classificação por asset. Bloco de regras padrão (seção 10)."

### 8.2 Issues de implementação (Fase 1)

> Formato resumido por issue. O "Prompt recomendado" deve ser combinado com o **bloco de regras padrão (seção 54.0 da spec)**, reproduzido na seção 10 deste plano.
>
> **Nota sobre numeração:** os números originais das 24 issues são preservados. A v2 acrescenta issues intermediárias (**03A**, **03B**, **23A**, **23B**) sem renumerar as demais. **A execução segue a ordem de dependência abaixo, não a ordem numérica.**

#### Ordem de execução recomendada (rev. 4.1)

> **Pré-implementação (Fase 0, em paralelo):**
> - **Issue P-09 — Auditoria do JavaScript legado do Webflow** antes das Issues 11, 12, 18 e 19 e de qualquer página comercial. Os resultados (`LEGACY_JS_AUDIT.md` e correlatos) alimentam a paridade dessas issues.
> - **Issue P-10 — Auditoria e migração seletiva de SVGs/assets** antes da **versão final** da identidade visual (Issue 02, quando houver dependência visual), Header (06), Footer (07), InsuranceCard/RamoGrid (10), InsurersGrid, Testimonials, páginas institucionais/comerciais e da configuração final de `next/image`. A implementação pode **começar com placeholders**; a versão final desses itens só é "Done" após a P-10.
>
> **Mudança da rev. 4.1:** as Issues **23A (staging seguro)** e **23B (auditoria anti-hardcode)** foram **antecipadas para antes da Home (15) e do template `/seguro-[ramo]` (16)**. Motivo: páginas comerciais podem usar placeholders, mas só devem ir para staging depois que o ambiente estiver protegido (noindex,nofollow; banner de homologação; fora do sitemap público; sem campanha Google Ads apontando para staging; Search Console sem sitemap de staging; páginas com dados `A_CONFIRMAR` nunca indexáveis) e a checagem anti-hardcode estiver ativa (Home/LPs só abrem PR com `npm run check:hardcode` ou checklist equivalente).

1. Issue 01 — Scaffold Next.js 15 + Tailwind 4 + shadcn/ui
2. Issue 02 — Tokens do Design System
3. Issue 03 — Layout base, fontes, providers e GTM inicial
4. **Issue 03A — Configuração de ambiente e validação de env**
5. **Issue 03B — Analytics mínimo e contrato de eventos**
6. Issue 04 — `lib/company.ts`
7. Issue 05 — `lib/ramos.ts`
8. Issue 08 — Componentes base: Button, Section, Container, Badge, Chip
9. Issue 06 — Header + Drawer mobile
10. Issue 07 — Footer
11. Issue 09 — CredBar
12. Issue 10 — InsuranceCard + RamoGrid
13. Issue 11 — LeadForm multi-step
14. Issue 12 — `/api/lead`
15. Issue 13 — `/cotacao`
16. Issue 14 — `/obrigado`
17. Issue 17 — FAQ + schema
18. Issue 19 — WhatsApp/call tracking + FAB + StickyCTA
19. Issue 18 — GTM/dataLayer (completar integração real)
20. Issue 20 — SEO metadata + JSON-LD
21. Issue 21 — sitemap + robots
22. Issue 22 — FraudAlert (banner + página)
23. **Issue 23A — Staging seguro e não indexável** (antes das páginas comerciais)
24. **Issue 23B — Auditoria anti-hardcode** (antes das páginas comerciais)
25. Issue 15 — Home
26. Issue 16 — Template `/seguro-[ramo]`
27. Issue 23 — QA mobile-first + a11y
28. Issue 24 — Deploy + redirects + go-live

> Observação: a Home (Issue 15) e o template `/seguro-[ramo]` (Issue 16) aparecem tarde de propósito — só depois que todos os blocos existirem. Na rev. 4.1, as Issues 23A/23B foram posicionadas **imediatamente antes** de 15/16: o staging seguro precisa estar no ar (noindex + banner + fora do sitemap) e a auditoria anti-hardcode ativa **antes** de qualquer página comercial ir para staging ou abrir PR. O setup de 23A/23B pode começar ainda mais cedo, em paralelo à fundação.

#### Issue 01 — Scaffold Next.js 15 + Tailwind 4 + shadcn/ui
- **Objetivo:** criar o projeto base (App Router, TS estrito, Tailwind 4, shadcn/ui, ESLint/Prettier, alias `@/`).
- **Contexto da spec:** seções 22, 23, 24. Docs: `TECHNICAL_SPEC.md`, `MVP_SCOPE.md`.
- **Arquivos prováveis:** `package.json`, `tsconfig.json`, `next.config.mjs`, `app/globals.css`, `app/layout.tsx`, `components.json`, `.eslintrc`, `.prettierrc`.
- **Dependências:** P-01..P-04.
- **Passos:** 1) criar app Next 15; 2) configurar TS estrito; 3) Tailwind 4 + shadcn init; 4) ESLint/Prettier/Husky.
- **Critérios de aceite:** [ ] build limpo; [ ] typecheck/lint ok; [ ] shadcn inicializado.
- **Fora de escopo:** componentes de negócio; conteúdo.
- **Riscos:** versões incompatíveis — fixar versões.
- **Prompt recomendado:** Issue 01 da seção 54.1.

#### Issue 02 — Tokens do Design System
- **Objetivo:** declarar tokens (cores, raios, sombras, fontes, gradientes, motion) via `@theme`; helper `cn()`.
- **Contexto da spec:** seções 8, 12, 13, 28, 30. Docs: `DESIGN_SYSTEM.md`.
- **Arquivos prováveis:** `app/globals.css`, `lib/utils.ts`.
- **Dependências:** Issue 01.
- **Passos:** 1) definir `@theme`; 2) tokens de cor/raio/sombra/motion; 3) `cn()`.
- **Critérios de aceite:** [ ] tokens utilizáveis; [ ] sem valor mágico; [ ] contraste AA.
- **Fora de escopo:** aplicar em componentes.
- **Riscos:** divergência com a paleta — seguir seção 12.
- **Prompt recomendado:** Issue 02 da seção 54.1.

#### Issue 03 — Layout base, fontes, providers, GTM
- **Objetivo:** `layout.tsx` com next/font (Manrope+Inter), GTM, Consent default, providers; metadata base.
- **Contexto da spec:** seções 11, 19, 20, 57. Docs: `SEO_ANALYTICS_SPEC.md`.
- **Arquivos prováveis:** `app/layout.tsx`, `lib/analytics.ts`, `components/consent/*`.
- **Dependências:** Issues 01–02.
- **Passos:** 1) fonts self-hosted; 2) GTM; 3) Consent default `denied`; 4) providers.
- **Critérios de aceite:** [ ] fonts sem requisição externa; [ ] GTM carrega; [ ] consent default `denied`.
- **Fora de escopo:** banner visual completo além do necessário; criação de `lib/env.ts` (agora na Issue 03A); integração real de GTM/GA4/Ads (Issue 18).
- **Riscos:** tags disparando antes do consent — validar.
- **Prompt recomendado:** Issue 03 da seção 54.1.

#### Issue 03A — Configuração de ambiente e validação de env
- **Objetivo:** criar `.env.example` e `lib/env.ts` cedo, antes de qualquer dependência real de ambiente (GTM, WhatsApp, `/api/lead`, Turnstile, CRM/webhook, analytics).
- **Contexto da spec:** seção 45 (variáveis de ambiente), 51 (segurança). Docs: `TECHNICAL_SPEC.md`.
- **Arquivos prováveis:** `.env.example`, `lib/env.ts`.
- **Dependências:** Issues 01 e 02.
- **Deve incluir:** todas as variáveis da seção 45; separação entre `NEXT_PUBLIC_*` (client) e server-only; validação com Zod; comentários indicando quais valores são placeholders; proibição de segredos em `NEXT_PUBLIC_*`; suporte a ambientes `development`/`staging`/`production`; falha clara no boot quando faltar variável obrigatória; possibilidade de mock em desenvolvimento para CRM/webhook.
- **Passos:** 1) escrever `.env.example` com placeholders comentados; 2) schema Zod separando client/server; 3) parse no boot com erro descritivo; 4) flags de mock para dev (CRM/webhook).
- **Critérios de aceite:** [ ] `.env.example` existe e não contém valores reais sensíveis; [ ] `lib/env.ts` valida as variáveis; [ ] nenhuma chave secreta exposta ao client; [ ] variáveis pendentes marcadas como `A_CONFIRMAR`; [ ] projeto roda em desenvolvimento com mocks controlados; [ ] Issues 03, 12 e 19 passam a depender desta Issue 03A.
- **Fora de escopo:** redirects e deploy (Issue 24); valores reais de produção.
- **Riscos:** segredo com prefixo `NEXT_PUBLIC_` — revisar; env obrigatória faltando em produção — validar no boot.
- **Prompt recomendado:** "Implemente APENAS a Issue 03A. Crie `.env.example` (seção 45) e `lib/env.ts` (validação Zod, separação client/server, mocks de dev). Bloco de regras padrão (seção 10). Sem valores reais; sem segredos em `NEXT_PUBLIC_*`."

#### Issue 03B — Analytics mínimo e contrato de eventos
- **Objetivo:** criar `lib/analytics.ts` com `trackEvent()` tipado e seguro, utilizável por componentes antes da configuração completa do GTM.
- **Contexto da spec:** seção 20 (eventos/dataLayer), 19 (analytics). Docs: `SEO_ANALYTICS_SPEC.md`.
- **Arquivos prováveis:** `lib/analytics.ts`; `types/analytics.ts` (se fizer sentido).
- **Dependências:** Issue 03A (pode vir logo após).
- **Comportamento (1ª etapa):** `trackEvent()` é um wrapper tipado; não quebra se `window`/`window.dataLayer` não existir (guarda SSR/Server boundaries); em `NODE_ENV === 'development'` pode logar no console; nunca envia PII em claro; aceita os eventos da seção 20; permite que LeadForm, WhatsApp, CallButton e FAQ sejam implementados sem depender do GTM real.
- **Passos:** 1) tipos dos eventos da seção 20; 2) `trackEvent()` com guarda de `window`/`dataLayer`; 3) log em dev; 4) proteção contra PII.
- **Critérios de aceite:** [ ] `trackEvent()` existe; [ ] eventos da seção 20 tipados; [ ] não quebra sem `window`; [ ] não quebra sem `dataLayer`; [ ] não envia PII; [ ] funciona corretamente em fronteiras Server/Client; [ ] usável por LeadForm, FAQ, WhatsApp e CallButton.
- **Fora de escopo:** integração real com GTM/GA4/Ads e validação no DebugView (Issue 18).
- **Riscos:** PII em claro — proibido; quebra em SSR — guardar `typeof window`.
- **Prompt recomendado:** "Implemente APENAS a Issue 03B. Crie `lib/analytics.ts` com `trackEvent()` tipado e seguro (sem quebrar sem `window`/`dataLayer`, log em dev, sem PII). Bloco de regras padrão (seção 10)."

#### Issue 04 — `lib/company.ts`
- **Objetivo:** fonte única tipada (`CompanyConfig`) com valores observados marcados `A CONFIRMAR`.
- **Contexto da spec:** seções 55, 64. Docs: `DADOS_OFICIAIS.md`.
- **Arquivos prováveis:** `lib/company.ts`.
- **Dependências:** P-05.
- **Passos:** 1) tipo; 2) `company`; 3) `companySameAs`; 4) marcar pendências.
- **Critérios de aceite:** [ ] tipo completo; [ ] nada hardcoded em JSX; [ ] pendências sinalizadas.
- **Fora de escopo:** consumo nos componentes.
- **Riscos:** publicar dado não confirmado — manter `A_CONFIRMAR`.
- **Prompt recomendado:** Issue 04 da seção 54.1.

#### Issue 05 — `lib/ramos.ts`
- **Objetivo:** array `InsuranceBranch[]` com 10 ramos + `getRamo(slug)`.
- **Contexto da spec:** seções 31, 56. Docs: `PRODUCT_SPEC.md`, `CONTENT_STRATEGY.md`.
- **Arquivos prováveis:** `lib/ramos.ts`.
- **Dependências:** Issue 04.
- **Passos:** 1) tipo; 2) 10 ramos; 3) preços de config; 4) `getRamo`.
- **Critérios de aceite:** [ ] 10 ramos tipados; [ ] `getRamo(slug)`; [ ] preços da lib.
- **Fora de escopo:** renderização.
- **Riscos:** preços pendentes — placeholders.
- **Prompt recomendado:** Issue 05 da seção 54.1.

#### Issue 06 — Header + Drawer mobile
- **Objetivo:** Header sticky/scrolled + MegaMenu desktop + Drawer mobile; CTAs de `company`.
- **Contexto da spec:** seções 5, 29, 30. Docs: `DESIGN_SYSTEM.md`.
- **Arquivos prováveis:** `components/layout/Header.tsx`, `Drawer`, nav data.
- **Dependências:** Issues 02, 04, 08.
- **Passos:** 1) nav desktop; 2) drawer mobile; 3) sticky/scroll; 4) a11y.
- **Critérios de aceite:** [ ] focus trap; [ ] Esc fecha; [ ] ≥44px; [ ] encolhe no scroll.
- **Fora de escopo:** footer; conteúdo de páginas.
- **Riscos:** foco preso — testar teclado.
- **Prompt recomendado:** Issue 06 da seção 54.1.

#### Issue 07 — Footer
- **Objetivo:** Footer com SUSEP/CNPJ/endereço/ouvidoria/legais/social de `company`; bloco de fraude resumido.
- **Contexto da spec:** seções 5, 9, 55.
- **Arquivos prováveis:** `components/layout/Footer.tsx`.
- **Dependências:** Issues 04, 08.
- **Passos:** 1) blocos legais/comercial; 2) links; 3) a11y.
- **Critérios de aceite:** [ ] zero hardcode; [ ] links legais corretos; [ ] acessível.
- **Fora de escopo:** página de fraude (Issue 22).
- **Riscos:** dados regulatórios pendentes — vir de `company`.
- **Prompt recomendado:** Issue 07 da seção 54.1.

#### Issue 08 — Componentes base (Button, Section, Container, Badge, Chip)
- **Objetivo:** primitives com `cva` sobre shadcn.
- **Contexto da spec:** seção 29.
- **Arquivos prováveis:** `components/ui/{button,section,container,badge,chip}.tsx`.
- **Dependências:** Issue 02.
- **Passos:** 1) variantes; 2) estados; 3) a11y.
- **Critérios de aceite:** [ ] variantes da seção 29; [ ] foco visível; [ ] ≥44px.
- **Fora de escopo:** componentes de negócio.
- **Riscos:** baixo.
- **Prompt recomendado:** Issue 08 da seção 54.1.

#### Issue 09 — CredBar
- **Objetivo:** barra de prova social (nota, avaliações, anos, SUSEP, nº seguradoras) de `company`.
- **Contexto da spec:** seções 16, 29, 55.
- **Arquivos prováveis:** `components/social/CredBar.tsx`.
- **Dependências:** Issues 04, 08.
- **Passos:** 1) layout; 2) números com contexto; 3) responsivo.
- **Critérios de aceite:** [ ] números com contexto textual (SR); [ ] responsivo.
- **Fora de escopo:** carrossel de reviews.
- **Riscos:** nota/avaliações pendentes — `A_CONFIRMAR`.
- **Prompt recomendado:** Issue 09 da seção 54.1.

#### Issue 10 — InsuranceCard + RamoGrid
- **Objetivo:** card de ramo + grid lendo `ramos`; Auto em destaque.
- **Contexto da spec:** seções 29, 31, 56.
- **Arquivos prováveis:** `components/home/{InsuranceCard,RamoGrid}.tsx`.
- **Dependências:** Issues 05, 08.
- **Passos:** 1) card; 2) grid; 3) destaque Auto; 4) hover lift.
- **Critérios de aceite:** [ ] preço "a partir de" da lib; [ ] hover lift; [ ] link "Cotar {ramo}".
- **Fora de escopo:** página da Home.
- **Riscos:** preços pendentes — placeholders.
- **Prompt recomendado:** Issue 10 da seção 54.1.

#### Issue 11 — LeadForm multi-step
- **Objetivo:** form 3 passos (RHF+Zod), só DDD+celular obrigatórios; UTM/gclid; estados; eventos.
- **Contexto da spec:** seções 21, 29, 30, 44.
- **Arquivos prováveis:** `components/lead/{LeadForm,ProgressBar,fields}.tsx`, `lib/validators.ts`.
- **Dependências:** Issues 02, 08, **03B (contrato mínimo de analytics)** e **P-09 (`FORMULARIOS_ATUAIS.md` — paridade de campos/máscaras/validações/hidden fields/pós-envio)** — **não** depende da integração completa do GTM (Issue 18).
- **Passos:** 1) schema; 2) passos; 3) captura UTM; 4) estados/eventos via `trackEvent()` (03B).
- **Critérios de aceite:** [ ] 2 campos viram lead; [ ] valida sem reload; [ ] emite `form_start/step/lead` via contrato mínimo (03B).
- **Fora de escopo:** rota `/api/lead` (Issue 12); validação real de eventos no DebugView (Issue 18).
- **Riscos:** a11y do form — foco no 1º inválido.
- **Prompt recomendado:** Issue 11 da seção 54.1.

#### Issue 12 — `/api/lead`
- **Objetivo:** Route Handler com Zod, E.164, idempotency, dedupe 24h, persistência, retry+fallback, rate limit, honeypot, Turnstile.
- **Contexto da spec:** seções 43, 44, 51.
- **Arquivos prováveis:** `app/api/lead/route.ts`, `lib/leads/*`.
- **Dependências:** Issues 03A (env), 04, 11, `validators.ts` e **P-09 (`INTEGRACOES_ATUAIS.md`/`API_CALLS_ATUAIS.md` — paridade de webhook/CRM e params realmente capturados hoje)**. (Env já criado na 03A; não depende mais da Issue 24.)
- **Passos:** 1) validar/normalizar; 2) idempotency/dedupe; 3) persistir + CRM/fallback; 4) segurança.
- **Critérios de aceite:** [ ] 201/422/200-dup/429; [ ] lead nunca perdido; [ ] alerta em falha.
- **Fora de escopo:** UI; CRM real (mockar via env).
- **Riscos:** destino do lead pendente (BLOQUEANTE) — mock + alerta.
- **Prompt recomendado:** Issue 12 da seção 54.1.

#### Issue 13 — `/cotacao`
- **Objetivo:** página com LeadForm variant `page` + lateral de confiança.
- **Contexto da spec:** seções 6, 21.
- **Arquivos prováveis:** `app/(marketing)/cotacao/page.tsx`.
- **Dependências:** Issues 11, 09.
- **Passos:** 1) layout; 2) form page; 3) metadata.
- **Critérios de aceite:** [ ] form funcional; [ ] metadata; [ ] mobile-first.
- **Fora de escopo:** —.
- **Riscos:** baixo.
- **Prompt recomendado:** Issue 13 da seção 54.1.

#### Issue 14 — `/obrigado`
- **Objetivo:** SuccessState + próximos passos; dispara `generate_lead`/Ads; noindex.
- **Contexto da spec:** seções 6, 15, 20.
- **Arquivos prováveis:** `app/(marketing)/obrigado/page.tsx`.
- **Dependências:** Issues 11, 18.
- **Passos:** 1) SuccessState; 2) disparo de conversão 1×; 3) noindex; 4) CTA WhatsApp.
- **Critérios de aceite:** [ ] conversão dispara 1×; [ ] noindex; [ ] CTA WhatsApp.
- **Fora de escopo:** —.
- **Riscos:** disparo duplicado — guardar idempotência.
- **Prompt recomendado:** Issue 14 da seção 54.1.

#### Issue 15 — Home
- **Objetivo:** compor seções (Hero, CredBar, RamoGrid, ComoFunciona, Benefits, CTA-meio, InsurersGrid, CoverageCards, Testimonials, FAQ, CTA-final).
- **Contexto da spec:** seções 6, 16.
- **Arquivos prováveis:** `app/(marketing)/page.tsx`, `components/home/*`.
- **Dependências:** Issues 02, 04, 05, 08, 09, 10, 11, 17, 19.
- **Passos:** 1) compor blocos; 2) LCP no hero; 3) 1 H1.
- **Critérios de aceite:** [ ] 1 H1; [ ] LCP no hero; [ ] reutiliza blocos prontos.
- **Fora de escopo:** criar componentes do zero (devem existir).
- **Riscos:** recriar inline — proibido; só compor.
- **Prompt recomendado:** Issue 15 da seção 54.1.

#### Issue 16 — Template `/seguro-[ramo]`
- **Objetivo:** rota dinâmica + `generateStaticParams`; renderiza de `ramos` (message match, coberturas, objeções, FAQ).
- **Contexto da spec:** seções 31, 56.
- **Arquivos prováveis:** `app/(marketing)/seguro-[ramo]/page.tsx`.
- **Dependências:** Issues 04, 05, 10, 11, 17, 19, 20.
- **Passos:** 1) rota dinâmica; 2) `generateStaticParams`; 3) render de `ramos`; 4) metadata por ramo.
- **Critérios de aceite:** [ ] 10 LPs geradas; [ ] sem copy duplicada manual; [ ] metadata por ramo.
- **Fora de escopo:** pSEO (cidade/modelo).
- **Riscos:** dados/preços pendentes — placeholders/staging.
- **Prompt recomendado:** Issue 16 da seção 54.1.

#### Issue 17 — FAQ + schema
- **Objetivo:** Accordion acessível + `FAQPage` JSON-LD de `ramos`/content.
- **Contexto da spec:** seções 29, 32.
- **Arquivos prováveis:** `components/shared/FAQ.tsx`, `lib/schema.ts`.
- **Dependências:** Issues 05, 08.
- **Passos:** 1) accordion ARIA; 2) JSON-LD; 3) evento `faq_open`.
- **Critérios de aceite:** [ ] ARIA correto; [ ] Rich Results válido; [ ] `faq_open` dispara.
- **Fora de escopo:** —.
- **Riscos:** schema inválido — validar Rich Results.
- **Prompt recomendado:** Issue 17 da seção 54.1.

#### Issue 18 — GTM/dataLayer (completar integração real e validação)
- **Objetivo:** completar a camada de analytics iniciada na Issue 03B — ligar `trackEvent()` ao GTM real, validar no GA4 DebugView/Tag Assistant e integrar GA4/Ads (conversões). A base tipada e segura já existe (03B).
- **Contexto da spec:** seções 19, 20.
- **Arquivos prováveis:** `lib/analytics.ts` (evolução), configuração GTM.
- **Dependências:** Issues 03B e 03A + **P-09 (`DATA_LAYER_ATUAL.md` — para não perder eventos/conversões atuais)**; acesso real a GTM/GA4/Ads.
- **Passos:** 1) confirmar push ao `dataLayer` com todos os eventos da seção 20 (parâmetro `ramo`); 2) validar no DebugView; 3) mapear tags GA4/Ads no GTM.
- **Critérios de aceite:** [ ] eventos no DebugView; [ ] tipados; [ ] sem PII em claro; [ ] conversões chegando ao GA4/Ads (teste).
- **Fora de escopo:** contrato mínimo de eventos (já entregue na 03B).
- **Riscos:** PII em claro — proibido; acesso a GA4/GTM/Ads pendente — depende de acesso externo.
- **Prompt recomendado:** Issue 18 da seção 54.1 (completar integração; a base mínima vem da 03B).

#### Issue 19 — WhatsApp/call tracking + FAB + StickyCTA
- **Objetivo:** WhatsAppFAB, StickyCTA, CallButton; `wa.me` por ramo (`lib/whatsapp`); eventos `whatsapp_click`/`call_click`.
- **Contexto da spec:** seções 16, 29, 34.
- **Arquivos prováveis:** `components/cta/*`, `lib/whatsapp.ts`.
- **Dependências:** Issues 03A (env/número via env), 03B (contrato de eventos), 04, 05 e **P-09 (paridade de fluxos/eventos de WhatsApp e telefone atuais)**. Não depende da integração completa do GTM (Issue 18).
- **Passos:** 1) FAB/StickyCTA/CallButton; 2) mensagens por ramo; 3) eventos via `trackEvent()` (03B).
- **Critérios de aceite:** [ ] msg pré-preenchida por ramo; [ ] abre no celular; [ ] eventos disparam.
- **Fora de escopo:** —.
- **Riscos:** **número de WhatsApp pendente (BLOQUEANTE)** — placeholder + não publicar.
- **Prompt recomendado:** Issue 19 da seção 54.1.

#### Issue 20 — SEO metadata + JSON-LD
- **Objetivo:** `generateMetadata` por página + JSON-LD (InsuranceAgency, Organization, Breadcrumb) de `company`/`ramos`.
- **Contexto da spec:** seções 17, 32.
- **Arquivos prováveis:** `lib/schema.ts`, metadata helpers, `opengraph-image.tsx`.
- **Dependências:** Issues 04, 05, 17.
- **Passos:** 1) metadata por página; 2) JSON-LD; 3) OG.
- **Critérios de aceite:** [ ] title/desc únicos; [ ] OG por página; [ ] Rich Results válido.
- **Fora de escopo:** Article/blog schema (Fase 3).
- **Riscos:** dados regulatórios pendentes — não publicar schema final.
- **Prompt recomendado:** Issue 20 da seção 54.1.

#### Issue 21 — sitemap + robots
- **Objetivo:** sitemap dinâmico (home, ramos, institucionais) + robots (bloquear `/api`, `/obrigado` noindex).
- **Contexto da spec:** seções 17, 32.
- **Arquivos prováveis:** `app/sitemap.ts`, `app/robots.ts`.
- **Dependências:** Issues 16, 20.
- **Passos:** 1) sitemap; 2) robots; 3) lastmod.
- **Critérios de aceite:** [ ] URLs corretas; [ ] lastmod; [ ] aponta sitemap.
- **Fora de escopo:** pSEO.
- **Riscos:** indexar `/obrigado` — garantir noindex.
- **Prompt recomendado:** Issue 21 da seção 54.1.

#### Issue 22 — FraudAlert (banner + página)
- **Objetivo:** banner dismissível (cookie) + `/alerta-de-fraude`; texto atual preservado; único uso do vermelho.
- **Contexto da spec:** seções 1, 29, 55.
- **Arquivos prováveis:** `components/shared/FraudAlert.tsx`, `app/(legal)/alerta-de-fraude/page.tsx`.
- **Dependências:** Issues 08, 04.
- **Passos:** 1) banner + dismiss em cookie; 2) página; 3) a11y.
- **Critérios de aceite:** [ ] dismiss persiste; [ ] página indexável; [ ] acessível.
- **Fora de escopo:** —.
- **Riscos:** texto oficial pendente — `A_CONFIRMAR` com Jurídico.
- **Prompt recomendado:** Issue 22 da seção 54.1.

#### Issue 23 — QA mobile-first + a11y
- **Objetivo:** varredura 360→1440, teclado, axe; corrigir falhas.
- **Contexto da spec:** seções 14, 26, 37, 53.
- **Arquivos prováveis:** testes/ajustes.
- **Dependências:** páginas e componentes prontos.
- **Passos:** 1) responsivo; 2) teclado; 3) axe; 4) corrigir.
- **Critérios de aceite:** [ ] 0 violação a11y crítica; [ ] alvos ≥44px; [ ] sem CLS.
- **Fora de escopo:** Storybook completo (Fase 2).
- **Riscos:** regressões — re-rodar após fixes.
- **Prompt recomendado:** Issue 23 da seção 54.1.

#### Issue 23A — Staging seguro e não indexável
- **Objetivo:** garantir que ambientes de preview/staging possam ser usados com placeholders sem risco de indexação, tráfego de Ads ou exposição pública indevida.
- **Contexto da spec:** seções 17/32 (SEO técnico/robots), 47 (migração), 57 (LGPD/consent). Docs: `SEO_ANALYTICS_SPEC.md`, `TECHNICAL_SPEC.md`.
- **Arquivos prováveis:** `app/robots.ts`, `middleware.ts` (se necessário), `app/layout.tsx`, `components/shared/StagingBanner.tsx`, configuração Vercel/staging, `lib/env.ts`.
- **Dependências:** Issues 03A (env define o ambiente), 03 (layout). Deve estar ativa **antes** de páginas comerciais irem para staging.
- **Deve incluir:** staging com `noindex,nofollow`; robots bloqueando crawlers em staging; banner visual discreto "Ambiente de homologação"; proteção opcional por senha/basic auth ou Vercel Protection, se disponível; canonical apontando para produção apenas em produção; nenhuma campanha Google Ads apontando para staging; Search Console não deve receber sitemap de staging; `/obrigado` sempre noindex; páginas com dados `A_CONFIRMAR` nunca indexáveis; regra clara para remover o banner apenas em produção.
- **Passos:** 1) detectar ambiente via env (03A); 2) `robots.ts` condicional (noindex em staging); 3) meta `noindex,nofollow` em staging; 4) `StagingBanner` visível só fora de produção; 5) canonical correto por ambiente.
- **Critérios de aceite:** [ ] staging não indexável; [ ] preview não aparece em sitemap público; [ ] banner de staging visível; [ ] produção não mostra banner; [ ] staging pode usar placeholders sem risco comercial/SEO.
- **Fora de escopo:** deploy de produção final (Issue 24).
- **Riscos:** staging indexado por engano — testar robots/meta; banner vazando em produção — condicionar por env.
- **Prompt recomendado:** "Implemente APENAS a Issue 23A. Configure staging noindex/nofollow, robots condicional por ambiente (env da 03A), `StagingBanner` visível só fora de produção e canonical correto. Bloco de regras padrão (seção 10)."

#### Issue 23B — Auditoria anti-hardcode
- **Objetivo:** criar uma checagem (manual ou automatizada) que impeça hardcodes de dados institucionais, comerciais e regulatórios fora das fontes permitidas.
- **Contexto da spec:** seções 48 (guard-rails), 55/56 (fontes únicas de dados), 58 (checklist de PR).
- **Arquivos prováveis:** `scripts/check-hardcoded-business-data.mjs` (ou checklist manual no início), integração no CI/PR.
- **Dependências:** Issues 04 e 05 (fontes legítimas já existem). Deve estar disponível **antes** de PRs de páginas comerciais.
- **Padrões proibidos a procurar:** `(11) 3230`, `3230-1422`, `95328-8466`, `97668-7668`, `45.998.165`, `252174522`, `R$ 79`, `R$ 49`, `R$ 99`, `wa.me`, `g.page`, `google.com/maps`, `segurosimediato.com.br`, e-mails comerciais recorrentes.
- **Regra:** esses dados só podem aparecer em `lib/company.ts`, `lib/ramos.ts`, `.env.example`, arquivos de documentação em `/docs` e testes específicos justificados. **Não** podem aparecer em JSX de componentes, páginas, helpers soltos ou arquivos duplicados.
- **Passos:** 1) definir lista de padrões proibidos; 2) script que varre `app/`, `components/`, `lib/` (exceto fontes permitidas); 3) comando `npm run check:hardcode`; 4) integrar ao checklist de PR/CI.
- **Critérios de aceite:** [ ] existe lista de padrões proibidos; [ ] existe comando ou checklist para rodar antes de PR; [ ] PR falha/é bloqueado se detectar hardcode proibido; [ ] o plano de QA menciona esta checagem; [ ] o checklist de PR menciona esta checagem.
- **Fora de escopo:** correção automática (apenas detecção); lint de tokens de cor/spacing (coberto por ESLint/DS).
- **Riscos:** falsos positivos em `/docs`/testes — usar allowlist de caminhos.
- **Prompt recomendado:** "Implemente APENAS a Issue 23B. Crie `scripts/check-hardcoded-business-data.mjs` com a lista de padrões proibidos e allowlist de caminhos (`lib/company.ts`, `lib/ramos.ts`, `.env.example`, `/docs`, testes). Adicione `npm run check:hardcode`. Bloco de regras padrão (seção 10)."

#### Issue 24 — Deploy + redirects + go-live
- **Objetivo:** preparar produção: redirects 301 do mapa de migração em `next.config`, configuração de deploy na Vercel, variáveis de ambiente de produção e verificação de go-live. **A criação de `.env.example`/`lib/env.ts` foi movida para a Issue 03A** — aqui apenas se configuram e validam os valores reais de produção.
- **Contexto da spec:** seções 47, 58, 59, 60.
- **Arquivos prováveis:** `next.config.mjs`, configuração Vercel/env de produção.
- **Dependências:** Issues 23A (staging seguro), 23B (anti-hardcode), `INVENTARIO_URLS.md`, checklist comercial (seção 60) e praticamente todas as anteriores.
- **Passos:** 1) redirects 301 do inventário; 2) configurar Vercel + env de produção; 3) build de produção; 4) rodar checklist de go-live (seção 15.1).
- **Critérios de aceite:** [ ] 301s ativos; [ ] env de produção configurado e validado (via `lib/env.ts` da 03A); [ ] build de produção ok; [ ] banner de staging ausente em produção; [ ] checklist comercial (seção 60) completo.
- **Fora de escopo:** criação primária de `lib/env.ts` (Issue 03A).
- **Riscos:** redirect errado/perda de SEO — testar em staging; env de produção incompleto — validar no boot.
- **Prompt recomendado:** Issue 24 da seção 54.1, focada em deploy/redirects/go-live (env já criado na 03A).

---

## 9. Dependências entre issues

### 9.1 Matriz (issue → depende de) — atualizada na rev. 4.1

- **01 Scaffold** → P-01..P-04.
- **02 Tokens** → 01.
- **03 Layout/GTM inicial** → 01, 02.
- **03A Env/validação** → 01, 02.
- **03B Analytics mínimo** → 03A (ou logo após).
- **04 company.ts** → P-05.
- **05 ramos.ts** → 04.
- **08 Base UI** → 02.
- **06 Header/Drawer** → 02, 04, 08 (+ **P-10** para logo/ícones finais).
- **07 Footer** → 04, 08 (+ **P-10** para logo/ícones finais).
- **09 CredBar** → 04, 08.
- **10 InsuranceCard/RamoGrid** → 05, 08 (+ **P-10** para ícones/assets finais).
- **InsurersGrid / Testimonials (parte da Issue 15/Home e Fase 4)** → 08 + **P-10** (logos de seguradoras/fotos reais em SVG/`lib/assets.ts`).
- **P-09 Auditoria JS legado** → P-01; acesso a Webflow/GTM. **Antes de 11, 12, 18, 19 e páginas comerciais.**
- **P-10 Auditoria SVGs/assets** → P-01; acesso a Webflow Asset Manager/Export. **Antes da versão final de 02 (visual), 06, 07, 10, InsurersGrid, Testimonials, páginas institucionais/comerciais, uso de logos de seguradoras e configuração final de `next/image`.** (Placeholders permitidos antes.)
- **11 LeadForm** → 02, 08, **03B** (contrato mínimo de analytics; **não** a Issue 18 completa) + **P-09** (paridade de campos/máscaras/validações/pós-envio).
- **12 /api/lead** → **03A**, 04, 11, validators + **P-09** (paridade de integrações/webhook/CRM e params capturados).
- **13 /cotacao** → 11, 09.
- **14 /obrigado** → 11, **03B** (dispara conversão via contrato mínimo; validação real na 18).
- **17 FAQ+schema** → 05, 08.
- **19 WhatsApp/call** → **03A**, **03B**, 04, 05 + **P-09** (paridade de fluxos/eventos de WhatsApp e telefone).
- **18 GTM/dataLayer (completar)** → 03B, 03A + **P-09** (`DATA_LAYER_ATUAL.md`, para não perder eventos/conversões atuais); acesso real GA4/GTM/Ads.
- **20 SEO metadata/JSON-LD** → 04, 05, 17 + **dados confirmados para publicação**.
- **21 sitemap/robots** → 16, 20.
- **22 FraudAlert** → 08, 04.
- **23A Staging seguro** → 03A, 03 — **antes de páginas comerciais em staging** (precede 15/16).
- **23B Anti-hardcode** → 04, 05 — **antes de PRs de páginas comerciais** (precede 15/16).
- **15 Home** → 02, 04, 05, 08, 09, 10, 11, 17, 19 + **23A** (staging seguro no ar) + **23B** (anti-hardcode ativo antes do PR).
- **16 /seguro-[ramo]** → 04, 05, 10, 11, 17, 19, 20 + **23A** (staging seguro) + **23B** (anti-hardcode antes do PR).
- **23 QA** → todas as páginas/componentes.
- **24 Deploy + redirects + go-live** → **23A**, **23B**, `INVENTARIO_URLS.md`, checklist comercial (seção 60) e praticamente todas.

### 9.2 Classificação das issues

- **Pode começar agora (scaffold/fundação/descoberta):** P-01..P-08, **P-09 (auditoria de JS legado)**, **P-10 (auditoria de SVGs/assets)** — ambas quanto antes melhor —, 01, 02, 03, 03A, 03B, 08.
- **Depende de dados pendentes (placeholders permitidos; não publicar):** 04, 05, 09, 10, 19 (WhatsApp), 20 (regulatório), 22 (texto fraude); páginas comerciais 15/16 (claims/preços).
- **Depende de componentes anteriores:** 06, 07, 11, 13, 14, 15, 16, 17, 21, 23, 23A, 23B.
- **Depende de acesso externo:** P-09 (Webflow Custom Code + GTM; parcial só com HTML publicado + rede), P-10 (Webflow Asset Manager/Export; parcial só com HTML publicado + URLs públicas; Cloudinary se usado), 12 (CRM/webhook/DB/Turnstile), 18/20/21 (GA4/Ads/Search Console para validação real), 24 (DNS/Vercel/redirects).

---

## 10. Estratégia de implementação segura no Cursor

Regras práticas (derivadas das seções 48 e 54.0):

- **Nunca** pedir "implemente tudo". Uma issue por prompt.
- **Sempre** limitar a 1 issue por prompt e referenciar 1–3 seções/arquivos.
- **Sempre** pedir o plano de arquivos antes de qualquer alteração e aguardar.
- **Sempre** rodar `typecheck` e `lint` após implementar e colar o resultado.
- **Sempre** revisar diffs antes de aceitar.
- **Sempre** verificar hardcodes proibidos (telefone, CNPJ, SUSEP, preços, WhatsApp).
- **Sempre** atualizar a documentação relevante (`CHANGELOG`, `DECISIONS` se houver decisão).
- **Sempre** anexar print/resumo (Definition of Done, seção 53).
- **Nunca** implementar página antes de dados/componentes existirem.
- **Sempre** usar placeholders explícitos (`A_CONFIRMAR`) quando dados estiverem pendentes.

### 10.1 Modelo de prompt padrão (por issue)

```
Você está implementando APENAS a issue [#X — título].
Referência: seções [A, B, C] da especificação (cole os trechos).
Escopo (MVP_SCOPE.md): NÃO implemente nada fora da issue.

REGRAS OBRIGATÓRIAS (bloco padrão):
- Não implemente nada fora do escopo desta issue.
- Não crie componentes ou páginas não solicitadas.
- Não adicione bibliotecas novas sem justificar antes.
- TypeScript estrito. Tailwind CSS 4 + tokens do Design System (seções 8/28).
- Sem valores mágicos de cor, espaçamento ou sombra.
- Sem hardcode de dados institucionais/regulatórios/telefones/preços/CNPJ/WhatsApp
  → tudo vem de lib/company.ts, lib/ramos.ts ou env (seções 55/56/45).
- Sem checkout, pagamento ou contratação automática.
- Sem CMS, blog ou pSEO nesta fase (MVP_SCOPE, seção 41).
- Antes de alterar arquivos: liste o plano de execução e aguarde.
- Depois de implementar: rode `typecheck` e `lint` e cole o resultado.
- Ao final: explique o que foi feito, eventos de analytics tocados, e o que ficou fora.
```

---

## 11. Estratégia de dados pendentes

Como há dados a confirmar, o trabalho é segmentado para não bloquear tudo (base: seções 64/68).

### 11.1 Pode avançar agora
- Documentação (`/docs`), divisão da especificação, ADRs.
- Scaffold (Issue 01) e tokens (Issue 02).
- Estrutura de diretórios e tipos (`CompanyConfig`, `InsuranceBranch`, `leadSchema`).
- Placeholders explícitos em `company.ts`/`ramos.ts`.
- Componentes base (Button/Section/Container/Badge/Chip) e layout.
- Skeleton de páginas (em staging, sem claims finais).

### 11.2 Não deve avançar sem confirmação
- Publicação em produção (go-live).
- CTAs finais de WhatsApp (número oficial é CRÍTICO).
- Schema final com dados regulatórios (`InsuranceAgency`/`Organization`/`aggregateRating`).
- Preços definitivos por ramo.
- Páginas comerciais com claims finais (anos de experiência, satisfação, preços).
- Conversão final do Google Ads.
- Qualquer go-live.

### 11.3 Pode avançar com placeholders
- `company.ts` e `ramos.ts` (valores observados marcados `A_CONFIRMAR`).
- Páginas em staging (não indexadas/não publicadas).
- Componentes e testes visuais.
- Skeleton de tracking (eventos com IDs placeholder, validados depois no DebugView).

---

## 12. Plano de qualidade

Cada teste classificado por gate (base: seções 25–27, 37, 53, 58).

| Teste | Classe |
|---|---|
| typecheck (`tsc --noEmit`) | Obrigatório para PR |
| lint (ESLint + jsx-a11y) | Obrigatório para PR |
| build | Obrigatório para PR |
| Lighthouse mobile ≥95 (4 categorias) | Obrigatório para homologação |
| Playwright (fluxo de cotação, CTAs) | Obrigatório para homologação |
| Testes de formulário (validação/erro/sucesso/foco) | Obrigatório para homologação |
| Teste de WhatsApp (abre conversa, msg por ramo) | Obrigatório para produção |
| Teste de telefone (abre discador) | Obrigatório para produção |
| Teste de GTM (Preview sem erro) | Obrigatório para homologação |
| Teste de GA4 (DebugView: `generate_lead`, `whatsapp_click`) | Obrigatório para homologação |
| Teste de Google Ads (conversão de teste) | Obrigatório para produção |
| Teste de Consent Mode (tags só após consent) | Obrigatório para produção |
| Teste de mobile (iOS Safari + Android Chrome reais, 4G) | Obrigatório para produção |
| Teste de acessibilidade (axe 0 críticas/sérias, teclado, SR) | Obrigatório para homologação |
| Teste de redirects (301 em staging) | Obrigatório para produção |
| Teste de fallback de leads (CRM cai → e-mail + persistência) | Obrigatório para produção |
| Teste de rollback (promote anterior / DNS) | Obrigatório para produção |
| Unit (Vitest) de validadores/helpers | Obrigatório para PR (quando houver lógica) |
| **Auditoria anti-hardcode (`npm run check:hardcode`, Issue 23B)** | **Obrigatório para PR** |
| **Staging não indexável (robots/meta noindex + banner, Issue 23A)** | **Obrigatório para homologação** |
| **QA visual de assets (Issue P-10, ver checklist abaixo)** | **Obrigatório para homologação** |
| Storybook completo / Chromatic / Lighthouse CI no pipeline | Fase posterior (Fase 2 de produto) |

**QA visual de assets (Issue P-10) — checklist de homologação:**
- [ ] todos os logos aparecem corretamente;
- [ ] assets críticos existem em `/public` ou `lib/assets.ts`;
- [ ] imagens têm `width` e `height`;
- [ ] imagens têm `alt` adequado;
- [ ] assets decorativos têm `alt=""` ou `aria-hidden`;
- [ ] imagem LCP do hero está otimizada (dentro do orçamento);
- [ ] logos de seguradoras estão legíveis em mobile;
- [ ] não há SVG inline grande em páginas;
- [ ] ícones genéricos foram substituídos por Lucide quando apropriado.

**QA de Cloudinary (quando usado) — reforço rev. 4.1:**
- [ ] todas as imagens Cloudinary usadas estão registradas em `CLOUDINARY_ASSETS.md`;
- [ ] todas as imagens Cloudinary usadas estão centralizadas em `lib/assets.ts`;
- [ ] nenhuma URL Cloudinary aparece diretamente em JSX;
- [ ] domínio Cloudinary configurado em `next.config.mjs`, se `next/image` for usado;
- [ ] assets críticos possuem fallback local ou alternativa documentada;
- [ ] imagens críticas de hero respeitam orçamento de LCP;
- [ ] imagens geradas por IA foram revisadas quanto à confiança e autenticidade.

**Gates de CI que bloqueiam merge:** typecheck+lint · build · testes relevantes · **auditoria anti-hardcode verde (Issue 23B)** · sem libs novas não aprovadas · responsivo validado · eventos de analytics validados (quando aplicável) · screenshots/vídeo anexados.

**Checklist de PR (bloqueia merge) — reforço v2/rev. 4.1:** além dos gates acima, o revisor confirma explicitamente que **nenhum dado institucional/regulatório/comercial aparece em JSX/páginas/helpers** (rodar `npm run check:hardcode`); dados só vêm de `lib/company.ts`, `lib/ramos.ts` ou env. **Regra rev. 4.1:** a Home (15) e as LPs `/seguro-[ramo]` (16) **só podem abrir PR** com a auditoria anti-hardcode (Issue 23B / `npm run check:hardcode` ou checklist equivalente) **ativa**. Exceções permitidas para os padrões proibidos: `lib/company.ts`, `lib/ramos.ts`, `.env.example`, `/docs` e testes específicos justificados.

**Definition of Done (reforço v2/rev. 4.1):** um item só é "Done" quando, além dos critérios da seção 53 da spec, a **auditoria anti-hardcode passa** e — para páginas comerciais — (a) o ambiente é **staging seguro/noindex (Issue 23A)** enquanto houver dados `A_CONFIRMAR`; e (b) as auditorias aplicáveis foram confrontadas: **P-09** para comportamento (LeadForm/`/api/lead`/tracking/WhatsApp) e **P-10** para acabamento visual (identidade/Header/Footer/InsurersGrid/imagens/logos).

---

## 13. Plano de migração e SEO

Base: seções 17, 32, 47, 59, 65. A auditoria real **ainda precisa ser preenchida** (depende de dados de tráfego/Search Console/Ads — `PENDING`).

- **Inventário de URLs:** produzir a partir de Webflow + sitemap atual + Search Console + Analytics + Google Ads (LPs) + Screaming Frog + backlinks. Consolidar em `INVENTARIO_URLS.md`. **Status: PENDING (auditoria real não realizada).**
- **Redirects 301:** preservar slugs que rankeiam (200, mesma URL); 301 só quando o slug muda (ex.: `/seguro-motos` → `/seguro-moto`). Nenhuma URL com tráfego/backlink vira 404. Em `next.config.mjs` (`redirects()`) ou middleware.
- **Sitemap:** dinâmico (home, ramos, institucionais), com `lastmod`; particionar se crescer (Fase 3).
- **Robots:** bloquear `/api` e thin content; `/obrigado` noindex.
- **Canonical:** em todas as páginas; por ramo via `seo.canonicalPath`.
- **Metadata:** `generateMetadata` por página (title <60c, desc <155c).
- **JSON-LD:** `InsuranceAgency`, `Organization`, `FAQPage`, `BreadcrumbList` (dados regulatórios `A_CONFIRMAR`).
- **Páginas `noindex`:** `/obrigado` e quaisquer thin/staging.
- **Search Console:** verificar domínio; submeter sitemap; "Validar correção"; IndexNow.
- **Monitoramento de 404:** acompanhar por ≥30–60 dias após go-live; adicionar 301 conforme surgirem.
- **Preservação de tráfego orgânico:** regra de ouro — nenhuma URL indexada/com tráfego/backlink removida sem redirect ou justificativa documentada.
- **Auditoria pós-go-live:** comparar indexação, posição média e impressões com baseline (`BASELINE_METRICS.md`). **Status: PENDING (depende de baseline coletado).**
- **Auditoria de comportamento (JS legado):** a migração de URLs/SEO **não** cobre o comportamento em runtime (formulários, tracking, integrações). Isso é tratado na seção dedicada abaixo e na Issue P-09, e é **pré-requisito** de LeadForm/`/api/lead`/GTM/WhatsApp. **Status: PENDING (auditoria não realizada).**

> **Importante:** as tabelas 59/65.1 da spec estão majoritariamente com `TBD` nas colunas de tráfego/backlink/indexação. Não decidir `manter`/`301`/`remover` sem os dados reais — usar `investigar` até a auditoria.

---

## Auditoria do JavaScript legado do Webflow

> Complementa a seção 13 (Migração e SEO). A migração de URLs preserva **endereços**; esta auditoria preserva **comportamento** (formulários, validações, máscaras, captura de parâmetros, cookies/storage, dataLayer, eventos GTM, chamadas de API/webhook, integrações CRM/WhatsApp, scripts de terceiros, redirecionamentos e regras condicionais por ramo).
>
> **Regra:** antes de substituir o site atual (`https://www.segurosimediato.com.br`), é **obrigatório** mapear todos os scripts em uso. Nenhuma integração, automação ou regra de negócio existente pode ser perdida na migração para Next.js. Esta auditoria é executada na **Issue P-09** e consolidada em `/docs/LEGACY_JS_AUDIT.md` (+ docs correlatos). **Status: PENDING.**

O site foi feito em Webflow, mas pode conter código `.js` externo ou embutido com tratamentos críticos fora do editor visual: manipulação/validação de formulários; máscaras de telefone, CPF, CEP e placa; captura de UTMs, GCLID, FBCLID, WBRAID, GBRAID; persistência de cookies/localStorage; disparos de `dataLayer`; eventos de GTM; chamadas para APIs externas; webhooks; integrações com CRM/WhatsApp/ferramentas de tracking; scripts de terceiros; redirecionamentos; tratamentos pós-envio de lead; disparos de processos adjacentes; e regras condicionais por ramo/produto.

### Fontes de JavaScript a inspecionar

- Webflow Project Settings → Custom Code (head e footer globais);
- Webflow Page Settings → Head Code (por página);
- Webflow Page Settings → Before `</body>` (por página);
- Embed blocks dentro das páginas;
- scripts carregados por CDN;
- scripts inline no HTML publicado;
- arquivos `.js` externos;
- GTM container atual (`GTM-PD6J398` — confirmar);
- tags customizadas dentro do GTM (Custom HTML);
- eventos `dataLayer.push`;
- formulários Webflow (action, name, campos, hidden fields);
- scripts de máscara/validação;
- scripts de WhatsApp;
- scripts de rastreamento de Ads;
- scripts de ferramentas de terceiros (chat, heatmap, pixels);
- chamadas `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`;
- uso de `localStorage`, `sessionStorage` e cookies (`document.cookie`).

### Como isso se conecta ao restante do plano

- **Bloqueia paridade** das Issues 11 (LeadForm), 12 (`/api/lead`), 18 (GTM/dataLayer) e 19 (WhatsApp/call) — nenhuma delas deve ser considerada "Done" sem confrontar o comportamento legado documentado.
- **Alimenta** `lib/validators.ts` (máscaras/validações reais), `lib/analytics.ts`/Issue 18 (eventos reais), `lib/whatsapp.ts` (mensagens/fluxos reais) e o contrato de `/api/lead` (campos/params realmente capturados hoje).
- **Não altera o escopo da Fase 1** nem antecipa itens de fases futuras; é uma etapa de **descoberta/paridade**, não de implementação de produto.

---

## Auditoria e migração de SVGs e assets visuais do Webflow

> Complementa a seção 8 da spec (Design System) e a seção "Sistema de imagens" (35). Antes da implementação visual final, é **obrigatório** mapear e **classificar** todos os SVGs e assets visuais do site atual (`https://www.segurosimediato.com.br`). O objetivo é **preservar o que é valioso** (logo da Imediato, logos de seguradoras, fotos reais) e **substituir/descartar** o que for genérico, datado, duplicado ou pesado — em vez de copiar tudo mecanicamente. Executada na **Issue P-10** e consolidada em `/docs/SVG_ASSETS_AUDIT.md` (+ correlatos). **Status: PENDING.**

### 1. Fontes de SVGs/assets a inspecionar

- HTML publicado do site atual;
- SVGs inline no HTML;
- SVGs dentro de Embed blocks do Webflow;
- arquivos `.svg` carregados por URL;
- imagens usadas como logos;
- logos de seguradoras;
- logo da Imediato;
- ícones customizados;
- ícones genéricos;
- elementos decorativos;
- assets em PNG/WebP que idealmente deveriam ser SVG;
- Webflow Assets Manager;
- Webflow Export, se disponível;
- CSS com `background-image`;
- scripts que injetam SVG ou imagens;
- GTM/custom HTML, se houver inserção visual;
- Cloudinary, se houver imagens/assets já hospedados lá.

### 2. Critérios de classificação

Cada asset deve ser classificado como:

- **Migrar obrigatório** — logo da Imediato, logos oficiais de seguradoras, assets institucionais essenciais.
- **Migrar opcional** — asset útil, mas não bloqueante.
- **Substituir por Lucide** — ícone genérico que deve virar componente Lucide.
- **Substituir por novo Design System** — decoração antiga, padrão visual datado ou inconsistente.
- **Descartar** — duplicado, pesado, antigo, sem função clara.
- **Investigar** — origem/finalidade incerta.
- **Cloudinary** — imagem já hospedada e aprovada para uso externo.

### 3. Regras de migração (obrigatórias)

1. Não copiar todos os SVGs automaticamente.
2. Logos proprietários e de seguradoras preservados preferencialmente em **SVG local**.
3. Ícones genéricos substituídos por **Lucide Icons** sempre que possível.
4. SVG inline grande **não** deve ser espalhado em JSX.
5. SVGs migrados salvos em pastas organizadas dentro de `/public`.
6. Caminhos dos assets **centralizados em `lib/assets.ts`**.
7. Nenhuma URL de asset espalhada em componentes.
8. Logos de seguradoras com `alt` correto ou `aria-hidden` quando decorativos.
9. Assets decorativos respeitam o novo Design System.
10. Imagens do Cloudinary registradas em `lib/assets.ts` com `src`, `alt`, `width`, `height`, `usage` e `priority` (quando aplicável).
11. Domínio Cloudinary configurado em `next.config.mjs` se usado por `next/image`.
12. Imagens críticas de hero respeitam orçamento de performance e LCP (seção 35: hero ≤120KB).
13. Uso de imagens geradas por IA revisado para não prejudicar confiança/autenticidade.
14. Fotos reais da equipe e do escritório têm prioridade sobre imagens genéricas.
15. SVGs/ícones antigos que conflitem com a nova identidade são descartados ou redesenhados.

### 4. Estrutura sugerida de assets

```
public/
  logos/
    imediato-logo.svg
    imediato-logo-white.svg
    seguradoras/
      porto.svg
      bradesco.svg
      azul.svg
      itau.svg
      hdi.svg
      tokio.svg
      sompo.svg
      mapfre.svg
      liberty.svg
      allianz.svg
      loovi.svg
      pier.svg
      justos.svg
      darwin.svg
      usebens.svg
      youse.svg
      ezze.svg
  icons/
    custom/
  decorative/
  images/
    fallback/
```

E o arquivo `lib/assets.ts`, centralizando: logos; imagens Cloudinary; imagens locais; alt texts; dimensões; uso previsto; prioridade de carregamento; fallback.

> Observação: os nomes de arquivo acima são **sugestões de convenção**, não afirmação de que os SVGs já existem. Nada deve ser baixado/copiado antes da auditoria (Issue P-10). A lista de seguradoras (16 vs 18) permanece `A_CONFIRMAR` (seção 5).

### 5. Como isso se conecta ao restante do plano

- **Bloqueia a versão final** (não o início com placeholders) da Issue 06 (Header), 07 (Footer), 10 (InsuranceCard/RamoGrid), do InsurersGrid, Testimonials e das páginas institucionais/comerciais.
- **Alimenta** `lib/assets.ts`, `lib/seguradoras.ts` (logos), o Design System (Issue 02, quando houver dependência visual) e a configuração de `next/image` (domínios/otimização).
- **Não altera o escopo da Fase 1** nem antecipa fases futuras; é etapa de **descoberta/curadoria**, não de implementação.

---

## Papel das auditorias P-09 e P-10

> Esclarece o que cada auditoria bloqueia (e o que **não** bloqueia), evitando ambiguidade sobre "bloquear tudo".

### P-09 — Bloqueia comportamento

A Issue P-09 bloqueia a conclusão (status "Done") de qualquer item que dependa de comportamento legado do Webflow. Ela bloqueia o fechamento final de:

- LeadForm;
- `/api/lead`;
- GTM/dataLayer;
- GA4/Ads;
- WhatsApp/call tracking;
- formulários;
- captura de UTM/GCLID/WBRAID/GBRAID;
- redirecionamentos pós-formulário;
- integrações com CRM/webhook;
- tags e scripts adjacentes;
- processos acionados por JavaScript legado.

Pode-se trabalhar em skeletons com placeholders, mas nenhum desses itens é considerado finalizado sem confronto com: `LEGACY_JS_AUDIT.md`, `FORMULARIOS_ATUAIS.md`, `DATA_LAYER_ATUAL.md`, `INTEGRACOES_ATUAIS.md`, `API_CALLS_ATUAIS.md`.

**Regra prática:** P-09 **não** bloqueia scaffold, tokens, componentes base ou layout estático. Ela bloqueia **comportamento** de conversão, tracking, integrações e paridade operacional.

### P-10 — Bloqueia acabamento visual final

A Issue P-10 **não** bloqueia scaffold, tokens abstratos ou componentes base com placeholders. Ela bloqueia apenas a **versão final** de:

- identidade visual aplicada;
- Header com logo final;
- Footer com logos/assets finais;
- InsurersGrid;
- Testimonials com imagens;
- páginas institucionais;
- páginas comerciais;
- uso final de logos de seguradoras;
- uso de Cloudinary;
- configuração definitiva de `next/image`;
- imagens finais de hero;
- assets finais de marca.

Pode-se avançar com placeholders, mas nenhuma página visual é considerada final sem: `SVG_ASSETS_AUDIT.md`, `BRAND_ASSETS.md`, `IMAGE_ASSETS_INVENTORY.md`, `CLOUDINARY_ASSETS.md` (se aplicável) e assets centralizados em `lib/assets.ts`.

**Regra prática:** P-10 **não** bloqueia o início do Design System ou componentes com placeholders. Ela bloqueia a **versão visual final** e a homologação visual.

---

## 14. Plano de analytics e conversões

Base: seções 18, 19, 20, 43, 57.

- **Eventos dataLayer (contrato app→tags):** `page_view`, `form_start`, `form_step`, `generate_lead`, `whatsapp_click`, `call_click`, `scroll_depth`, `engaged_time`, `cta_click`, `faq_open`. Nomes em `snake_case`, com parâmetro `ramo` onde aplicável.
- **GA4:** fonte de verdade; funil view LP → `form_start` → `form_step` → `generate_lead` (+ caminho `whatsapp_click` → lead).
- **GTM:** camada de tags (`GTM-PD6J398` — `A_CONFIRMAR`); nada hard-coded; tudo via `dataLayer.push`.
- **Google Ads:** conversões primárias = envio de form + clique WhatsApp/Ligar; secundárias = `scroll_depth` 75% + `engaged_time` >60s; conversão por ramo.
- **Enhanced Conversions:** e-mail/telefone hasheados (1ª parte) no envio e no `/obrigado`, somente com `ad_user_data:granted`.
- **Consent Mode v2:** defaults `denied`; `update` ao escolher no banner; eventos só após `analytics_storage:granted`.
- **DebugView:** validar `generate_lead` e `whatsapp_click` antes do go-live.
- **Eventos principais:** `generate_lead`, `whatsapp_click`, `call_click`.
- **Eventos secundários:** `scroll_depth`, `engaged_time`, `cta_click`, `faq_open`, `form_step`.
- **Parâmetros por ramo:** `ramo`, `productId`, `conversionValue` (de `ramos.analytics`/`ramos.ads`).
- **UTMs/GCLID:** capturados da URL/cookie 1st-party no LeadForm e anexados ao lead/contexto do vendedor.
- **Funil de conversão:** documentado em GA4; abandono por passo do form.

**Pode implementar com placeholders:** estrutura de `lib/analytics.ts`, push de eventos, tipos, integração com Consent default, skeleton do banner. **Depende de acesso real:** GA4/GTM/Ads IDs e validação no DebugView/Tag Assistant; conversão de teste no Ads; Enhanced Conversions.

---

## 15. Plano de go-live e rollback

### 15.1 Checklist operacional de go-live (base: seções 27, 58.3, 60)

- [ ] DNS validado · SSL ativo · www→apex
- [ ] Vercel: projeto e domínio configurados
- [ ] Variáveis de ambiente configuradas (validadas por `lib/env.ts`)
- [ ] GTM publicado
- [ ] GA4 recebendo eventos (Realtime/DebugView)
- [ ] Google Ads recebendo conversão de teste
- [ ] `/api/lead` testada (201/422/200-dup/429)
- [ ] Fallback por e-mail testado (CRM indisponível)
- [ ] Vendedor recebeu **lead real** com ramo/origem/UTM/GCLID
- [ ] Redirects 301 ativos (mapa de `INVENTARIO_URLS.md`)
- [ ] Search Console configurado
- [ ] Sitemap enviado
- [ ] `/obrigado` está **noindex**
- [ ] Telefone/WhatsApp corretos (abrem discador/conversa)
- [ ] Preços "a partir de" corretos por ramo
- [ ] Banner de consentimento acessível; política de privacidade no ar
- [ ] **Banner de staging ausente em produção (Issue 23A)**
- [ ] **Auditoria anti-hardcode verde no build de produção (Issue 23B)**
- [ ] **Staging permanece noindex e fora do sitemap público**
- [ ] Rollback preparado (deploy anterior + DNS com TTL baixo)
- [ ] Webflow mantido publicável temporariamente

### 15.2 Critérios objetivos para acionar rollback (base: seção 62)

Acionar rollback se ocorrer qualquer um:
- Leads não chegam ao destino.
- WhatsApp quebrado ou número errado.
- Telefone errado.
- Google Ads sem registrar conversão.
- Erro 5xx persistente em `/api/lead` ou páginas principais.
- Queda severa de conversão vs baseline.
- DNS/SSL instável.
- Páginas principais fora do ar.

**Tempo máximo de decisão:** até 30 min após detecção de falha crítica. Sem hotfix em <15 min, **reverter primeiro** (Vercel "Promote to Production" do deploy anterior ou repontar DNS) e investigar depois. Pausar campanhas de Ads durante a reversão.

---

## 16. Riscos principais

Base: seção 52, ampliada com os itens solicitados. Responsáveis são `TODO` até definição (seção 69).

| Risco | Impacto | Probabilidade | Mitigação | Responsável | Fase |
|---|---|---|---|---|---|
| Dados reais incorretos | Alto | Média | Gate seção 64/68; `DADOS_OFICIAIS.md`; revisão antes de produção | Comercial/Jurídico (TODO) | 0/6 |
| WhatsApp errado (link usa `#`) | Crítico | Média | Confirmar número (CRÍTICO); teste real no celular | Comercial (TODO) | 6/8 |
| Lead não chegando | Crítico | Média | DB como verdade; retry+fallback; alerta; teste E2E | Dev (TODO) | 5/8 |
| Tracking quebrado (GA4/Ads) | Alto | Média | GTM Preview + DebugView; E2E de eventos; checklist | Dev/Mkt (TODO) | 7/8 |
| Perda de SEO na migração | Alto | Média | Mapa 301; preservar slugs; Search Console; monitorar 404 | SEO/Dev (TODO) | 8 |
| Queda de conversão | Alto | Média | Paridade; QA de funil; comparar baseline; rollback DNS | Produto (TODO) | 8 |
| Excesso de escopo | Médio | Alta | `MVP_SCOPE`; 1 issue/vez; template de prompt | Tech Lead (TODO) | todas |
| Inconsistência visual (Cursor) | Médio | Média | Tokens obrigatórios; DS; revisão de diff | Design/Dev (TODO) | todas |
| Problemas LGPD | Alto | Baixa | Consent Mode v2; minimização; anonimização; aprovação jurídica | Jurídico/Dev (TODO) | 1/8 |
| Spam no formulário | Médio | Alta | Honeypot + Turnstile + rate limit | Dev (TODO) | 5 |
| Performance abaixo de 95 | Alto | Média | Lighthouse; budget JS/img; SSG/ISR; next/image | Dev (TODO) | 1–8 |
| Erro no redirect | Alto | Média | Testar 301s em staging; auditoria de URLs | SEO/Dev (TODO) | 8 |
| Staging indexado / dados pendentes expostos | Alto | Média | Staging seguro noindex + banner (Issue 23A); fora do sitemap; sem Ads apontando para staging | Dev/SEO (TODO) | 6/8 |
| Hardcode de dados regulatórios/comerciais | Alto | Média | Auditoria anti-hardcode (Issue 23B) no PR/CI; fontes únicas `company`/`ramos`/env | Dev (TODO) | todas |
| Perda de integração/automação do JS legado na migração | Crítico | Alta | Auditoria de JS legado (Issue P-09) antes de LeadForm/`/api/lead`/GTM/WhatsApp; `LEGACY_JS_AUDIT.md`; comparar paridade | Dev/Mkt (TODO) | 0/5/7 |
| Perda de eventos/conversões atuais do dataLayer/GTM | Alto | Média | `DATA_LAYER_ATUAL.md` (P-09) confrontado na Issue 18; validar no DebugView | Mkt/Dev (TODO) | 7 |
| Perda de logos/assets proprietários | Alto | Média | Auditoria de assets (P-10) antes da migração; `BRAND_ASSETS.md`; SVG local preservado | Design/Dev (TODO) | 0/3 |
| Uso incorreto de marca de seguradora | Alto | Média | Catálogo `BRAND_ASSETS.md`; logos oficiais em SVG; `alt`/`aria-hidden` corretos | Design/Comercial (TODO) | 3/4 |
| Cópia de SVGs pesados/duplicados | Médio | Alta | Classificação por asset (P-10); regra "não copiar tudo"; orçamento de peso | Dev (TODO) | 0/3 |
| Inconsistência visual por ícones antigos | Médio | Média | Substituir genéricos por Lucide; descartar datados; validar vs novo DS | Design/Dev (TODO) | 3/4 |
| URLs de Cloudinary espalhadas / quebra por mudança de URL | Médio | Média | Centralizar em `lib/assets.ts`; domínio em `next.config.mjs`; `CLOUDINARY_ASSETS.md` | Dev (TODO) | 4/6 |
| Piora de LCP por imagem hero mal dimensionada | Alto | Média | Orçamento (hero ≤120KB); `width`/`height`; `priority` só no LCP; `next/image` | Dev (TODO) | 6/8 |
| Excesso de imagens geradas por IA reduzindo confiança | Médio | Média | Priorizar fotos reais de equipe/escritório; revisão editorial | Mkt/Design (TODO) | 6 |
| Ausência de `alt` / SVG inline grande dificultando manutenção | Médio | Média | QA visual (seção 12); `lib/assets.ts`; sem SVG inline grande em JSX | Dev (TODO) | 3/6 |
| Env obrigatória faltando / segredo exposto | Alto | Média | Validação de env no boot (Issue 03A); segredos nunca em `NEXT_PUBLIC_*` | Dev (TODO) | 1/8 |
| Dependência de Cloudinary (quebra/indisponibilidade se usado) | Médio | Média | ADR-0009; inventário `CLOUDINARY_ASSETS.md`; centralização em `lib/assets.ts`; **fallback local em `/public` para assets críticos**; hero não depende de URL não verificada | Mkt/Dev (TODO) | 4/6 |
| Dependência de acesso externo | Alto | Média | Identificar acessos cedo (seção 69); planos B documentados | Tech Lead (TODO) | todas |

---

## Dependências externas (complemento à seção 69 da spec)

Além das dependências externas já mapeadas na seção 69 da especificação (domínio/DNS, Vercel, Webflow, GTM, GA4, Ads, Search Console, CRM/webhook, e-mail, WhatsApp, DB, Sentry, Turnstile, etc.), a rev. 4.1 formaliza o **Cloudinary** como dependência externa condicional:

| Dependência | Necessária para | Tipo | Responsável | Status | Plano B |
|---|---|---|---|---|---|
| Cloudinary | Hospedagem/CDN de imagens não vetoriais | Serviço/Acesso | Marketing/Dev | TBD | usar imagens locais em `/public` como fallback |

Regras (quando Cloudinary for usado):

- é necessário acesso à conta/projeto Cloudinary;
- é necessário inventário das URLs (`CLOUDINARY_ASSETS.md`);
- é necessário configurar o domínio em `next.config.mjs` (para `next/image`);
- deve haver fallback ou alternativa local para assets críticos;
- imagens críticas de hero **não** podem depender de URLs não verificadas;
- nenhuma URL Cloudinary pode aparecer diretamente em JSX;
- o uso deve estar coberto pela **ADR-0009** (ver P-03).

> Se o Cloudinary **não** for usado, esta dependência é dispensada e os assets ficam locais em `/public` (registrados em `lib/assets.ts`).

---

## 17. Próximas ações recomendadas

1. Criar o repositório.
2. Adicionar `ESPECIFICACAO v3.md` (fonte canônica).
3. Adicionar `PLANO_IMPLEMENTACAO_rev4_1.md`.
4. Criar `/docs` com os arquivos listados na seção 4 (P-01).
5. Dividir a especificação em documentos menores (P-02 / Prompt A).
6. Criar `DADOS_OFICIAIS.md` (P-05 / Prompt D) e iniciar a confirmação dos dados bloqueantes.
7. Criar `DECISIONS.md`, incluindo **ADR-0009 (Cloudinary) como proposta** (P-03 / Prompt B).
8. Criar `.env.example` (P-04 / Prompt C).
9. Criar `INVENTARIO_URLS.md` (P-06 / Prompt E).
10. Criar `BASELINE_METRICS.md` (P-07).
11. Criar o backlog (P-08 / Prompt F) com **P-09, P-10, 03A, 03B, 23A e 23B**.
12. Rodar **P-09 — auditoria de JS legado**.
13. Rodar **P-10 — auditoria de SVGs/assets**.
14. Rodar **Issue 01 — scaffold**.
15. Seguir a ordem recomendada de execução (seção 8.2, rev. 4.1): `01 → 02 → 03 → 03A → 03B → 04 → 05 → 08 → 06 → 07 → 09 → 10 → 11 → 12 → 13 → 14 → 17 → 19 → 18 → 20 → 21 → 22 → 23A → 23B → 15 → 16 → 23 → 24`.

> **Observação:** P-09 e P-10 devem rodar o quanto antes e **em paralelo** com a preparação técnica, porque seus resultados alimentam, respectivamente, o comportamento final (leads/tracking/integrações) e os assets/identidade visual final. As Issues 11/12/18/19 só fecham com a P-09 concluída; a versão visual final (02/06/07/10/InsurersGrid/páginas) só fecha com a P-10. Páginas comerciais só em staging seguro (23A), com anti-hardcode (23B) ativo, e só vão a produção após o gate da seção 68.

---

## Status de prontidão

- **Pronto para documentação e scaffold?** **Sim** — base de docs e scaffold (Issues 01–03) podem ser executados imediatamente, sem dados confirmados.
- **Pronto para auditoria de JS legado?** **Sim, depende de acesso parcial ou total ao Webflow/GTM** — a Issue P-09 roda cedo; sem acesso completo, auditar HTML publicado + rede (parcial, marcado PENDING).
- **Pronto para auditoria de assets/SVGs?** **Sim, depende de acesso ao Webflow Asset Manager/Export e Cloudinary, se aplicável** — a Issue P-10 roda cedo; sem acesso, auditar HTML publicado + URLs públicas (parcial).
- **Pronto para env validation?** **Sim, com placeholders** — `.env.example` + `lib/env.ts` (Issue 03A), com variáveis pendentes `A_CONFIRMAR` e mocks de dev.
- **Pronto para analytics mínimo?** **Sim, com placeholders** — `lib/analytics.ts` (Issue 03B) com `trackEvent()` tipado e seguro, antes da integração real do GTM (Issue 18).
- **Pronto para componentes base?** **Sim** — Button/Section/Container/Badge/Chip (Issue 08) dependem apenas de tokens (Issue 02).
- **Pronto para componentes comerciais?** **Sim, com placeholders** — lendo de `company.ts`/`ramos.ts` com valores `A_CONFIRMAR`, sem publicar claims finais.
- **Pronto para staging?** **Sim, após Issue 23A** — ambiente com noindex/nofollow + banner de homologação + fora do sitemap público.
- **Pronto para páginas comerciais em staging?** **Sim, somente após 23A e 23B** — com placeholders e noindex; nunca indexável enquanto houver dados `A_CONFIRMAR`.
- **Pronto para páginas comerciais em produção?** **Não, depende de dados confirmados** — Home e LPs por ramo exigem preços, WhatsApp, telefone, SUSEP/CNPJ e claims confirmados (gate seção 68).
- **Pronto para finalizar comportamento de leads/tracking?** **Não, depende de P-09 e acessos externos** — LeadForm/`/api/lead`/GTM/Ads/WhatsApp precisam de paridade com a auditoria de JS legado e de acesso a CRM/webhook/GA4/Ads.
- **Pronto para finalizar identidade visual/assets?** **Não, depende de P-10** — versão final só após auditoria e classificação de SVGs/assets.
- **Pronto para usar logos de seguradoras?** **Não, depende de P-10 e `BRAND_ASSETS.md`** — logos catalogados e preservados em SVG local via `lib/assets.ts`.
- **Pronto para usar Cloudinary?** **Não, depende de P-10, ADR-0009, acesso à conta/projeto, inventário e configuração** — registro em `CLOUDINARY_ASSETS.md`/`lib/assets.ts` + domínio em `next.config.mjs`.
- **Pronto para integração real de leads?** **Não, depende de CRM/webhook/banco/Turnstile** — até lá, mock via env.
- **Pronto para go-live?** **Não, depende de dados, acessos, baseline, auditorias, URLs, teste real e checklist comercial** — exige DNS/SSL, contas GA4/GTM/Ads/Search Console, redirects validados, baseline coletado, P-09/P-10 concluídas, teste de lead real e itens bloqueantes confirmados.

---

## Alterações desta versão — rev. 4.1

- corrigida inconsistência de "14 arquivos" (P-01 agora referencia os arquivos listados na seção 4, com condicionais como `CLOUDINARY_ASSETS.md`);
- reforçado o papel bloqueante por tipo de P-09 (bloqueia comportamento) e P-10 (bloqueia acabamento visual final), em subseção dedicada;
- Issue 23A (staging seguro) antecipada para antes da Home (15) e das LPs (16);
- Issue 23B (auditoria anti-hardcode) antecipada para antes da Home (15) e das LPs (16), com regra de PR explícita;
- adicionada ADR-0009 para uso de Cloudinary (status Proposta) na P-03/`DECISIONS.md`;
- Cloudinary incluído como dependência externa (nova subseção + linha de tabela + risco dedicado);
- Cloudinary reforçado no QA visual de assets (checklist específico na seção 12);
- próximas ações recomendadas atualizadas (sequência operacional de 15 passos + observação);
- status de prontidão atualizado (lista ampliada, condicionada a P-09/P-10/dados/acessos).

> **Reforço final:** esta revisão continua sendo um **plano**, não uma implementação. Não foi escrito código, não foram baixados assets, não foram inventados dados, nenhuma pendência (`A_CONFIRMAR`/`PENDING`/`TODO`) foi removida e a especificação original `ESPECIFICACAO v3.md` não foi alterada. Preservados o modelo lead → contato humano e as regras: sem checkout, sem pagamento online e sem contratação automática. Nenhum item de fases futuras (blog, CMS, pSEO, área logada, IA, integrações com seguradoras) foi antecipado para a Fase 1.

---

## Alterações das versões anteriores (v2 e v3)

**v2 — correção estrutural:**

- **`env` separado de deploy:** criada a **Issue 03A — Configuração de ambiente e validação de env** (`.env.example` + `lib/env.ts`) cedo no projeto; a Issue 24 passou a tratar apenas de deploy, redirects, produção e go-live (não cria mais `lib/env.ts`).
- **Componentes base antecipados:** ordem de execução ajustada para que Button/Section/Container/Badge/Chip (Issue 08) venham **antes** de Header (06), Footer (07) e CredBar (09); refletido no roadmap (Fase 3), no backlog (nova "Ordem de execução recomendada") e na matriz de dependências.
- **Analytics mínimo criado:** nova **Issue 03B — Analytics mínimo e contrato de eventos** (`trackEvent()` tipado e seguro, sem quebrar sem `window`/`dataLayer`, sem PII); LeadForm (11), `/obrigado` (14) e WhatsApp/call (19) passam a depender do contrato mínimo (03B), não da integração completa; a Issue 18 virou "completar GTM/dataLayer e validação real".
- **Staging seguro adicionado:** nova **Issue 23A — Staging seguro e não indexável** (noindex/nofollow, robots por ambiente, banner de homologação, canonical correto, sem Ads/sitemap em staging); vira pré-requisito das páginas comerciais em staging.
- **Auditoria anti-hardcode adicionada:** nova **Issue 23B — Auditoria anti-hardcode** (lista de padrões proibidos + `scripts/check-hardcoded-business-data.mjs` + `npm run check:hardcode`); incorporada ao plano de qualidade, ao checklist de PR e à Definition of Done.
- **Dependências atualizadas:** matriz da seção 9 revisada (03A ← 01/02; 03B ← 03A; 11 ← 03B; 12 ← 03A/04/11/validators; 19 ← 03A/03B/04/05; 20 ← 04/05/17 + dados; 23A antes de páginas comerciais; 23B antes de PRs comerciais; 24 ← 23A/23B/inventário/checklist).
- **Status de prontidão atualizado:** ampliado para incluir env validation, analytics mínimo, componentes base, páginas comerciais em staging vs produção, integração de leads e go-live.
- **Matriz de riscos ampliada:** novos riscos de staging indexado, hardcode de dados e env faltando/segredo exposto.

**v3 — auditoria de comportamento:**

- **Auditoria do JavaScript legado do Webflow adicionada:** nova seção dedicada (complementa a seção 13) + nova **Issue P-09** (mapeamento de scripts, GTM/dataLayer, formulários, chamadas de API/webhook, cookies/storage e regras por ramo), com 5 novos docs (`LEGACY_JS_AUDIT`, `INTEGRACOES_ATUAIS`, `DATA_LAYER_ATUAL`, `FORMULARIOS_ATUAIS`, `API_CALLS_ATUAIS`); torna-se pré-requisito das Issues 11/12/18/19 e das páginas comerciais; refletida na Fase 0, na matriz de dependências, nas próximas ações e na matriz de riscos.

---

## Alterações desta versão (v4)

- **Adicionada auditoria de SVGs/assets do Webflow:** nova seção "Auditoria e migração de SVGs e assets visuais do Webflow" (complementa as seções 8 e 35 da spec), com fontes a inspecionar, critérios de classificação e regras.
- **Adicionada Issue P-10 — Auditoria e migração seletiva de SVGs/assets do Webflow** (preparatória), com fontes, classificação, regras e tabelas.
- **Adicionadas tabelas de inventário visual:** Tabela 1 (SVGs), Tabela 2 (logos de marca), Tabela 3 (ícones genéricos → Lucide), Tabela 4 (decorativos), Tabela 5 (Cloudinary).
- **Adicionadas regras de migração seletiva:** 15 regras (não copiar tudo; logos em SVG local; genéricos → Lucide; sem SVG inline grande em JSX; etc.).
- **Adicionada centralização em `lib/assets.ts`:** incluída na arquitetura (seção 3) e como fonte única de caminhos/alt/dimensões/uso/prioridade/fallback.
- **Adicionada estratégia para Cloudinary:** `CLOUDINARY_ASSETS.md`, registro em `lib/assets.ts` e configuração de domínio em `next.config.mjs` quando usado por `next/image`.
- **Adicionadas dependências de assets:** P-10 antes da versão final de identidade visual (02), Header (06), Footer (07), InsuranceCard/RamoGrid (10), InsurersGrid, Testimonials, páginas e `next/image`; placeholders permitidos antes.
- **Adicionados riscos de assets:** perda de logos, uso indevido de marca, SVGs pesados/duplicados, inconsistência por ícones antigos, URLs Cloudinary espalhadas/quebradas, LCP por hero mal dimensionado, excesso de IA, ausência de `alt`, SVG inline grande.
- **Adicionado QA visual de assets:** checklist específico na seção 12 (logos, `alt`, `width/height`, LCP, Cloudinary, Lucide, sem SVG inline grande).
- **Status de prontidão atualizado:** novas perguntas sobre identidade visual final, logos de seguradoras, imagens Cloudinary e finalização de páginas visuais (todas condicionadas à Issue P-10).
- **4 novos docs em `/docs`:** `SVG_ASSETS_AUDIT`, `IMAGE_ASSETS_INVENTORY`, `BRAND_ASSETS`, `CLOUDINARY_ASSETS`.

> Esta versão continua sendo um **plano**, não uma implementação. A especificação `ESPECIFICACAO v3.md` não foi alterada; nenhum código foi escrito; nenhum asset foi baixado ou copiado; nenhum nome de arquivo foi inventado como existente; nenhuma URL de Cloudinary foi espalhada; nenhum dado foi inventado; nenhuma pendência foi removida; nenhum item de fases futuras foi antecipado para a Fase 1; o modelo lead → contato humano (sem checkout/pagamento/contratação automática) foi preservado.
