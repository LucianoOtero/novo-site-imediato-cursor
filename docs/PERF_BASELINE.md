# PERF_BASELINE — Core Web Vitals por fase (telemetria UX)

**Fonte do plano:** [UX_TELEMETRIA_PLAN.md](UX_TELEMETRIA_PLAN.md)  
**Escopo:** `novo.segurosimediato.com.br` (braço Exp). Legado fora.  
**Fase 0 concluída (lab):** 2026-09-11  
**Campo (Speed Insights):** pendente — Gate A / Gate B

---

## Gate A (Luciano) — checklist

| # | Item | Status |
|---|------|--------|
| 1 | Vercel Speed Insights habilitado e com dados em produção (plano Pro) | **OK** (2026-09-11) — time `lucianootero's projects` **Pro**; projeto `imediato-seguros`; SI Plus com dados Production últimos 7 dias (`Sep 4–11`). URL: https://vercel.com/lucianooteros-projects/imediato-seguros/speed-insights |
| 2 | CSP/WAF externo bloqueando `clarity.ms`? | **PENDENTE** (repo: sem `script-src` restritivo no Next; validar CDN) |
| 3 | Consent Clarity = categoria Analytics (`imediato_consent`) | **Confirmado no plano** (wire na Fase 2) |
| 4 | Privacidade/banner atualizados antes da Fase 2 | **PENDENTE** (bloqueante para F2) |
| 5 | Freeze Ads/criativo nas janelas de 7 dias; experimento URL continua? | **PENDENTE** |

**Gate B (RUM):** cumprido pelo critério **≥7 dias de RUM** (janela SI 7d com tráfego real). Volume forte em `/cotacao` (mobile ~396 eventos LCP); `/` ainda com amostra pequena no SI — gates CWV das próximas fases devem privilegiar `/cotacao` + agregados device, e tratar `/` com cautela até haver mais eventos.

---

## Thresholds de “sem regressão” (Gates D/E)

Comparar p75 Speed Insights (campo) quando existir; lab Lighthouse/PSI como complemento.

| Métrica | Critério |
|---------|----------|
| LCP | Não piora &gt; **200 ms** e não sai de good (&lt;2.5 s) se já estava good |
| INP | Não piora &gt; **50 ms** |
| CLS | Não piora &gt; **0.05** |

Árbitro: Luciano. SI prevalece sobre lab quando Gate B ok.

**Ads (Gate C):** alerta heurístico se volume conversão formulário Δ &gt;15% vs média 7d — **não** é teste de significância (n pequeno no Exp); investigar se persistir 2–3 dias ou coincidir com deploy/GTM.

**Unload (Gate C):** tags GA4 de `form_abandon` / `form_step_timing` leave devem usar transport compatível com pagehide (Opção A do plano — só `dataLayer`).

---

## Fase 0 — Lab Lighthouse (2026-09-11)

**Método:** Lighthouse CLI 12.2.1 (Chrome headless), categorias performance.  
API PageSpeed Insights pública retornou **429 quota** nesta sessão; lab local equivale à coleta de laboratório do plano.  
Artefatos resumidos: `docs/_psi_fase0/sum-*.json`.

| Página | Estratégia | Perf | LCP | FCP | TBT | CLS | INP (lab) |
|--------|------------|------|-----|-----|-----|-----|-----------|
| `/` | mobile | **58** | **9,4 s** (9384 ms) | 1,1 s | 576 ms | 0 | n/a |
| `/` | desktop | **99** | **0,9 s** (907 ms) | 0,4 s | 0 ms | 0 | n/a |
| `/cotacao` | mobile | **91** | **3,2 s** (3204 ms) | 1,1 s | 139 ms | 0 | n/a |
| `/cotacao` | desktop | **100** | **0,7 s** (674 ms) | 0,3 s | 0 ms | 0 | n/a |

