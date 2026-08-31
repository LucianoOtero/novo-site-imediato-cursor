# CHANGELOG

## Finalidade
Histórico de mudanças do projeto (Conventional Commits).

## Origem
Derivado de `ESPECIFICACAO v3.md` (convenção das seções 23/58) e `PLANO_IMPLEMENTACAO.md` rev. 4.1 (seção 4).

## Status
ATIVO (preenchido a cada release)

---

## [0.2.44] — 2026-08-31 (UX: hero Auto + LeadForm alinhados ao Ads/QS)

### Changed
- Ramo **auto** ([`lib/ramos.ts`](lib/ramos.ts)): H1 `O preço do seu seguro em 21 seguradoras`; sub/eyebrow message-match; `priceLabel` qualificada (fora do H1); `ads.messageMatchHeadline` alinhado.
- [`Hero.tsx`](components/home/Hero.tsx): selo mobile `Sem compromisso · 21 seguradoras`.
- [`LeadForm.tsx`](components/lead/LeadForm.tsx): título `Receba sua cotação online`; teaser; subtítulos; microcopy WhatsApp no telefone; CTAs `Receber cotação` / `Falta pouco` / `Ver meu preço`.

### Docs
- Consultoria: ordens 1+2 (Auto) em revisão na branch `feat/hero-form-ads`.

### Ops Ads (após merge em produção)
- [ ] RSA / títulos do grupo Auto ecoarem **preço / 21 seguradoras / cotação online** (não só âncora R$ 79,90).

## [0.2.43] — 2026-08-30 (UX: identidade jurídica só no Footer)

### Changed
- Removida a barra de identidade jurídica (razão social · CNPJ · SUSEP) do [`Header`](components/layout/Header.tsx) — contorno Ads em `comparaseguroonline` dispensável com `novo.segurosimediato.com.br`.
- Faixa inferior do [`Footer`](components/layout/Footer.tsx): `{legalName} · CNPJ · SUSEP` + © year (fonte `lib/company.ts`).
- Comentário em [`CredBar`](components/social/CredBar.tsx): SUSEP/CNPJ no Footer, não no Header.

### Docs
- Consultoria e `PROXIMOS_PASSOS`: barra Header marcada como feita.

## [0.2.42] — 2026-08-30 (Docs: consultoria 5ª rodada)

### Docs
- [`CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md`](docs/CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md) §11: linha política/banner encerrada (verificação de conta ativa, domínio atual, sem flags); conformidade SF = conta, não página; CNPJ/SUSEP = sinal de LP, não verificação; "Qualificada (limitada)" = QS, não política; Índice de Qualidade como gargalo de volume (1/10 em `cotação de seguro online`); hero promovido à ordem 2 por QS; telemetria rebaixada; higiene de campanha + marca Porto Seguro; **Octadesk antifraude adiada** (todo futuro — decisão cliente); projeto Header CNPJ→Footer liberado.

## [0.2.41] — 2026-08-30 (Docs: consultoria 4ª rodada)

### Docs
- [`CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md`](docs/CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md): decisão banner registrada; ordem **0.25** Octadesk+RPA; medição ordem 1 = bloco com `e98b262`; barra CNPJ/SUSEP: contorno Ads em `comparaseguroonline` — **dispensável** em `novo.segurosimediato.com.br` (§10.5).

## [0.2.40] — 2026-08-30 (UX: remove banner de golpes)

### Changed
- Removido `FraudAlert` do topo das páginas de marketing; aviso oficial de PIX/rastreador permanece no `Footer` + `/alerta-de-fraude`.
- **Decisão:** cliente, 2026-08-30 — banner circunstancial; aviso reposicionado (não suprimido). Commit `e98b262`; deploy prod ~19:09 BRT.
- **Pendente:** antifraude na 1ª msg Octadesk + linha na tela de resultado RPA.

### Docs
- [`CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md`](docs/CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md): assimetria Ads Exp vs legado = veredito Espo; ordem 0 diagnóstica; ordem 0.5 métrica; ordem 5 inviável por A/B; banner golpes = dono institucional.

## [0.2.38] — 2026-08-30 (Docs: consultoria 2ª rodada)

### Docs
- [`CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md`](docs/CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md): bidding Ads vs captura, gating por custo de reversão, H1+card acoplados; backlog reordenado (ordem 0 = auditoria goals).

## [0.2.37] — 2026-08-30 (Docs: consultoria hero/form)

### Docs
- Consultoria Claude + considerações + recomendações: [`CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md`](docs/CONSULTORIA_CLAUDE_HERO_FORMULARIO_2026-08-30.md) (telefone-primeiro, funil GA4/Firebase, priorização P0–P3).

## [0.2.36] — 2026-08-30 (LeadForm: título cotação online)

### Changed (UX copy)
- Título do card: `Faça aqui a cotação online do seu seguro` (antes “Inicie aqui sua cotação”); `leading-snug` no h2 para quebra no frost/mobile.

## [0.2.35] — 2026-08-30 (LeadForm: rótulos nomeados)

### Changed (UX copy)
- Progresso do formulário: `Telefone · 1/3` / `Contato · 2/3` / `Veículo · 3/3` no lugar de “Etapa X de 3”; subtítulos e teaser alinhados; `aria-label` do `ProgressBar` com rótulo nomeado.

## [0.2.34] — 2026-08-30 (Captura leads W1–W3)

### Docs / Ops
- Análise geração de leads W1+W2+**W3**: [`ANALISE_EXPERIMENTO_LEADS_W1_W2_W3_2026-08-30.md`](docs/ANALISE_EXPERIMENTO_LEADS_W1_W2_W3_2026-08-30.md).
- Snapshots W3: Ads/Firebase/GA4 + [`experiment-comparison-w1-w2-w3-2026-08-30.json`](scripts/google-ops/experiment-comparison-w1-w2-w3-2026-08-30.json).

## [0.2.33] — 2026-08-30 (Placar comercial W1–W3 as-of)

### Docs / Ops
- Placar comercial experimento as-of 2026-08-30: W1 (10–14), W2 (17–21), **W3 (24–28)** — [`ANALISE_COMERCIAL_EXPERIMENTO_asof-2026-08-30.md`](docs/ANALISE_COMERCIAL_EXPERIMENTO_asof-2026-08-30.md).
- Ads W3: [`ads-analysis-w3.json`](scripts/google-ops/ads-analysis-w3.json); snapshots `experiment-commercial-w*-asof-2026-08-30.json`.

## [0.2.32] — 2026-08-29 (Fase 5: prep runbook + scripts)

