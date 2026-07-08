# Imediato Soluções em Seguros — Especificação de Produto (Redesign)

> **Blueprint oficial para a próxima geração da plataforma de geração de leads.**
> Stack alvo: **Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Framer Motion**.
> Implementação via **Cursor AI (Claude Opus 4.1)**.
> Versão 1.0 · Modelo de negócio: **lead → contato humano** (sem checkout/pagamento/contratação automática).

**Escopo preservado.** Mantém integralmente o modelo de negócio atual — corretora intermediando seguradoras registradas na SUSEP. Não há checkout, pagamento online nem contratação automática. Toda conversão termina em contato humano (WhatsApp / telefone / formulário).

---

## Sumário

**Parte I — Fundação (1–27)**
1. Diagnóstico do site atual · 2. Problemas encontrados · 3. Melhorias propostas · 4. Novo mapa do site · 5. Arquitetura da informação · 6. Wireframes textuais · 7. Lista de componentes · 8. Design System · 9. Identidade visual · 10. Biblioteca de ícones · 11. Tipografia · 12. Paleta de cores · 13. Espaçamentos · 14. Responsividade · 15. Jornada do usuário · 16. Estratégia de conversão · 17. SEO · 18. Google Ads · 19. Analytics · 20. Eventos do GTM · 21. Componentes React · 22. Estrutura de diretórios · 23. Convenções de código · 24. Recomendações para Cursor · 25. Checklist de desenvolvimento · 26. Checklist de homologação · 27. Checklist de produção

**Parte II — Especificação Estendida (28–39)**
28. Identidade visual exclusiva · 29. Design System empresarial · 30. Motion Design System · 31. Landing Pages por produto · 32. SEO de autoridade · 33. Otimização para IA (GEO) · 34. Guia editorial · 35. Sistema de imagens · 36. Estratégia de CMS · 37. Qualidade & testes · 38. Roadmap · 39. Visão de excelência

**Parte III — Plano Operacional (40–53)**
40. Organização em artefatos · 41. Escopo do MVP · 42. Fases & critérios de saída · 43. Contrato da API de leads · 44. Validação/dedupe/fallback · 45. Variáveis de ambiente · 46. Baseline & metas · 47. Migração Webflow→Next · 48. Conduzir o Cursor · 49. Issues implementáveis · 50. pSEO travado · 51. Observabilidade & segurança · 52. Matriz de riscos · 53. Ready/Done

**Parte IV — Artefatos finais para o Cursor (54–63)**
54. Prompts por issue · 55. lib/company.ts · 56. lib/ramos.ts · 57. Consent Mode v2 & LGPD · 58. Git/PR/deploy · 59. Inventário de URLs · 60. Checklist comercial · 61. Observabilidade operacional · 62. Rollback · 63. Ordem de início no Cursor

---

# PARTE I — FUNDAÇÃO

## 1. Diagnóstico completo do site atual

O site atual (`segurosimediato.com.br`) roda em **Webflow**, é uma landing page única e longa focada em Seguro Auto, com páginas-satélite por ramo. Tem ativos de credibilidade fortes, mas a execução técnica e de conversão está datada.

### 1.1 Inventário do que existe hoje

| Área | Conteúdo atual observado |
|---|---|
| Topo / contato | Telefone (11) 3230-1422, WhatsApp, Emergência (11) 95328-8466, Ouvidoria (11) 97668-7668 |
| Hero | "25 anos de experiência", Seguro de Auto, cálculo online, cotação em 16 seguradoras, "a partir de R$ 79,90 mensais", formulário (DDD, celular, CEP, CPF, placa) |
| Alerta de fraude | Aviso sobre golpe usando o nome da empresa solicitando PIX para rastreador |
| Prova social | 96% de satisfação, nota 4.8/5.0, +2.000 avaliações certificadas no Google |
| Ramos | Auto, Caminhão, Uber, Utilitários, Motos, RCF/24h, Táxi, Pet, Aluguel/Fiança |
| Diferenciais | Atendimento humano, Experiência (25 anos), Equipe, Reputação, Preço, Bônus, Sob medida, Sinistro, Canais |
| Parceiros | 16+ seguradoras: Porto, Bradesco, Azul, Itaú, HDI, Tokio, Sompo, Mapfre, Liberty, Allianz, Loovi, Pier, Justos, Darwin, Usebens, Youse, Ezze |
| Coberturas | 16 itens: Colisão, Roubo/Furto, Incêndio, Danos Pessoais/Materiais, Ass. 24h, Chaveiro, Vidros, Pane Seca/Elétrica/Mecânica, Faróis, Retrovisores, Pneus, Carro Reserva |
| Equipe | 39 colaboradores, fotos individuais, página /equipe |
| Rodapé / legal | SUSEP 252174522, CNPJ 45.998.165/0001-32, Rua Barão de Itapetininga 125, 6º andar, Centro/SP |
| Tracking | GTM-PD6J398 já presente |

### 1.2 Ativos de valor a preservar
- **Credibilidade real e verificável:** 25–35 anos de atuação, registro SUSEP, nota 4.8 com +2.000 avaliações. Maior ativo do site.
- **Posicionamento de atendimento humano** ("gente de verdade") — coerente com o modelo lead → vendedor.
- **Amplitude de ramos e seguradoras** — base para SEO e múltiplas landing pages de Ads.
- **Alerta de fraude** — responsabilidade e proteção de marca; manter, com tratamento visual contido.
- **Equipe nomeada e fotografada** — humaniza e diferencia de insurtechs frias.

**Conclusão:** o conteúdo e a reputação são de primeira linha; o que está defasado é a *embalagem* (hierarquia visual, performance, estrutura de conversão e instrumentação). O redesign é de forma e engenharia, não de substância.

## 2. Problemas encontrados

**Técnicos / Performance:** Webflow + scripts pesados → LCP/TBT altos no mobile; imagens sem `srcset`/prioridade; página única muito longa sem code-splitting; sem controle fino de Core Web Vitals.

**Conversão (CRO):** formulário pede CPF e placa cedo demais → fricção; CTA único (falta sticky CTA, CTA repetido, botão "Ligar" mobile); prova social diluída no meio da página; hierarquia de benefícios plana.

**UX / Conteúdo:** excesso de CAIXA ALTA; densidade alta de ícones/itens sem hierarquia (16 coberturas iguais); sem FAQ estruturado; navegação por ramo pouco clara.

**SEO / Acessibilidade:** sem Schema.org; contraste e foco de teclado inconsistentes; alt text genérico/ausente; meta description com keyword stuffing.

## 3. Melhorias propostas

| Problema | Melhoria proposta | Impacto |
|---|---|---|
| Formulário com fricção | Form multi-step (3 passos), só DDD+celular obrigatórios; CPF/placa opcionais e ao final | ↑ Conversão |
| CTA único | Sistema de CTAs: hero, meio, pós-FAQ, sticky mobile, WhatsApp + Ligar flutuantes | ↑ Conversão |
| Prova social diluída | Barra de credibilidade no topo + bloco de avaliações Google dedicado | ↑ Confiança |
| Performance Webflow | Migração Next.js (SSG/ISR), `next/image`, fontes self-hosted | ↑ CWV / SEO |
| Sem Schema | JSON-LD: InsuranceAgency, Organization, FAQPage, BreadcrumbList | ↑ SEO |
| CAIXA ALTA excessiva | Sentence case, hierarquia tipográfica (Manrope display + Inter texto) | ↑ Legibilidade |
| Sem FAQ | Seção FAQ (acordeão acessível) com rich snippet | ↑ SEO / ↓ dúvidas |
| Tracking raso | GA4 + GTM com eventos de WhatsApp, ligar, form, scroll, tempo + Enhanced Conversions | ↑ Otimização de Ads |

## 4. Novo mapa do site

Árvore rasa (máx. 2 níveis), otimizada para Google Ads (LP por ramo) e SEO.

```
/                         Home — hub de conversão (Auto em destaque)
├─ /seguro-auto          LP principal de Ads (Quality Score)
├─ /seguro-moto
├─ /seguro-caminhao
├─ /seguro-uber          (apps: Uber/99)
├─ /seguro-taxi
├─ /seguro-utilitario
├─ /seguro-frota         (PJ / frotas)
├─ /seguro-pet
├─ /assistencia-24-horas (RCF / 24h)
├─ /fianca               (seguro aluguel)
├─ /coberturas           hub de coberturas (16 itens, âncoras)
├─ /seguradoras-parceiras
├─ /a-imediato           sobre + história + SUSEP
│   └─ /equipe           39 colaboradores
├─ /reputacao            avaliações Google/Facebook
├─ /blog                 (SEO de conteúdo — fase 3)
│   └─ /blog/[slug]
├─ /contato
├─ /cotacao              formulário completo (destino de CTAs)
├─ /obrigado             thank-you page (disparo de conversão, noindex)
└─ legais: /politica-de-privacidade · /termos · /alerta-de-fraude
robots.txt · sitemap.xml · /og
```

**Regra de ouro de Ads:** cada campanha aponta para a LP do ramo correspondente (não a home), com o mesmo headline do anúncio (message match) → melhora Quality Score e CPC.

## 5. Arquitetura da informação

### 5.1 Navegação principal (header)
Reduzida e orientada à ação. Desktop: `Seguros ▾ · Coberturas · A Imediato ▾ · Reputação · Contato` + botões **Ligar** e **Cotar agora**. Mobile: logo + botão Cotar + menu hambúrguer (drawer).
- Menu "Seguros": Auto · Moto · Caminhão · Uber/Apps · Táxi · Utilitário · Frota · Pet · Fiança
- Menu "A Imediato": Sobre · Equipe · Seguradoras parceiras · Alerta de fraude

### 5.2 Hierarquia de cada LP de ramo
1. Hero com formulário/CTA + prova social imediata
2. Coberturas do ramo (cards priorizados)
3. Como funciona (3 passos até o especialista)
4. Por que a Imediato (diferenciais)
5. Seguradoras parceiras (logos)
6. Avaliações Google
7. FAQ do ramo
8. CTA final + rodapé

### 5.3 Princípios de IA
- Uma ação primária por tela (cotar). Tudo o mais é suporte.
- Profundidade máxima de 2 cliques da home a qualquer cotação.
- Conteúdo legal e anti-fraude sempre acessível pelo rodapé.
- Breadcrumbs em todas as páginas internas (UX + Schema).

## 6. Wireframe textual de todas as páginas

### 6.1 Home `/`
```
Header      Logo · nav · [Ligar] [Cotar agora] — sticky, encolhe ao rolar
CredBar     ★ 4.8 · +2.000 avaliações · 25+ anos · SUSEP · 16 seguradoras
Hero        H1 "Seguro auto a partir de R$ 79,90/mês" · subhead · LeadForm passo 1 (DDD+Celular) · selo "grátis, sem compromisso"
RamoGrid    9 InsuranceCards (Auto destacado) com preço "a partir de"
ComoFunciona  3 passos: Cote → Especialista compara 16 seguradoras → Você escolhe
Benefits    Preço · Bônus integral · Sob medida · Apoio no sinistro (4 cards)
CTA-meio    faixa azul "Receba sua cotação hoje" [Cotar] [WhatsApp]
InsurersGrid logos cinza → cor no hover
CoverageCards coberturas principais (6 + link "ver todas")
Testimonials carrossel Embla de avaliações Google reais
TeamStrip   "39 especialistas, gente de verdade" + grade de fotos
FAQ         acordeão (6–8 perguntas) + FAQPage schema
CTA-final   "Fale com um especialista agora" [WhatsApp] [Ligar]
Footer      SUSEP · CNPJ · endereço · ouvidoria · legais · alerta de fraude
Flutuante   StickyCTA (mobile) + botão WhatsApp fixo
```

### 6.2 LP de ramo `/seguro-auto` (template reutilizável)
```
Hero ramo        Eyebrow · H1 (message-match) · LeadForm · prova social
Argumentos       3 selling points em FeatureCards
Coberturas       CoverageCards filtrados
Como funciona    Timeline 3 passos
Diferenciais     Benefits · InsurersGrid · Testimonials
FAQ do ramo      perguntas específicas (preço, carência, documentos)
CTA final + Footer
```

### 6.3 Cotação `/cotacao`
```
ProgressBar   Passo 1 de 3 ▓▓░░░░
Passo 1       Tipo de veículo + DDD + Celular (mín. para virar lead)
Passo 2       CEP + nome (opcional)
Passo 3       CPF + placa (opcionais) "ou deixe que coletamos no contato"
Lateral fixa  "Cotação grátis · Sem compromisso · Retorno rápido" + ★4.8
```

### 6.4 Outras
```
/reputacao   nota agregada · cards de reviews · link Google · CTA
/a-imediato  história · números · SUSEP/CNPJ · valores · CTA
/equipe      grade dos 39 colaboradores · CTA
/contato     WhatsApp · telefones · e-mail · Google Maps embed · horário
/obrigado    confirmação · próximos passos · dispara conversão GA4/Ads (noindex)
```

## 7. Lista de componentes

