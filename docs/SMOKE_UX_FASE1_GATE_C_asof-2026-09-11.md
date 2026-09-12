# Smoke Gate C — UX Fase 1 (asof 2026-09-11)

**Site:** https://novo.segurosimediato.com.br  
**Deploy:** `v0.2.46` / `dpl_AWfsNyEtmENQHKcDTtesS5F4TFrm`  
**GTM Live:** v49 “UX Fase 1 — Gate C GA4”  
**GA4:** `G-694K3F1XQ1`

## Resultado: PASS (com nota de unload)

| Check | Resultado |
|-------|-----------|
| Bundle prod contém `form_step_timing` / `rpa_wait_start` / `below_hero` | OK |
| `/cotacao` — `form_start` + `form_step` + `form_step_timing` enter/leave no `dataLayer` | OK |
| `/cotacao` — avanço passo 1→2 com `dwell_ms` no leave | OK |
| Collect GA4 `form_step_timing` → `analytics.google.com/g/collect?tid=G-694K3F1XQ1` | OK |
| `scroll_depth` `scope: page` no `dataLayer` + collect GA4 | OK |
| Home `[data-hero]` + `scroll_depth` `scope: below_hero` (25/50/75/100) | OK |
| `form_abandon` no `dataLayer` com `focus_field` + `had_filled_field` | OK |
| Tags novas **sem** Ads conversion (`googleadservices` / AW) | OK |
| Ads `conversion` só no caminho existente `form_initial_contact` (passo 1) | OK (esperado) |
| Collect isolado de `form_abandon` / leave no Performance API após `pagehide` sintético | Parcial — GTM processou (`gtm.uniqueEventId`); hit pode ir em batch/beacon; validar DebugView / saída real de aba |

## Não exercitado neste smoke

- `rpa_wait_*` via UI RPA (só push sintético no `dataLayer` na home)
- Preview GTM UI / GA4 DebugView (UI Google)
- iOS Safari beacon real

## Ops

- Smoke avançou passo 1 com celular teste `11 98877-6655` → pode ter criado lead/Opp no Espo; arquivar se ainda estiver aberto.
- Gate D: medir SI 7d a partir de 2026-09-11 (~até 2026-09-18).