### Docs / Ops
- Runbook prod: [`docs/FASE5_ROLLOUT_PRODUCAO.md`](docs/FASE5_ROLLOUT_PRODUCAO.md) (D0/D1, aceite, rollback).
- Aceite §9 e AMBIENTE §5 apontam para produção (`flyingdonkeys.com.br`).

### Added (scripts — sem executar prod)
- [`fase5-prod-smoke.mjs`](scripts/espo-ops/fase5-prod-smoke.mjs): RTDB `environment=production` → Espo prod; exige `--i-know-this-is-prod`.
- `resolveEspoConfig`: `ESPOCRM_API_CONFIG[prefer]` tem prioridade sobre `ESPO_BASE_URL` (corrige inventário `--prefer=prod` mascarado pelo env DEV).
- `fase0-attribution-fields.mjs`: inventário prod permitido; CREATE em prod só com `--i-know-this-is-prod`.

### Notes
- Sem commit/deploy/Espo prod nesta entrada. Execução D0/D1 sob autorização explícita (alvo 2026-08-30).

## [0.2.31] — 2026-08-29 (Fase 4: Final URL suffix Exp)

### Ops (Google Ads)
- **Substituído** `finalUrlSuffix` só na Exp `24095000558` pelo canônico (UTMs + ValueTrack; sem `gclid` no suffix).
- Controle `21287198336`, `trackingUrlTemplate` e suffix da conta **intocados**.
- Scripts: [`ads-set-exp-final-url-suffix.mjs`](scripts/google-ops/ads-set-exp-final-url-suffix.mjs); backup/result em `scripts/google-ops/ads-fase4-suffix-*.json`.

### Docs / Ops
- Smoke Ads-like → RTDB staging → Espo DEV: [`fase4-ads-url-smoke.mjs`](scripts/espo-ops/fase4-ads-url-smoke.mjs) — **GATE OK**.
- Docs: [`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md), [`AMBIENTE_TESTES_SITE_NOVO.md`](docs/AMBIENTE_TESTES_SITE_NOVO.md).

### Notes
- Tráfego Exp já leva params canônicos; aceite formal de leads prod na **Fase 5** (Espo prod + deploy).

## [0.2.30] — 2026-08-29 (Fase 3: E2E Espo DEV 23/23)

### Docs / Ops
- Gate Fase 3 verde: piloto + suite [`e2e/testes-espocrm.spec.ts`](e2e/testes-espocrm.spec.ts) contra localhost staging → Espo DEV — **23 passed** (~41 min).
- Resultado: [`e2e/testes-espocrm.resultado-fase3.json`](e2e/testes-espocrm.resultado-fase3.json).

### Changed (harness E2E)
- Reset do store local entre casos; assert Lead+Opp no DEV; `ESPO_BASE_URL` só aceita `dev.flyingdonkeys.com.br`.

### Notes
- Sem deploy prod / Ads. Próximo: Fase 4 (Final URL suffix na campanha Exp).

## [0.2.29] — 2026-08-29 (Fase 2: CF atribuição Opp + smokes Espo DEV)

### Changed (Firebase)
- [`firebase/functions/espocrm.js`](firebase/functions/espocrm.js): `attributionPackageFields` / Lead extended / **Opportunity pacote completo** (PUT best-effort).
- [`firebase/functions/index.js`](firebase/functions/index.js): PUT `espo_attribution_{stage}_sent` após funil/canal.
- Deploy `deliverLead` em `imediato-seguros-site-novo` (rev. deliverlead-00026).

### Docs / Ops
- Smokes: [`scripts/espo-ops/fase2-attribution-smoke.mjs`](scripts/espo-ops/fase2-attribution-smoke.mjs), [`fase2-rtdb-attribution-smoke.mjs`](scripts/espo-ops/fase2-rtdb-attribution-smoke.mjs).
- Gate Fase 2 verde: RTDB `environment=staging` → Lead+Opp DEV com UTMs/`cUtmCampaignName`/`cCanalCaptura`; canais formulario/whatsapp/telefone.
- Opp POST continua só com `cGclid` até Espo prod espelhar schema (Fase 5).

### Notes
- Sem deploy Vercel prod / Ads suffix. Próximo: Fase 3 (E2E) ou Preview staging com `FIREBASE_*` espelhados.

## [0.2.28] — 2026-08-29 (Fase 0 Espo DEV + Fase 1 atribuição local)

### Docs / Ops
- Fase 0 Espo DEV: campos Ads/UTM/`cCanalCaptura` em Lead + Opportunity; layout “Cotação do Site” atualizado; inventário via Metadata API.
- [`docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md): status Fases 0–1.

### Added (app — sem deploy prod)
- [`lib/leads/attribution.ts`](lib/leads/attribution.ts): persistência 1st-party (`localStorage`, TTL 90d) + merge query ∪ storage.
- `utmSchema` / `captureUtmFromLocation` ampliados (`campaign_name`, ValueTrack).
- `LeadForm`, `ContactLeadModal`, `whatsapp`, `PageAnalytics` passam a usar `getAttributionUtm()`.

### Notes
- Sem deploy Vercel/CF/Ads nesta release de código. Próximo: Fase 2 (staging + CF Opportunity completa).

## [0.2.27] — 2026-08-27 (docs: Fase4 atribuição — plano por fases 0–5)