| Componente | Finalidade | Estados principais |
|---|---|---|
| Header | Navegação + CTAs persistentes | top / scrolled / drawer aberto |
| CredBar | Prova social no topo | estático |
| Hero | Promessa + entrada de lead | com form / com CTA |
| LeadForm | Captura multi-step | idle · validando · erro · enviando · sucesso |
| ProgressBar | Progresso do form | 1/3 · 2/3 · 3/3 |
| InsuranceCard | Card de ramo + preço | default · hover · destaque |
| Benefits | Diferenciais | estático |
| CoverageCards | Coberturas | default · hover · "ver todas" |
| InsurersGrid | Logos de seguradoras | cinza · hover colorido |
| Testimonials | Avaliações (Embla) | arrastando · auto-play pausável |
| TeamStrip / TeamGrid | Equipe humana | resumo · completo |
| FAQ | Dúvidas (acordeão) | item aberto/fechado |
| CTASection | Chamada de meio/fim | variantes |
| StickyCTA | Barra fixa mobile | oculto até scroll · visível |
| WhatsAppFAB · CallButton | Contato 1-clique | default · hover |
| FraudAlert | Aviso de golpe PIX | banner / página |
| Footer | Legal + contato + mapa | estático |
| Breadcrumb · Section · Container | Layout/SEO | — |

Cada componente entregue com: finalidade, props tipadas (Zod/TS), estados, breakpoints e requisitos de acessibilidade (detalhado na seção 21/29).

## 8. Design System

Tokens-first, mapeados para `globals.css @theme` (Tailwind 4, CSS-first) e variáveis de shadcn/ui.

```
colors:  brand.50 #eef4fd · 100 #d8e6fb · 500 #1366d6 · 600 #0f55b8 · 700 #0a2540 (deep)
         whatsapp #1aa564 ; alert #d23b3b
         neutral.50 #f6f8fb · 200 #e2e8f1 · 500 #5b6b82 · 900 #0b1f3a
radius:  sm 8 · md 12 · lg 16 · xl 24 · full 9999
shadow:  sm 0 1 2 rgba(11,31,58,.06) ; md 0 6 20 rgba(11,31,58,.08) ; lg 0 18 50 rgba(11,31,58,.12)
font:    display "Manrope" ; sans "Inter"
ease:    standard cubic-bezier(.2,.7,.2,1) ; dur 160–240ms
```

**Princípios visuais:** muito espaço em branco (padding vertical 80–120px desktop); sombras discretas e gradientes suaves azul→branco; bordas hairline; confiança via azul profundo + tipografia sólida; nada de exageros.

## 9. Guia de identidade visual

**Personalidade:** confiável e estabelecida (25+ anos); humana e próxima ("gente de verdade"); moderna mas não fria; direta e transparente.
**Tom de voz:** sentence case, frases curtas, "você", benefício antes de recurso, urgência sem pressão.
**Logotipo:** manter o atual; SVG monocromático p/ fundos azuis e colorido p/ fundos claros; mínimo 120px (desktop) / 96px (mobile).
**Imagery:** fotos reais da equipe e atendimento com leve overlay azul; evitar banco de imagens genérico.

## 10. Biblioteca de ícones

**Lucide Icons** (open-source, tree-shakeable, traço 1.5–2px). Substitui todos os SVGs avulsos.

| Contexto | Ícone Lucide |
|---|---|
| Colisão / acidente | `car-front`, `shield-alert` |
| Roubo e furto | `shield`, `lock` |
| Assistência 24h / guincho | `truck`, `clock` |
| Vidros / faróis | `square-dashed`, `lightbulb` |
| Chaveiro / carro reserva | `key-round`, `car` |
| WhatsApp / telefone | `message-circle`, `phone` |
| Preço / bônus | `badge-percent`, `piggy-bank` |
| Confiança / SUSEP | `badge-check`, `star` |
| Fraude (alerta) | `triangle-alert` |

Logos de marca (WhatsApp, seguradoras) usam SVG oficial. Ícone decorativo recebe `aria-hidden="true"`; ícone com significado recebe `aria-label`.

## 11. Tipografia

- **Manrope (Display):** títulos, H1–H3, números de destaque. Pesos 700/800. `letter-spacing:-.02em` em tamanhos grandes.
- **Inter (Texto):** corpo, UI, labels, FAQ. Pesos 400/500/600. `line-height:1.6`.

| Token | Mobile → Desktop | Uso |
|---|---|---|
| display | 34 → 56px / 800 | H1 hero |
| h2 | 26 → 38px / 800 | títulos de seção |
| h3 | 20 → 24px / 700 | subtítulos |
| body | 16 → 17px / 400 | parágrafos |
| small | 13 → 14px / 500 | labels, legais |
| eyebrow | 12px / 700 · uppercase · tracking .16em | eyebrows |

Fontes **self-hosted** via `next/font` (subset latin, `display:swap`) → elimina render-blocking, melhora CWV/privacidade.

## 12. Paleta de cores

| Cor | Hex | Token | Uso |
|---|---|---|---|
| Azul profundo | `#0a2540` | brand.700 | fundo escuro, headers |
| Azul ação | `#1366d6` | brand.500 | CTAs, links |
| Azul suave | `#eef4fd` | brand.50 | fundos de seção |
| Branco | `#ffffff` | — | base |
| Cinza claro | `#f6f8fb` | neutral.50 | cards, alternância |
| Cinza texto | `#5b6b82` | neutral.500 | texto secundário |
| Verde | `#1aa564` | — | **só WhatsApp** |
| Vermelho | `#d23b3b` | — | **só alerta de fraude** |
| Tinta | `#0b1f3a` | neutral.900 | texto principal |

**Regra de cor:** verde e vermelho são funcionais e exclusivos (WhatsApp / fraude). Nunca decoração.
**Contraste (WCAG AA):** tinta/branco 15.8:1 ✓ · azul ação/branco 4.7:1 ✓ · branco/azul profundo 14.6:1 ✓ · cinza secundário/branco 5.6:1 ✓.

## 13. Espaçamentos

Escala base **4px** (alinha com Tailwind).

| Token | px | Uso |
|---|---|---|
| space-1…3 | 4 · 8 · 12 | gaps internos, ícone+texto |
| space-4 · 6 | 16 · 24 | padding de card, gap de grid |
| space-8 · 12 | 32 · 48 | blocos, margens de título |
| section-y | 64 (mob) → 112 (desk) | padding vertical de seção |
| container | máx 1200px · gutter 20/32 | largura de conteúdo |

## 14. Responsividade

| Breakpoint | Largura | Layout |
|---|---|---|
| base (mobile) | < 640px | 1 coluna · StickyCTA ativo · menu drawer |
| sm | ≥ 640px | grids 2 col |
| md (tablet) | ≥ 768px | nav expande · hero 2 colunas |
| lg (desktop) | ≥ 1024px | nav completa · grids 3–4 col · sticky lateral no form |
| xl | ≥ 1280px | container 1200px centralizado |

**Mobile-first:** 70%+ do tráfego vem de Ads no smartphone. Alvos de toque ≥ 44px; CTA primário sempre visível (sticky); form acima da dobra; imagens com `sizes` corretos; sem hover como único meio de interação.

## 15. Jornada do usuário

Persona dominante: motorista pesquisando preço no celular, vindo de anúncio Google. Ansioso por preço, cauteloso com golpes, pouca paciência.

| Etapa | Estado mental | O que a página faz |
|---|---|---|
| 1 Clique no anúncio | "É confiável e barato?" | Message-match; preço visível; CredBar imediata |
| 2 Primeiros 5s | Avaliando credibilidade | ★4.8 · SUSEP · 25 anos · seguradoras conhecidas |
| 3 Considera cotar | "Vai dar trabalho?" | "Grátis, sem compromisso", form curto, barra de progresso |
| 4 Dúvidas | Carência? Bônus? | FAQ + "fale agora no WhatsApp" |
| 5 Conversão | Decisão | Envia form OU clica WhatsApp/Ligar → vira lead |
| 6 Pós-conversão | "E agora?" | /obrigado: "um especialista retornará rapidamente" |
| 7 Humano fecha | Confiança consolidada | Vendedor compara 16 seguradoras e vende (fora do site) |

**Fricções a remover:** pedir CPF/placa cedo; medo de spam (microcopy de privacidade); desconfiança de golpe (alerta acessível sem assustar no hero).

## 16. Estratégia de conversão (CRO)

**Sistema de CTAs:** Header (Cotar + Ligar) · Hero (LeadForm inline) · Meio (faixa "Receba sua cotação hoje") · Pós-FAQ (WhatsApp + Ligar) · Final · Sticky mobile · WhatsApp FAB.

**Alavancas:** confiança (prova social acima da dobra, SUSEP, logos, fotos da equipe); redução de fricção (2 campos, validação instantânea, barra de progresso, WhatsApp alternativo); urgência sem exagero ("retorno rápido", "cotação hoje" — sem cronômetros falsos); microcopy ("cotação 100% gratuita", "sem compromisso", "seus dados estão seguros").

**Testes A/B (fase 2):** headline (preço vs benefício); form inline vs botão; cor/cópia do CTA; ordem FAQ vs depoimentos.

## 17. Estratégia de SEO

**Técnico:** SSG/ISR (HTML pronto para crawler, CWV verdes); URLs amigáveis por ramo; `canonical` em todas; `sitemap.xml`/`robots.txt`; metadados por página via `generateMetadata` (title <60c, description <155c sem keyword stuffing); Open Graph + Twitter Cards com `/og` dinâmica; alt text descritivo; lazy loading; `priority` só no LCP.

**Schema.org (JSON-LD):** InsuranceAgency (nome, logo, telefone, endereço, geo, aggregateRating 4.8/2000, areaServed BR, priceRange, sameAs); Organization (CNPJ, fundação); FAQPage; BreadcrumbList; WebSite + SearchAction (fase blog).

