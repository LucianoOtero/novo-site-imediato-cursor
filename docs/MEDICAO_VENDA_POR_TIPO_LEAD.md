# Medição de venda real por tipo de lead

**Status:** Fases 0–3 concluídas (histórico); Fase 4 código+CF ok; Enum `cCanalCaptura` e pacote Ads completo na Opp ainda pendentes de execução (docs 2026-08-21)  
**Gerado em:** 2026-08-17 · **Docs atribuição/testes:** 2026-08-21  
**Operação:** EspoCRM + Firebase somente leitura nas Fases 0–3; instrumentação aditiva só no site novo na Fase 4. Legado Webflow intocado.  
**Contrato Ads → Espo → venda:** [`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](ATRIBUICAO_ADS_SITE_NOVO_ESPO.md) · **Runbook staging:** [`AMBIENTE_TESTES_SITE_NOVO.md`](AMBIENTE_TESTES_SITE_NOVO.md)

---

## 1. Regras de negócio (Fase 0 — travadas)

| Regra | Definição |
|---|---|
| **Venda operacional (experimento)** | Opportunity com **`stage = "Vendido"`** — alinhado ao processo comercial Imediato. |
| **Venda contábil / apólice** | Opportunity com **`cDataVenda`** preenchida (apólice emitida). |
| **Reconciliação** | Placar do experimento usa **`Vendido`**; auditar divergências com `cDataVenda` em cada extração (ver [`EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md)). |
| **Valor monetário** | **`amount`** (“Valor Comissão” na UI Espo); apoio: `cPremioLiquido`. |
| **Unidade de coorte** | **Opportunity** (não Lead). |
| **Ancoragem temporal** | Coorte = data de captura (`cDataDoLead` / janela Firebase), **não** data em que virou `Vendido`. |
| **Maturação** | Reexecutar análise **as-of a data do relatório**; vendas entram na coorte da semana de origem mesmo semanas depois. Janelas fixas 30/60/90 dias permanecem úteis para histórico legado. |
| **Tipo de captura** | Primeiro contato da jornada que criou a Opp (não o último `cEtapaFunil`). |
| **Legado** | Somente leitura (Espo + Firebase `leads-imediato-seguros`). Sem instrumentação Webflow/proxy. |
| **Exclusões** | Testes: e-mail `@imediatoseguros.com.br` derivado, nomes com `NOVO CLIENTE`, smokes documentados, `environment≠production` no site novo. |

### Premissa de produto

A conversão Ads no passo 1 do formulário (`form_initial_contact` / telefone informado) é **estratégia válida**: lead só com telefone já se mostrou operável no modal. O placar comercial trata essa coorte como legítima.

### Discriminadores

- Site novo Espo: `cWebpage` ∈ `novo.segurosimediato.com.br`, `comparaseguroonline.com.br`
- Legado Espo: tipicamente `mdmidia.com.br` (proxy); `cWebpage` vazio = legado operacional antigo (`legado_webpage_vazio`)
- Firebase novo: `captureChannel` + `stage` (+ `modalChannel` a partir da Fase 4)
- Firebase legado: `source` = `webflow_modal_*`

---

## 2. Descoberta Espo (Fase 1)

Snapshot: [`scripts/espo-ops/espo-discovery-snapshot.json`](../scripts/espo-ops/espo-discovery-snapshot.json).

- Opportunities recentes (orderBy `createdAt` desc) + filtro dedicado do site novo.
- Gate confirmado: **não** dá para separar formulário vs modal nem WA vs telefone só no Espo.
- Site novo ainda é volume baixo (~45 Opps com `cWebpage` de experimento).
- Estágio comercial `Vendido` (~733 nas recentes) — **placar do experimento**; cruzar com `cDataVenda` (nem sempre coincidentes). Ver [`EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md).

---

## 3. Classificação e métricas (Fases 2–3)

Gerado em: 2026-08-17T03:42:39.428Z  
Artefato: [`scripts/espo-ops/sales-by-lead-type.json`](../scripts/espo-ops/sales-by-lead-type.json)

### Join

| Métrica | Valor |
|---|---:|
| Opportunities analisadas (após excluir testes) | 4961 |
| Match Firebase | 1685 |
| Sem match (fallback Espo) | 3276 |
| Testes excluídos | 1039 |
| Match por `espocrmLeadId` (site novo) | 45 |
| Match por `gclid` | 1640 |

### Placar por coorte (venda = `cDataVenda` — histórico analítico legado)

> **Experimento Ads site novo vs legado:** usar `stage = "Vendido"` + `amount`, coorte por semana, reexecução as-of — [`EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md).

| Coorte | Opps | Vendidas | Taxa | Comissão Σ | Dias medianos até venda |
|---|---:|---:|---:|---:|---:|
| `legado_espo_only` | 2518 | 236 | 9.4% | 136072.94 | 4 |
| `legado_modal_complete` | 1353 | 164 | 12.1% | 96178.42 | 3 |
| `legado_webpage_vazio` | 739 | 466 | 63.1% | 291755.23 | 2 |
| `legado_modal_initial` | 287 | 53 | 18.5% | 36862.62 | 3 |
| `novo_form_calculo` | 20 | 1 | 5.0% | 507.12 | 3 |
| `novo_form_pessoais` | 13 | 0 | 0.0% | 0.00 | — |
| `novo_form_veiculo` | 6 | 1 | 16.7% | 400.47 | 2 |
| `novo_modal_complete` | 5 | 1 | 20.0% | 215.50 | 3 |
| `novo_form_telefone` | 1 | 1 | 100.0% | 535.97 | 2 |

