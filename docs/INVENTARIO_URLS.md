# INVENTARIO_URLS

## Finalidade
Inventário de URLs do site atual e mapa de redirects da migração.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 59 e 65. Extraído na Issue P-06, sem resumo, reinterpretação ou decisão de ação sem dados reais de tráfego. A seção 47 (sequência de migração Webflow → Next.js) também alimenta este documento e está copiada integralmente em `ROADMAP.md` — não duplicada aqui para evitar divergência de fonte.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`) — tabela 65.1 ainda **PENDING** de auditoria real (colunas com tráfego/backlink/indexação marcadas `TBD` na fonte).

## Observações
Nenhuma ação de migração (manter/redirecionar/consolidar/remover) foi decidida ou alterada nesta extração além do que já está explícito na especificação. A auditoria real (rodar Screaming Frog, exportar Search Console, exportar LPs de Ads) ainda precisa ser executada — ver checklist da seção 65.2 abaixo.

---

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

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. As colunas de tráfego/backlink/indexação da tabela 65.1 permanecem `TBD` intencionalmente — nenhuma ação de migração deve ser decidida sem os dados reais de auditoria (Screaming Frog, Search Console, Google Ads). Nenhum conteúdo foi resumido, reinterpretado ou inventado nesta extração.