**Keywords:** /seguro-auto "seguro auto cotação" (transacional); /seguro-uber "seguro para uber/99" (nicho); /seguro-moto "seguro de moto barato"; /blog/* informacional.

## 18. Estratégia Google Ads

- 1 grupo de anúncios por ramo → LP correspondente (message match) → Quality Score alto, CPC menor.
- Enhanced Conversions: e-mail/telefone hasheado (1ª parte) no envio do form e no /obrigado.
- Conversões primárias: envio de form + clique WhatsApp/Ligar. Secundárias: scroll 75%, tempo >60s.
- Remarketing: público de quem visitou LP mas não converteu (audiência GA4 → Ads).
- Velocidade da LP impacta Quality Score → meta Lighthouse ≥95.
- Mobile: extensões de chamada/local; CTA "Ligar" com tel: rastreável.

**Implementação limpa:** nenhuma tag hard-coded; tudo via GTM (`GTM-PD6J398`), disparado por `dataLayer.push`.

## 19. Estratégia Analytics

- GA4 = fonte de verdade; GTM = camada de tags; `dataLayer` = contrato entre app e tags.
- Consent Mode v2 (LGPD) com banner; tags só após consentimento.
- Modelo de eventos nomeado e versionado (seção 20).
- Funil GA4: view LP → start_form → submit_form → lead (+ caminho whatsapp_click → lead).
- Relatórios: conversão por ramo, origem (utm/campanha), dispositivo; abandono por passo do form.

## 20. Eventos do GTM / dataLayer

Contrato único: o app empurra eventos; o GTM mapeia p/ GA4/Ads. Nomes em `snake_case`.

| Evento | Quando dispara | Parâmetros |
|---|---|---|
| `page_view` | navegação (SPA) | page_path, page_title, ramo |
| `form_start` | 1º campo focado | form_id, ramo |
| `form_step` | avança passo | step (1–3), ramo |
| `generate_lead` | form enviado com sucesso | ramo, value, method:'form' |
| `whatsapp_click` | clique WhatsApp | location (hero/sticky/fab), ramo |
| `call_click` | clique telefone | location, ramo |
| `scroll_depth` | 25/50/75/90% | percent, page_path |
| `engaged_time` | 30s / 60s | seconds, page_path |
| `cta_click` | qualquer CTA primário | cta_id, location |
| `faq_open` | abre item de FAQ | question |

```ts
// lib/analytics.ts
trackEvent('generate_lead', { ramo: 'auto', method: 'form', value: 1 })
// → window.dataLayer.push({ event:'generate_lead', ... })
```

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

## 25. Checklist de desenvolvimento
- [ ] Tokens no `@theme` (cores, radius, shadow, fonts) · Fonts self-hosted · Container/Section/Grid base
- [ ] Header (sticky/scrolled/drawer) · Footer (SUSEP/CNPJ/legais) · CredBar
- [ ] Hero + LeadForm passo 1 · RamoGrid (de lib/ramos) · Benefits (4 cards) · CoverageCards
- [ ] InsurersGrid · Testimonials Embla · FAQ + schema · CTAs (meio/pós-FAQ/final/sticky/FAB)
- [ ] WhatsApp + Ligar com tracking · LeadForm multi-step · api/lead → webhook/CRM
- [ ] /cotacao · /obrigado · template LP de ramo · FraudAlert

## 26. Checklist de homologação (QA)
- [ ] Lighthouse mobile ≥95 (4 categorias) · CWV verdes · Form: validação/erros/sucesso/foco
- [ ] Eventos dataLayer (GTM Preview) · generate_lead e whatsapp_click conferidos · Schema válido · Metadata/OG · sitemap/robots
- [ ] Teclado completo · foco visível · contraste AA · screen reader · responsivo 360→1440 · toque ≥44px · reduced-motion · links tel:/wa.me

## 27. Checklist de produção (go-live)
- [ ] Domínio + SSL + www→apex · GTM publicado · GA4 recebendo · Ads + Enhanced Conversions · Consent Mode v2/LGPD
- [ ] 301 das URLs antigas · Search Console + sitemap · variáveis de ambiente · monitoramento de erros · backup de leads + fallback e-mail
- [ ] Teste de carga /api/lead · 404/500 com CTA de contato · smoke test de conversão ponta a ponta

---

# PARTE II — ESPECIFICAÇÃO ESTENDIDA

> Compatível com Next.js 15 · TypeScript · Tailwind CSS 4 (config CSS-first via `@theme`) · shadcn/ui · Framer Motion.

## 28. Identidade visual exclusiva

### 28.1 Conceito de marca — "Imediato"
Imediatismo com cuidado humano. Três tensões equilibradas: **rapidez** (resposta, movimento curto, clareza), **solidez** (25+ anos, SUSEP, azul profundo) e **proximidade** (gente de verdade, calor sutil).

### 28.2 Os 6 elementos de assinatura (DNA Imediato) — reconhecível sem logo
1. **Traço Imediato:** linha/seta diagonal ascendente (~18°) da esquerda→direita, como divisor de seção, sublinhado de keyword e direção de movimento.
2. **Azul profundo dominante** `#0a2540` em blocos âncora (hero, CTA-faixa, footer), texto branco, respiro amplo.
3. **Cartões "lift":** brancos sobre cinza-nuvem, raio 16px, sombra md, borda hairline; elevam +4px no hover.
4. **Selo de confiança recorrente:** pílula "★ 4.8 · +2.000 avaliações · SUSEP" como motivo.
5. **Numeral em destaque:** preços/estatísticas em Manrope 800, `tabular-nums`, sufixo em peso menor.
6. **Gradiente "amanhecer azul":** `#0a2540 → #0f55b8` a 160° com glow ciano, exclusivo de hero/CTA. Nunca em texto.

> **Teste do "squint":** ao desfocar, ler: bloco azul no topo, faixa de cards elevados, pílula de confiança, faixa azul de CTA, footer azul. Esse ritmo cromático é a impressão digital da marca.

### 28.3 Princípios de design
Clareza acima de tudo · Confiança visível (prova social/SUSEP a ≤1 scroll) · Respiro é recurso · Movimento com propósito (<240ms) · Humano no centro · Consistência sistêmica (tudo deriva de tokens, zero valor mágico).

### 28.4 Direção de arte & estilo fotográfico
- **Fotografia:** pessoas reais (equipe/clientes BR), luz natural difusa, ambientes autênticos, ar à volta do sujeito. Nunca "stock sorridente".
- **Tratamento:** color grade frio-neutro; overlay azul `#0a2540` 8–14% sobre texto; granulação zero; contraste médio.
- **Proporções:** hero 16:9/3:2; retratos 4:5; thumbs 1:1; OG 1.91:1.
- **Ilustração:** mínima e geométrica (traço 2px, paleta da marca). Sem mascotes, flat genérico ou "corporate Memphis".
- **Proibições:** gradientes arco-íris, glassmorphism exagerado, sombras coloridas, emojis institucionais.

### 28.5 Gradientes, sombras & bordas (tokens estendidos)
```css
/* globals.css @theme */
@theme {
  --gradient-brand: linear-gradient(160deg,#0a2540 0%,#0f55b8 78%);
  --gradient-glow:  radial-gradient(60% 80% at 70% 0%, rgba(34,140,255,.25), transparent 70%);
  --gradient-soft:  linear-gradient(180deg,#f6f8fb 0%,#ffffff 100%);
  --shadow-sm: 0 1px 2px rgba(11,31,58,.06);
  --shadow-md: 0 6px 20px rgba(11,31,58,.08);
  --shadow-lg: 0 18px 50px rgba(11,31,58,.12);
  --shadow-cta:0 8px 24px rgba(19,102,214,.28);   /* só botão primário */
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:24px; --radius-pill:9999px;
  --border-hair:1px solid #e2e8f1;
}
```
Sombras sempre azuladas, nunca além de `lg` (exceto CTA). Bordas hairline `#e2e8f1`. Raios crescem com a importância (chips 8 → cards 16 → hero 24).

### 28.6 Grid, espaçamento & ritmo
Grid 12 colunas, gutter 24/16px, container 1200px, margem mín. 20px. Base 4px. Ritmo de seção: alternância branco ↔ cinza-nuvem; bloco azul profundo a cada ~3 seções. Medida de leitura 60–75ch. Cadência: eyebrow → título → subtítulo → conteúdo → (opcional) CTA.

### 28.7 Motion language (resumo)
Movimento curto, decidido, direcional (esquerda→direita). Easing `cubic-bezier(.2,.7,.2,1)`, 160–240ms, respeitando `prefers-reduced-motion`. Detalhe na seção 30.

## 29. Design System empresarial

### 29.1 Template de documentação (todo componente)
Finalidade · Propriedades (TS) · Variantes · Estados (default/hover/focus/active/disabled/loading/error/success/empty) · Comportamento · Acessibilidade (ARIA/teclado/foco/contraste) · Animações (tokens da seção 30) · Responsividade · Exemplos de uso · Boas práticas · Anti-padrões.

### 29.2 Fichas-chave

**Button** — variantes `primary | secondary | ghost | whatsapp | destructive`; sizes `sm|md|lg`; props `iconLeft/iconRight, loading, fullWidth, asChild, href`. Estados: hover (−2px Y), active (scale .98), focus-visible (anel 2px), disabled (.6), loading (spinner, aria-busy). A11y: `<button>`/`<a>` semântico, ≥44px, foco visível. Boas práticas: 1 primary por viewport, verbo de ação. Anti: 2+ primary, "clique aqui".

**FAQ/Accordion** — props `items:{q,a}[], type:'single'|'multiple', emitSchema`. Radix: `aria-expanded`, `aria-controls`, teclado ↑↓ Home End. Animação altura 220ms + fade; chevron 180°. Emitir FAQPage JSON-LD. Anti: todos abertos por padrão.

**Toast/Sonner** — variantes success/error/info. `role=status` (polite) p/ sucesso, `role=alert` p/ erro; auto-dismiss 5s pausável. Anti: toast p/ erro de validação de campo (usar inline).

### 29.3 Matriz completa de componentes

| Componente | Variantes | Estados / notas | A11y crítico |
|---|---|---|---|
| Hero | home · ramo · simples | com form / CTA; LCP-priority | H1 único; foco lógico |
| InsuranceCard | default · destaque · compacto | hover lift; preço da lib | link "Cotar {ramo}" |
| CoverageCard | grid · lista · destaque | "ver todas" expande | ícone aria-hidden |
| PricingCard | simples · recomendado | numeral tabular; selo popular | preço legível por SR |
| ComparisonTable | 2–4 colunas | scroll-x mobile; linha destaque | `<table>` scope; caption |
| Timeline | vertical · horizontal | "como funciona"; reveal | lista ordenada |
| Testimonials | carrossel · grid | Embla; autoplay pausável | setas+teclado; aria-roledescription |
| TrustIndicators | barra · grid | SUSEP, nota, anos | números com contexto |
| FloatingCTA/WhatsAppFAB | WhatsApp · multi | msg por ramo | label descritivo |
| StickyCTA | barra mobile | some no footer; safe-area | não rouba foco |
| MegaMenu | desktop · drawer | colunas por categoria | focus trap; Esc; aria-expanded |
| Drawer/Sheet | esq · dir · bottom | overlay; scroll-lock | focus trap; retorno de foco |
| EmptyState | busca · resultado | ilustração mínima + CTA | texto descritivo |
| ErrorState | inline · 404/500 | mensagem humana + recuperação + WhatsApp | role=alert; foco |
| SuccessState | inline · /obrigado | confirma + dispara conversão | role=status |
| Skeleton | texto · card · imagem | shimmer 1.4s; evita CLS | aria-hidden; aria-busy |
| ProgressIndicator | barra · passos · circular | form multi-step; % visível | aria-valuenow/min/max |
| ContactCard | WhatsApp · tel · email · endereço | tel:/wa.me/mailto; Maps | links rotulados; lazy mapa |
| Breadcrumb | padrão | BreadcrumbList schema | nav aria-label; aria-current |
| Badge/Chip | info · success · alert · neutro · filtro | removível/selecionável | chip selecionável = button; aria-pressed |
| FeatureCard | ícone-topo · ícone-lado | hover lift | título como heading |
| FraudAlert | banner dismissível · página | único uso do vermelho; dismiss em cookie | role=region; não auto-fechar |

Implementação: primitives shadcn/ui (Radix), estendidos com `cva`; cada componente com entrada no Storybook (seção 37, Fase 2).

## 30. Motion Design System

### 30.1 Tokens
```css
--ease-standard: cubic-bezier(.2,.7,.2,1);   /* entradas/saídas UI */
--ease-emphasized: cubic-bezier(.2,.9,.1,1); /* hero, momentos-chave */
--ease-exit: cubic-bezier(.4,0,1,1);
--dur-instant:100ms; --dur-fast:160ms; --dur-base:200ms; --dur-slow:240ms; --dur-slower:320ms;
--stagger:60ms;
```
Regra: chip 100ms · botão 160ms · card 200ms · modal 240ms · transição de página 320ms. Nunca >320ms.

### 30.2 Catálogo de padrões

| Padrão | Duração/Easing | Especificação |
|---|---|---|
| Entrada | 200ms standard | fade + translateY 8→0 |
| Saída | 150ms exit | fade + translateY 0→4 |
| Hover card | 160ms standard | translateY −4 + sombra md→lg |
| Hover botão primário | 160ms | brilho +6% + Y −2 + sombra-cta |
| Active/press | 100ms | scale .98 |
| Focus | 120ms | anel 2px + offset 2px (sem shift) |
| Scroll reveal | 240ms · stagger 60ms | fade + Y 16→0 ao entrar 15%; `whileInView once`; direcional esq→dir |
| Stagger grid | filhos +60ms | máx 8 itens animados |
| Hero | 320ms emphasized | headline → subhead +80 → form +160 → prova +220; glow pulse 6s (off em reduced) |
| Sticky CTA | 200ms | slide-up ao passar do hero; slide-down no footer |
| Mega menu/drawer | 160/240ms | menu fade+scale; drawer slide-in + overlay |
| FAQ accordion | 220ms | altura auto + fade; chevron 180° |
| Form passo | 200ms | atual sai −24+fade, próximo entra da direita; barra 240ms |
| Form validação | 120ms | borda erro + shake ±4 (2×); ✓ scale-in |
| Loading | — | spinner 700ms linear; skeleton shimmer 1.4s |
| Toast | in 200 / out 150 | slide-up + fade; empilha |
| Transição de página | 320ms emphasized | fade + Y 12 (AnimatePresence / View Transitions) |
| Contador | 1.2s easeOut | preços contam de 0; tabular-nums |
| Logos seguradoras | 160ms | cinza→cor; marquee pausa no hover |

### 30.3 Quando usar
**Usar para:** confirmar ação, direcionar atenção, mostrar causa→efeito, comunicar carregamento. **Não usar:** decoração pura, atrasar info (nunca bloquear LCP), competir com outra animação, ou quando o usuário pediu `reduce`.

### 30.4 Implementação
```ts
// lib/motion.ts
export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: .2, ease: [.2,.7,.2,1] } },
}
export const staggerGroup = { show: { transition: { staggerChildren: .06 } } }
```
```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.01ms!important; transition-duration:.01ms!important; scroll-behavior:auto!important }
}
```
Animar só `transform`/`opacity` (GPU). Nunca `width/height/top/left` em scroll. `will-change` só durante a animação.

## 31. Landing Pages por produto

LP gerada pelo template dinâmico `seguro-[ramo]/page.tsx` lendo de `lib/ramos.ts`.

### 31.1 Anatomia da LP (ordem)
1. Hero (eyebrow + H1 message-match + subhead + LeadForm + CredBar) · 2. Argumentos (3 FeatureCards) · 3. Coberturas do ramo · 4. Como funciona (Timeline) · 5. Diferenciais · 6. Quebra de objeções · 7. Prova social · 8. FAQ do ramo · 9. CTA final + Footer.
Elementos de confiança em toda LP: nota 4.8/+2.000, SUSEP, logos, fotos da equipe, "grátis / sem compromisso / retorno rápido".

### 31.2 Fichas por produto

| Ramo / rota / preço | H1 / keyword | Argumentos · Objeções · FAQ · SEO title |
|---|---|---|
| **Auto** `/seguro-auto` R$79,90 | "Seguro auto a partir de R$ 79,90/mês, com cobertura FIPE 100%" · "seguro auto cotação online" | FIPE 100%, ass. 24h+carro reserva, bônus integral · "caro"/"trabalho"/"sinistro" · franquia/bônus/documentos/vistoria · *Seguro Auto Online \| Cotação Grátis em 16 Seguradoras — Imediato* |
| **Moto** `/seguro-moto` R$49,90 | "Seguro de moto a partir de R$ 49,90/mês" · "seguro de moto barato" | roubo/furto+RCF, ass. 24h, preço · cobre terceiros?/rastreador?/delivery · *Seguro de Moto Barato \| Cotação Online* |
| **Caminhão** `/seguro-caminhao` R$99,90 | "Seguro de caminhão sob medida para o seu negócio" · "seguro de caminhão" | casco+RCF-V, ass. pesada, carga opcional · cobre carga?/agregado/rastreamento · *Seguro de Caminhão \| Casco, RCF e Assistência 24h* |
| **Uber/99** `/seguro-uber` R$84,90 | "Seguro para Uber e 99 que cobre o uso por aplicativo" · "seguro para motorista de aplicativo" | cobertura app, proteção da renda, carro reserva · "seguradora cancelou por app" · avisar app?/passageiro?/APP · *Seguro para Uber e 99 \| Cobertura para App* |
| **Táxi** `/seguro-taxi` R$99,90 | "Seguro de táxi para o profissional que vive do carro" | uso profissional, ass. 24h, carro reserva · alvará?/passageiro? · *Seguro de Táxi \| Cobertura Profissional 24h* |
| **Utilitário** `/seguro-utilitario` R$94,90 | "Seguro de utilitário para carga e transporte" | casco+RCF, carga, ass. 24h · *Seguro de Utilitário e Van \| Cotação Online* |
| **Frota (PJ)** `/seguro-frota` sob consulta | "Seguro de frota com gestão única e condições de PJ" | volume, gestão central, especialista PJ · CTA "Falar com especialista PJ" (lead qualificado) · *Seguro de Frota Empresarial \| Gestão Única* |
| **Pet** `/seguro-pet` R$99,90 | "Assistência pet para cuidar de quem é da família" | rede credenciada, emergência 24h, sem burocracia · carência/espécies/reembolso · *Assistência Pet \| Cuidado para seu Animal* |
| **Fiança** `/fianca` R$99,90 | "Seguro fiança: alugue sem fiador e sem depósito caução" · "seguro fiança aluguel" | sem fiador, sem caução, aprovação ágil · "caro"→parcelado · o que cobre/análise/documentos · *Seguro Fiança para Aluguel \| Sem Fiador* |
| **Assistência 24h/RCF** `/assistencia-24-horas` R$39,90 | "Assistência 24h e RCF a partir de R$ 39,90/mês" | entrada acessível, cobre terceiros (RCF), socorro 24h · *Assistência 24h e RCF \| A partir de R$ 39,90* |

### 31.3 Analytics & SEO comum
Eventos com parâmetro `ramo` (funil e conversão por ramo); conversão Ads por ramo; metadata única; JSON-LD InsuranceAgency+FAQPage+BreadcrumbList+Service/Offer; OG dinâmica; canonical próprio; 1 guia pilar + 2–3 artigos de apoio por ramo (Fase 3).

## 32. SEO — autoridade nacional

### 32.1 Pillar + Cluster
Cada ramo é pillar (LP otimizada); cercado de artigos de cluster (long-tail) que linkam de volta.
```
PILLAR /seguro-auto
 ├─ /blog/quanto-custa-seguro-auto
 ├─ /blog/como-funciona-franquia-do-seguro
 ├─ /blog/bonus-de-seguro-como-transferir
 ├─ /blog/seguro-auto-vale-a-pena
 ├─ /blog/documentos-para-contratar-seguro
 └─ /blog/o-que-fazer-em-caso-de-sinistro
```

### 32.2 Tipos de conteúdo
| Tipo | Rota | Função |
|---|---|---|
| Pillar (produto) | `/seguro-[ramo]` | keyword transacional |
| Blog/Guias | `/blog/[slug]` | long-tail informacional |
| Guia completo | `/guias/[tema]` | pilar informacional extenso |
| Glossário | `/glossario/[termo]` | featured snippets |
| Comparativos | `/comparar/[a]-vs-[b]` | alta intenção |
| Calculadoras | `/calculadoras/[tipo]` | ferramenta + conversão |
| Por cidade | `/seguro-auto/[cidade]` | pSEO local |
| Por estado | `/seguro-auto/estado/[uf]` | pSEO regional |
| Por montadora | `/seguro-auto/montadora/[marca]` | pSEO |
| Por modelo | `/seguro-auto/carro/[modelo]` | pSEO cauda longa |
| Por perfil | `/seguro-auto/perfil/[perfil]` | jovem/1º carro/app/mulher/+50 |

> **pSEO com responsabilidade:** páginas programáticas só publicadas com conteúdo único e útil. Páginas finas = `noindex` (ver seção 50).

### 32.3 Links internos
Cluster→Pillar (âncora descritiva); Pillar→Cluster (relacionados); cross-cluster via `<GlossaryLink>`; breadcrumbs em todas; hub pages distribuem PageRank; profundidade ≤3 cliques; zero órfãs.

### 32.4 Schema avançado
```
InsuranceAgency (raiz) + Service/Offer (preço "a partir de")
Article/BlogPosting (autor Person, datas, image) · FAQPage · HowTo · BreadcrumbList
WebSite+SearchAction · Review/AggregateRating (4.8/2000) · LocalBusiness+geo (cidades) · DefinedTerm (glossário)
```

### 32.5 Técnico em escala
sitemap dinâmico particionado (>50k); robots bloqueando `/api`/thin; canonicals por página; SSG/ISR + `generateStaticParams`; RUM de CWV → GA4 (INP<200, LCP<2.5s, CLS<0.1); Search Console + IndexNow.

### 32.6 Autoridade (off-page)
E-E-A-T (autores SUSEP, página de autor); sinais de confiança crawláveis; digital PR (estudos de preço por cidade/modelo); Google Business Profile; conteúdo evergreen com data de revisão.

## 33. Otimização para mecanismos de IA (GEO)

### 33.1 Princípios
Respostas extraíveis (1º parágrafo direto, 40–60 palavras citáveis); estrutura semântica real (h1–h3, article, listas, table, headings em pergunta); entidades claras (Schema + sameAs, NAP consistente); dados e especificidade (preços, prazos, % FIPE; citar fontes/datas).

### 33.2 E-E-A-T (YMYL)
- **Experience:** conteúdo por corretores que vivem a operação; casos reais.
- **Expertise:** autores com credenciais SUSEP; bio + foto + Person schema.
- **Authoritativeness:** 25+ anos, +2.000 avaliações, 16 seguradoras — marcados.
- **Trust:** SUSEP, CNPJ, endereço, ouvidoria, política, fraude — verificáveis e crawláveis.

### 33.3 Infra para IA
`/public/llms.txt` + `llms-full.txt` (mapa curado); robots permitindo crawlers de IA legítimos (GPTBot, ClaudeBot, PerplexityBot, Google-Extended — decisão documentada); JSON-LD rico; conteúdo no HTML (SSG/ISR); FAQ+HowTo+DefinedTerm; OG completo. Monitorar tráfego de referência de IA no GA4.

## 34. Guia editorial & conteúdo

Voz: "o especialista experiente que fala como gente, não como apólice". Confiável, claro, próximo, direto.

**Eixos** — Somos: claros, próximos (2ª pessoa), confiantes, diretos, honestos. Não somos: cheios de jargão, corporativos, arrogantes/alarmistas, prolixos, pressionadores.

**Copywriting:** benefício antes do recurso; sentence case (sem CAIXA ALTA); números concretos; verbos de ação; prova junto da promessa.

### 34.3 Microcopy (pronta)
| Contexto | Copy |
|---|---|
| CTA primário | "Cotar agora" · "Fazer cotação grátis" · "Quero meu preço" |
| CTA WhatsApp | "Falar no WhatsApp" · "Tirar dúvidas agora" |
| Garantias | "Cotação 100% gratuita · Sem compromisso · Seus dados estão seguros" |
| Facilidade | "Leva menos de 1 minuto" · "Só precisamos de 2 informações pra começar" |
| Erro de campo | "Confira o número do celular (com DDD)" · "Esse CEP parece incompleto" |
| Erro de envio | "Algo deu errado ao enviar. Tente de novo ou fale com a gente no WhatsApp." |
| Sucesso | "Recebemos sua cotação! Um especialista vai te chamar em breve com as melhores opções." |
| Loading | "Buscando as melhores opções…" |
| Empty | "Nada por aqui ainda. Que tal fazer uma cotação?" |
| 404 | "Essa página saiu de cobertura. Volte ao início ou fale com um especialista." |

### 34.4 Mensagens de WhatsApp (por ramo)
```ts
// lib/whatsapp.ts → wa.me/55XXXXXXXXXXX?text=...
auto:  "Olá! Vim pelo site e quero uma cotação de Seguro Auto."
moto:  "Olá! Quero cotar um Seguro de Moto."
uber:  "Olá! Sou motorista de app e quero um seguro que cubra Uber/99."
frota: "Olá! Quero falar com um especialista sobre Seguro de Frota (PJ)."
// origem (utm) e ramo anexados p/ contexto do vendedor
```

### 34.5 Institucional vs comercial
- **Institucional** (Sobre, legais, fraude): formal e preciso ("Atuamos como corretores de seguros, intermediando companhias registradas na SUSEP").
- **Comercial** (LPs, CTAs, blog): quente e direto ("A gente compara 16 seguradoras pra você pagar menos").

## 35. Sistema de imagens

### 35.1 Pipeline técnico
| Etapa | Especificação |
|---|---|
| Formato | AVIF (1ª) + WebP fallback via `next/image`; JPEG só fallback final |
| Componente | `next/image` sempre: width/height (anti-CLS), `sizes`, `quality 70-80` |
| Prioridade | `priority` só no LCP (hero). Resto lazy |
| Placeholder | `placeholder="blur"` com blurDataURL (LQIP) |
| Responsividade | hero `100vw`; card `(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw` |
| Orçamento | hero ≤120KB · cards ≤40KB · thumbs ≤20KB · logos SVG |
| Entrega | otimização Vercel Image/CDN; cache longo + immutable; URLs com hash |

### 35.2 SEO de imagens
Alt descritivo e específico (sem stuffing); decorativas `alt=""`; nomes kebab-case semânticos; sitemap de imagens; OG 1.91:1 via `opengraph-image.tsx`.

> Fotos reais existentes (equipe, call-center) devem ser re-exportadas em AVIF/WebP e tratadas conforme 28.4 antes da produção.

## 36. Estratégia de gerenciamento de conteúdo (CMS)

| Opção | Prós | Contras | Ideal para |
|---|---|---|---|
| MDX/Markdown (repo) | custo zero, versionado, DX, máx. performance | edição exige PR; sem UI p/ não-técnico | docs, glossário, baixa rotação |
| Sanity | editor estruturado, real-time, free generoso | curva de schema; fora do Git; custo ao escalar | blog + pSEO c/ autores não-técnicos |
| Payload CMS | open-source, self-host, TS nativo, roda no Next, sem lock-in | exige infra; setup inicial | dados próprios + TS end-to-end |
| Contentful | maduro, enterprise | caro; menos flexível; lock-in | grandes times |

**Recomendado — híbrido:** **MDX no repo para conteúdo estável** (glossário, guias, institucional, FAQ) **+ Payload CMS para blog/alta rotação** quando o time editorial crescer (Fase 3).
- MDX elimina dependência externa, máx. performance (SSG), Git, custo zero — ideal Fase 1–2.
- Payload: TS end-to-end, self-hosted (dados próprios, sem lock-in), roda no mesmo app Next.
- pSEO gerada por dados estruturados (JSON/DB) + `generateStaticParams`, não CMS.
- `lib/ramos.ts`/`lib/company.ts` permanecem em código (config crítica de negócio).

## 37. Estratégia de qualidade & testes

| Camada | Ferramenta | Cobre |
|---|---|---|
| Unit/lógica | Vitest + Testing Library | validadores Zod, helpers, hooks |
| Componente/visual | Storybook + addon-a11y | variantes/estados; play; regressão (Chromatic opc.) |
| E2E/integração | Playwright | fluxo de cotação, WhatsApp/Ligar, cross-browser |
| Acessibilidade | axe-core + eslint-jsx-a11y | WCAG 2.2 AA automatizado |
| Performance/SEO | Lighthouse CI + bundle-analyzer | Perf/SEO/A11y/BP ≥95; budget de JS; CWV |
| Tipos/lint | tsc --noEmit · ESLint · Prettier | type-safety, padrões |

**Gates de CI (bloqueiam merge):** typecheck+lint · Vitest verde · Playwright (cotação+CTAs) · axe 0 críticas/sérias · Lighthouse ≥95 mobile · bundle dentro do orçamento.
**Manuais recorrentes:** responsivo 360/390/768/1024/1440 · iOS Safari + Android Chrome reais · teclado · leitor de tela · conversão ponta a ponta · eventos GTM/GA4 DebugView · Rich Results · reduced-motion/alto contraste.

## 38. Roadmap evolutivo

| Fase | Entrega | Escopo | Sucesso |
|---|---|---|---|
| 1 | Site institucional | Home, /cotacao, /obrigado, sobre, equipe, reputação, contato, legais, fraude; DS base + analytics + SEO técnico | Lighthouse ≥95; lead funcionando; CWV verdes |
| 2 | LPs especializadas | template + 10 LPs; conversão por ramo; integração Ads | ↑ Quality Score; ↑ conversão/ramo |
| 3 | Blog & conteúdo | clusters dos ramos de maior CPC, glossário, guias; MDX→Payload | ↑ orgânico; rankings long-tail |
| 4 | Área do Cliente | login, apólices, sinistro, documentos, 2ª via | ↓ chamados; ↑ retenção |
| 5 | Portal do Corretor | painel de leads, atribuição, follow-up, métricas | ↑ velocidade de resposta |
| 6 | Calculadoras | estimador por perfil/veículo | ↑ engajamento; ↑ links |
| 7 | Assistente de IA | chat de qualificação (RAG) que encaminha ao humano — nunca fecha venda | ↑ qualificação |
| 8 | Integrações seguradoras | APIs/multicálculo; CRM unificado | ↓ tempo de cotação |

> Modelo lead→humano→venda preservado em todas as fases. A IA da Fase 7 qualifica e encaminha; nunca cria checkout.

## 39. Visão de excelência visual

Meta: uma das melhores experiências digitais entre corretoras BR — confiança, tecnologia, sofisticação e proximidade.

| Dimensão | Bom | Excelente (meta) |
|---|---|---|
| Performance | rápido | sensação de instantâneo; CWV no topo; zero CLS |
| Hierarquia | organizado | o olho sabe para onde ir em cada tela |
| Detalhe | consistente | microinterações, foco, vazios/erros polidos |
| Confiança | tem selos | credibilidade sentida em cada bloco |
| Conversão | tem form | caminho ao lead sem fricção, copy que acolhe |
| Identidade | tem logo | reconhecível sem o logo (seção 28) |

**Inspirações:** Stripe/Vercel (rigor de grid/tipografia); Linear/Mercury/Ramp/Clerk (microinterações, motion contido); Nubank/Inter (calor humano no financeiro BR); Porto (confiança de seguros).
**Diferencial Imediato:** combinar 25+ anos de relação humana com execução digital premium — *tecnologia a serviço de gente de verdade*.

**Critérios de aceitação visual (DoD):** reconhecível sem logo · 1 ação primária por tela · prova social a ≤1 scroll · motion ≤240ms com propósito · tokens 100% · estados vazio/erro/sucesso desenhados · mobile impecável (≥44px, sticky) · contraste AA + foco visível · Lighthouse ≥95 · imagens AVIF, zero CLS.

---

# PARTE III — PLANO OPERACIONAL DE IMPLEMENTAÇÃO

> Objetivo: reduzir risco de execução no Cursor, controlar escopo, evitar que a IA implemente tudo de uma vez.

## 40. Organização em artefatos (/docs)

Esta spec é a fonte canônica. Para o Cursor, é fatiada em arquivos focados — cada prompt referencia 1–3 arquivos, nunca o documento inteiro.

| Arquivo | Conteúdo (seções) | Excluído | Uso pelo Cursor |
|---|---|---|---|
| `PRODUCT_SPEC.md` | Visão, negócio, IA, jornada, conversão, LPs (1–7, 15–16, 31) | detalhe técnico, tokens | contexto de produto |
| `MVP_SCOPE.md` | Escopo Fase 1 (41) | tudo de fases 2+ | trava de escopo |
| `DESIGN_SYSTEM.md` | identidade, tokens, componentes, motion (8–14, 28–30, 35) | lógica de API, SEO | implementar UI |
| `TECHNICAL_SPEC.md` | arquitetura, diretórios, convenções, API leads, env, segurança (21–23, 43–45, 51) | copy, SEO | implementar lógica/infra |
| `SEO_ANALYTICS_SPEC.md` | SEO, schema, GTM/GA4/Ads, eventos, GEO (17–20, 32–33) | UI, conteúdo | metadata, JSON-LD, dataLayer |
| `CONTENT_STRATEGY.md` | guia editorial, microcopy, CMS (34, 36) | técnico | textos e voz |
| `CURSOR_IMPLEMENTATION_PLAN.md` | conduzir o Cursor + issues (24, 48–49, 54) | — | plano mestre |
| `QA_CHECKLIST.md` | testes, checklists, Ready/Done (25–27, 37, 53, 58, 60) | — | gate de entrega |
| `ROADMAP.md` | fases, critérios, migração, riscos, baseline (38, 42, 46–47, 52, 62) | implementação | planejamento |

**Como gerar:** "extraia a seção N deste documento para `/docs/ARQUIVO.md` sem alterar o conteúdo".

## 41. Escopo do MVP — Fase 1

Regra inegociável: a Fase 1 substitui o site atual com foco em conversão. Nada além.

**✓ Incluído:** Next.js 15 (App Router) · TypeScript estrito · Tailwind CSS 4 · shadcn/ui · tokens · Header · Footer · Home · LP dinâmica por ramo · /cotacao · /obrigado · LeadForm multi-step · sistema de CTAs · WhatsApp rastreável · telefone rastreável · CredBar · InsuranceCards · CoverageCards · Benefits · InsurersGrid · Testimonials · FAQ · FraudAlert · schema básico · sitemap · robots · metadata · dataLayer · GTM · GA4 · Ads conversion · Consent Mode v2 · deploy.

**✗ Fora (fases posteriores):** blog · glossário · calculadoras · pSEO cidade/estado/montadora/modelo/perfil · área do cliente · portal do corretor · CMS headless · Storybook completo · testes A/B · assistente de IA · integrações com seguradoras.

## 42. Fases de implementação & critérios de saída

**Fase 1 — Website de conversão**
- Objetivo: substituir o site com foco em Ads → lead → WhatsApp/telefone/form.
- Páginas: Home, /seguro-[ramo] (10), /cotacao, /obrigado, /a-imediato, /equipe, /reputacao, /contato, legais, /alerta-de-fraude, 404/500.
- Componentes: todos do escopo 41.
- Dependências: domínio, GTM existente, nº WhatsApp, endpoint/CRM, contas GA4/Ads.
- **Aceite:** Lighthouse mobile ≥95 (4 cat.) · CWV verdes · lead chega ao destino · eventos no GA4 DebugView · 301s no ar · Rich Results válido · a11y AA nas páginas-chave.
- Riscos: perda de SEO na migração; tracking quebrado (seção 52).
- **NÃO fazer:** blog, CMS, pSEO, área logada, A/B, IA, Storybook completo.

**Fase 2 — Design System, qualidade & polimento**
- Entregáveis: Storybook completo, testes visuais, axe/Playwright/Vitest, motion refinado, estados, Lighthouse CI no pipeline.
- Aceite: todo componente no Storybook · gates de CI (37) ativos · 0 a11y crítica · cobertura mín. em lib/.

**Fase 3 — SEO de autoridade**
- Entregáveis: blog (MDX→Payload), guias pilares, glossário, clusters dos ramos de maior CPC, internal linking, E-E-A-T.
- Aceite: clusters dos 3 ramos prioritários publicados · schema Article/Person válido · 0 órfãs · ↑ impressões Search Console.

**Fase 4 — SEO programático controlado**
- Entregáveis: cidade→estado→montadora→modelo→perfil, cada um com conteúdo único.
- Aceite: conteúdo/dados únicos + intenção clara · thin = noindex · Search Console revisado antes de escalar lote.

**Fase 5 — Produto digital**
- Área do cliente, portal do corretor, IA, integrações (roadmap 4–8); sempre preservando lead→humano.

> **Gate entre fases:** não iniciar fase N+1 com critérios da fase N em aberto.

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

## 46. Baseline & metas mensuráveis

Sem dados inventados — `TBD` até medição.

| Métrica | Fonte | Atual | Meta de referência |
|---|---|---|---|
| Lighthouse mobile/desktop | PageSpeed | TBD | ≥95 / ≥98 |
| LCP | CrUX/RUM | TBD | <2.5s |
| INP | CrUX/RUM | TBD | <200ms |
| CLS | CrUX/RUM | TBD | <0.1 |
| TBT | Lab | TBD | <200ms |
| Conversão do form | GA4 | TBD | + relativo |
| Clique WhatsApp/telefone | GA4 | TBD | ↑ vs baseline |
| Abandono por etapa | GA4 funil | TBD | ↓ por passo |
| CPC/CPA por campanha | Ads | TBD | ↓ via QS |
| Conversão por dispositivo | GA4 | TBD | ↑ mobile |
| Quality Score médio | Ads | TBD | ↑ |
| Impressões/cliques orgânicos | Search Console | TBD | ↑ (fases 3–4) |
| Posição média | Search Console | TBD | ↑ |
| Páginas indexadas | Search Console | TBD | estável→↑ controlado |
| Leads por ramo | CRM/GA4 | TBD | ↑ |

**Metas por janela:** 7d estabilidade (0 perda de tracking; 301s ok; CWV verdes; leads fluindo; 404≈0) · 30d paridade+ (conversão ≥ baseline; QS subindo; rankings preservados) · 90d ganho (↑ conversão, ↓ CPA; primeiros clusters) · 180d autoridade (orgânico crescente; pSEO inicial). Percentuais exatos só após baseline.

## 47. Migração Webflow → Next.js

### 47.1 Sequência
1. Inventário de URLs (Screaming Frog + sitemap Webflow + Search Console).
2. Mapa de 301 (47.2 / seção 59).
3. Exportar assets (imagens → AVIF/WebP; logos SVG; textos).
4. Build em staging; validar paridade e 301s.
5. Janela em baixa audiência; TTL de DNS reduzido antes.
6. DNS/SSL: apontar; forçar HTTPS; canonical www↔apex.
7. Pós-go-live: submeter sitemap; "Validar correção"; IndexNow.
8. Monitorar 404 (30–60 dias).
9. Rollback: manter Webflow publicável; reversão = repontar DNS.

### 47.2 Regra de redirect
Preservar slugs que rankeiam (200, mesma URL); 301 só quando o slug muda (ex.: `/seguro-motos` → `/seguro-moto`). Nenhuma URL com tráfego/backlink vira 404. Redirects em `next.config.mjs` (`redirects()`) ou middleware.

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

## 50. SEO programático — travas anti-thin-content

**Gates de publicação:** sem conteúdo único, não publica; sem intenção de busca clara, não publica; cidade/modelo/montadora só com volume/relevância; incompletas = `noindex` até qualidade; revisar Search Console antes de escalar lote; começar pequeno (poucos clusters), medir, expandir.

**Ordem segura:** 1) LPs transacionais por ramo (Fase 1) · 2) guias pilares · 3) artigos de apoio · 4) glossário · 5) comparativos (Fase 3) · 6) calculadoras (Fase 3→4) · 7) pSEO cidade/estado · 8) pSEO montadora/modelo/perfil (Fase 4).

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

