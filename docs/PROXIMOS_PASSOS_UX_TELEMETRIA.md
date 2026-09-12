# Próximos passos — telemetria UX (site Exp)

**Atualizado:** 2026-09-12  
**Site:** https://novo.segurosimediato.com.br  
**Plano canônico:** [UX_TELEMETRIA_PLAN.md](UX_TELEMETRIA_PLAN.md)  
**Baseline CWV:** [PERF_BASELINE.md](PERF_BASELINE.md)  
**Último smoke Gate C:** [SMOKE_UX_FASE1_GATE_C_asof-2026-09-11.md](SMOKE_UX_FASE1_GATE_C_asof-2026-09-11.md)

---

## Onde estamos

| Item | Status |
|------|--------|
| Fase 0 (lab + SI campo) | Feito |
| Fase 1 código (v0.2.46+) | Em produção |
| Gate C GTM (Live v49, só GA4) | Feito + smoke PASS |
| Gate D (7 dias Speed Insights) | **Em curso** — janela desde **2026-09-11** |
| Fase 2 (Microsoft Clarity) | Bloqueada até Gate D + privacidade |
| Fase 3 (brief consolidado) | Depois da Fase 2 |

---

## Próximos passos (ordem)

### 1. Agora → ~18/set — Gate D (obrigatório)

Medir **p75 Speed Insights** (produção) em `/cotacao` e agregados device; comparar com [PERF_BASELINE.md](PERF_BASELINE.md).

**Critérios (sem regressão):**

- LCP: não piora >200 ms e não sai de good (&lt;2.5 s) se já estava good  
- INP: não piora >50 ms  
- CLS: não piora >0.05  

**Ações:**

- [ ] Congelar criativo/campanha Ads o máximo possível na janela (heurística Δ15% no volume passo 1)  
- [ ] Em ~**2026-09-18**, extrair SI 7d e preencher coluna pós-F1 no `PERF_BASELINE.md`  
- [ ] Se Gate D **falhar**: bissectar (hipótese #1 scroll; #2 trabalho síncrono no abandon) — ver plano  

**Dono:** Luciano (árbitro CWV).

### 2. Paralelo (ops leves, não bloqueiam Gate D)

- [ ] (Opcional) Confirmar `form_abandon` / `form_step_timing` leave no **GA4 DebugView** / saída real de aba (iOS)  
- [ ] Arquivar lead de smoke Espo (`11 98877-6655`, 2026-09-11) se ainda aberto  
- [ ] Commit/remoto: script `scripts/google-ops/gtm-apply-ux-fase1.mjs` versionado no GitHub  

### 3. Antes de abrir Fase 2 — bloqueantes de privacidade (Gate A restante)

- [ ] Banner/privacidade atualizados para Clarity (categoria Analytics / `imediato_consent`)  
- [ ] Validar CSP/CDN não bloqueia `clarity.ms`  
- [ ] Definir freeze Ads na janela pós-deploy F2  

Sem isso, **não** publicar Clarity.

### 4. Fase 2 — Clarity (só após Gate D OK)

1. PR isolada: `ClarityScript` (`afterInteractive`), sample `localStorage` 5%→20%, mask, kill cookie, tags `form_step` / `rpa_active`  
2. Env `NEXT_PUBLIC_CLARITY_ID` só produção  
3. Gate E (CWV pós-Clarity) — mesma lógica de thresholds  
4. Kill switch: cookie `imediato_clarity_off=1` + Instant Rollback  

Detalhe: seção Fase 2 em [UX_TELEMETRIA_PLAN.md](UX_TELEMETRIA_PLAN.md).

### 5. Fase 3 — Brief

Consolidar funil GA4 + gravações Clarity + CWV vs F0/F1 para auditoria externa.  
Não somar `form_abandon` + `rpa_wait_end(abandon)` como duas quedas de funil.

---

## O que **não** fazer agora

- Não alterar `sendInitialContact` / tags Ads do passo 1  
- Não misturar Measurement Protocol na mesma PR da Fase 1 (só PR 1.1 se perda iOS comprovada)  
- Não ligar Clarity antes do Gate D + privacidade  
- Não tocar site legado neste braço  

---

## Datas-alvo

| Marco | Quando |
|-------|--------|
| Início janela Gate D | 2026-09-11 (deploy F1) |
| Avaliação Gate D | ~**2026-09-18** |
| Decisão go/no-go Fase 2 | Após Gate D + checklist privacidade |
| Fase 3 | Após Gate E da Fase 2 |

---

## Contatos / artefatos ops

- GTM: `GTM-PD6J398` · GA4: `G-694K3F1XQ1`  
- Aplicar/reaplicar tags F1: `node scripts/google-ops/gtm-apply-ux-fase1.mjs [--publish]`  
- Vercel SI: projeto `imediato-seguros` (Production)
