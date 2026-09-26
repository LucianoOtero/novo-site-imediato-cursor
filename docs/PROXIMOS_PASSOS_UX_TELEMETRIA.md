# Próximos passos — telemetria UX (site Exp)

**Atualizado:** 2026-09-26  
**Site:** https://novo.segurosimediato.com.br  
**Plano canônico:** [UX_TELEMETRIA_PLAN.md](UX_TELEMETRIA_PLAN.md)  
**Baseline CWV:** [PERF_BASELINE.md](PERF_BASELINE.md) — **F0′**  
**Gate D:** [GATE_D_EVAL_asof-2026-09-26.md](GATE_D_EVAL_asof-2026-09-26.md)

---

## Onde estamos

| Item | Status |
|------|--------|
| Fase 0–1 + Gate C | Feito |
| Gate D | F1 PASS + waiver + F0′ |
| Gate A (privacidade Clarity) | **OK** (banner + política + CSP app) |
| Fase 2 código Clarity | **Implementado** — aguarda env Production |
| Gate E | Após 48h @ 5% + roteiro mask |
| Fase 3 | Depois Gate E |

---

## Próximos passos (ordem)

### 1. Agora — ativar Clarity em Production (ops)

1. Criar projeto Microsoft Clarity (domínio `novo.segurosimediato.com.br`).
2. Vercel Production **somente**:
   - `NEXT_PUBLIC_CLARITY_ID=<project id>`
   - `NEXT_PUBLIC_CLARITY_RAMP_UNTIL=<ISO agora+48h>` (sample 5%)
3. Redeploy Production.
4. Smoke: Network `clarity.ms/tag/…`; cookie kill `imediato_clarity_off=1` desliga.
5. (Recomendado) Evitar mudanças grandes de criativo Ads na janela Gate E.

### 2. Gate E (~48h após deploy F2)

Roteiro mask (LeadForm + modal + RPA + re-mount) — nenhum CPF/tel/e-mail/placa legível.  
Só então: remover/expirar `RAMP_UNTIL` (novos sorteios a 20%) ou setar `SAMPLE_RATE=0.2`.

### 3. Paralelo

- [ ] Arquivar lead smoke Espo se aberto  
- [ ] Commit remoto `gtm-apply-ux-fase1.mjs` se pendente  

### 4. Fase 3 — Brief

Após Gate E.

---

## Kill switch

- Cookie `imediato_clarity_off=1` (instantâneo)  
- Instant Rollback Vercel  
- Remover `NEXT_PUBLIC_CLARITY_ID` + redeploy  

---

## Contatos

- Clarity: env Production · código `components/analytics/ClarityScript.tsx`  
- SI: https://vercel.com/lucianooteros-projects/imediato-seguros/speed-insights