## 52. Matriz de riscos

| Risco | Prob. | Impacto | Mitigação | Resp. | Fase |
|---|---|---|---|---|---|
| Perda de SEO na migração | Média | Alto | Mapa 301 (47); preservar slugs; Search Console; monitorar 404 | SEO/Dev | 1 |
| Queda temporária de conversão | Média | Alto | Paridade; QA de funil; rollback DNS; comparar baseline | Produto | 1 |
| Erro no envio de leads | Média | Crítico | DB como verdade; retry+fallback; alerta; backup | Dev | 1 |
| Tracking quebrado (GA4/Ads) | Média | Alto | GTM Preview+DebugView; E2E de eventos; checklist | Dev/Mkt | 1 |
| Excesso de escopo | Alta | Médio | MVP_SCOPE; 1 issue/vez; template de prompt | Tech Lead | todas |
| Performance <95 | Média | Alto | Lighthouse CI; budget JS/img; SSG/ISR; next/image | Dev | 1–2 |
| Problemas de LGPD | Baixa | Alto | Consent Mode v2; minimização; anonimização | Jurídico/Dev | 1 |
| Conteúdo duplicado em pSEO | Média | Alto | Travas anti-thin (50); noindex; revisão por lote | SEO | 4 |
| Inconsistência visual pelo Cursor | Média | Médio | Tokens obrigatórios; DS; revisão de diff; Storybook | Design/Dev | todas |
| Dependência de widgets pagos | Baixa | Médio | Substituir por gratuitas; self-host | Dev | 1 |
| Spam no formulário | Alta | Médio | Honeypot + Turnstile + rate limit | Dev | 1 |

