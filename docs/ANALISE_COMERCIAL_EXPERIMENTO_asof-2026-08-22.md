# Placar comercial do experimento — as-of 2026-08-22

**Gerado em:** 2026-08-22  
**Coortes:** W1 (10–14/08) · W2 (17–21/08)  
**Venda:** Opportunity `stage = "Vendido"` · **Valor:** `amount` (Valor Comissão)  
**Operação:** read-only (Espo + Firebase + Ads)

Relacionado: [`EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md) · [`ANALISE_EXPERIMENTO_COMPARATIVO_2026-08-10-14_vs_2026-08-17-21.md`](ANALISE_EXPERIMENTO_COMPARATIVO_2026-08-10-14_vs_2026-08-17-21.md)

---

## 1. Resumo executivo (comercial)

| Semana | Idade coorte | Exp vs Ctrl comparável? | Veredito comercial Exp |
|---|---|---|---|
| **W1** | 8 dias (imatura) | **Parcial** — Ctrl sem join Espo confiável | **6 vendas**, R$ 2.631 comissão, **R$ 12,24/clique**, ROAS **3,05×** |
| **W2** | 1 dia (imatura) | **Parcial** — Ctrl 2 Opps, 0 vendas | **2 vendas**, R$ 1.850, **R$ 2,70/clique**, ROAS **0,56×** |

**Leitura:** o site novo **converte leads em vendas** na W1 (2,79 vendas/100 cliques), com ROAS comercial > 3× o investimento Ads do braço Exp. A W2 está **prematura** para fechamento (coorte encerrou há 1 dia) — quase todas as Opps ainda em funil (`Cotação Enviada`, `Cliente Contactado`). **Não promover nem pausar** com base só neste snapshot; **reexecutar as-of** em ~21–30 dias.

**Gap de dados Controle:** o legado **não replica** gclid/telefone de forma joinável Firebase→Opp Espo na maioria dos casos (proxy Octadesk). Comparativo Exp vs Ctrl comercial **só é confiável para o braço Exp** até deploy de atribuição completa na Opp ([`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](ATRIBUICAO_ADS_SITE_NOVO_ESPO.md)).

---

## 2. Metodologia desta execução

- Script: [`experiment-analyze-espo-commercial.mjs`](../scripts/espo-ops/experiment-analyze-espo-commercial.mjs)
- Join Exp: Firebase `espocrmOpportunityId` / `espocrmLeadId` / domínio novo
- Join Ctrl: Firebase legado gclid/telefone → Opp (cobertura **baixa** na W1)
- Coorte ancorada na **janela Firebase** + data de captura Opp quando disponível
- Reconciliação W1 Exp: **6/6** `Vendido` com `cDataVenda` e `amount` preenchidos

---

## 3. Semana 1 (10–14/08) — Exp vs Legado · as-of 2026-08-22

### 3.1 Captura (referência Firebase/Ads)

| Métrica | Controle | Exp |
|---|---:|---:|
| Cliques Ads | 649 | 215 |
| Gclids únicos | 46 | 37 |
| Taxa gclid/clique | 7,1% | 17,2% |

### 3.2 Placar comercial Espo

| Métrica | Controle | Exp | Nota |
|---|---:|---:|---|
| Opps na coorte (join) | **0** | **37** | Ctrl: join Espo insuficiente |
| Vendas (`Vendido`) | 0 | **6** | |
| Taxa venda/Opp | — | **16,2%** | 6/37 |
| Taxa venda/clique | — | **2,79%** | 6/215 |
| Comissão Σ (R$) | 0 | **2.631,14** | |
| Comissão média/venda | — | **R$ 438,52** | |
| R$/clique | — | **R$ 12,24** | |
| ROAS comercial | — | **3,05×** | comissão ÷ custo Ads Exp |
| Mediana dias até Vendido | — | **3 dias** | |

**Estágios Exp (37 Opps):** `Cotação Enviada` 14 · `Cliente Contactado` 7 · **`Vendido` 6** · `Perdido` 3 · `Cliente não aceitou Mensagem Octa` 6

### 3.3 Veredito W1 comercial

- **Exp:** funil comercial **ativo** — 16% das Opps já `Vendido` em 8 dias; ROAS > 3×.
- **Ctrl:** **sem placar** nesta execução (limitação de join legado).
- **Captura vs venda:** lead rate 17,2% → venda/clique 2,79% (~1 venda a cada 36 leads identificados).

---

## 4. Semana 2 (17–21/08) — Exp vs Legado · as-of 2026-08-22

### 4.1 Captura (referência)

| Métrica | Controle | Exp |
|---|---:|---:|
| Cliques Ads | 1.098 | 684 |
| Gclids únicos | 180 | 114 |
| Taxa gclid/clique | 16,4% | 16,7% |

