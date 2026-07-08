# BASELINE_METRICS

## Finalidade
Coleta de métricas de baseline do site atual (Core Web Vitals, conversão, CPA, tráfego orgânico) para comparação pós-migração.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seção 66 ("Plano de coleta de baseline"). Extraído na Issue P-07, sem resumo, reinterpretação ou preenchimento de valores não medidos. A seção 46 ("Baseline & metas mensuráveis") também alimenta este tema e está copiada integralmente em `ROADMAP.md` — não duplicada aqui para evitar divergência de fonte.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`) — todas as métricas permanecem **PENDING** (`TBD`) até a coleta real ser executada.

## Observações
Nenhum valor foi medido, estimado ou inventado nesta extração. Todos os campos "Atual" permanecem `TBD` exatamente como na especificação, até que a coleta real seja realizada pelos responsáveis indicados (Dev/Mkt/Comercial/SEO).

---

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

### Resumo das métricas Obrigatórias (destaque)

As seguintes métricas, marcadas **Obrigatória** na tabela acima, são o mínimo necessário antes do go-live:
- Lighthouse mobile
- LCP, INP, CLS
- Conversão do formulário
- Clique WhatsApp
- Leads por ramo
- CPA médio

> As demais métricas marcadas apenas "Obrigatória" (sem negrito na fonte) — Lighthouse desktop, clique telefone, leads por origem, CPC médio, Quality Score, conversão por campanha, impressões/cliques orgânicos, páginas indexadas — também são obrigatórias, porém não estavam destacadas em negrito na tabela original; a classe "Desejável" e "Fase posterior" segue como na fonte.

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Nenhum valor foi medido ou inventado nesta extração; todos os campos "Atual" permanecem `TBD` até a coleta real.