## 53. Definição de Ready / Done

**Definition of Ready — pode começar quando:** escopo claro (issue + seções) · dependências resolvidas · design/tokens definidos · critérios de aceite escritos · dados necessários existem (env, lib/ramos) · fora de escopo explícito.

**Definition of Done — termina quando:** código implementado · typecheck passou · lint passou · testes relevantes passaram · responsividade validada (360→1440) · acessibilidade básica validada (teclado/axe) · analytics disparando quando aplicável · sem hardcode proibido · documentação atualizada · print/vídeo curto anexado.

---

# PARTE IV — ARTEFATOS FINAIS PARA IMPLEMENTAÇÃO NO CURSOR

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

## 55. Fonte única de dados institucionais — `lib/company.ts`

Todo dado institucional/comercial/regulatório vive em um único arquivo tipado. Nenhum componente hardcoda razão social, CNPJ, SUSEP, endereço, telefones, WhatsApp, ouvidoria, e-mail, horário, nº de seguradoras, nota/quantidade de avaliações, anos de experiência, preços, links sociais, URLs legais ou mensagem padrão de WhatsApp.

### 55.1 Contrato
```ts
export type CompanyConfig = {
  legalName: string
  tradeName: string
  cnpj: string
  susep: string
  address: { street:string; number:string; floor?:string; district:string;
    city:string; state:string; zipCode:string; country:string }
  contact: { phone:string; phoneDisplay:string; whatsapp:string;
    whatsappDisplay:string; emergencyPhone?:string; ombudsmanPhone?:string;
    email:string; fallbackEmail:string }
  business: { yearsExperience:number; insurersCount:number;
    googleRating:number; googleReviewsCount:number; satisfactionRate?:number }
  legalUrls: { privacyPolicy:string; terms:string; fraudAlert:string }
  social?: { instagram?:string; facebook?:string; linkedin?:string }
  google?: { reviewUrl?:string; profileUrl?:string; placeId?:string }
}
```

