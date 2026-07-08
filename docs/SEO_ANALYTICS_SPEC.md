# SEO_ANALYTICS_SPEC

## Finalidade
SEO técnico, Schema.org, estratégia GTM/GA4/Google Ads, eventos de tracking e otimização para mecanismos de IA (GEO).

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 17–20, 32–33. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

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

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Nenhum conteúdo foi resumido, reinterpretado ou inventado nesta extração.
