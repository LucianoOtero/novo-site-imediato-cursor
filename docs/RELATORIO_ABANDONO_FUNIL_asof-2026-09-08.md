# Relatório abandono funil — asof 2026-09-08

Janela baseline: **2026-08-31 → 2026-09-04** (W4 experiment) · property `281067607` · hosts novo site.  
Fonte: snapshot `ga4-analysis-w4-asof-2026-09-05.json` (API live indisponível neste token — sem `analytics.readonly`).

## Contagem por evento

| Evento | Count |
|---|---:|
| `form_start` | 0 |
| `form_initial_contact` | 0 |
| `form_step` | 0 |
| `form_quote_choice` | 40 |
| `generate_lead` | 0 |
| `form_abandon` | 0 |
| `whatsapp_modal_initial_contact` | 0 |
| `phone_modal_initial_contact` | 0 |
| `whatsapp_modal_submit` | 11 |
| `whatsapp_modal_dismiss` | 0 |

## Drop-off entre passos

| Transição | De | Para | Drop % |
|---|---:|---:|---:|
| form_start→form_initial_contact | — | — | n/d |
| form_step1→form_step2 | — | — | n/d |
| form_step2→form_step3 | — | — | n/d |
| form_step3→form_step4 | — | — | n/d |
| form_step4→form_quote_choice | — | — | n/d |
| form_quote_choice→generate_lead | 40 | 0 | 100% |

## Abandono (`form_abandon`)

- Total: **0** (esperado até deploy + GTM Live v48 + tráfego)
- Por `last_step` / `reason` / dispositivo: n/d

## Modais

- Dismiss: **0** · Submit: **11** · taxa dismiss: **0%** (dismiss ainda não visível no pull W4)

## Top-3 gargalos (leitura inicial)

1. **form_quote_choice→generate_lead** — 100% no snapshot (40→0): ou `generate_lead` não chega ao GA4 no braço Exp, ou a contagem W4 não listou o evento com volume.
2. **Funil pré-escolha invisível** — `form_start` / `form_initial_contact` / `form_step` zerados no pull: priorizar tags GA4 desses eventos (além do abandon).
3. **Dismiss modal** — 0 no W4; com telemetria + param `reason` na v48, reavaliar na próxima semana.

## Veredito / ações (playbook)

| Prioridade | Ação |
|---|---|
| P0 | Deploy Vercel da instrumentação; confirmar Preview/DebugView `form_abandon` |
| P0 | `auth-login.mjs --with-analytics` + `ga4-ensure-abandon-dimensions.mjs` + re-rodar relatório API |
| P1 | Auditar por que `form_start` / `form_initial_contact` não aparecem no Data API no hostname novo |
| P2 | Após 7d com abandon: aplicar matriz em `docs/ABANDONO_FORMULARIO_RETENCAO.md` |

## Notas

- GTM **v48** publicada 2026-09-08 (`form_abandon` + dismiss `reason`).
- Este asof é **baseline pré-abandon**; não usar para decidir copy/UI ainda.

_Gerado no fechamento da entrega abandono funil (2026-09-08)._