### 55.2 Exemplo preenchido (✅ = confirmado pelo cliente · ⚠️ = confirmar antes de produção)
> Implementado em `lib/company.ts`. Legenda no arquivo.
```ts
export const company: CompanyConfig = {
  legalName: 'Imediato Corretora de Seguros Ltda.', // ✅
  tradeName: 'Imediato Seguros',                    // ✅
  cnpj: '45.998.165/0001-32',                       // ⚠️ A CONFIRMAR
  susep: '252174522',                               // ⚠️ A CONFIRMAR
  address: { street:'Rua Barão de Itapetininga', number:'125', floor:'6º andar',
    district:'Centro', city:'São Paulo', state:'SP',
    zipCode:'01042-001', country:'BR' },             // ⚠️ A CONFIRMAR
  contact: {
    phone:'+551132301422', phoneDisplay:'(11) 3230-1422',          // ⚠️ A CONFIRMAR
    whatsapp:'5511932301422',   // ⚠️ CRÍTICO: link do site atual usa '#'
    whatsappDisplay:'(11) 3230-1422',
    emergencyPhone:'+5511953288466', ombudsmanPhone:'+5511976687668', // ⚠️
    email:'contato@imediatoseguros.com.br',          // ⚠️ A CONFIRMAR
    fallbackEmail:'lrotero@gmail.com' },             // ✅
  business: { yearsExperience:25,   // ⚠️ RESOLVER (hero 25 vs rodapé 35+)
    insurersCount:16,               // ⚠️ A CONFIRMAR (16 texto / 18 logos)
    googleRating:4.8, googleReviewsCount:2000,       // ⚠️ A CONFIRMAR
    satisfactionRate:96 },          // ⚠️ RESOLVER (96% vs 98%)
  legalUrls: { privacyPolicy:'/politica-de-privacidade', terms:'/termos',
    fraudAlert:'/alerta-de-fraude' },
  social: {
    facebook:'https://web.facebook.com/imediatocorretora',                               // ✅
    instagram:'https://www.instagram.com/imediato.seguros/',                             // ✅
    linkedin:'https://www.linkedin.com/company/imediato-solu%C3%A7%C3%B5es-em-seguros/' },// ✅
  google: {
    reviewUrl:'https://g.page/r/CSZR7jnTxayxEAE/review',                                  // ✅
    profileUrl:'https://www.google.com/maps/place/IMEDIATO+SOLU%C3%87%C3%95ES+EM+SEGUROS',// ✅
    placeId:'0x94ce5849842c0001:0xb1acc5d339ee5126' },                                    // ✅
}

// sameAs para JSON-LD (apenas URLs confirmadas)
export const companySameAs = [company.social?.facebook, company.social?.instagram,
  company.social?.linkedin, company.google?.profileUrl].filter(Boolean) as string[]
```

> **A confirmar antes de produção (bloqueante):** WhatsApp oficial (o site usa `#`), telefone principal, SUSEP, CNPJ, endereço, anos de experiência (25 vs 35+), satisfação (96% vs 98%), preços por ramo, horário de atendimento.
>
> **Já confirmado ✅:** razão social, e-mail de fallback, Facebook, Instagram, LinkedIn, link de avaliações e perfil Google.
>
> **Regra obrigatória:** nenhum dado institucional/regulatório/comercial recorrente pode aparecer diretamente em JSX. Tudo vem de `lib/company.ts`. Lint/PR review rejeita strings de telefone, CNPJ, SUSEP ou preço em componentes.

## 56. Fonte única de dados dos produtos — `lib/ramos.ts`

Todos os ramos em um único arquivo tipado. LPs renderizam a partir dele — sem duplicar copy manualmente.

### 56.1 Contrato
```ts
export type InsuranceBranch = {
  slug: string
  name: string; shortName: string
  category: 'auto'|'moto'|'pj'|'residencial'|'vida'|'pet'|'aluguel'|'assistencia'|'outros'
  icon: string                      // nome do ícone Lucide
  priceFrom?: number; priceLabel: string; priceDisclaimer?: string
  headline: string; subheadline: string; eyebrow?: string
  seo: { title:string; description:string; keywordFocus:string; canonicalPath:string }
  ads: { messageMatchHeadline:string;
         campaignIntent:'transacional'|'nicho'|'pj'|'informacional';
         conversionValue?:number }
  benefits: string[]
  arguments: string[]
  objections: { objection:string; response:string }[]
  coverages: string[]
  faq: { question:string; answer:string }[]
  trustSignals?: string[]
  whatsappMessage: string
  analytics: { ramo:string; productId:string }
}
```

### 56.2 O que alimenta
| Consumidor | Campos |
|---|---|
| RamoGrid | name, shortName, icon, priceLabel, slug |
| InsuranceCard | name, icon, priceFrom/Label, eyebrow, slug |
| LP `/seguro-[ramo]` | headline, subheadline, benefits, arguments, objections, coverages, trustSignals |
| FAQ | faq[] (+ FAQPage schema) |
| WhatsApp | whatsappMessage |
| SEO metadata | seo.{title,description,canonicalPath} |
| JSON-LD | name, priceFrom (Offer), faq |
| dataLayer | analytics.{ramo,productId}, ads.conversionValue |
| Sitemap | seo.canonicalPath |
| Links internos | slug, shortName |

> **Regra:** LPs de ramo não duplicam copy manualmente — renderizam de `lib/ramos.ts`. Exceção: blocos editoriais específicos, claramente isolados. Preços daqui/`company`, nunca do JSX.

## 57. Consentimento, LGPD & Google Consent Mode v2

Tracking de Ads/Analytics só após consentimento; o formulário **sempre funciona**, mesmo sem consentimento de marketing.

### 57.1 Estados
| Momento | analytics_storage | ad_storage / ad_user_data / ad_personalization |
|---|---|---|
| Inicial (default) | denied | denied |
| Aceita todos | granted | granted |
| Rejeita | denied | denied (pings sem cookies) |
| Personaliza | conforme escolha | conforme escolha |

### 57.2 Categorias de cookies
| Categoria | Finalidade | Exemplo | Necessário? | Depende de consentimento? | Enviado ao Google? |
|---|---|---|---|---|---|
| Necessários | funcionamento | sessão, consentimento, CSRF | Sim | Não | Não |
| Funcionais | preferências | dismiss de banner, UTM 1st-party | Não | Não | Não |
| Analytics | medição | GA4 (_ga) | Não | Sim | Sim (se granted) |
| Marketing/Ads | remarketing, conversão | Google Ads, gclid | Não | Sim | Sim (se granted) |

### 57.3 Comportamentos
Persistência: cookie 1st-party (6 meses) + registrado com o lead. Revogar: link "Preferências de cookies" no footer reabre o banner (atualiza em tempo real). Eventos só após `analytics_storage:granted` (antes, pings sem cookies). Enhanced Conversions só com `ad_user_data:granted` (e-mail/telefone hasheados). Formulário sem consentimento de marketing continua enviando o lead (finalidade = contato solicitado); apenas não dispara tags de Ads.

### 57.4 Banner — texto e a11y
Texto: *"Usamos cookies para melhorar sua experiência e medir nossos anúncios. Você pode aceitar todos, rejeitar ou escolher. Veja nossa Política de Privacidade."* — botões **Aceitar todos · Rejeitar · Preferências**.
A11y: `role="dialog"`, foco vai ao banner, navegável por teclado, botões reais (≥44px), contraste AA, link obrigatório à Política de Privacidade.

### 57.5 Inicialização (pseudo-código)
```js
// ANTES de qualquer tag (no <head>, via GTM ou inline)
gtag('consent','default',{
  ad_storage:'denied', ad_user_data:'denied',
  ad_personalization:'denied', analytics_storage:'denied',
  functionality_storage:'granted', security_storage:'granted',
  wait_for_update: 500
});
// ao escolher no banner:
gtag('consent','update',{
  ad_storage: c.ads?'granted':'denied',
  ad_user_data: c.ads?'granted':'denied',
  ad_personalization: c.ads?'granted':'denied',
  analytics_storage: c.analytics?'granted':'denied'
});
dataLayer.push({ event:'consent_update', consent:c });
```

## 58. Fluxo Git, Pull Requests & Deploy

### 58.1 Branches
- `main` → produção (protegida) · `develop` → integração (preview automático Vercel).
- `feature/issue-NN-slug` (ex.: `feature/issue-01-scaffold`) — uma por issue.
- PR obrigatório `feature → develop`; `develop → main` só após homologação; tag de release (`v1.0.0`) no merge para main.
- Aprovação: 1 reviewer (tech lead) mínimo; CI verde obrigatório.

### 58.2 Checklist de PR (bloqueia merge)
typecheck · lint · build · testes relevantes · sem hardcode proibido (company/ramos/env) · sem libs novas não aprovadas · sem regressão visual óbvia · responsivo validado · eventos de analytics validados (quando aplicável) · screenshots/vídeo anexados.

### 58.3 Checklist de deploy em produção
DNS validado · SSL ativo · variáveis de ambiente configuradas · GTM publicado · GA4 recebendo eventos · Google Ads recebendo conversões · `/api/lead` funcionando · fallback funcionando · Search Console configurado · sitemap enviado · redirects 301 ativos · smoke test completo.

## 59. Inventário de migração de URLs

| Página | URL atual | URL nova | Conteúdo | Imgs? | 301 | Prior. |
|---|---|---|---|---|---|---|
| Home | / | / | refeito | ☐ | — | Alta |
| Seguro Auto | /seguro-auto | /seguro-auto | refeito | ☐ | 200 | Alta |
| Seguro Moto | /seguro-motos | /seguro-moto | refeito | ☐ | 301 | Alta |
| Seguro Caminhão | /seguro-caminhao | /seguro-caminhao | refeito | ☐ | 200 | Alta |
| Seguro Uber/99 | /seguro-uber | /seguro-uber | refeito | ☐ | 200 | Alta |
| Seguro Táxi | /seguro-taxi | /seguro-taxi | refeito | ☐ | 200 | Média |
| Seguro Utilitário | /seguro-utilitario | /seguro-utilitario | refeito | ☐ | 200 | Média |
| Seguro Frota | (novo) | /seguro-frota | novo | ☐ | — | Média |
| Seguro Pet | → assistência | /seguro-pet | novo | ☐ | 301? | Baixa |
| Fiança/Aluguel | /fianca | /fianca | refeito | ☐ | 200 | Média |
| Assistência 24h/RCF | /assistencia-24-horas | /assistencia-24-horas | refeito | ☐ | 200 | Média |
| Coberturas | (seção) | /coberturas | novo | ☐ | — | Baixa |
| Seguradoras Parceiras | (seção) | /seguradoras-parceiras | novo | ☐ | — | Baixa |
| A Imediato | (seção) | /a-imediato | refeito | ☐ | — | Média |
| Equipe | /equipe | /equipe | refeito | ☐ | 200 | Baixa |
| Reputação | /reputacao | /reputacao | refeito | ☐ | 200 | Média |
| Contato | (seção) | /contato | novo | ☐ | — | Média |
| Alerta de Fraude | (seção) | /alerta-de-fraude | preservado | ☐ | — | Alta |
| Política de Privacidade | (verificar) | /politica-de-privacidade | revisar | ☐ | 301? | Alta |
| Termos | (verificar) | /termos | revisar | ☐ | 301? | Média |
| Obrigado | (form) | /obrigado | novo (noindex) | ☐ | — | Alta |

> **Regra:** nenhuma URL antiga vai para produção sem decisão explícita — manter, redirecionar, consolidar ou remover com justificativa. Rodar Screaming Frog + Search Console para capturar órfãs não listadas.