### Docs
- [`docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md): §2 “Plano de execução por fases (0–5)” com gates go/no-go DEV/staging antes de prod; numeração §§3–10 corrigida (contrato técnico, persistência, Ads, Espo, critérios).
- [`docs/AMBIENTE_TESTES_SITE_NOVO.md`](docs/AMBIENTE_TESTES_SITE_NOVO.md): matriz de testes realinhada às fases; mapa fases ↔ seções; gates por fase.
- [`docs/PROXIMOS_PASSOS.md`](docs/PROXIMOS_PASSOS.md): bloco “Próximo projeto — Fase4 atribuição Ads” com link ao plano e próximo passo (Fase 0 Espo DEV).

### Notes
- Reorganização **documental apenas** — sem mudança de runtime. Implementação pendente; ordem: Fase 0 (Espo DEV) → Fase 1 (código) → Fases 2–3 (staging/E2E) → Fase 4 (Ads suffix) → Fase 5 (prod).

## [0.2.26] — 2026-08-24 (remove debug-client-error — edge request abuse)

### Removed
- `POST /api/debug-client-error` e rota [`app/api/debug-client-error/route.ts`](app/api/debug-client-error/route.ts) — endpoint temporário de diagnóstico (2026-07-14) abusado (~277k edge requests no Firewall Traffic); investigação `/obrigado` já resolvida com error boundaries.

### Changed
- [`components/analytics/PageAnalytics.tsx`](components/analytics/PageAnalytics.tsx): removido listener global que POSTava erros ao servidor (não capturava erros de render; ver [`docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md`](docs/INVESTIGACAO_APPLICATION_ERROR_OBRIGADO.md)).
- [`app/(marketing)/error.tsx`](app/(marketing)/error.tsx) e [`app/global-error.tsx`](app/global-error.tsx): só `console.error` local — UI de recuperação inalterada.

### Ops
- Regra WAF **Deny debug-client-error** já publicada no projeto Vercel `imediato-seguros` (redundante após deploy; pode manter).

## [0.2.25] — 2026-08-22 (docs: comparativo experimento W1 vs W2)

### Docs
- [`docs/ANALISE_EXPERIMENTO_COMPARATIVO_2026-08-10-14_vs_2026-08-17-21.md`](docs/ANALISE_EXPERIMENTO_COMPARATIVO_2026-08-10-14_vs_2026-08-17-21.md): relatório analítico W1 (10–14/08) vs W2 (17–21/08) — split, Ads, GA4, Firebase (gclids únicos), triangulação e recomendação operacional.
- [`docs/GTM_ADS_OAUTH_OPS.md`](docs/GTM_ADS_OAUTH_OPS.md): seção “Análise de experimento por janela” (comandos dos scripts generalizados).

### Ops (read-only)
- Scripts [`scripts/google-ops/experiment-analyze-*.mjs`](../scripts/google-ops/) + [`experiment-compare-weeks.mjs`](../scripts/google-ops/experiment-compare-weeks.mjs); JSONs agregados W1/W2 em `scripts/google-ops/` (sem PII).

### Notes
- Sem mudança de runtime em produção. W2: gap de captura Exp vs Ctrl **quase zerou** (16,7% vs 16,4% gclid/clique); engajamento GA4 Exp mantido (~44% vs ~10% legado). Relatório estruturado em **dois passos:** confronto Exp vs Legado por semana (§3–§4), depois comparativo inter-semana (§5).
- **Plano ampliado (2026-08-22):** [`docs/EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](docs/EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md) — placar decisório = vendas Opp `Vendido` + `amount` (Valor Comissão), reexecução as-of por coorte W1…Wn.
- **Execução comercial as-of 2026-08-22:** scripts `experiment-analyze-espo-commercial.mjs`, `experiment-compare-commercial-weeks.mjs`; relatório [`docs/ANALISE_COMERCIAL_EXPERIMENTO_asof-2026-08-22.md`](docs/ANALISE_COMERCIAL_EXPERIMENTO_asof-2026-08-22.md).

## [0.2.24] — 2026-08-21 (docs: atribuição Ads + ambiente de testes)

