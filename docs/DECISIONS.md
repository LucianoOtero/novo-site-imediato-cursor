# DECISIONS

## Finalidade
Registro de ADRs (Architecture Decision Records) do projeto.

## Origem
ADRs 1–8 derivados da lista de decisões da seção 67.1 de `ESPECIFICACAO v3.md` ("ADRs iniciais a registrar"), com contexto/consequências reconstruídos a partir do conteúdo já explícito na especificação. ADR-0009 copiado do texto de referência em `PLANO_IMPLEMENTACAO.md` rev. 4.1 (Issue P-03).

## Status
CONTEÚDO CRIADO (9 ADRs registrados na Issue P-03)

## Observações
Onde a especificação não detalha explicitamente um item do modelo ADR (ex.: "Data", "Responsável", ou alternativas consideradas para decisões técnicas de framework/ferramenta), o campo é marcado como `TODO` — nenhum dado foi inventado.

---

# ADR-0001 — Adoção de Next.js 15 (App Router)

## Status
Aceita

## Contexto
O site atual roda em Webflow (landing page única, longa), com performance fraca no mobile (LCP/TBT altos, sem code-splitting) e sem controle fino de Core Web Vitals (`ESPECIFICACAO v3.md`, seções 1–2). A especificação define a stack alvo como Next.js 15 com App Router, TypeScript, Tailwind CSS 4, shadcn/ui e Framer Motion (cabeçalho e seções 21–22).

## Decisão
Adotar Next.js 15 com App Router como framework do redesign, com Server Components por padrão e `'use client'` apenas onde há interatividade (seção 21).

## Consequências
HTML pronto para crawler via SSG/ISR, melhores Core Web Vitals, code-splitting nativo, estrutura de diretórios por App Router (seção 22).

## Alternativas consideradas
Não detalhadas explicitamente na especificação; a alternativa implícita rejeitada é permanecer no Webflow atual (seção 1–2, "Problemas encontrados").

## Data
TODO

## Responsável
TODO

---

# ADR-0002 — Tailwind CSS 4 (CSS-first, `@theme`)

## Status
Aceita

## Contexto
Necessidade de um Design System tokens-first, sem valores mágicos de cor/espaçamento/sombra, para consistência visual e prevenção de inconsistências geradas por IA no Cursor (seções 8, 28, 48).

## Decisão
Adotar Tailwind CSS 4 com configuração CSS-first via `@theme` em `globals.css` para declarar tokens (cores, raios, sombras, fontes, gradientes, motion) (seções 8, 28.5).

## Consequências
Tokens utilizáveis diretamente em classes; proibição de valor mágico; revisão de diff facilitada (sem CSS solto, seção 23).

## Alternativas consideradas
Não detalhadas explicitamente na especificação.

## Data
TODO

## Responsável
TODO

---

# ADR-0003 — shadcn/ui (Radix) como base de componentes

## Status
Aceita

## Contexto
Necessidade de primitives acessíveis (ARIA, teclado, foco) para toda a matriz de componentes (seção 29), sem reimplementar comportamento de acessibilidade do zero.

## Decisão
Adotar shadcn/ui (baseado em Radix), estendido com `cva` para variantes, como base de todos os componentes de UI (seções 21, 29.3).

## Consequências
Componentes com estados/ARIA corretos por padrão; consistência entre Button/Accordion/Dialog etc.; dependência de manutenção do ecossistema shadcn/Radix.

## Alternativas consideradas
Não detalhadas explicitamente na especificação.

## Data
TODO

## Responsável
TODO

---

# ADR-0004 — MDX primeiro, Payload CMS depois (estratégia de conteúdo)

## Status
Aceita

## Contexto
Necessidade de gerenciar conteúdo estável (institucional, glossário, guias, FAQ) com máxima performance e custo zero na Fase 1–2, versus necessidade futura de alta rotação editorial (blog, Fase 3) (seção 36).

## Decisão
Usar MDX no repositório para conteúdo estável (Fase 1–2) e migrar para Payload CMS (self-hosted, TypeScript nativo) para blog/alta rotação quando o time editorial crescer (Fase 3) — estratégia híbrida (seção 36).

## Consequências
Zero dependência externa e máxima performance (SSG) na Fase 1; necessidade de adoção de infraestrutura própria (Payload) na Fase 3.

## Alternativas consideradas
Sanity (editor estruturado, real-time, mas fora do Git e com custo ao escalar); Contentful (maduro/enterprise, mas caro e com lock-in) — ambas descartadas por não serem ideais para a Fase 1–2 (seção 36, tabela de opções).

## Data
TODO

## Responsável
TODO

---

# ADR-0005 — Modelo lead → contato humano (sem checkout)

## Status
Aceita

## Contexto
O modelo de negócio atual é de corretora intermediando seguradoras registradas na SUSEP; não há checkout, pagamento online ou contratação automática hoje, e a especificação exige preservar integralmente esse modelo (cabeçalho e seções 41, 48.2).

## Decisão
Toda conversão do site (formulário, WhatsApp, telefone) gera um lead encaminhado a um vendedor humano; o site nunca processa pagamento, checkout ou contratação automática, em nenhuma fase (seções 41, 48.2, 72).

## Consequências
Arquitetura simplificada (sem gateway de pagamento); todo o valor de conversão está na qualidade e velocidade da captura/encaminhamento do lead (`/api/lead`, seções 43–44).