## 60. Checklist comercial de go-live

Obrigatório antes de publicar — o negócio depende de Ads + atendimento humano.

- [ ] Telefone principal correto
- [ ] WhatsApp correto (abre conversa no celular)
- [ ] Ouvidoria correta
- [ ] E-mail correto
- [ ] SUSEP correto
- [ ] CNPJ correto
- [ ] Endereço correto
- [ ] Preço "a partir de" correto por ramo
- [ ] Mensagem WhatsApp por ramo correta
- [ ] Clique no telefone abre discador
- [ ] Formulário envia lead real
- [ ] Lead chega ao CRM/webhook
- [ ] Fallback por e-mail funciona
- [ ] Vendedor recebe ramo, origem, UTM e GCLID
- [ ] /obrigado dispara conversão
- [ ] GA4 DebugView registra generate_lead
- [ ] Google Ads registra conversão de teste
- [ ] GTM Preview sem erro
- [ ] Lead duplicado tratado corretamente
- [ ] Erro de CRM gera alerta
- [ ] Form funciona em 4G no celular
- [ ] Form funciona no iPhone Safari
- [ ] Form funciona no Android Chrome
- [ ] Campanha aponta para a LP correta por ramo
- [ ] LP tem message match com o anúncio
- [ ] /obrigado está noindex
- [ ] Política de privacidade acessível
- [ ] Banner de consentimento acessível
- [ ] Vendedor validou recebimento de lead real

## 61. Observabilidade operacional pós-go-live

| Sinal | Ferramenta | Frequência | Alerta quando | Ação esperada |
|---|---|---|---|---|
| Erro em /api/lead | Sentry | tempo real | erro >1% ou 5xx | investigar; checar CRM/fallback |
| Falha de webhook/CRM | Logs + Sentry | tempo real | 1 falha | verificar fila; reprocessar; alertar comercial |
| Tempo de resposta da API | Vercel/Sentry | contínuo | p95 >1s | otimizar; checar dependências |
| Queda de conversão | GA4 | diário | ↓ >30% vs baseline | checar form/tracking; comparar deploy |
| Queda WhatsApp/telefone | GA4 | diário | ↓ abrupto | verificar links/eventos |
| Aumento de 404 | Search Console + logs | semanal | novos 404 com tráfego | adicionar 301 |
| Falhas de Consent Mode | GTM/Tag Assistant | semanal | tags sem consent ok | corrigir defaults/update |
| Ausência de eventos GA4 | GA4 Realtime | diário | 0 eventos em janela ativa | checar GTM/dataLayer |
| Queda de CWV | GA4 RUM / CrUX | semanal | métrica sai do verde | profiling; otimizar |
| Aumento de spam | Logs /api/lead | diário | pico de inválidos | endurecer Turnstile/rate limit |
| Falha do e-mail fallback | Logs provedor | tempo real | bounce/erro | checar provedor; reenviar |

Ferramentas: Sentry · Vercel Analytics · GA4 · Google Ads · Search Console · GTM Preview · logs do webhook/CRM · monitor sintético simples (uptime + smoke do form).

## 62. Plano de rollback

### 62.1 Como reverter rápido
- **Vercel:** "Promote to Production" do deploy anterior (rollback instantâneo).
- **DNS:** repontar para o host anterior (TTL baixo pré-migração).
- **Ads:** pausar campanhas temporariamente.
- **Site anterior:** manter Webflow publicável durante a validação.
- **Backups:** redirects 301 e variáveis de ambiente.
- **Pós-rollback:** revalidar tracking; comunicar a equipe comercial.

### 62.2 Critérios para acionar rollback
Leads não chegam · WhatsApp quebrado · telefone errado · Google Ads sem conversão · erro 5xx persistente · queda severa de conversão · DNS/SSL instável · páginas principais fora do ar.

> **Tempo máximo de decisão:** até 30 min após detecção de falha crítica. Sem hotfix rápido (<15min), reverter primeiro e investigar depois — nunca deixar o funil comercial quebrado no ar.

## 63. Ordem recomendada para começar no Cursor

1. Criar o repositório.
2. Criar a estrutura `/docs`.
3. Dividir a especificação nos arquivos recomendados (seção 40).
4. Criar `MVP_SCOPE.md` (seção 41).
5. Criar `.env.example` (seção 45).
6. Criar `lib/company.ts` (seção 55).
7. Criar `lib/ramos.ts` (seção 56).
8. Rodar a **Issue 01** no Cursor (scaffold).
9. Validar o scaffold (build/typecheck/lint).
10. Seguir as issues em ordem, **uma por vez** (seção 54).

> **Advertência:** não comece pela Home. Primeiro construa fundação, tokens, dados e componentes reutilizáveis. A Home (Issue 15) só é montada depois que os blocos existirem — caso contrário, o Cursor recria componentes inline e quebra a consistência.

---

---

# PARTE V — FECHAMENTO NOTA 10: VALIDAÇÕES REAIS, DADOS OFICIAIS E PACOTE DE EXECUÇÃO

> Objetivo: deixar a especificação à prova de execução real — validações, responsáveis, dependências e critérios finais. Não reescreve Partes I–IV; fecha lacunas.

## 64. Dados oficiais obrigatórios antes da implementação

| Dado | Valor atual observado | Fonte atual | Confirmado? | Responsável | Onde será usado |
|---|---|---|---|---|---|
| Razão social exata | **Imediato Corretora de Seguros Ltda.** | cliente | ✅ Confirmado | Sócio/Jurídico | company.legalName, Schema, footer |
| Nome fantasia | Imediato Seguros | site | ☐ | Sócio | company.tradeName |
| CNPJ | 45.998.165/0001-32 | rodapé | ☐ | Jurídico | company.cnpj, Organization schema |
| SUSEP | 252174522 | rodapé | ☐ | Jurídico | company.susep, footer |
| Endereço completo | Rua Barão de Itapetininga 125, 6º andar, Centro, SP, 01042-001 | rodapé | ☐ | Adm | address, LocalBusiness, /contato |
| Telefone principal | (11) 3230-1422 | topo/rodapé | ☐ | Comercial | contact.phone, CallButton |
| Telefone de emergência | (11) 95328-8466 | topo | ☐ | Comercial | contact.emergencyPhone |
| WhatsApp oficial | (11) 3230-1422 (link usa `#`!) | topo | ☐ **CRÍTICO** | Comercial | contact.whatsapp, FAB |
| Ouvidoria | (11) 97668-7668 | rodapé | ☐ | Jurídico | contact.ombudsmanPhone |
| E-mail comercial | contato@imediatoseguros.com.br | rodapé | ☐ | Comercial | contact.email |
| E-mail fallback de leads | **lrotero@gmail.com** | cliente | ✅ Confirmado | TI/Comercial | LEAD_FALLBACK_EMAIL |
| Horário de atendimento | — | — | ☐ A CONFIRMAR | Comercial | /contato, Schema openingHours |
| Anos de experiência | 25 (hero) / 35+ (rodapé) — **divergente** | site | ☐ **RESOLVER** | Marketing | business.yearsExperience |
| Nº de seguradoras parceiras | 16 (texto) / 18 logos | site | ☐ | Comercial | business.insurersCount |
| Nota Google | 4.8 | site | ☐ | Marketing | business.googleRating, AggregateRating |
| Qtd. de avaliações | +2.000 | site | ☐ | Marketing | business.googleReviewsCount |
| % de satisfação | 96% (texto) / 98% (outro bloco) — **divergente** | site | ☐ **RESOLVER** | Marketing | business.satisfactionRate |
| Preços "a partir de" por ramo | Auto 79,90 · Moto 49,90 · Cam. 99,90 · Uber 84,90 · Util. 94,90 · Táxi 99,90 · Pet 99,90 · Fiança 99,90 · Ass24h 39,90 | site | ☐ | Comercial | ramos.priceFrom |
| Redes sociais oficiais | FB `web.facebook.com/imediatocorretora` · IG `instagram.com/imediato.seguros` · LinkedIn `imediato-soluções-em-seguros` | cliente | ✅ Confirmado | Marketing | company.social, sameAs |
| URL Google Business Profile | `maps` → IMEDIATO SOLUÇÕES EM SEGUROS (place id `0x94ce5849842c0001:0xb1acc5d339ee5126`) | cliente | ✅ Confirmado | Marketing | sameAs, /reputacao |
| Link de avaliações Google | `g.page/r/CSZR7jnTxayxEAE/review` | cliente | ✅ Confirmado | Marketing | /reputacao, Testimonials |
| Política de privacidade | (verificar se existe) | — | ☐ | Jurídico | /politica-de-privacidade |
| Termos | (verificar se existe) | — | ☐ | Jurídico | /termos |
| Texto oficial do alerta de fraude | presente no site (PIX/rastreador) | site | ☐ | Jurídico | /alerta-de-fraude, FraudAlert |

> **Regra:** nenhuma informação institucional, regulatória, comercial ou de preço entra em produção sem confirmação explícita nesta tabela. Itens marcados **CRÍTICO/RESOLVER** são bloqueantes (seção 68).

## 65. Auditoria real de URLs antes do go-live

Inventário final produzido a partir de: **Webflow** · sitemap atual · **Google Search Console** · **Google Analytics** · **Google Ads** (landing pages das campanhas) · **Screaming Frog** (ou crawler equivalente) · **backlinks** (Search Console/ferramenta de SEO, se disponível).

### 65.1 Tabela definitiva (a preencher)
| URL atual | Tipo | Tráfego orgânico? | Tráfego Ads? | Backlinks? | Indexada? | URL nova | Ação | Redirect | Prioridade | Obs. |
|---|---|---|---|---|---|---|---|---|---|---|
| / | home | TBD | TBD | TBD | sim | / | manter | — | Alta | |
| /seguro-auto | LP | TBD | TBD | TBD | sim | /seguro-auto | manter | — | Alta | LP de Ads |
| /seguro-motos | LP | TBD | TBD | TBD | sim | /seguro-moto | redirecionar | 301 | Alta | normalizar slug |
| /seguro-caminhao | LP | TBD | TBD | TBD | sim | /seguro-caminhao | manter | — | Alta | |
| /seguro-uber | LP | TBD | TBD | TBD | sim | /seguro-uber | manter | — | Alta | |
| /seguro-taxi | LP | TBD | TBD | TBD | sim | /seguro-taxi | manter | — | Média | |
| /seguro-utilitario | LP | TBD | TBD | TBD | sim | /seguro-utilitario | manter | — | Média | |
| /assistencia-24-horas | LP | TBD | TBD | TBD | sim | /assistencia-24-horas | manter | — | Média | |
| /fianca | LP | TBD | TBD | TBD | sim | /fianca | manter | — | Média | |
| /reputacao | inst. | TBD | TBD | TBD | sim | /reputacao | manter | — | Média | |
| /equipe | inst. | TBD | TBD | TBD | sim | /equipe | manter | — | Baixa | |
| *(URLs adicionais do crawler)* | — | TBD | TBD | TBD | TBD | — | investigar | — | — | preencher |

A coluna **Ação** aceita apenas: `manter` · `redirecionar` · `consolidar` · `remover com justificativa` · `noindex` · `investigar`.

> **Regra:** nenhuma URL indexada, com tráfego ou com backlink pode ser removida sem redirect ou justificativa documentada.

### 65.2 Checklist de auditoria
- [ ] Sitemap antigo exportado
- [ ] Sitemap novo validado
- [ ] Lista de URLs do Search Console exportada
- [ ] Lista de landing pages usadas em Google Ads exportada
- [ ] Redirects testados em staging
- [ ] URLs 404 monitoradas após go-live por ≥30 dias

## 66. Plano de coleta de baseline

