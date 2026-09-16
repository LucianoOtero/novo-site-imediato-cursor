# Fase 3 — Motor de domínio (`scripts/dash-producao/lib`)

**Status:** CONCLUÍDA (2026-09-16) — suíte unitária verde  
**Plano pai:** [`../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md`](../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md)  
**Contrato join:** [`CONTRATO_JOIN_ESPO_AGGER.md`](./CONTRATO_JOIN_ESPO_AGGER.md)

---

## Módulo

Caminho: `scripts/dash-producao/lib/` (ESM puro, sem rede).

| Arquivo | Funções |
|---|---|
| `normalize.mjs` | `normDoc`, `normSeg`, `segToken`, `segMatch`, `toDateOnly`, `daysBetween`, `classifyNegocioCorretora` |
| `calendar.mjs` | `isBusinessDay`, `businessDays`, `project`, feriados SP 2025–2027 |
| `join.mjs` | `eligibleOpp`, `joinOppPolicy`, `orphanPolicies`, `policyNegocio` |
| `flags.mjs` | `inconsistencyFlags`, códigos `FLAG.*` |
| `consolidate.mjs` | `buildMonthRows`, `consolidateByVendor`, `houseTotals`, `avgLast3Months` |
| `index.mjs` | re-export |

**Testes:** `npm run test:dash-producao` → `node --test scripts/dash-producao/test/domain.test.mjs`

---

## Regras implementadas

1. **Elegibilidade:** `stage === Vendido` ∧ `cDataDeEmisso` ∈ mês.  
2. **Join:** doc + seg fuzzy + `|emisso Espo − COALESCE(data_emissao, vigencia_inicio) Agger| ≤ 7d`; fallback `cInicioVigncia`; multi → emitido 0.  
3. **Só-Agger:** só `NOVO NEGÓCIO` / `venda_nova`; `NEGÓCIO PRÓPRIO` excluído.  
4. **Projeção:** `metric × (úteis_mês / úteis_decorridos)`; úteis SP-capital.  
5. **Header:** soma projeções por vendedor **e** projeção sobre total da casa.

---

## Matriz de inconsistências (código → UI)

| Código | Origem |
|---|---|
| `amount0` | produzido Espo = 0 / vazio |
| `noDoc` | sem CPF no Opp |
| `noMatch` | join none |
| `multiMatch` | join multi |
| `inactivePolicy` | policy `is_active=false` |
| `vendorMismatch` | vendedor Agger ≠ assigned Espo |
| `unassigned` | sem vendedor |
| `currencyNonBRL` | moeda ≠ BRL |
| `amountCommissionGap` | \|amount − comissão\| / \|amount\| > 10% |

---

## Aceite Fase 3

| Critério | Status |
|---|---|
| Lib pura sem UI/rede | OK |
| Suíte unitária verde | OK |
| Matriz de flags documentada | OK |

**Próximo:** Fase 4 — API Next + auth Espo (app novo do dash).
