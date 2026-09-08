# Abandono de formulário e modais — playbook de retenção

Fonte de telemetria: GA4 (`G-694K3F1XQ1` / property `281067607`) via dataLayer → GTM `[NovoSite]`.  
CRM (`cEtapaFunil` no Espo) complementa ordem de magnitude; **não** é 1:1 com GA4.

Escopo atual: `LeadForm` + `ContactLeadModal` (telefone/WhatsApp). Fora: `/contato` (fase 2). Abandono **não** é conversão Ads.

---

## 1. Mapa do funil

| UI | Evento client | CRM (aprox.) |
|---|---|---|
| Foco 1º campo | `form_start` + `form_step` step=1 | — |
| Passo 1 confirmado (DDD+cel) | `form_initial_contact` | `Telefone informado` / `initial` |
| Avanço 2 / 3 / 4 | `form_step` step=2\|3\|4 | `progress` (2–3) |
| Escolha RPA/consultor | `form_quote_choice` | `consultant_requested` / `complete` |
| Lead final | `generate_lead` | — |
| Sai sem completar | `form_abandon` (`last_step`, `reason`, `had_initial_contact`) | lead parado em etapa anterior |
| Modal ×/Esc/fora | `whatsapp_modal_dismiss` (`modal_step`, `reason`) | — |
| Modal envio / skip | `whatsapp_modal_submit` | `complete` (modal) |

Flags de sessão (`lib/analytics-funnel.ts`): abandon no máx. 1×; não dispara após complete.

---

## 2. Como ler o relatório API

Script: `node scripts/google-ops/ga4-funnel-abandon-report.mjs` (default 7d; `--days 28` ou `--start`/`--end`).

Saídas: `scripts/google-ops/ga4-funnel-abandon-asof-YYYY-MM-DD.json` e `docs/RELATORIO_ABANDONO_FUNIL_asof-YYYY-MM-DD.md`.

**Taxa de drop-off** entre A→B = `(count(A) − count(B)) / count(A)`.  
**Taxa dismiss modal** = `dismiss / (dismiss + submit)`.

Interprete `form_abandon` por `last_step` (onde parou) e `reason` (`pagehide` \| `hidden` \| `unmount`). Em mobile, `pagehide` alto costuma ser interrupção de aba — não confundir com fricção de campo.

---

## 3. Matriz métrica → hipótese → ação

| Gargalo (métrica) | Hipótese | Ação sugerida |
|---|---|---|
| Alto abandon em `last_step=1` (pré ou pós telefone) | Fricção DDD/celular / medo de ligação | Reforçar copy “sem compromisso”; adiar campos; teste A/B máscara |
| Queda 1→2 (após `form_initial_contact`) | Expectativa “já pedi cotação” | Microcopy do passo 2; progresso visível; benefício do e-mail |
| Queda 2→3 (CPF/CEP/placa) | Sensibilidade CPF / esforço | Campos progressivos; explicar por quê; permitir pular placa se política OK |
| Queda 3→4 / abandon no RPA | Cansaço / dúvida no cálculo | Encurtar passo 3; destaque “2 minutos”; default visual no passo 4 |
| Modal `dismiss` em step 1 | Só queria WA | Já navega ao WA — medir se dismiss↑ após mudanças; não bloquear saída |
| Modal step 2 dismiss alto | Campos opcionais parecem obrigatórios | Destacar “pular”; reduzir campos visíveis |
| Abandon `reason=pagehide` alto mobile | Interrupção / tabs | Reengajar via Octadesk só se `initial` já gravado; não spam |

---

## 4. Cadência

1. Rodar o relatório **semanalmente** (segunda ou após campanha).
2. Revisar esta matriz quando um passo cair **>10 pp** vs baseline da semana anterior (mesmo hostname / janela).
3. Após mudança de UI, esperar **24–48h** de tráfego antes de concluir.
4. Experimento CTRL vs EXP: segmentar por hostname / UTM quando o volume permitir (mesmo script, hosts do braço Exp).

---

## 5. Checklist ops (GTM / GA4)

Ver seção em `docs/FASE_A_GTM_ESPOCRM_OPS.md` — *Abandono funil (form_abandon)*.

Resumo:

1. Deploy site com `form_abandon` / `reason` no dismiss.
2. `node scripts/google-ops/gtm-apply-form-abandon.mjs --publish`
3. Custom dims EVENT (Admin): `last_step`, `max_step`, `reason`, `form_id`, `had_initial_contact` — ou `ga4-ensure-abandon-dimensions.mjs` com OAuth `--with-analytics`.
4. Preview GTM + DebugView: abandon sem PII; **não** marcar como conversão Ads.
5. Relatório API após 24–48h.

---

## 6. Primeira leitura (asof 2026-09-08)

Baseline W4 (31/08–04/09) no hostname novo: `form_quote_choice`=40, `whatsapp_modal_submit`=11; **`form_abandon`=0** (pré-instrumentação). Gargalos aparentes: funil pré-escolha ausente no Data API (`form_start`/`form_initial_contact` zerados no pull) e `generate_lead` sem hits no mesmo snapshot. Próximo passo: deploy + dims + relatório API vivo — ver `docs/RELATORIO_ABANDONO_FUNIL_asof-2026-09-08.md`.