**fetchTime (UTC):** home mobile `2026-09-11T21:11:01Z`; home desktop `21:11:45Z`; cotacao mobile `21:12:02Z`; cotacao desktop `21:12:16Z`.

### Leitura (Fase 0)

- **CLS 0** em todos os runs — estável.
- **LCP mobile da home** continua o gargalo (faixa poor, &gt;4 s) — alinhado ao baseline 2026-08-07 (8,8 s); dominado por JS de terceiros (GTM), não pelo hero.
- **`/cotacao` mobile** LCP ~3,2 s (needs improvement) — path quente do funil Ads; usar como path de gate junto com `/`.
- Desktop em good para LCP nas duas URLs.
- **INP de campo** ainda não disponível (só RUM / SI / CrUX).

### Referência histórica (não substituir F0)

Lab 2026-08-07 em [BASELINE_METRICS.md](BASELINE_METRICS.md): `/` mobile LCP 8,8 s; desktop 0,6 s.

---

## Fase 0 — Campo (Speed Insights)

| Item | Valor |
|------|--------|
| Projeto | `imediato-seguros` (`prj_BHGNmtJglplcna6AbCWOpmpUI09B`) |
| Domínios prod | `novo.segurosimediato.com.br`, `comparaseguroonline.com.br`, … |
| Plano | **Pro** (team) |
| Componente | `<SpeedInsights />` em `app/layout.tsx` |
| Pacote | `@vercel/speed-insights` ^2.0.0 |
| Snapshot | **2026-09-11** — Production · Last 7 Days · **P75** |
| Gate B | **OK** (≥7 dias RUM) |

### Agregado (todos os routes) — P75, 7 dias

| Device | RES | LCP | INP | CLS | FCP | TTFB |
|--------|-----|-----|-----|-----|-----|------|
| Desktop | 98 | **1,84 s** (good) | **64 ms** (good) | **0,02** (good) | 2,11 s | 0,83 s |
| Mobile | 98 | **1,95 s** (good) | **232 ms** (needs improvement) | **0** (good) | 1,53 s | 0,71 s |

### Por rota — LCP P75 (eventos ≈ visitas SI)

| Device | Path | LCP p75 | Eventos (LCP) |
|--------|------|---------|---------------|
| Desktop | `/cotacao` | 1,62 s | 43 |
| Desktop | `/` | 2,48 s | 4 |
| Mobile | `/cotacao` | 1,98 s | **396** |
| Mobile | `/` | 1,06 s | 2 |
| Mobile | `/assistencia-24-horas` | 1,44 s | 6 |

**Nota lab vs campo:** Lighthouse mobile `/` mostrou LCP ~9,4 s (throttling 4G + terceiros). Campo mobile p75 em `/` e `/cotacao` está **good**. Gates D/E usam **SI campo** como fonte primária; lab continua complementar.

Fonte: dashboard Vercel Speed Insights Plus (sessão autenticada CLI/browser `lucianootero`, 2026-09-11).

---

## Inventário de terceiros / GTM (caminho crítico)

**Container:** `GTM-PD6J398`  
**GA4:** `G-694K3F1XQ1`  
**Google Ads:** `AW-815139667`  
**Carregamento no app:** `next/script` `afterInteractive` ([GtmConsentScripts.tsx](../components/consent/GtmConsentScripts.tsx)) + Consent Mode `beforeInteractive` (opt-out / default granted).  
**Hostname novo:** `novo.segurosimediato.com.br` (triggers `[NovoSite]` também cobriram `comparaseguroonline.com.br`; v47 RegEx dois domínios — ver ops GTM).

### Itens relevantes `[NovoSite]` (resumo documental)