### Comparável legado × novo (modal)

| Coorte | Opps | Taxa venda | Comissão média (vendidas) |
|---|---:|---:|---:|
| `legado_modal_initial` | 287 | **18.5%** | R$ 695,52 |
| `legado_modal_complete` | 1353 | 12.1% | R$ 586,45 |
| `novo_modal_complete` | 5 | 20.0% | R$ 215,50 |
| `novo_modal_initial` | 0 | — | — |

> No site novo, quase todos os modais já chegaram a `complete` no Firebase (poucos param só no initial). Amostra do Exp ainda é pequena para maturação 30/60/90.

### Hipótese: telefone-only vs enriquecido (site novo)

| Grupo | Opps | Vendidas | Taxa |
|---|---:|---:|---:|
| Só telefone (form initial + modal initial) | 1 | 1 | 100%* |
| Enriquecido (form avançado + modal complete) | 44 | 3 | 6.8% |

\*Amostra anedótica (n=1). **Não** concluir superioridade do telefone-only — o site novo ainda não tem Opps elegíveis a 30 dias na maioria das coortes.

### Maturação 30/60/90 (legado modal — referência)

| Coorte | 30d taxa | 60d taxa | 90d taxa |
|---|---:|---:|---:|
| `legado_modal_initial` | 19.7% (38/193) | 23.7% (22/93) | 39.1% (9/23) |
| `legado_modal_complete` | 12.5% (128/1020) | 11.9% (71/599) | 10.7% (16/149) |

Sinal útil no legado: **modal initial** (só telefone) tem taxa de venda **maior** que modal complete na janela madura — alinhado à hipótese de produto de que telefone cedo é lead comercialmente interessante.

### Leitura / vieses

1. **`legado_webpage_vazio` (63% venda)** — forte viés de seleção (registros antigos sem `cWebpage`, muitos já fechados). Não usar como baseline do legado.
2. **Site novo** — volume baixo e recente; maturação 30/60/90 ainda vazia na maioria das coortes. Reavaliar em 30–60 dias.
3. **Formulário multi-etapa** — só existe com paridade no site novo; comparar com legado só via **modal**.
4. WA vs telefone no histórico novo — indisponível até o campo `cCanalCaptura` estar ativo.

---

## 4. Fase 4 — instrumentação (site novo)

### Código (feito)

- Payload/API/Firebase: `modalChannel: "whatsapp" | "phone"` em [`lib/leads/types.ts`](../lib/leads/types.ts), [`ContactLeadModal.tsx`](../components/cta/ContactLeadModal.tsx), [`firebase-backup.ts`](../lib/leads/firebase-backup.ts), [`app/api/lead/route.ts`](../app/api/lead/route.ts).
- CF: `canalCapturaFields()` em [`firebase/functions/espocrm.js`](../firebase/functions/espocrm.js); PUT **separado** best-effort em [`firebase/functions/index.js`](../firebase/functions/index.js).

### Pendente operacional (manual)

1. Entity Manager Espo — **primeiro DEV**, depois prod (Lead **e** Opportunity): Enum `cCanalCaptura` + pacote Ads/UTM na Opp (hoje a CF grava sobretudo `cGclid` na Opp). Ver [`CANAL_CAPTURA_ESPO.md`](CANAL_CAPTURA_ESPO.md) e [`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](ATRIBUICAO_ADS_SITE_NOVO_ESPO.md).
2. Deploy Cloud Function `deliverLead` no projeto `imediato-seguros-site-novo` — **feito 2026-08-17** (canal); extensão do pacote Ads na Opp ainda a implementar.
3. Persistência 1st-party de click IDs/UTMs + schema ValueTrack no site novo (a implementar).
4. Deploy Vercel do site (`modalChannel` + atribuição) após staging verde — [`AMBIENTE_TESTES_SITE_NOVO.md`](AMBIENTE_TESTES_SITE_NOVO.md).
5. Google Ads campanha Exp `24095000558`: Final URL suffix documentado em atribuição (Controle intocado).
6. Smoke A/B/C canal + smoke D atribuição/persistência → Espo DEV.

A API Metadata do Espo rejeitou criação automática do campo com a chave atual (HTTP 405) — criação só via UI admin.

---

## 5. Artefatos

- [`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](ATRIBUICAO_ADS_SITE_NOVO_ESPO.md)
- [`AMBIENTE_TESTES_SITE_NOVO.md`](AMBIENTE_TESTES_SITE_NOVO.md)
- [`CANAL_CAPTURA_ESPO.md`](CANAL_CAPTURA_ESPO.md)
- [`scripts/espo-ops/README.md`](../scripts/espo-ops/README.md)
- [`scripts/espo-ops/espo-discover-sales.mjs`](../scripts/espo-ops/espo-discover-sales.mjs)
- [`scripts/espo-ops/espo-analyze-sales-by-lead-type.mjs`](../scripts/espo-ops/espo-analyze-sales-by-lead-type.mjs)
- [`scripts/espo-ops/espo-discovery-snapshot.json`](../scripts/espo-ops/espo-discovery-snapshot.json)
- [`scripts/espo-ops/sales-by-lead-type.json`](../scripts/espo-ops/sales-by-lead-type.json)