## Alternativas consideradas
Checkout/pagamento online e contratação automática foram explicitamente excluídos como guard-rail de negócio, inclusive nas fases futuras (seção 38 — "a IA da Fase 7 qualifica e encaminha; nunca cria checkout").

## Data
TODO

## Responsável
TODO

---

# ADR-0006 — Consent Mode v2 (Google) para LGPD

## Status
Aceita

## Contexto
Necessidade de conformidade com a LGPD e com os requisitos do Google para consentimento de anúncios/analytics, mantendo o formulário funcional independentemente do consentimento de marketing (seções 19, 57).

## Decisão
Implementar Google Consent Mode v2 com banner (Aceitar todos / Rejeitar / Preferências), defaults `denied` antes de qualquer tag, e `analytics_storage`/`ad_storage`/`ad_user_data`/`ad_personalization` conforme escolha do usuário (seções 57.1, 57.5).

## Consequências
Tags de Ads/Analytics só disparam após consentimento; Enhanced Conversions só com `ad_user_data:granted`; o formulário sempre funciona (finalidade = contato solicitado) mesmo sem consentimento de marketing (seção 57.3).

## Alternativas consideradas
Não detalhadas explicitamente na especificação.

## Data
TODO

## Responsável
TODO

---

# ADR-0007 — Dados institucionais centralizados em `lib/company.ts`

## Status
Aceita

## Contexto
Risco de hardcode disperso de dados regulatórios/comerciais (telefone, CNPJ, SUSEP, WhatsApp, preços) em múltiplos componentes, dificultando atualização e auditoria (seções 55, 48.1).

## Decisão
Criar `lib/company.ts` como fonte única e tipada (`CompanyConfig`) de todos os dados institucionais/regulatórios/comerciais recorrentes; nenhum componente pode hardcodar esses dados em JSX (seções 55.1–55.2).

## Consequências
Lint/PR review pode rejeitar strings de telefone/CNPJ/SUSEP/preço em componentes; atualização centralizada; necessidade de marcar itens `A_CONFIRMAR` explicitamente até confirmação (seção 55.2).

## Alternativas consideradas
Não detalhadas explicitamente na especificação.

## Data
TODO

## Responsável
TODO

---

# ADR-0008 — Dados de produto centralizados em `lib/ramos.ts`

## Status
Aceita

## Contexto
As 10 landing pages por ramo precisam renderizar de forma consistente (headline, coberturas, objeções, FAQ, preço, mensagens de WhatsApp) sem duplicação manual de copy (seções 31, 56).

## Decisão
Criar `lib/ramos.ts` como fonte única tipada (`InsuranceBranch[]`) de todos os dados de produto por ramo, com helper `getRamo(slug)`; o template `/seguro-[ramo]` renderiza exclusivamente a partir dela (seções 56.1–56.2).

## Consequências
LPs sem copy duplicada manual; JSON-LD, dataLayer, sitemap e SEO alimentados pela mesma fonte; preços e mensagens nunca hardcoded em JSX (seção 56.2).

## Alternativas consideradas
Não detalhadas explicitamente na especificação.

## Data
TODO

## Responsável
TODO

---

# ADR-0009 — Uso de Cloudinary para imagens não vetoriais

## Status
Proposta

## Contexto
O projeto possui imagens já geradas e hospedadas no Cloudinary. Elas podem ser úteis para páginas comerciais, institucionais, hero images, fotos de apoio e materiais visuais não vetoriais. Porém URLs externas espalhadas pelo JSX prejudicam manutenção, performance, SEO e governança visual.

## Decisão
O Cloudinary poderá ser usado para imagens não vetoriais, desde que:
- cada asset esteja registrado em `CLOUDINARY_ASSETS.md`, quando aplicável;
- cada asset esteja centralizado em `lib/assets.ts`;
- cada imagem tenha `src`, `alt`, `width`, `height`, `usage`, `priority` quando aplicável e fallback;
- o domínio Cloudinary esteja configurado em `next.config.mjs` quando usado com `next/image`;
- nenhuma URL Cloudinary apareça diretamente em JSX;
- imagens críticas de hero respeitem orçamento de performance e LCP;
- imagens geradas por IA passem por revisão de confiança, autenticidade e alinhamento com a marca;
- fotos reais da equipe e do escritório tenham prioridade sobre imagens genéricas ou geradas por IA.

## Consequências
- facilita troca e otimização de imagens sem espalhar URLs;
- melhora governança visual;
- reduz risco de quebra por URL externa;
- exige inventário e disciplina de uso;
- cria dependência externa quando Cloudinary for usado;
- exige fallback para assets críticos.

## Alternativas consideradas
- hospedar todas as imagens localmente em `/public`;
- usar apenas imagens locais otimizadas;
- usar Cloudinary sem centralização;
- migrar imagens para outro CDN;
- usar imagens Cloudinary apenas temporariamente em staging.

## Data
TODO

## Responsável
TODO

---

> Este documento contém os 9 ADRs iniciais exigidos pelo plano (seção 67.1 da especificação + ADR-0009 da rev. 4.1 do `PLANO_IMPLEMENTACAO.md`). Nenhum dado foi inventado; campos não detalhados explicitamente na fonte permanecem `TODO`. Novas decisões devem ser adicionadas como ADR-0010 em diante, seguindo o mesmo modelo.