| Tipo | Nome / evento | Notas |
|------|---------------|--------|
| Ads | `[NovoSite] Ads - form initial contact` | Conversão formulário passo 1 (`form_initial_contact`, label `iwx7…`) — **não alterar** |
| Ads | form_quote_choice consultor/aguardar | **Pausadas** (v44+) |
| Ads | whatsapp/phone modal submit | **Pausadas** (v43+) |
| GA4 | whatsapp_modal_submit, form_quote_choice, dismiss | Telemetria funil |
| CMP | CookieYes blocked no hostname novo (v46) | Evita default denied no Exp |

**Ainda não existem tags** para: `form_step_timing`, enrich `form_abandon`, `rpa_wait_*`, scroll `below_hero` — criar só GA4 na Fase 1 (Gate C).

**Outros no app (não GTM):** `@vercel/speed-insights`. Sem Clarity/Hotjar. Octadesk = backend.

**Dono pause GTM &lt;15 min:** _TBD (Luciano nomeia)_

---

## Envs relevantes (sem secrets)

| Env | Uso |
|-----|-----|
| `NEXT_PUBLIC_GTM_ID` | Container GTM |
| `NEXT_PUBLIC_GA4_ID` | Schema/prod |
| `NEXT_PUBLIC_CLARITY_ID` | **Só Fase 2** — Production only; ainda não definir |

---

## Colunas pós-fase (preencher depois)

### Pós Fase 1 (dataLayer)

| Fonte | Path | LCP | INP | CLS | vs F0 |
|-------|------|-----|-----|-----|-------|
| Lab / SI | `/` mobile | TBD (após 7d) | TBD | TBD | TBD |
| Lab / SI | `/cotacao` mobile | TBD (após 7d) | TBD | TBD | TBD |

**Código Fase 1 (2026-09-11):** `form_step_timing`, enrich `form_abandon` (`focus_field`/`had_filled_field`), `rpa_wait_*`, `scroll_depth` com `scope` page/below_hero + `data-hero` no Hero.  
**Gate C (GTM):** tags GA4 dos eventos novos ainda **pendentes** (só GA4, zero Ads; auditar transport unload).  
**Gate D:** medir 7 dias após deploy prod.

Gates C/D: TBD

### Pós Fase 2 (Clarity)

| Fonte | Path | LCP | INP | CLS | vs F0 |
|-------|------|-----|-----|-----|-------|
| SI | `/` + `/cotacao` | TBD | TBD | TBD | TBD |

Gate E (mask + branches): TBD · Sample 5%→20%: TBD

### Pós Fase 3

CWV deve permanecer estável vs F2. Brief: [UX_AUDIT_BRIEF.md](UX_AUDIT_BRIEF.md) (a criar).

---

## Status Fase 0

| Entregável | Status |
|------------|--------|
| Lab Lighthouse `/` + `/cotacao` mobile/desktop | **Feito** (2026-09-11) |
| `PERF_BASELINE.md` | **Feito** (este arquivo) |
| Inventário GTM documental | **Feito** (resumo; dump live opcional no Gate C) |
| Snapshot Speed Insights campo | **Feito** (2026-09-11, Pro, 7d P75) |
| Gate B (RUM mínimo) | **OK** (≥7 dias RUM) |
| Liberar Fase 1 | **Liberada pelo Gate B**; restante Gate A (privacidade/freeze) só bloqueia Fase 2 |

---

## Resumo pós-Fase 0

- **O que mudou no código:** nenhum (só documentação + artefatos `docs/_psi_fase0/sum-*.json`).
- **Envs Vercel:** nenhum novo.
- **CWV lab:** home mobile LCP poor (~9,4 s); cotacao mobile ~3,2 s; desktop good; CLS 0.
- **CWV campo (SI 7d P75):** desktop LCP 1,84 s / INP 64 ms / CLS 0,02; mobile LCP 1,95 s / INP 232 ms / CLS 0. `/cotacao` mobile ~396 eventos.
- **Próximo passo:** Fase 1 liberada (Gate B OK). Antes da Fase 2: privacidade/banner + freeze Ads (Gate A itens 4–5).
