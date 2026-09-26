# Gate D — avaliação CWV pós–Fase 1 (as-of 2026-09-26)

**Plano:** [UX_TELEMETRIA_PLAN.md](UX_TELEMETRIA_PLAN.md) · [PROXIMOS_PASSOS_UX_TELEMETRIA.md](PROXIMOS_PASSOS_UX_TELEMETRIA.md)  
**Baseline F0 (SI):** [PERF_BASELINE.md](PERF_BASELINE.md) — snapshot 2026-09-11  
**Artefato diário:** [`_psi_fase0/gate-d-si-daily-cotacao-mobile-lcp.json`](_psi_fase0/gate-d-si-daily-cotacao-mobile-lcp.json)

---

## Veredicto final

| Item | Status |
|------|--------|
| Gate D vs F0 (janela 7d 19–26/set, path `/cotacao` mobile) | **FAIL numérico** (LCP +230 ms) |
| Atribuição (passo **C**) | **Redesign 17/set**, não instrumentação F1 |
| Gate D **F1 isolada** (11–16/set) | **PASS** (LCP diário ~2,07–2,12 s vs F0 1,98 s → Δ +90–140 ms ≤200 ms) |
| Decisão | **A — waiver + re-baseline F0′** (snapshot SI 7d 19–26/set) |
| Bissect F1 (opção B) | **Não** |
| Liberar Fase 2 (Clarity) | **Sim, após Gate A privacidade** (Gate D F1 liberado por waiver documentado) |

**Árbitro:** Luciano (CWV) — waiver aplicado na avaliação 2026-09-26 após evidência timeseries.

---

## Passo C — LCP p75 diário `/cotacao` mobile (SI API timeseries)

Fonte: `GET /api/speed-insights/v2/timeseries` · device=mobile · route=`/cotacao` · Aug 27–Sep 26.

| Data | LCP p75 | Eventos LCP | Marco |
|------|---------|-------------|--------|
| 2026-09-10 | 1,78 s | 72 | pré-F1 |
| **2026-09-11** | **2,08 s** | 90 | **deploy F1** |
| 2026-09-14 | 2,11 s | 142 | pós-F1 |
| 2026-09-15 | 2,12 s | 109 | pós-F1 |
| 2026-09-16 | 2,07 s | 101 | pós-F1 |
| **2026-09-17** | **2,36 s** | 87 | **redesign `/cotacao` v0.2.49** |
| 2026-09-18 | 2,23 s | 56 | pós-redesign |
| 2026-09-21 | 1,88 s | 38 | |
| 2026-09-22 | 1,89 s | 41 | |
| 2026-09-23 | 2,52 s | 52 | spike dia |
| 2026-09-24 | 2,36 s | 113 | |
| 2026-09-25 | 2,22 s | 123 | |

**Leitura:** entre F1 e o redesign (11–16/set) o LCP ficou ~2,07–2,12 s — dentro do limiar vs F0 **1,98 s**. O degrau claro é **17/set** (2,36 s). A janela Gate D “Last 7 Days” (19–26/set) mistura só pós-redesign → FAIL vs F0 antigo, mas **não condena a F1**.

---

## Passo A — Waiver + F0′

**Waiver:** o FAIL da comparação F0 (11/set) × SI 7d (19–26/set) **não bloqueia** a Fase 2 por causa da F1; a regressão atribuível é o redesign de `/cotacao`.

**F0′ (nova baseline pós-redesign)** — Production · Last 7 Days · P75 · **2026-09-19 → 2026-09-26**:

### Agregado

| Device | RES | LCP | INP | CLS | FCP | TTFB |
|--------|-----|-----|-----|-----|-----|------|
| Desktop | 100 | **1,21 s** | **88 ms** | **0,02** | 1,21 s | 0,49 s |
| Mobile | 93 | **2,15 s** | **272 ms** | **0** | 2,03 s | 0,77 s |

### Path do gate

| Device | Path | LCP | INP | CLS | Volume |
|--------|------|-----|-----|-----|--------|
| Mobile | `/cotacao` | **2,21 s** | 248 ms | 0 | ~1,3K (7d) / ~367 LCP evt |
| Desktop | `/cotacao` | **1,64 s** | 80 ms | 0,01 | filtrado |

Gates E (pós-Clarity) usam **F0′**, não o F0 de 11/set, para `/cotacao`.

---

## Thresholds (referência)

| Métrica | Critério |
|---------|----------|
| LCP | Não piora > **200 ms** e não sai de good (&lt;2.5 s) se já good |
| INP | Não piora > **50 ms** |
| CLS | Não piora > **0.05** |

---

## Próximo passo

1. Gate A restante: banner/privacidade Clarity + CSP `clarity.ms` + freeze Ads.  
2. Fase 2 Clarity (PR isolada).  
3. Gate E vs **F0′**.

Não bissectar scroll/abandon da F1 salvo nova regressão vs F0′.
