# ROADMAP

## Finalidade
Fases de implementação, critérios de saída, plano de migração, matriz de riscos e baseline.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 38, 42, 46–47, 52, 62, 66. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

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

> **Nota (rev. 4.1 do `PLANO_IMPLEMENTACAO.md`):** este roadmap evolutivo de **produto** (Fases 1–8 acima) não deve ser confundido com o roadmap **operacional de execução** da Fase 1 (Fase 0 a 8 operacionais do `PLANO_IMPLEMENTACAO.md`). Apenas a Fase 1 deste roadmap está em execução; Fases 2–8 permanecem fora de escopo até autorização futura.

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

> **Nota (rev. 4.1 do `PLANO_IMPLEMENTACAO.md`):** esta matriz é ampliada no plano operacional com riscos adicionais (staging indexado, hardcode de dados, perda de integração/automação do JS legado, perda de logos/assets, dependência de Cloudinary, env faltando/segredo exposto). Consulte o `PLANO_IMPLEMENTACAO.md` para a matriz de riscos completa e vigente.

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

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Nenhum conteúdo foi resumido, reinterpretado ou inventado nesta extração.