### 4.2 Placar comercial Espo

| Métrica | Controle | Exp |
|---|---:|---:|
| Opps na coorte (join) | 2 | **116** |
| Vendas (`Vendido`) | 0 | **2** |
| Taxa venda/Opp | 0% | **1,7%** |
| Taxa venda/clique | 0% | **0,29%** |
| Comissão Σ (R$) | 0 | **1.849,72** |
| Comissão média/venda | — | **R$ 924,86** |
| R$/clique | R$ 0 | **R$ 2,70** |
| ROAS comercial | 0× | **0,56×** |

**Estágios Exp (116 Opps):** funil dominante — poucas vendas fechadas após **1 dia** de maturação.

### 4.3 Veredito W2 comercial

- **Imaturidade:** coorte W2 com **1 dia** de idade — resultado comercial **não comparável** à W1 (8 dias).
- **Exp:** 2 vendas precoces (R$ 1.850); ROAS < 1× **esperado** neste estágio.
- **Ctrl:** amostra 2 Opps — irrelevante.

---

## 5. Comparativo inter-semana (Exp)

| Métrica Exp | W1 | W2 | Δ W2/W1 |
|---|---:|---:|---:|
| Cliques | 215 | 684 | +218% |
| Opps join | 37 | 116 | +213% |
| Vendas `Vendido` | 6 | 2 | −67% |
| Taxa venda/clique | **2,79%** | 0,29% | −90%* |
| R$/clique | **R$ 12,24** | R$ 2,70 | −78%* |
| ROAS comercial | **3,05×** | 0,56× | −82%* |

\*Queda **artefactual** da imaturidade W2, não regressão comprovada.

---

## 6. Triangulação captura × comercial (Exp)

| W1 Exp | Leads/gclid | Vendas | R$/clique |
|---|---:|---:|---:|
| Firebase/Ads | 17,2%/clique | 2,79%/clique | R$ 12,24 |
| Leitura | Alta captura | ~16% Opp→Vendido em 8d | ROAS > 3× |

| W2 Exp | Leads/gclid | Vendas | R$/clique |
|---|---:|---:|---:|
| Firebase/Ads | 16,7%/clique (empate c/ Ctrl) | 0,29%/clique | R$ 2,70 |
| Leitura | Captura ok | Funil **não maduro** | Aguardar re-run |

---

## 7. Limitações desta execução

1. **Controle legado:** join Firebase→Espo **incompleto** — comparativo bilateral pendente.
2. **Maturação:** W1 8d · W2 1d — decisão exige reexecução as-of ≥21d.
3. **`cUtmCampaign` na Opp** ainda não deployado — atribuição Exp é forte; Ctrl é fraca.
4. Coorte W2 com **116 Opps** vs **114 gclids** — boa cobertura Exp.

---

## 8. Recomendação

1. **Manter experimento** — W1 Exp mostra ROAS comercial **> 3×**; W2 ainda imatura.
2. **Reexecutar** `experiment-analyze-espo-commercial.mjs` **as-of ~12/09** (W1+W2) e a cada nova semana W3…
3. **Priorizar** atribuição Ads na Opp do legado **e** do novo para placar Ctrl confiável.
4. **Não promover** site novo só com leads W2 (empate) **nem pausar** só com ROAS W2 prematuro.

---

## 9. Artefatos

| Arquivo | Conteúdo |
|---|---|
| [`experiment-commercial-w1-asof-2026-08-22.json`](../scripts/espo-ops/experiment-commercial-w1-asof-2026-08-22.json) | Coorte W1 |
| [`experiment-commercial-w2-asof-2026-08-22.json`](../scripts/espo-ops/experiment-commercial-w2-asof-2026-08-22.json) | Coorte W2 |
| [`experiment-commercial-comparison-asof-2026-08-22.json`](../scripts/espo-ops/experiment-commercial-comparison-asof-2026-08-22.json) | Agregado |

```bash
# Reproduzir (PowerShell)
cd scripts/espo-ops
$env:ESPOCRM_API_CONFIG = gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo
node experiment-analyze-espo-commercial.mjs --cohort-start 2026-08-10 --cohort-end 2026-08-14 --as-of 2026-08-22 --ads-json ../google-ops/ads-analysis-w1-rerun.json --out experiment-commercial-w1-asof-2026-08-22.json
node experiment-analyze-espo-commercial.mjs --cohort-start 2026-08-17 --cohort-end 2026-08-21 --as-of 2026-08-22 --ads-json ../google-ops/ads-analysis-w2.json --out experiment-commercial-w2-asof-2026-08-22.json
node experiment-compare-commercial-weeks.mjs --as-of 2026-08-22 --w1 experiment-commercial-w1-asof-2026-08-22.json --w2 experiment-commercial-w2-asof-2026-08-22.json
```