| Métrica | Ferramenta | Como coletar | Janela mínima | Resp. | Atual | Meta | Classe |
|---|---|---|---|---|---|---|---|
| Lighthouse mobile | PageSpeed/Lab | rodar em /, /seguro-auto | 1 dia | Dev | TBD | ≥95 | **Obrigatória** |
| Lighthouse desktop | PageSpeed | idem | 1 dia | Dev | TBD | ≥98 | Obrigatória |
| LCP | PageSpeed/CrUX | campo + lab | 28 dias | Dev | TBD | <2.5s | Obrigatória |
| INP | CrUX/RUM | campo | 28 dias | Dev | TBD | <200ms | Obrigatória |
| CLS | PageSpeed/CrUX | campo + lab | 28 dias | Dev | TBD | <0.1 | Obrigatória |
| TBT | Lab | Lighthouse | 1 dia | Dev | TBD | <200ms | Desejável |
| CrUX (se disponível) | CrUX Dashboard | BigQuery/relatório | 28 dias | Dev | TBD | verde | Desejável |
| Conversão do formulário | GA4 | eventos / sessões | 30 dias | Mkt | TBD | + relativo | **Obrigatória** |
| Clique WhatsApp | GA4 | evento | 30 dias | Mkt | TBD | ↑ | **Obrigatória** |
| Clique telefone | GA4 | evento | 30 dias | Mkt | TBD | ↑ | Obrigatória |
| Abandono por etapa | GA4 funil | funil do form atual | 30 dias | Mkt | TBD | ↓ | Desejável |
| Leads por ramo | CRM/planilha | exportar | 30–90 dias | Comercial | TBD | ↑ | **Obrigatória** |
| Leads por dispositivo | GA4/CRM | segmento | 30 dias | Mkt | TBD | ↑ mobile | Desejável |
| Leads por origem | GA4/CRM | utm/origem | 30 dias | Mkt | TBD | — | Obrigatória |
| CPC médio | Google Ads | relatório | 30 dias | Mkt | TBD | ↓ | Obrigatória |
| CPA médio | Google Ads | relatório | 30 dias | Mkt | TBD | ↓ | **Obrigatória** |
| Quality Score por campanha | Google Ads | coluna QS | atual | Mkt | TBD | ↑ | Obrigatória |
| Conversão por campanha | Google Ads | relatório | 30 dias | Mkt | TBD | ↑ | Obrigatória |
| Impressões/cliques orgânicos | Search Console | desempenho | 90 dias | SEO | TBD | ↑ | Obrigatória |
| Posição média | Search Console | desempenho | 90 dias | SEO | TBD | ↑ | Desejável |
| Páginas indexadas | Search Console | cobertura | atual | SEO | TBD | controlado | Obrigatória |
| Top LPs orgânicas/pagas | GSC/Ads | relatório | 90 dias | SEO/Mkt | TBD | — | Desejável |
| Principais queries/termos | GSC/Ads | relatório | 90 dias | SEO/Mkt | TBD | — | Desejável |
| Rejeição/engajamento | GA4 | métrica | 30 dias | Mkt | TBD | ↑ engaj. | Desejável |
| Velocidade de resposta ao lead | CRM/Comercial | medir | 30 dias | Comercial | TBD | ↓ | Desejável |
| Taxa de fechamento | CRM | se disponível | 90 dias | Comercial | TBD | ↑ | Fase posterior |

> **Regra:** o sucesso do redesign só pode ser medido se ao menos as métricas **Obrigatórias** forem coletadas antes do go-live.

## 67. Pacote mínimo inicial do repositório

Antes da Issue 01, devem existir:

| Arquivo | Finalidade | Origem na spec | Quando | Quem atualiza |
|---|---|---|---|---|
| `/docs/PRODUCT_SPEC.md` | Contexto de produto | seções 1–7, 15–16, 31 | sempre em contexto | Produto |
| `/docs/MVP_SCOPE.md` | Trava de escopo Fase 1 | seção 41 | todo prompt | Tech Lead |
| `/docs/DESIGN_SYSTEM.md` | UI, tokens, motion | 8–14, 28–30, 35 | issues de UI | Design |
| `/docs/TECHNICAL_SPEC.md` | Arquitetura, API, env, segurança | 21–23, 43–45, 51 | issues técnicas | Dev |
| `/docs/SEO_ANALYTICS_SPEC.md` | SEO, schema, GTM/GA4/Ads, GEO | 17–20, 32–33 | issues SEO/analytics | SEO/Mkt |
| `/docs/CONTENT_STRATEGY.md` | Voz, microcopy, CMS | 34, 36 | textos | Marketing |
| `/docs/CURSOR_IMPLEMENTATION_PLAN.md` | Plano mestre + prompts | 24, 48–49, 54, 70 | execução | Tech Lead |
| `/docs/QA_CHECKLIST.md` | Testes, checklists, Ready/Done | 25–27, 37, 53, 58, 60 | gate de entrega | QA |
| `/docs/ROADMAP.md` | Fases, migração, riscos, baseline | 38, 42, 46–47, 52, 62, 66 | planejamento | Produto |
| `/docs/DECISIONS.md` | ADRs (decisões arquiteturais) | seção 67.1 | a cada decisão | Tech Lead |
| `/docs/CHANGELOG.md` | Histórico de mudanças | Conventional Commits | a cada release | Dev |
| `.env.example` | Variáveis com placeholders | seção 45 | scaffold | Dev |

### 67.1 DECISIONS.md (modelo ADR)
```md
# ADR-0001 — Título da decisão

## Status
Proposta | Aceita | Substituída

## Contexto
## Decisão
## Consequências
## Alternativas consideradas
## Data
## Responsável
```
**ADRs iniciais a registrar:** Next.js 15 App Router · Tailwind CSS 4 (CSS-first `@theme`) · shadcn/ui (Radix) · MDX primeiro, Payload depois · lead → contato humano (sem checkout) · Consent Mode v2 · dados institucionais em `company.ts` · ramos em `ramos.ts`.

## 68. Gate de início da implementação

Antes de abrir o Cursor para implementar páginas, todos os itens **bloqueantes** devem estar concluídos.

| Item | Classe |
|---|---|
| Dados oficiais confirmados (seção 64) | Bloqueante |
| WhatsApp oficial confirmado | **Bloqueante** |
| Telefone principal confirmado | Bloqueante |
| SUSEP e CNPJ confirmados | Bloqueante |
| Preços por ramo confirmados | Bloqueante |
| Destino inicial dos leads (CRM/webhook) definido | Bloqueante |
| Fallback de e-mail definido | Bloqueante |
| `.env.example` criado | Bloqueante |
| `MVP_SCOPE.md` validado | Bloqueante |
| Inventário de URLs iniciado | Importante |
| Lista de LPs de Google Ads exportada | Importante |
| Estrutura `/docs` criada | Importante |
| Especificação dividida em arquivos menores | Importante |
| `company.ts` pronto ou com placeholders explícitos | Importante |
| `ramos.ts` pronto ou com placeholders explícitos | Importante |
| Responsável comercial pelo teste de lead definido | Importante |
| Responsável técnico pelo deploy definido | Importante |
| Contas GA4/GTM/Ads identificadas | Importante |
| GTM atual (GTM-PD6J398) confirmado | Importante |
| Search Console acessível | Importante |
| Domínio e DNS identificados | Importante |
| Plano de rollback aceito | Importante |
| Horário de atendimento confirmado | Desejável |
| Redes sociais confirmadas | Desejável |

> **Regra:** se qualquer item **bloqueante** estiver pendente, não iniciar implementação de páginas. Trabalhar apenas em scaffold/documentação (Issues 01–05 podem rodar com placeholders).

## 69. Dependências externas e responsáveis

| Dependência | Necessária para | Tipo | Responsável | Status | Plano B |
|---|---|---|---|---|---|
| Acesso domínio/DNS | go-live, SSL, redirects | Acesso | TI/Sócio | TBD | adiar go-live |
| Acesso à Vercel | deploy, preview | Acesso | Dev | TBD | outro host Node |
| Acesso ao Webflow atual | migração, export | Acesso | Marketing | TBD | recriar conteúdo do crawl |
| Acesso ao GTM | tags, eventos | Acesso | Mkt | TBD (GTM-PD6J398) | novo container |
| Acesso ao GA4 | analytics | Acesso | Mkt | TBD | nova propriedade |
| Acesso ao Google Ads | conversões, LPs | Acesso | Mkt | TBD | — |
| Acesso ao Search Console | SEO, migração | Acesso | SEO | TBD | reverificar domínio |
| CRM ou webhook | destino de leads | Integração | Comercial/TI | TBD | e-mail + planilha |
| Provedor de e-mail fallback | resiliência de leads | Serviço | TI | TBD | SMTP próprio |
| Número oficial de WhatsApp | conversão | Dado | Comercial | TBD **CRÍTICO** | telefone |
| Google Business Profile | reputação, local SEO | Acesso | Mkt | TBD | omitir bloco |
| Banco de dados | persistência de leads | Infra | Dev | TBD | Postgres gerenciado |
| Sentry | observabilidade | Serviço | Dev | TBD | logs Vercel |
| Turnstile/reCAPTCHA | anti-spam | Serviço | Dev | TBD | honeypot + rate limit |
| Imagens reais da equipe | identidade | Conteúdo | Marketing | TBD | placeholders |
| Logos de seguradoras | prova social | Conteúdo | Marketing | parcial (no site) | re-exportar SVG |
| Textos legais | conformidade | Conteúdo | Jurídico | TBD | rascunho + revisão |
| Aprovação jurídica/LGPD | go-live | Aprovação | Jurídico | TBD | bloqueia produção |
| Equipe comercial p/ teste E2E | validação de lead | Pessoas | Comercial | TBD | — |

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

## 71. Definition of Done da especificação

A especificação atende a: preserva lead→humano · impede checkout/pagamento/contratação automática · define escopo MVP e fora de escopo · stack · design system · componentes · dados institucionais · dados dos ramos · API de leads · fallback de leads · analytics · GTM/GA4/Ads · Consent Mode v2 · LGPD · SEO técnico · GEO/IA · migração · redirects · baseline · testes · rollback · observabilidade · prompts por issue · ordem de execução · Ready/Done · responsáveis e dependências · o que confirmar antes da implementação · sem decisões contraditórias · sem dados não confirmados sem marcação · não incentiva implementar tudo de uma vez. ✓

### 71.1 Autoavaliação
| Critério | Nota | Justificativa | Pendência |
|---|---|---|---|
| Clareza de produto | 10 | Negócio, jornada e escopo explícitos | — |
| UX/UI | 9 | Wireframes + estados; falta protótipo navegável | protótipo (opcional) |
| Design system | 10 | Tokens, componentes, motion documentados | — |
| Arquitetura front-end | 10 | Next 15, diretórios, contratos TS | — |
| Conversão/CRO | 10 | Sistema de CTAs, form de fricção mínima | validar com baseline |
| SEO | 10 | Técnico + autoridade + schema | — |
| Google Ads | 9 | Estratégia + tracking; depende de acesso à conta | export de LPs/QS |
| Analytics | 10 | Eventos, funil, dataLayer | — |
| LGPD | 9 | Consent Mode v2 + retenção | aprovação jurídica |
| Prontidão para Cursor | 10 | Prompts por issue + bloco de regras | — |
| Controle de escopo | 10 | MVP travado + "fora de escopo" por issue | — |
| Migração | 9 | Plano + inventário; falta dado de tráfego real | auditoria seção 65 |
| Segurança | 10 | Rate limit, honeypot, Turnstile, HMAC, hash | — |
| Observabilidade | 10 | Sinais, ferramentas, alertas | provisionar Sentry |
| Qualidade/testes | 10 | Pirâmide + gates de CI | — |
| Governança | 10 | ADRs, dependências, responsáveis | preencher responsáveis |
| Execução por fases | 10 | Fases com critérios de saída | — |
| **Média** | **9.7** | Pendências são de **dados/acessos externos**, não de especificação | confirmar seções 64/68/69 |

> A nota só chega a 10/10 plena quando os itens bloqueantes (seções 64/68) forem confirmados — são dependências do cliente, não lacunas do documento.

## 72. Resumo executivo final

**O que será construído (Fase 1):** um novo site institucional e de conversão para a Imediato Seguros, rápido e moderno, com landing pages por ramo (Auto, Moto, Caminhão, Uber/99, Táxi, Utilitário, Frota, Pet, Fiança, Assistência 24h), formulário de cotação de baixa fricção, botões de WhatsApp e telefone rastreáveis, prova social (nota 4.8, +2.000 avaliações, SUSEP) e instrumentação completa de analytics e Google Ads. Stack: Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui.

**O que NÃO será construído agora:** blog, glossário, calculadoras, páginas programáticas (cidade/modelo), área do cliente, portal do corretor, CMS, assistente de IA e integrações diretas com seguradoras — tudo em fases posteriores. **Nunca** haverá checkout, pagamento online ou contratação automática: toda conversão gera contato humano.

**Por que vai converter melhor:** página muito mais rápida (melhor Quality Score e menor custo de Ads), formulário que pede só 2 informações para virar lead, CTAs presentes em todos os momentos, prova social no topo e mensagem do anúncio batendo com a da landing page (message match).

**Como será implementado com segurança:** uma tarefa (issue) por vez no Cursor, com escopo travado, dados sensíveis fora do código (em `company.ts`/`ramos.ts`/variáveis de ambiente), testes e checklists a cada entrega, migração com redirects para preservar o SEO atual e um plano de rollback para reverter em até 30 minutos se algo falhar.

**Quais dados precisam ser confirmados antes de começar (bloqueantes):** WhatsApp oficial, telefone principal, SUSEP, CNPJ, preços por ramo, destino dos leads (CRM/webhook) e e-mail de fallback — além de resolver as divergências de "anos de experiência" (25 vs 35) e "satisfação" (96% vs 98%). Lista completa na seção 64.

**Primeira ação prática:** preencher a tabela de dados oficiais (seção 64) e exportar as URLs/landing pages reais (seções 65/66); em paralelo, rodar os prompts de preparação (seção 70) e a Issue 01 (scaffold). Só montar páginas após o gate da seção 68.

---

*Documentação oficial completa — Partes I, II, III, IV & V (72 seções). Pronta para servir como documento oficial de produto, design, engenharia, marketing, SEO e implementação no Cursor (Claude Opus 4.1). Iniciar pela seção 72 (resumo) → seção 64 (dados) → seção 68 (gate) → seção 63/54 (execução).*
