# Contrato de join EspoCRM ↔ Agger (Fase 2)

**Status:** PROPOSTO — 2026-09-16 (homologação comercial pendente)  
**Plano pai:** [`../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md`](../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md)  
**Scripts de discovery:**  
- `scripts/dash-producao/fase2-espo-discover.mjs`  
- `agger-ops/ingest/fase2-agger-discover.mjs`  
- `agger-ops/ingest/fase2-match-baseline.mjs`

**Amostra:** Espo prod Opps `stage=Vendido` + `cDataDeEmisso ≥ 2026-07-01` (cap 4000) × `agger_policy` ativas (8061).

---

## 1. Glossário — Venda Nova × Renovação

### 1.1 Fonte canônica (apólices / `agger_policy`)

Coluna Excel / `raw`: **`NEGÓCIO CORRETORA`**.

| Valor Agger | Interpretação no dash | Uso |
|---|---|---|
| **`NOVO NEGÓCIO`** | **Venda Nova** | Entra no painel como linha só-Agger (se sem Opp); join com Opp normalmente |
| **`NEGÓCIO PRÓPRIO`** | **Renovação** (carteira própria) | **Excluir** linhas só-Agger; se houver Opp `Vendido`, a Opp **permanece** (regra do plano) |

Distribuição ativa (Supabase, 2026-09-16): NOVO NEGÓCIO **4803** · NEGÓCIO PRÓPRIO **3258**.

### 1.2 Não usar para o filtro de apólice

| Campo | Onde | Valores observados | Nota |
|---|---|---|---|
| `TIPO RENOVAÇÃO` | só Excel **propostas** / `agger_proposal.raw` | `PRÓPRIA` / `OUTRA CORRETORA` | Origem da renovação na proposta; **não** discriminar emitido do painel |
| `ENDOSSO` | apólices | maioria vazio; alguns códigos | Endosso ≠ renovação de carteira; não usar como glossário Nova/Renovação |

### 1.3 Extensão de schema (pós-aceite)

Tipar no ingest: `agger_policy.negocio_corretora` (`text`) a partir de `NEGÓCIO CORRETORA`, com aliases normalizados. Até lá, ler de `raw`.

---

## 2. Campos Espo relevantes ao join

| Campo | Tipo | Fill na amostra Vendido* | Papel no join |
|---|---|---|---|
| `cCpftext` | varchar | **3735/4000 (93%)** | **Chave doc** (digits only) |
| `cCPF` | int | 0/4000 | Ignorar |
| `cSeguradora` | enum curto | **4000/4000** | Match fuzzy vs razão social Agger |
| `cDataDeEmisso` | date | **4000/4000** (filtro) | Data primária vs `vigencia_inicio` Agger |
| `cInicioVigncia` | date | 4000/4000 | Fallback de data se primary falhar |
| `cPlaca` | text | 1747/4000 (44%) | Reforço opcional (Agger `placa` hoje **0%** tipado) |
| `cCiapol` | text | 26/4000 (~1%) | Inútil para join agora |
| `cApolice` / `cPropostaTransmitida` | **file** | — | **Não** há nº apólice/proposta tipado na Opp |
| `amount` | currency | 3999/4000 | Produzido; cruzar com `comissao_valor` só como sinal |
| `assignedUser*` | link | 4000/4000 | Vendedor Espo (autoridade) |
| `accountId` | link | **0/4000** | Não usar |

\*Amostra limitada a 4000 registros (paginação discovery).

**Conclusão Espo:** join **não** pode depender de nº de apólice/proposta na Opp. Hipótese do plano confirmada: **CPF + seguradora + proximidade de data**.

---

## 3. Campos Agger (`agger_policy`) relevantes

| Campo | Fill ativo | Papel |
|---|---|---|
| `cliente_doc` / `doc_norm` | **8061/8061** | Chave doc |
| `seguradora` | 8061/8061 | Razão social longa |
| `numero_apolice` | 8061/8061 | Chave Agger interna; sem par Espo tipado |
| `numero_proposta` | 8059/8061 | Idem |
| `vigencia_inicio` | 8061/8061 | Fallback de data / vigência |
| `data_emissao` | **8058/8061** (após re-export 2026-09-16 com coluna EMISSÃO) | **Data preferida no join** |
| `placa` | **0/8061** | Coluna ausente no Excel de apólices |
| `comissao_valor` | 8061/8061 | **Emitido** |
| `raw['NEGÓCIO CORRETORA']` | 100% | Glossário Nova/Renovação |
| `vendedor` | parcial | Só-Agger / flag divergência |

---

## 4. Chave de join definitiva (proposta)

### 4.1 Algoritmo `joinOppPolicy(opp, policies)`

1. Normalizar `doc = digits(cCpftext)`. Se vazio → **`none`** (Opp entra com emitido 0 + flag `noDoc`).  
2. Candidatos = policies ativas com mesmo `doc`.  
3. Filtrar por **seguradora**: token Espo (enum, ex. `Suhai`, `Porto`) ⊂ ou ≈ token/razão Agger (stopwords: cia, seguros, …). Sem mapear enum→razão completa ainda — fuzzy por primeiro token significativo.  
4. Filtrar por data: `|cDataDeEmisso − COALESCE(data_emissao, vigencia_inicio)| ≤ 7 dias`.  
5. Se **0** candidatos: tentar de novo com `cInicioVigncia` no lugar de `cDataDeEmisso` (mesmo doc+seg+±7d).  
6. Resultado:
   - **1** candidato → **`one`** (usar `comissao_valor`)  
   - **>1** → **`multi`** (emitido = 0 + inconsistência; não somar)  
   - **0** → **`none`** (emitido = 0 + flag `noMatch`)