### Docs
- [`docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md): contrato click IDs/UTMs/ValueTrack site novo → Lead **e** Opportunity; persistência 1st-party; Final URL suffix só na campanha Exp `24095000558`; legado/Octadesk fora de escopo.
- **Nome literal da campanha:** URL `campaign_name={campaignname}` → Espo `cUtmCampaignName` (Lead+Opp); `cUtmCampaign` permanece ID (`{campaignid}`). Sufixo Ads e smoke D atualizados.
- [`docs/AMBIENTE_TESTES_SITE_NOVO.md`](docs/AMBIENTE_TESTES_SITE_NOVO.md): runbook staging (`APP_ENV=staging` → Espo DEV) + matriz E2E/smokes canal e atribuição.
- Atualizados [`docs/CANAL_CAPTURA_ESPO.md`](docs/CANAL_CAPTURA_ESPO.md) (Enum **DEV primeiro**), [`docs/MEDICAO_VENDA_POR_TIPO_LEAD.md`](docs/MEDICAO_VENDA_POR_TIPO_LEAD.md), [`docs/FLUXO_LEADFORM_CRM_WHATSAPP.md`](docs/FLUXO_LEADFORM_CRM_WHATSAPP.md).

### Notes
- Sem mudança de runtime nesta release documental. Implementação (Espo DEV, persistência site, CF Opp completa, Ads suffix, staging, gate prod) segue o plano *Fase4 atribuição Ads Espo*.

## [0.2.23] — 2026-08-17 (medição de venda por tipo de lead + modalChannel)

### Added
- Relatório comercial [`docs/MEDICAO_VENDA_POR_TIPO_LEAD.md`](docs/MEDICAO_VENDA_POR_TIPO_LEAD.md): venda = `cDataVenda`, coortes form/modal site novo×legado via Espo+Firebase (legado read-only).
- Scripts [`scripts/espo-ops/`](scripts/espo-ops/): discovery + join/análise agregada sem PII.
- `modalChannel` (`whatsapp`|`phone`) no payload `/api/lead`, RTDB e CF; `cCanalCaptura` em PUT best-effort separado (requer Enum no Entity Manager).

### Notes
- Deploy `deliverLead` (canal) feito; Enum Espo e Vercel prod do `modalChannel` seguem pendentes (Metadata API 405 com a chave atual).

## [0.2.22] — 2026-08-09 (hero focado em conversão: frost card, H1 em 3 linhas, prova social sem duplicação)

### Changed
- **Card do formulário do hero em branco translúcido (frost)** ([`components/lead/LeadForm.tsx`](components/lead/LeadForm.tsx)): variante `inline` trocou o glass navy por `bg-white/85` + blur (fallback `bg-white/95` sem `backdrop-filter`), tone `light` (labels escuros, inputs brancos sólidos), título "Inicie aqui sua cotação" em navy (`brand-700`) e botão azul — destaque máximo do formulário sobre o hero. `/cotacao` e modal intocados.
- **H1 do hero como lockup de 3 linhas** ([`components/home/Hero.tsx`](components/home/Hero.tsx) + [`lib/ramos.ts`](lib/ramos.ts)): "Seguro auto" grande, "a partir de R$ 79,90/mês," e "com cobertura FIPE 100%" menores — desktop com larguras casadas, mobile cabendo em 360px sem quebras.
- **"96% de satisfação no Google" em todo o site** (nota real ÷ 5 × 100, nunca hardcoded): substitui "4,8 de avaliação no Google" na CredBar, no selo do hero e no `CotacaoTrustPanel`; régua de estatísticas do desktop também passou a usar a fórmula (era `satisfactionRate` fixo).
- **Prova social sem duplicação por dobra**: selo com estrelas do hero agora é exclusivo do mobile (<768px) e em pilha de 3 linhas (estrelas / satisfação / avaliações — antes quebrava no meio da frase); de 768px em diante a CredBar é a fonte única; no mobile da home a CredBar pós-hero virou variante `complementar` ([`components/social/CredBar.tsx`](components/social/CredBar.tsx)) só com anos de experiência + seguradoras parceiras. LPs de ramo (sem CredBar) mantêm o selo como única prova junto ao form.
- **CredBar mobile em grid 2x2 sem sobreposição**: itens não usam mais `whitespace-nowrap` no mobile (rótulos transbordavam por cima do vizinho em 360px).
- **Header sem quebra de linha entre 768px e lg** ([`components/layout/Header.tsx`](components/layout/Header.tsx) + [`components/layout/MegaMenu.tsx`](components/layout/MegaMenu.tsx)): itens do menu e botões Ligar/"Cotar agora" com texto/padding fluidos (`clamp()` por vw) + `nowrap`.

### Docs
- To-do registrado em [`docs/PROXIMOS_PASSOS.md`](docs/PROXIMOS_PASSOS.md): acompanhamento da campanha Google Ads, eventos GA4 e acionadores GTM após a migração de domínio e as mudanças de conversão do hero.

## [0.2.21] — 2026-08-07 (formulário acima da dobra no mobile)

### Changed
- **Conversão mobile** (pedido do cliente; mockup aprovado): no mobile, o passo 1 do LeadForm (DDD + celular + botão) agora cabe na primeira dobra. [`components/home/Hero.tsx`](components/home/Hero.tsx): padding vertical do hero reduzido só no mobile (o `py-16` da Section + `py-12` do Container somavam 112 px de espaço morto), `gap`/`margins` do texto mais enxutos e selos (cotação grátis + estrelas Google) movidos para baixo do card do formulário (`lg` intocado — desktop idêntico). [`app/(marketing)/page.tsx`](app/(marketing)/page.tsx): CredBar desce para depois do Hero no mobile (duplicava selos do hero). [`components/shared/FraudAlert.tsx`](components/shared/FraudAlert.tsx): mais compacto no mobile (texto oficial preservado). LPs de ramo herdam as melhorias do Hero automaticamente.
- Rollback: reverter este commit (a versão anterior é o commit `803ba08`) ou Instant Rollback na Vercel.

### Ops (2026-08-08, pós-tag)
- **Turnstile ativado em produção**: widget criado no dashboard do Cloudflare (modo Invisible, hostnames `segurosimediato.com.br` + `localhost`); `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` reais configuradas na Vercel (Production) via API, substituindo os placeholders — sai do mock mode. Smoke do fluxo de lead executado após o deploy.

## [0.2.20] — 2026-08-07 (melhorias da auditoria de performance/SEO/conversão)

### Added
- [`lib/leads/post-lead.ts`](lib/leads/post-lead.ts): POST centralizado a `/api/lead` com token do **Cloudflare Turnstile** (widget invisível, renderizado sob demanda a cada envio; script lazy, fora do critical path). **Fail-open nos dois lados**: sem site key/script bloqueado/timeout envia sem token; o servidor ([`lib/leads/security.ts`](lib/leads/security.ts)) aceita token ausente com aviso e só rejeita token presente e inválido — nunca perder lead real por causa do anti-bot. Os 8 pontos de envio (LeadForm ×5, ContactLeadModal ×2, useSubmitLead) passaram a usar o helper. **Pendente**: criar o widget no dashboard do Cloudflare (tipo Invisible) e configurar `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` na Vercel — até lá segue em mock mode, comportamento idêntico ao anterior.
- `@vercel/speed-insights` + `<SpeedInsights />` no layout raiz (RUM de LCP/INP/CLS de campo) — no-op até habilitar no projeto Vercel (requer plano **Pro**; upgrade é ação do cliente).
- Headers de segurança em [`next.config.mjs`](next.config.mjs): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP `frame-ancestors 'self'` (CSP completa adiada — GTM).
- `scripts/google-ops/gsc-setup-novo.mjs` + escopo `webmasters` no kit OAuth (`--with-gsc`).

### Changed
- Metadata default do layout raiz: title/description "Scaffold" substituídos por default real com `title.template` (`%s | Imediato Seguros`); [`lib/metadata.ts`](lib/metadata.ts) passou a emitir `title.absolute` (os titles do helper já incluem a marca — evita duplicação do sufixo).

### Ops (fora do app Next)
- Vercel: `serverlessFunctionRegion` **iad1 → gru1** via API (menor latência p/ `/api/lead`, SafetyMails e PH3A).
- Search Console: a propriedade de Domínio `sc-domain:segurosimediato.com.br` (owner) já cobre o subdomínio novo; `sitemap.xml` do domínio novo submetido via API.
- GCP `leads-imediato-seguros`: APIs Search Console e PageSpeed Insights habilitadas; API key `psi-ops` criada (restrita ao PSI).
- **Baseline Lighthouse coletada** (PSI, home + `/seguro-auto`, mobile+desktop) e registrada em [`docs/BASELINE_METRICS.md`](docs/BASELINE_METRICS.md): SEO 100 e CLS 0 em tudo; LCP mobile da home 8,8 s simulado (causa: JS de terceiros/GTM na banda throttled, não a imagem do hero); HTML da home = ~25 KB com Brotli na rede (242 KB brutos) — diagnóstico do payload encerrado sem ação.

## [0.2.19] — 2026-08-07 (migração para novo.segurosimediato.com.br)

### Changed
- Domínio do site experimental migrado de `comparaseguroonline.com.br` para **`novo.segurosimediato.com.br`** (motivo: "Veiculação limitada" na conta Ads NOVA por identidade do anunciante — domínio genérico sem marca). `NEXT_PUBLIC_SITE_URL` (Vercel), constantes das Cloud Functions (`SITE_WEBPAGE`, `SITE_MARKER`), templates de e-mail e comentários atualizados; CF `deliverLead` redeployada. Legado intocado.
- [`components/layout/Header.tsx`](components/layout/Header.tsx): barra de identidade jurídica (razão social + CNPJ + SUSEP) no topo; [`components/social/CredBar.tsx`](components/social/CredBar.tsx): SUSEP duplicada removida.

### Ops (fora do app Next)
- Cloudflare: CNAME `novo` → Vercel; Vercel: domínio adicionado + **redirect 301** de `comparaseguroonline.com.br` (+www) para o domínio novo (preserva path), via API.
- GTM **v47 Live**: 7 acionadores `[NovoSite]` com RegEx cobrindo os dois domínios; legado intacto.
- Google Ads (braço Exp `24095000558` apenas): 21 RSAs com URLs finais no domínio novo + marca nos títulos; sitelinks removidos; **21/21 APPROVED**; headline de marca **fixada na posição 1** (recomendação da política "Limited ad serving", jun/2026); experimento reativado do snapshot.
- Smoke fim-a-fim no domínio novo (2026-08-07): **PASS** — Lead/Opp no Espo prod com `cWebpage=novo.segurosimediato.com.br`, Octadesk e e-mails ok; registros de teste arquivados/purgados. Achado fora de escopo: workflow do Espo movendo Opp para "Perdido" no fluxo "Receber depois" (verificar com a equipe).
- Novos scripts `scripts/google-ops`: `ads-baseline-experiment`, `ads-pause-exp-adgroups` (pause/resume com snapshot), `gtm-migrate-hostname`, `ads-migrate-exp-domain`, `ads-check-serving-status`, `ads-pin-brand-headline`, entre outros.

## [0.2.18] — 2026-08-04 (logos das seguradoras viram links)

### Changed
- [`components/home/InsurersGrid.tsx`](components/home/InsurersGrid.tsx) (Home + LPs de ramo): texto do link inferior "Ver todas as seguradoras parceiras" → **"Dados detalhados das Seguradoras"**; cada logo do grid agora é um link para `/seguradoras-parceiras` (com `aria-label` por seguradora e focus ring), mantendo o efeito grayscale → cor no hover.

## [0.2.17] — 2026-08-04 (marcador de origem nos e-mails de alerta de leads)

### Changed (Cloud Function — fora do app Next)
- [`firebase/functions/email-notification.js`](firebase/functions/email-notification.js): alertas de lead do site novo (mesmo Cloud Run/template do legado) agora saem com `momento_descricao` prefixada com **`comparaseguroonline — `** e emoji `🆕` no primeiro contato / `🆕✅` na submissão completa (`❌` mantido nos de erro). Legado sem marcador (monta o payload no browser); Cloud Run intocado.
- Deploy `deliverLead` OK. Teste dev (RTDB, `initial` + `complete`): 4 e-mails enviados com sucesso (`email_espocrm_initial/update_sent`, `email_octa_initial/cotacao_dados_recebidos_sent`); registros de teste purgados (RTDB + Espo dev via API, HTTP 200).

## [0.2.16] — 2026-08-04 (consent opt-out, paridade com o legado)

### Changed
- [`components/consent/GtmConsentScripts.tsx`](components/consent/GtmConsentScripts.tsx): Consent Mode v2 default passa de denied para **granted** (opt-out), lendo a rejeição salva (`imediato_consent`) ainda beforeInteractive; [`components/consent/ConsentBanner.tsx`](components/consent/ConsentBanner.tsx) vira informativo (toggles default true; "Rejeitar" continua funcionando e persiste). Decisão do cliente, 2026-08-04, espelhando o legado (CookieYes grava `_ga` sem interação).
- **Motivo (achado da auditoria via GA4 Data API)**: com opt-in, a "Tag do Google G-694K3F1XQ1" (consent obrigatório `analytics_storage`, acionador de page load) **nunca disparava** no site novo — page load sempre antecede o aceite. Resultado: 1 sessão GA4 no site novo vs 492 no legado em 03/08 e **zero conversões Ads no braço Exp** apesar de 5 leads reais com `gclid` no RTDB. A medição do experimento estava assimétrica; leitura limpa a partir de 5/ago.

### Ops (fora do app Next)
- GTM **v46 Live** (via API, 2 itens no diff): a tag compartilhada **CookieYes CMP** ganhou exceção de hostname (`[NovoSite] Consent Init - hostname novo`) — ela setava default **denied** na inicialização de consentimento em todas as páginas e, sem o cookie `cookieyes-consent` (que só existe no legado), re-negava o consentimento do site novo depois do nosso default granted, bloqueando a Tag do Google mesmo com o opt-out no site. No legado nada muda (verificado: CookieYes carrega e `_ga` é gravado sem interação). Rollback = republicar v45.
- Verificação em prod (Playwright, iPhone 13): site novo sem interação → `page_view` GA4 com `gcs=G111` + cookies `_ga`/`_gcl_au`, banner ainda visível; após "Rejeitar" + reload → só pings `gcs=G100` (rejeição respeitada desde o primeiro page_view).
- OAuth kit: `--with-analytics` agora inclui `analytics.readonly` (GA4 Data API para relatórios); "Google Analytics Data API" habilitada no projeto GCP via gcloud.

## [0.2.15] — 2026-08-04 (telemetria GA4 dos envios finais)

### Changed
- [`components/cta/ContactLeadModal.tsx`](components/cta/ContactLeadModal.tsx) + [`lib/analytics.ts`](lib/analytics.ts): parâmetro `submit_mode: "full" | "skip"` no `whatsapp_modal_submit` — distingue o envio completo do link "Prosseguir sem preencher o resto" (ref marcado no clique; sem mudança de comportamento).

### Ops (fora do app Next)
- GTM **v45 Live** (via API, aditivo, zero tags Ads): tags GA4 `G-694K3F1XQ1` para `whatsapp_modal_submit` (`modal_channel`/`submit_mode`/`location`/`ramo`) e `form_quote_choice` (`choice`/`ramo`), com acionadores novos filtrados por hostname; DLV `submit_mode` nova (`modal_channel` já existia da v42). Fecha o funil GA4: `*_initial_contact` → submit/dismiss nos modais; `form_initial_contact` → `form_quote_choice` no form. Legado intocado; rollback v44. Verificado em prod (Playwright, 9/9): hits GA4 corretos (skip/full/choice) e conversões Ads intactas (`iwx7`/`ND-wCL`/`KL9b`), nenhum ping Ads nos envios finais.
- Admin GA4 via **Analytics Admin API** (property `281067607`): 6 dimensões personalizadas de evento (`modal_channel`, `submit_mode`, `choice`, `location`, `ramo`, `modal_step`) e 2 key events (`whatsapp_modal_submit`, `form_quote_choice`) criados. OAuth kit ganhou escopo `analytics.edit` (`auth-login.mjs --with-analytics`). Detalhes em [`docs/FASE_A_GTM_ESPOCRM_OPS.md`](docs/FASE_A_GTM_ESPOCRM_OPS.md) (*Telemetria GA4 v45*).

## [0.2.14] — 2026-08-04 (conversão do formulário no telefone)

### Changed
- [`components/lead/LeadForm.tsx`](components/lead/LeadForm.tsx) + [`lib/analytics.ts`](lib/analytics.ts): novo evento `form_initial_contact`, emitido 1× ao confirmar o passo 1 (DDD+Celular validados), no mesmo instante do lead `initial` — a conversão Ads do formulário antecipa para o telefone, alinhada ao CRM e espelhando os modais. `form_quote_choice` (etapa 4) continua sendo emitido (GA4/funil), sem tag Ads ativa.

### Ops (fora do app Next)
- GTM **v44 Live** (via API): acionador `[NovoSite] CE - form_initial_contact` (evento + hostname) + tag `[NovoSite] Ads - form initial contact` (action de formulário `iwx7…`, **sem** valor/moeda, Conversion Linker); tags `[NovoSite] Ads - form_quote_choice - consultor`/`- aguardar` **pausadas** (1 conversão por jornada). Diff só `[NovoSite]`; legado intocado; rollback v43. Verificado em prod (Playwright, `/api/lead` mockado): passo 1 → 1 ping `iwx7` sem valor; etapa 4 → nenhum ping; modais inalterados (`ND-wCL…`).
- **Ressalva do experimento (decisão do cliente)**: o formulário legado converte no envio final — o braço tratamento passa a converter mais cedo no funil do formulário a partir de ~08:00 BRT de 2026-08-04; a comparação Controle vs Tratamento deixa de ser simétrica nesse funil (modais seguem simétricos).

## [0.2.13] — 2026-08-04 (EspoCRM: Opportunity nova por jornada)

### Changed (Cloud Function — fora do app Next)
- [`firebase/functions/espocrm.js`](firebase/functions/espocrm.js) (`deliverStage`, modo `useDirect`): a Opportunity só é reaproveitada **dentro da mesma jornada** (via `espocrmOpportunityId` gravado no registro RTDB na primeira entrega). Removida a busca `findOpportunityByLeadId` (por `cLeadId` no CRM), que ressuscitava a Opportunity de jornadas passadas de prospects recorrentes; no PUT stale (404/403) cria direto uma Opportunity nova. Dedupe de **Lead** inalterado (1 Lead por prospect, atualizado). Decisão do cliente, 2026-08-04.
- Deploy `deliverLead` OK. Teste dev (`dev.flyingdonkeys.com.br`, via RTDB): 2 jornadas com o mesmo telefone → 1 Lead + 2 Opportunities; `complete` da mesma jornada atualizou a mesma Opportunity; cenário stale criou nova (não recuperou a antiga). Registros de teste purgados (RTDB + Espo dev).
- **Ressalvas**: janela de dedupe de 24h do `/api/lead` = mesma jornada; o pipeline passa a ter múltiplas Opportunities por prospect (relatórios não devem assumir `cLeadId` único; fechamento das antigas paradas fica a cargo do processo no CRM). Site legado continua no proxy antigo (atualiza a Opportunity existente) — comportamentos coexistem na mesma base.

## [0.2.12] — 2026-08-04 (paridade de momentos de conversão com o legado)

### Changed
- [`components/cta/ContactLeadModal.tsx`](components/cta/ContactLeadModal.tsx) + [`lib/analytics.ts`](lib/analytics.ts): no blur do telefone validado o site novo emite os eventos **legados** `whatsapp_modal_initial_contact` / `phone_modal_initial_contact` — as tags Ads legadas (`ND-wCL…`/`KL9b…`) disparam identicamente nos dois braços do experimento (mesmo momento, mesma action, mesmo valor). O push de `whatsapp_modal_submit` no envio final permanece (funil/GA4, sem tag Ads ativa).

### Ops (fora do app Next)
- GTM **v43 Live** (via API): tags `[NovoSite] Ads - whatsapp_modal_submit`/`- phone_modal_submit` **pausadas** (elimina duplo disparo e o cross-firing no legado por falta de filtro de hostname); `conversionValue`/`currencyCode` removidos das 4 tags Ads `[NovoSite]` (simetria com a tag legada de formulário). Diff só `[NovoSite]`; rollback v42. Verificado em prod (Playwright): conversão no blur, nenhum ping no submit, form sem valor. Leitura limpa do experimento a partir de 5/ago. Detalhe em [`docs/FASE_A_GTM_ESPOCRM_OPS.md`](docs/FASE_A_GTM_ESPOCRM_OPS.md) (*Paridade de momentos*).

## [0.2.11] — 2026-08-03 (skip do modal só após telefone + medição de abandono)

### Changed
- [`components/cta/ContactLeadModal.tsx`](components/cta/ContactLeadModal.tsx): link "Prefiro ir direto, sem preencher" (que navegava sem registrar nada) removido da etapa 1; na etapa 2 (telefone validado, lead `initial` já criado) surge "Prosseguir sem preencher o resto" como `type="submit"` — atualiza o lead (`stage: complete`), dispara `whatsapp_modal_submit` (conversão Ads) e navega. ×/Esc/clique fora seguem navegando (anti-beco-sem-saída).

### Added
- Evento `whatsapp_modal_dismiss` ([`lib/analytics.ts`](lib/analytics.ts)) no dismiss do modal, com `modal_step` (1 = sem telefone; 2 = telefone capturado) — mede o abandono antes invisível.

### Ops (fora do app Next)
- GTM **v42 Live** (via API, aditivo): DLVs `modal_step`/`location`/`ramo` + CE `whatsapp_modal_dismiss` (hostname novo) + tag GA4 `G-694K3F1XQ1`; **sem** tag Ads para dismiss. Legado intocado; rollback v41. Verificado em prod (Playwright, `/api/lead` mockado). Detalhe em [`docs/FASE_A_GTM_ESPOCRM_OPS.md`](docs/FASE_A_GTM_ESPOCRM_OPS.md).

## [0.2.10] — 2026-08-03 (fix zero conversões braço Exp)

### Fixed
- **Consent Mode v2** ([`components/consent/ConsentBanner.tsx`](components/consent/ConsentBanner.tsx)): `consent update` era empurrado como Array em vez de objeto `arguments` — Google tag ignorava e o consentimento ficava `denied` para sempre (`gcs=G100`, zero conversões Ads e GA4 subnotificado no site novo). Corrigido + deploy Vercel; prova em prod: `gcs=G111` e cookie `_gcl_au` após aceite.

### Ops (fora do app Next)
- GTM **v41 Live** (via API): labels cruzados corrigidos nas tags `[NovoSite]` — consultor → `iwx7…` (action de formulário, primária) e `phone_modal_submit` → `KL9b…` (action modal telefone). Só 2 tags no diff; legado intocado; rollback v40. Detalhe em [`docs/FASE_A_GTM_ESPOCRM_OPS.md`](docs/FASE_A_GTM_ESPOCRM_OPS.md) (*Correções 2026-08-03*).
- Leitura do experimento Ads: dados do braço tratamento anteriores ao fix subnotificam conversões — comparar a partir de 4/ago.

## Ops — 2026-08-03 (smoke 6 momentos Firebase/Espo/Octadesk)

- Smoke prod nos 6 momentos (form + modal WA + modal tel × initial/complete): EspoCRM `flyingdonkeys.com.br` OK (simulados no initial; update real no complete); RTDB `environment=production`; Octadesk `octadesk_sent` + HSM modal `cotacao_dados_recebidos`. Detalhe em [`docs/FASE_A_GTM_ESPOCRM_OPS.md`](docs/FASE_A_GTM_ESPOCRM_OPS.md).
- Achado: API `add_travelangels` sem DELETE (403) — purge de teste via arquivo de celular; dedupe `/api/lead` initial bloqueia 2º initial no mesmo telefone+ramo em 24h.

## [0.2.9] — 2026-08-02

### Added
- Kit OAuth ops em [`scripts/google-ops/`](scripts/google-ops/): GTM (`auth`, `gtm:whoami`, `gtm:inspect`, `gtm-apply-form-split`) + Ads API (`ads:whoami`, `ads-audit-experiment`, `ads-monitor-approvals`, recreate/remove Exp) + guia [`docs/GTM_ADS_OAUTH_OPS.md`](docs/GTM_ADS_OAUTH_OPS.md).

### Ops (fora do app Next) — conquistas do dia
- GTM **v39 Live**: split form consultor (`KL9b…`) vs RPA (`9VjS…`) + hostname; legado intocado (rollback v38).
- Ads: action RPA `9VjSCLSUx9ocENOW2IQD`; experimento **`Exp site novo vs legado 50/50`** Agendado (Diurna, 50/50, 3/ago–27/set, sem auto-apply).
- Braço Exp (conta NOVA `994-791-8772`): URLs só `comparaseguroonline.com.br`; sitelinks legado desvinculados; ads legado removidos; grupo **Auto** com 3 ENABLED **APPROVED**.
- OAuth Google Ads API validado; monitoramento de aprovação via API.
- Detalhe em [`docs/FASE_A_GTM_ESPOCRM_OPS.md`](docs/FASE_A_GTM_ESPOCRM_OPS.md) (*Conquistas 2026-08-02*).

## [0.2.8] — 2026-08-02

### Changed
- Formulário `/contato`: envio principal via **AWS SES** (identidade do legado `noreply@bpsegurosimediato.com.br`); Firebase/cron cPanel só como fallback.
- Destinatários: `adm@imediatoseguros.com.br`, `lrotero@gmail.com`, `alexkaminski70@gmail.com`.

### Added
- Cloud Functions auxiliares do contato (`listPendingContactMessages`, `markContactMessageSent`) + `firebase/functions/contact-email.js`.
- Variáveis `AWS_SES_*` em `.env.example` / `lib/env.ts`.

## Ops — 2026-08-02 (contato via AWS SES)

- Formulário `/contato`: envio principal via **AWS SES** (mesma conta/identidade do Cloud Run legado: `noreply@bpsegurosimediato.com.br`, região `sa-east-1`), template HTML limpo, `Reply-To` do visitante → `adm@imediatoseguros.com.br`.
- Destinatários do `/contato`: `adm@imediatoseguros.com.br` + `lrotero@gmail.com` + `alexkaminski70@gmail.com` (`contact.formEmailExtra`).
- Em produção na Vercel, PHP/SMTP cPanel deixam de ser tentados no request (evitam lentidão); Firebase + cron Exim permanecem como fallback se SES falhar.
- Cloud Run `send-email-notification` **não** é mais usado para `/contato` (template de lead com “ERRO NO ENVIO”).

## Ops — 2026-08-01 (páginas institucionais)

- Criada rota `/a-imediato` (link “Sobre” no menu) — antes 404; conteúdo só com dados de `lib/company.ts`.
- Criada rota `/seguradoras-parceiras` (antes 404): lista das 21 parceiras com assistência 24h e área do cliente (`lib/seguradoras.ts`); destaque no topo para acionar a seguradora direto em pane/emergência (evitar gargalo via corretor).
- Criada rota `/coberturas` (antes 404): hub das 16 coberturas de **Seguro Auto** (`lib/coberturas-auto.ts`) com descrição breve; aviso no topo para ler apólice/Condições Gerais (coberturas variam e podem não estar incluídas).
- Criada rota `/reputacao` (antes 404): nota/volume Google, análise temática das avaliações reais (`lib/reputation-insights.ts` + `fetchReputationPageData`), grade ampliada de depoimentos positivos.
- Criada rota `/contato` (antes 404): canais oficiais + formulário via `POST /api/contact` (evoluiu em 2026-08-02 para AWS SES; backup Firebase `contact_messages/`).

## Ops — 2026-08-01 (EspoCRM prod + onda 2)

- Entity Manager prod: 5 campos do funil + painel “Cotação do Site” + colunas list Lead.
- Role API: Note create; Task/User já ok. Secret `ESPOCRM_API_CONFIG.prod` preenchido (chave Cloud Run / `add_travelangels`; Tasks → Lucas Andrade); `deliverLead` redeployed.
- Smoke onda 2 PASS: `cWebpage=comparaseguroonline.com.br`, `cEtapaFunil` atualiza no progress. Sem release de código Next.

## [0.2.7] — 2026-07-31

### Changed
- **Seguradoras parceiras: 18 → 21** (confirmação do cliente, ver `docs/DADOS_OFICIAIS.md`): saem Darwin, Liberty e Usebens; entram Aliro (grafia oficial — pedido citava "Alliro"), BP Seguradora, Ituran, Mitsui Sumitomo, Suhai e Yelum (ex-Liberty Brasil).
- `lib/seguradoras.ts` reescrito com as 21 entradas em **ordem por reputação de mercado** (Porto, Azul, Itaú, Bradesco, Allianz, Tokio, Mapfre, HDI, Sompo, Yelum, Mitsui, Suhai, Youse, Justos, Pier, Aliro, Ezze, BP, Ituran, Loovi, Novo).
- `lib/company.ts` `insurersCount: 21` (propaga para Hero, CredBar, InsurersGrid, ComoFunciona); 8 ocorrências hardcoded "18" → "21" em `lib/ramos.ts` (subheadlines, título SEO da LP Auto, resposta de objeção) e texto do `RpaChoiceStep`.

### Added
- 6 novos logos SVG vetor puro em `/public/logos/seguradoras/` — origem/formato de cada um em `docs/BRAND_ASSETS.md` (5 oficiais dos sites das marcas; BP vetorizado via potrace por separação de cor a partir do PNG oficial).

### Removed
- `darwin.svg`, `liberty.svg`, `usebens.svg` de `/public/logos/seguradoras/`.

### Pendências
- Templates de WhatsApp no Octadesk aprovados na Meta ainda citam "18 seguradoras" — alterar exige nova aprovação da Meta (registrado em `docs/GUIA_OCTADESK_TEMPLATES.md`).

## [0.2.6] — 2026-07-29

### Added
- Evento dataLayer `form_quote_choice` (`aguardar` | `consultor`) no passo 4 do `LeadForm` — conversão Ads do formulário só nesses cliques.
- GTM **v38 publicada** (2026-07-29 15:50, aprovada pelo usuário após validação): DLV `modal_channel`; 3 acionadores filtrados; 3 tags Ads `[NovoSite]` (WA `ND-wCL…`, telefone `iwx7CN…`, form `KL9bCO…`). Versão só **adiciona** os 7 itens — legado intocado.
- Validação pré-Publish: disparos testados com o container do workspace em página isolada (WA → só `ND-wCL…`; telefone → só `iwx7…`; form → `KL9b…`; `generate_lead` → sem Ads); bundle prod `/cotacao` contém `form_quote_choice`.

### Changed
- Tag Ads NovoSite do form deixa de usar `generate_lead` (permanece funil/GA4) e passa a `form_quote_choice`.

## [0.2.5] — 2026-07-29

### Fixed
- `NEXT_PUBLIC_GTM_ID` (e demais IDs one-line) na Vercel estavam com sufixo `\r\n`, o que impedia o `gtm.js` de carregar e o Tag Assistant de conectar em `comparaseguroonline.com.br`. Vars regravadas sem newline; `lib/env.ts` sanitiza IDs one-line (não aplica a PEM/secrets multilinha).
- Ao limpar `NEXT_PUBLIC_APP_ENV=production`, `assertRequiredInProduction()` passou a rodar no **browser** (via import de `publicEnv`/`isProduction` no layout) e derrubava a home no error boundary (“Algo deu errado”). Assert agora é **server-only**.
- **Sem Publish Live** no GTM — container Live do legado `segurosimediato.com.br` permanece v37.

## [0.2.4] — 2026-07-29

### Added
- GTM ligado em produção (`NEXT_PUBLIC_GTM_ID=GTM-PD6J398`) em `comparaseguroonline.com.br`.
- Vars de produção: GA4, Ads (`AW-815139667` / label `KL9bCO__i6QcENOW2IQD`), WhatsApp/telefone, `IP_HASH_SALT`, Turnstile placeholder, `DATABASE_URL` placeholder.
- Ops: [`docs/FASE_A_GTM_ESPOCRM_OPS.md`](docs/FASE_A_GTM_ESPOCRM_OPS.md) (checklist GTM workspace + labels + virada CRM).
- Workspace GTM aditivo (sem Publish Live): acionadores `[NovoSite] CE - whatsapp_modal_submit` / `generate_lead` e tags Ads `[NovoSite] Ads - *` (labels `ND-wCL…` / `KL9bCO…`).

### Changed
- `NEXT_PUBLIC_APP_ENV=production` — novos leads com `environment: "production"` → EspoCRM **`flyingdonkeys.com.br`** via proxy `ESPOCRM_PROD_URL` (onda 1); e-mail admin PROD. Octadesk inalterado.

---

## [0.2.3] — 2026-07-29

### Added
- Campo opcional **Nome Completo** na etapa 2 dos modais WhatsApp/telefone (`ContactLeadModal`), ordem alinhada ao legado (CPF → E-mail → Nome → CEP → Placa).

### Changed
- `complete` do modal propaga `nome` ao EspoCRM (`firstName` / Opportunity `name`) e ao Octadesk (`target.contact.name` → `{{nome-contato}}` na 2ª HSM).
- `hasExtra` da 2ª HSM inclui nome real (além de e-mail/CEP/CPF/placa).

---

## [0.2.2] — 2026-07-29

### Added
- `captureChannel` (`contact_modal` | `lead_form`) no contrato de `/api/lead` — discrimina origem da captura.
- Octadesk: no `complete` do modal WhatsApp/telefone com dados extras, envia `cotacao_solicitada_util` (`cotacao_dados_recebidos` no secret).

### Changed
- Docs de templates/fluxo atualizados com o momento 1b dos modais.

---

## [0.2.1] — 2026-07-29

### Fixed
- Opportunity no EspoCRM não recebia `name` real em `progress`/`complete` (ficava com o nome falso do telefone do `initial`) — alinhado ao Lead e ao proxy legado (`buildOpportunityFields` em `espocrm.js`).

### Changed
- Harness E2E: `OPP_FIELDS` inclui `cEmailAdress`, `cCEP`, `cCpftext`, `cCelular`.
- `docs/FASE_ESTABILIZACAO_E2E_LEADS.md`: E6 documentado como resolvido.

---

## [0.2.0] — 2026-07-28

### Added
- E-mail admin na Cloud Function `deliverLead` (mesmo Cloud Run do legado), com dedupe por flags no RTDB (`firebase/functions/email-notification.js`).
- Recuperação de `espocrmLeadId` stale no EspoCRM (PUT 404/403 → find/create).
- Harness E2E EspoCRM (`e2e/testes-espocrm.spec.ts` + cases/resultados).
- Documento da nova fase: `docs/FASE_ESTABILIZACAO_E2E_LEADS.md` (erros E1–E5 a estabilizar).

### Fixed
- `cf_retry_count` consumido a cada estágio — agora sobe só em falha de entrega; reset no `stage: initial`.
- `ReferenceError` em `maybeSendAdminEmail` (destructuring `record` vs `workingRecord`).
- Rate limit de `/api/validate/*` compartilhado com leads — buckets separados `lead` vs `validate`.

### Changed
- Writes só de metadados na RTDB passam a ser ignorados pela CF (evita reentrada).
- Documentação de arquitetura de leads atualizada (e-mail admin + limites de retry).

### Known issues (próxima fase)
Ver `docs/FASE_ESTABILIZACAO_E2E_LEADS.md`: `rpa_desabilitado` intermitente, funil CRM incompleto na janela E2E, HTTP 409 por telefone reutilizado, cobertura parcial da bateria de 23 casos.

---

## [0.1.0] — baseline pré-release

Versão inicial do pacote (`package.json`). Histórico de commits anteriores permanece no Git sem tags semânticas formais até esta release.
