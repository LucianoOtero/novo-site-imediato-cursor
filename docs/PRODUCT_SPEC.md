# PRODUCT_SPEC

## Finalidade
Contexto de produto/negócio, jornada do usuário, estratégia de conversão e landing pages (LPs).

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 1–7, 15–16, 31. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

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

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Para o texto completo do projeto (todas as 72 seções), consulte a especificação original. Nenhum conteúdo foi resumido, reinterpretado ou inventado nesta extração.