**Janela recomendada:** **±7 dias** (melhor equilíbrio 1:1 vs multi na baseline).  
**Não** abrir para ±15d no MVP sem map de seguradora mais rígido (sobe multi).

### 4.2 Baseline (2026-09-16)

| Regra | 1:1 | multi | none | taxa 1:1 |
|---|---|---|---|---|
| emisso+doc+seg ±0d | 928 | 7 | 3065 | 23,2% |
| emisso+doc+seg ±3d | 1517 | 19 | 2464 | 37,9% |
| **emisso+doc+seg ±7d** (Agger `data_emissao`) | **1764** | **34** | ~2200 | **~44,1%** |
| **cascade emisso→vig ±7d** | **1777** | **34** | **2189** | **44,4%** |
| doc ±7d (sem seg) | 1825 | 67 | 2108 | 45,6% |

Entre 1:1 (cascade ±7d, pós-coluna EMISSÃO): **NOVO NEGÓCIO 1748** · **NEGÓCIO PRÓPRIO 29**.  
`amount` vs `comissao_valor` ±10%: **1399/1776 (~79%)** nos 1:1 — sinal útil, não regra de join.

**Leitura:** ~44% das Opps Vendido (amostra) fecham 1:1; multi é raro (&lt;1%). O restante fica emitido 0 + `noMatch` até melhorar mapa de seguradora / nº apólice no Espo. **Sem limiar de falha** no aceite Fase 2 (só baseline).  
*Nota:* re-export 2026-09-16 preencheu `data_emissao` (~99,96% ativas); join passa a preferir emissão Agger sobre vigência.

### 4.3 Só-Agger (sem Opp)

1. Partir de `agger_policy` ativas com `negocio_corretora = NOVO NEGÓCIO` (ou raw equivalente).  
2. Excluir `NEGÓCIO PRÓPRIO`.  
3. Excluir policies já usadas em join `one` no mês.  
4. Produzido = 0; emitido = `comissao_valor`; vendedor = `agger_policy.vendedor`.

---

## 5. Inconsistências tipadas (join / escopo)

| Código | Quando | Efeito no KPI |
|---|---|---|
| `noDoc` | Opp sem `cCpftext` | emitido 0 |
| `noMatch` | 0 policy após algoritmo | emitido 0 |
| `multiMatch` | &gt;1 policy | emitido 0 até resolver |
| `vendorMismatch` | 1:1 mas vendedor Agger ≠ assigned Espo | mantém vendedor Espo; flag |
| `amountCommissionGap` | 1:1 e \|amount−comissao_valor\|/\|amount\| &gt; 10% | ambos somam; flag analítico |
| `inactivePolicy` | match em `is_active=false` (se incluído) | inclui + flag (plano) |
| `currencyNonBRL` | `amountCurrency` ≠ BRL | flag |
| *(escopo)* | só-Agger `NEGÓCIO PRÓPRIO` | **não lista** (não é inconsistência) |

---

## 6. Mapa de seguradora (mínimo sugerido)

Espo enum → tokens Agger (primeiro passo; expandir na Fase 3):

| Espo `cSeguradora` | Tokens / contém |
|---|---|
| Suhai | `suhai` |
| Youse | `youse` |
| Tokio | `tokio` |
| Porto, Porto + Cartão | `porto` |
| Azul, Azul + Cartão, Azul Mensal | `azul` |
| Pier | `pier` |
| Allianz | `allianz` |
| … | idem primeiro token |

Implementar tabela config versionada no motor (`packages/dash-producao-core` / `scripts/dash-producao/lib`).

---

## 7. Plano de schema ingest (após aceite)

1. Coluna tipada `negocio_corretora text` + alias `NEGÓCIO CORRETORA`.  
2. Investigar tipar `data_emissao` a partir de coluna real do Gestor (hoje 0% no relatório Produção — só vigência).  
3. Opcional: `placa` se o relatório passar a exportar.

**Não** executar migração nesta Fase 2 — só contrato.

---

## 8. Aceite Fase 2

| Critério | Status |
|---|---|
| Glossário Nova/Renovação documentado | OK — `NOVO NEGÓCIO` / `NEGÓCIO PRÓPRIO` |
| Chave de join proposta + multi=exceção | OK — doc+seg±7d cascade |
| Baseline de match 1–2 meses | OK — tabela §4.2 |
| Lista de inconsistências tipadas | OK — §5 |
| Homologação comercial (assinatura) | **PENDENTE** |

---

## 9. Riscos

1. Taxa 1:1 ~44% → emitido subconta até mapa de seguradora / datas melhores.  
2. `data_emissao` Agger — **preenchida** após coluna EMISSÃO no export (2026-09-16); `vigencia_inicio` permanece fallback.  
3. Sem nº apólice no Espo → CPF compartilhado (família/frota) gera multi.  
4. Enum Espo (`Porto + Cartão`) vs razão social Agger exige manutenção do mapa.  
5. Amostra Espo cap 4000 — reestimar após motor em produção com query completa do mês.
