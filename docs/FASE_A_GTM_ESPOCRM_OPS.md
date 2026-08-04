# Fase A — GTM + virada EspoCRM prod (ops)

## Finalidade
Checklist operacional da Fase A (2026-07-29): ligar GTM no site novo e entregar leads no EspoCRM **produção** (`flyingdonkeys.com.br`).

## Status

| Item | Status |
|---|---|
| Secrets Firebase `ESPOCRM_PROD_URL` / e-mail PROD | Confirmados |
| `ESPOCRM_API_CONFIG.prod` | **OK 2026-08-01** — `useDirect` + bloco prod (API key Cloud Run `add_travelangels`); `taskAssignedUserId` = Lucas Andrade; deploy `deliverLead` |
| Vercel: GTM/GA4/Ads + `NEXT_PUBLIC_APP_ENV=production` | **OK** — valor limpo `production` (sem `\r\n`); StagingBanner ausente em 2026-08-01 (só permanece FraudAlert vermelho, intencional) |
| Container GTM Live `GTM-PD6J398` | Carrega no site após correção do ID (sem `\r\n`) + redeploy |
| Live legado `segurosimediato.com.br` | **Intacto** — tags legadas não editadas; v39 só altera/adiciona `[NovoSite]*` form |
| Environment GTM `Staging-NovoSite` | Ainda **não** criado (só Live/Latest) |
| Acionadores/tags aditivos contrato novo (`[NovoSite]*`) | **v38** (2026-07-29) + **v39** split form (2026-08-02) |
| Split form RPA/consultor + experimento Ads | **OK 2026-08-02** — ver secção *Conquistas 2026-08-02* abaixo |
| OAuth ops GTM + Google Ads API | **OK** — `scripts/google-ops` (conta Ads NOVA `994-791-8772`); monitor de aprovação ativo |
| Campos funil no EspoCRM **prod** (`cEtapaFunil` etc.) | **OK 2026-08-01** — 5 campos Lead+Opp, painel, list; Role API com Note create; onda 2 ativa (smoke PASS) |

---

## IDs

| Sistema | ID |
|---|---|
| GTM | `GTM-PD6J398` |
| GA4 | `G-694K3F1XQ1` |
| Google Ads (conversões / tag) | `AW-815139667` |
| Google Ads (conta experimento NOVA) | `994-791-8772` — *Imediato Seguros - NOVA* |
| Conversion labels no container Live | `iwx7CNffw4YBENOW2IQD`, `ND-wCL7t0LgbENOW2IQD`, `KL9bCO__i6QcENOW2IQD`, `9VjSCLSUx9ocENOW2IQD` (RPA) |
| Label RPA | `9VjSCLSUx9ocENOW2IQD` — action `[Compartilhada] Form - RPA aguardar cálculo` |
| Label gravado em `GOOGLE_ADS_CONVERSION_LABEL` (Vercel) | `KL9bCO__i6QcENOW2IQD` (⚠️ desatualizado desde v41: consultor agora usa `iwx7…`; env var é só documental) |
| Campanha base experimento | `ATIVA - Dias de Semana - 2026 - 04 - 22 - Diurna` (id `21287198336`) |
| Campanha Exp | id `24095000558` — sufixo `Exp site novo vs legado 50/50` |

O código Next **não** dispara `gtag('event','conversion')` — a conversão real é via tags do GTM. A env var documenta/valida boot de produção.

---

## Verificação GTM (browser 2026-07-29)

Conta **Imediato Seguros** · Contêiner `www.segurosimediato.com.br` · **`GTM-PD6J398`** · Workspace ativo · Live = versão **37** (“Inclusão dos dados personalizados”).

### Tags presentes (amostra)
- `Tag do Google G-694K3F1XQ1` (GA4)
- `Tag do Google AW-815139667` + `Vinculador de conversões`
- `Google Ads - Conversão Modal WhatsApp` ← acionador `Modal WhatsApp - Initial Contact`
- `Google Ads - Conversão no Modal do Telefone` ← acionador `CE - phone_modal_initial_contact`
- `Conversão Formulário Válido` ← `Form Submit Valid`
- `CookieYes CMP` (Inicialização de consentimento) — **conflito** com Consent Mode nativo do site novo
- Collect Chat / StepCounter — legado morto

### Eventos dos acionadores vs site novo

| Acionador GTM (legado) | Evento que dispara a tag | Site novo emite |
|---|---|---|
| Modal WhatsApp - Initial Contact | `whatsapp_modal_initial_contact` | **`whatsapp_modal_submit`** |
| CE - phone_modal_initial_contact | `phone_modal_initial_contact` | **`whatsapp_modal_submit`** (com `modal_channel`) |
| Form Submit Valid | (evento legado formulário) | **`generate_lead`** |

**Conclusão (antes da rodada aditiva):** com o container Live **publicado** (v37), conversões Ads do modal/form **não disparam** no site novo — mismatch de nomes. O workspace agora tem cópias aditivas (abaixo); **Live legado permanece intacto até Publish**.

### Itens aditivos `[NovoSite]` — **publicados na v38** (2026-07-29 15:50)

Protocolo seguido: só **adicionar**/ajustar itens `[NovoSite]*`; tags/acionadores legados intocados; CookieYes intocado; Publish só após validação dos disparos (aprovado pelo usuário). Versão 38 = 7 itens adicionados, zero modificações no legado.

| Item | Nome | Detalhe |
|---|---|---|
| Variável | `[NovoSite] DLV - modal_channel` | Data Layer Variable `modal_channel` |
| Acionador | `[NovoSite] CE - whatsapp_modal_submit - whatsapp` | CE `whatsapp_modal_submit` **e** `modal_channel` equals `whatsapp` |
| Acionador | `[NovoSite] CE - whatsapp_modal_submit - phone` | CE `whatsapp_modal_submit` **e** `modal_channel` equals `phone` |
| Acionador | `[NovoSite] CE - form_quote_choice` | Custom Event = `form_quote_choice` (passo 4 do LeadForm) |
| Tag Ads | `[NovoSite] Ads - whatsapp_modal_submit` | `AW-815139667` / `ND-wCL7t0LgbENOW2IQD` · valor 30 · BRL · → CE whatsapp |
| Tag Ads | `[NovoSite] Ads - phone_modal_submit` | `AW-815139667` / `iwx7CNffw4YBENOW2IQD` · valor 30 · BRL · → CE phone |
| Tag Ads | `[NovoSite] Ads - form_quote_choice` | `AW-815139667` / `KL9bCO__i6QcENOW2IQD` · valor 30 · BRL · → CE form_quote_choice |

**Momentos (site novo):**
- Modais WA/telefone: conversão no **submit final** do `ContactLeadModal` (`whatsapp_modal_submit` + `modal_channel`) — não no blur do telefone.
- Formulário: conversão Ads só no clique de **cálculo automático** (`choice: aguardar`) ou **assistido** (`choice: consultor`) via `form_quote_choice`. `generate_lead` continua no funil/GA4; **não** é a tag Ads NovoSite.
- “Prosseguir assim mesmo” (pula passo 4): **sem** tag Ads do form.

**Experimento Ads:** as 3 labels são as **mesmas actions** do legado; o relatório do experimento separa braços pelo clique (URL legado vs `comparaseguroonline.com.br`), não por action distinta.

**Preservação do legado:** v38 apenas **adiciona** os 7 itens `[NovoSite]` — nenhuma tag/acionador/variável legada modificada.

**Validação (2026-07-29, antes do Publish):** container do workspace testado em página isolada com consentimento concedido — WA modal → só `ND-wCL…`; telefone modal → só `iwx7…`; `form_quote_choice` → `KL9b…`; `generate_lead` → **nenhuma** conversão Ads. Bundle prod `/cotacao` contém push `form_quote_choice`. Após Publish, gtm.js Live confirmado com os 3 rótulos + `form_quote_choice`/`modal_channel`.

### Environments
Só **Live** e **Latest**. Live atual = **v42** (v41 fix labels + v42 dismiss GA4, ambas 2026-08-03). **Não existe** Environment Staging-NovoSite ainda.

---

## Conquistas 2026-08-02 (GTM + Ads + OAuth)

Resumo executivo do que foi concluído nesta data (legado preservado):

1. **GTM v39 Live** — split do formulário NovoSite: consultor → `KL9b…`; RPA aguardar → `9VjS…`; filtros `choice` + hostname `comparaseguroonline.com.br`; CE form sem filtro removido. Preview OK; Publish via API. Rollback = v38.
2. **Ads conversion RPA** — action `[Compartilhada] Form - RPA aguardar cálculo` (`9VjSCLSUx9ocENOW2IQD`, 30 BRL, primária). Actions legadas/modais **não** alteradas.
3. **Experimento Ads** `Exp site novo vs legado 50/50` — status **ENABLED/Agendado**; 3/ago–27/set/2026; 50/50; sem auto-apply na campanha original; sync on. Base = Diurna (SERVING); braço Exp = PENDING até o início.
4. **Braço Exp alinhado ao domínio novo** (API, conta `994-791-8772`): URLs → `comparaseguroonline.com.br` (`/cotacao`, `/seguro-moto`, `/seguro-caminhao`, …); sitelinks legado desvinculados da campanha/grupos; anúncios antigos com domínio misto **removidos** (política “um site por grupo”).
5. **Aprovação (monitor API):** grupo **Auto** (único grupo ENABLED do Exp) — 3 ads ENABLED todos **APPROVED** (`/cotacao`). Moto / Caminhão / 02 outubro — ads ENABLED **APPROVED** (grupos pausados). *Cotação Seguro Online* — grupo pausado; ads ENABLED **DISAPPROVED** (não bloqueia o Exp enquanto pausado).
6. **OAuth ops** — kit [`scripts/google-ops/`](../scripts/google-ops/) + [`GTM_ADS_OAUTH_OPS.md`](GTM_ADS_OAUTH_OPS.md): Tag Manager + Google Ads API (`ads:whoami`, `ads-audit-experiment`, `ads-monitor-approvals`). Release **v0.2.9** no GitHub.
7. **Contato (mesmo dia, v0.2.8)** — `/contato` via AWS SES (já documentado no CHANGELOG).

**Próximo acompanhamento:** a partir de 3/ago, Exp deve ir a SERVING (50/50); ler relatório Controle vs Tratamento; opcional Contestar/limpar grupo *Cotação Seguro Online*; Environment Staging-NovoSite continua opcional.

---

## Correções 2026-08-03 — zero conversões no braço Exp (site novo)

Investigação do dia 1 do experimento (tráfego real ok, leads no Firebase com `gclid`, mas **0 conversões** no braço tratamento) encontrou duas causas; ambas corrigidas no mesmo dia. Legado intocado.

### 1. Bug de Consent Mode v2 no site novo (causa raiz)

`components/consent/ConsentBanner.tsx` empurrava o comando `consent update` como **Array** (`dataLayer.push(args)` com rest params) em vez de um objeto **`arguments`** genuíno. O Google tag ignora Arrays em silêncio → consentimento ficava `denied` para sempre mesmo após "Aceitar tudo" (`gcs=G100`, sem cookies `_gcl_*`), zerando conversões Ads e subnotificando GA4.

- **Fix:** `function gtag() { dataLayer.push(arguments) }` (deploy Vercel 2026-08-03).
- **Prova pós-fix (Playwright em prod):** após aceite, `google_tag_data.ics` com `update:true` em `ad_storage`/`analytics_storage`/`ad_user_data`/`ad_personalization`; pings com **`gcs=G111`**; cookie `_gcl_au` criado.

### 2. Labels cruzados nas tags [NovoSite] — GTM **v41** (publicada via API)

As labels `KL9b…` e `iwx7…` estavam **invertidas** em relação às actions do Ads (`iwx7…` = *Envio de Formulário de Lead na Página*, primária; `KL9b…` = *Preencher o telefone no modal*, secundária):

| Tag | Antes (v39/v40) | Depois (v41) |
|---|---|---|
| `[NovoSite] Ads - form_quote_choice - consultor` | `KL9b…` (action modal telefone, **secundária** → não contava) | `iwx7…` (action formulário, primária — maçãs-com-maçãs com o legado) |
| `[NovoSite] Ads - phone_modal_submit` | `iwx7…` | `KL9b…` (igual ao legado; action secundária — promover a primária no Ads se quiser que conte) |

Diff da v41 = **somente essas 2 tags** `[NovoSite]`; WA (`ND-wCL…`) e RPA (`9VjS…`) inalteradas. Teste pós-publish em prod: `form_quote_choice` consultor → conversão `iwx7…`; `whatsapp_modal_submit` phone → `KL9b…`; ambos `gcs=G111`. Rollback = republicar v40.

**Impacto no experimento:** dias 3/ago (e anteriores ao fix) subnotificam conversões do braço tratamento — considerar iniciar a leitura comparativa a partir de 4/ago.

---

## Skip do modal só após telefone + medição de abandono (2026-08-03, GTM **v42**)

Decisão do cliente: o link "Prefiro ir direto, sem preencher" do `ContactLeadModal` (visível desde a abertura e que navegava ao WhatsApp/telefone **sem registrar nada**) era um ponto cego. Mudanças (site + GTM v42, publicada via API):

- **Etapa 1 (só DDD+Celular):** sem link de skip. Escape continua pelo ×/Esc/clique fora, que segue navegando ao destino (decisão anti-beco-sem-saída de 2026-07-08 preservada).
- **Etapa 2 (telefone validado):** novo link **"Prosseguir sem preencher o resto"** — é um `type="submit"`: atualiza o lead (`stage: "complete"` só com telefone), dispara `whatsapp_modal_submit` (conversão Ads `ND-wCL…`/`KL9b…`) e navega. Antes esse caminho perdia a conversão.
- **Novo evento `whatsapp_modal_dismiss`** (×/Esc/clique fora) com `modal_step` (1 = sem telefone; 2 = telefone já capturado via lead `initial`) — só GA4, **sem tag Ads** (abandono não é conversão).
- **GTM v42 (aditivo, 5 itens `[NovoSite]`):** DLVs `modal_step`/`location`/`ramo`; CE `whatsapp_modal_dismiss` + hostname; tag GA4 `[NovoSite] GA4 - whatsapp_modal_dismiss` (`G-694K3F1XQ1`) com os 4 params. Legado intocado; rollback = republicar v41.

**Verificação em prod (Playwright, `/api/lead` mockado para não criar leads reais):** etapa 1 sem link; × → `whatsapp_modal_dismiss` `modal_step:1` + hit GA4 (`gcs=G111`); blur do celular → `POST /api/lead` `stage:initial`; link da etapa 2 → `stage:complete` + `whatsapp_modal_submit` + conversão Ads `ND-wCL…` `gcs=G111`.

---

## Paridade de momentos de conversão com o legado (2026-08-04, GTM **v43**)

Problema (análise 2026-08-03): os braços do experimento convertiam em **momentos diferentes** — legado no **contato inicial** (blur do telefone) e site novo no **submit final** do modal; além disso, os acionadores modais `[NovoSite]` sem filtro de hostname faziam as tags novas dispararem também no legado (dupla contagem potencial), e as tags `[NovoSite]` enviavam valor 30 BRL onde a tag legada de formulário não enviava valor.

Solução implementada (site + GTM v43, deploy Vercel ~07:10 de 2026-08-04):

- **Site novo emite os eventos legados** `whatsapp_modal_initial_contact` / `phone_modal_initial_contact` no blur do telefone validado (`sendInitialContact` do `ContactLeadModal`, 1× por abertura) — as **tags Ads legadas** (`Modal WhatsApp - Initial Contact` → `ND-wCL…`; `CE - phone_modal_initial_contact` → `KL9b…`) passam a disparar identicamente nos dois braços: mesmo momento, mesma action, mesmo valor (30 BRL, que as tags modais legadas sempre enviaram).
- **Tags `[NovoSite] Ads - whatsapp_modal_submit` e `- phone_modal_submit` PAUSADAS** — elimina o disparo duplicado no submit e o cross-firing no site legado (o push de `whatsapp_modal_submit` continua no submit final, sem tag Ads ativa; disponível para GA4/funil).
- **`conversionValue`/`currencyCode` removidos das 4 tags Ads `[NovoSite]`** (consultor, aguardar/RPA e as 2 modais pausadas) — simetria com a tag legada de formulário (`Form Submit Valid`, sem valor). Se quisermos valores no futuro, definir valor padrão na conversion action do Ads (vale igual para os dois braços).
- Diff da v43 = somente as 4 tags `[NovoSite]`; legado intocado; rollback = republicar v42.

**Verificação em prod (Playwright, `/api/lead` mockado):** blur do telefone no modal WA → 1 conversão `ND-wCL…` (`gcs=G111`, value=30 — tag legada); submit final → **nenhum** ping Ads; `phone_modal_initial_contact` → `KL9b…`; form consultor → `iwx7…` **sem** valor/moeda.

**Leitura do experimento:** a partir do deploy de 2026-08-04 (~07:10 BRT) os braços têm paridade total de momento/action/valor nos modais — comparar Controle vs Tratamento a partir de **5/ago** para dias cheios e simétricos. **Superada em parte pela v44 (mesma manhã, abaixo): o funil do formulário deixou de ser simétrico por decisão do cliente; modais seguem simétricos.**

---

## Conversão do formulário no telefone (2026-08-04, GTM **v44**)

Decisão do cliente (~08:00 BRT, mesma manhã da v43): a conversão Ads do **formulário** antecipa da etapa 4 para o **passo 1** (telefone validado) — o Ads passa a contar no mesmo instante em que o lead `initial` é criado e EspoCRM/Octadesk são sensibilizados, espelhando os modais. Cliente ciente e de acordo com a **assimetria** que isso cria no experimento (formulário legado converte no envio final).

- **Site** (deploy Vercel): novo evento `form_initial_contact` (`lib/analytics.ts`), emitido 1× em `sendInitialContact()` do `LeadForm` (guarda `initialCallInFlightRef`), fire-and-forget antes do `POST /api/lead`. `form_quote_choice` continua na etapa 4 (GA4/funil).
- **GTM v44 Live** (via API): acionador `[NovoSite] CE - form_initial_contact` (Custom Event + hostname `comparaseguroonline.com.br`) + tag `[NovoSite] Ads - form initial contact` (`awct`, `AW-815139667`, label `iwx7CNffw4YBENOW2IQD` — mesma action primária de formulário —, **sem** valor/moeda, Conversion Linker). Tags `[NovoSite] Ads - form_quote_choice - consultor` e `- aguardar` **pausadas** (1 conversão por jornada; a action RPA `9VjS…` fica sem tag ativa). Diff = 4 itens `[NovoSite]`; legado intocado; rollback = republicar v43. (Workspace de ensaio 48 ficou órfão no container — token OAuth sem escopo de delete; apagar na UI se incomodar.)
- **Verificação em prod (Playwright, `/api/lead` e `/api/validate/*` mockados)**: passo 1 → 1 ping `iwx7` com `value=0` (sem valor/moeda configurados); etapa 4 (consultor) → **nenhum** ping novo; modal WA → `ND-wCL…` no blur, inalterado; modal não dispara `iwx7`.
- **Leitura do experimento**: braço tratamento converte mais cedo no funil do formulário desde ~08:00 BRT de 4/ago — esperar volume maior de conversões de formulário no tratamento por construção (conversão mais rasa no funil), não necessariamente por desempenho. Modais permanecem simétricos (v43).

---

## Telemetria GA4 dos envios finais (2026-08-04, GTM **v45**)

Complemento analítico da v44 (zero tags Ads — conversões intactas): os 4 cliques de envio final passam a chegar ao GA4 `G-694K3F1XQ1`, fechando o funil pós-conversão.

- **Site** (deploy Vercel): `whatsapp_modal_submit` ganha `submit_mode: "full" | "skip"` (`skipSubmitRef` marcado no clique de "Prosseguir sem preencher o resto" no `ContactLeadModal`).
- **GTM v45 Live** (via API): DLV `[NovoSite] DLV - submit_mode` (a `- modal_channel` já existia da v42); acionadores `[NovoSite] CE - whatsapp_modal_submit (GA4)` e `- form_quote_choice (GA4)` (Custom Event + hostname; os CEs antigos das tags Ads pausadas não foram tocados); tags `[NovoSite] GA4 - whatsapp_modal_submit` (`modal_channel`/`submit_mode`/`location`/`ramo`) e `- form_quote_choice` (`choice`/`ramo`). Diff = 5 itens `[NovoSite]`, nenhuma tag `awct`; legado intocado; rollback = republicar v44.
- **Verificação em prod (Playwright, `/api/lead` e `/api/validate/*` mockados, 9/9 PASS)**: modal WA skip → GA4 `submit_mode=skip` (Ads `ND-wCL…` no blur intacto, nenhum Ads no submit); modal tel envio completo → `submit_mode=full`/`modal_channel=phone` (`KL9b…` intacto); form etapa 4 consultor → `form_quote_choice` `choice=consultor` (`iwx7…` do passo 1 intacto, nenhum Ads na etapa 4).

**Funil GA4 completo por superfície:**

| Superfície | Conversão Ads (momento) | Telemetria GA4 pós-conversão |
|---|---|---|
| Form | `form_initial_contact` (telefone, passo 1) | `form_quote_choice` (`choice` consultor/aguardar) |
| Modal WA | `whatsapp_modal_initial_contact` (blur) | `whatsapp_modal_submit` (`submit_mode` full/skip) ou `whatsapp_modal_dismiss` |
| Modal tel | `phone_modal_initial_contact` (blur) | `whatsapp_modal_submit` (`modal_channel=phone`) ou `whatsapp_modal_dismiss` |

**Admin GA4 — CONCLUÍDO via Analytics Admin API (2026-08-04)** na property `Seguros Imediato – GA4` (`properties/281067607`, stream `G-694K3F1XQ1`):

1. Dimensões personalizadas (escopo **Evento**) criadas: `modal_channel`, `submit_mode`, `choice`, `location`, `ramo`, `modal_step` (display name = nome do parâmetro; a API não aceita `/`, parênteses ou acentos). Já existiam: `event_category`, `event_label`.
2. Key events criados: `whatsapp_modal_submit` e `form_quote_choice` (juntam-se a `purchase`, `solicitar_cotação`, `qualify_lead`, `close_convert_lead`). Não vira conversão Ads — não afeta o experimento.

Pré-requisitos que foram necessários: habilitar a **Google Analytics Admin API** no projeto GCP do OAuth kit; conceder papel na property ao e-mail do token (`lrotero@gmail.com`); re-login com `node auth-login.mjs --with-analytics` (escopo `analytics.edit`).

**Leitura de relatórios (2026-08-04, tarde):** `--with-analytics` passou a incluir também o escopo `analytics.readonly` (GA4 **Data API** — `runReport`/`runRealtimeReport` via `getAnalyticsData()` em `lib/auth.mjs`); a "Google Analytics Data API" foi habilitada no projeto `leads-imediato-seguros` via `gcloud services enable analyticsdata.googleapis.com`. Token atual cobre GTM + Ads + Admin + leitura GA4.

---

## Consent opt-out — paridade com o legado (2026-08-04, tarde)

**Achado (auditoria via GA4 Data API + Playwright):** com o modelo opt-in (default denied), a "Tag do Google G-694K3F1XQ1" — que tem consent **obrigatório** `analytics_storage` e dispara no page load/history change — **nunca disparava no site novo**: o page load sempre antecede o clique em "Aceitar tudo", e a tag não re-dispara quando o consentimento chega depois. Evidências: 03/08 com 76 cliques pagos no braço Exp → **1 sessão** GA4 no hostname novo (nosso teste) vs 492 no legado; 5 leads reais com `gclid` no RTDB desde 03/08 e **zero conversões Ads** no Exp; no legado, o CookieYes grava `_ga` **sem interação** (opt-out de fato), enquanto o site novo exigia opt-in — experimento com medição assimétrica.

**Correção (decisão do cliente):** o site novo adota a mesma postura do legado.

- `GtmConsentScripts.tsx`: default granted para `ad_storage`/`ad_user_data`/`ad_personalization`/`analytics_storage`; o script beforeInteractive lê `imediato_consent` do localStorage e mantém **denied** para quem já rejeitou (a rejeição vale desde o primeiro page_view). `wait_for_update` removido.
- `ConsentBanner.tsx`: informativo (aparece até o visitante decidir; toggles default true); "Rejeitar"/preferências continuam funcionando e persistindo.
- **GTM v46 Live** (descoberto na verificação): o default granted do site **não bastava** — a tag compartilhada **CookieYes CMP** (Consent Initialization, todas as páginas) setava default **denied** por cima e, sem o cookie `cookieyes-consent` (só existe no legado), nunca revertia. v46 adiciona o acionador de exceção `[NovoSite] Consent Init - hostname novo` (consentInit + hostname contém `comparaseguroonline.com.br`) como blocking trigger da tag CookieYes. Diff = 2 itens; legado intocado (CookieYes segue carregando lá e gravando `_ga` sem interação — verificado); rollback = republicar v45.
- **Verificação em prod (Playwright, iPhone 13)**: site novo sem interação → `page_view` GA4 `gcs=G111` em `analytics.google.com/g/collect`, cookies `_ga`/`_ga_694K3F1XQ1`/`_gcl_au`, banner ainda visível; "Rejeitar" + reload → só pings `gcs=G100`.
- Leitura limpa do experimento **a partir de 05/08** (dados do braço Exp de 03–04/08 subnotificam GA4 e conversões).

---

## Marcador de origem nos e-mails de alerta (2026-08-04, noite)

Os alertas de lead dos dois sites saem pelo **mesmo Cloud Run legado** (`send-email-notification-prod`), com o mesmo template — eram indistinguíveis. Como `momento_descricao`/`momento_emoji` são renderizados como chegam no payload (o legado monta os dele no browser, `MODAL_WHATSAPP_DEFINITIVO.js`), a CF do site novo ([`firebase/functions/email-notification.js`](../firebase/functions/email-notification.js)) passou a prefixar `momento_descricao` com **`comparaseguroonline — `** e usar emoji `🆕` (momentos normais; `❌` mantido nos de erro). Cobre todos os disparos (`initial`, `update` e erros, incl. pós-Octadesk) num único ponto (`MOMENTO_META`). Cloud Run e legado intocados. Testado em dev (4 e-mails OK, registros purgados).

---

## Baseline Live (2026-08-02, pré-split)

Lido do `gtm.js` público `GTM-PD6J398` (sem login):

| Checagem | Resultado |
|---|---|
| Evento `form_quote_choice` | Presente (acionador único, **sem** filtro `choice`) |
| DLV `choice` | **Ausente** no Live |
| DLV `modal_channel` | Presente |
| Filtro hostname `comparaseguroonline.com.br` | **Ausente** no container |
| Labels Ads ativos | `KL9bCO__i6QcENOW2IQD`, `ND-wCL7t0LgbENOW2IQD`, `iwx7CNffw4YBENOW2IQD` |
| Rollback GTM | Versão Live atual = **v38** (não publicar sem Preview + smoke legado) |

**Ads (manual, antes de mudar):** exportar/capturar 7 dias de conversões das 3 actions + CPA da(s) campanha(s) do experimento. **Não** editar settings dessas actions.

---

## Split form RPA/consultor + experimento Ads (runbook)

Status: **executado 2026-08-02** (GTM v39 + experimento agendado + braço Exp corrigido). Runbook abaixo permanece como referência / rollback. OAuth: [`GTM_ADS_OAUTH_OPS.md`](GTM_ADS_OAUTH_OPS.md).

### Salvaguardas do legado (obrigatório)

1. Só criar/ajustar itens cujo nome começa com `[NovoSite]`.
2. Diff do Publish = **zero** mudanças em tags/acionadores/variáveis legadas (CookieYes, Formulário Válido, modais legado, Tag Google, Conversion linker).
3. Tags form NovoSite exigem **Page Hostname contém `comparaseguroonline.com.br`**.
4. Não renomear nem alterar valor/contagem/goal/status das actions `KL9b…`, `ND-wCL…`, `iwx7…`.
5. Action RPA é **só aditiva**.
6. Experimento via **Campaign experiment** (controle = URLs legado); não reescrever URLs da campanha base.
7. Pausar o CE `[NovoSite] CE - form_quote_choice` sem filtro (evitar double-count).
8. Rollback: republicar v38; encerrar experimento Ads sem apagar actions.

### Fase 1 — Google Ads (`AW-815139667`)

1. Criar conversion action **`[Compartilhada] Form - RPA aguardar cálculo`**:
   - Categoria/goal iguais à action da KL9b
   - Valor **30 BRL**; contagem alinhada à KL9b
   - Incluir no mesmo conversion goal das campanhas Maximize conversions do experimento
2. Anotar label: `AW-815139667/<LABEL_RPA>` → preencher abaixo e na tabela de IDs.
3. Não tocar nas 3 actions existentes.

**Label RPA:** `AW-815139667/9VjSCLSUx9ocENOW2IQD` (criada 2026-08-02; primária; 30 BRL; categoria Enviar formulário de lead)

### Fase 2 — GTM workspace (`GTM-PD6J398`)

| Ação | Item |
|---|---|
| Criar | Variável `[NovoSite] DLV - choice` — Data Layer Variable `choice` |
| Criar | Acionador `[NovoSite] CE - form_quote_choice - consultor` — CE `form_quote_choice` **e** `choice` equals `consultor` **e** Page Hostname contains `comparaseguroonline.com.br` |
| Criar | Acionador `[NovoSite] CE - form_quote_choice - aguardar` — CE `form_quote_choice` **e** `choice` equals `aguardar` **e** Page Hostname contains `comparaseguroonline.com.br` |
| Ajustar | Tag `[NovoSite] Ads - form_quote_choice` → renomear `[NovoSite] Ads - form_quote_choice - consultor`; manter `KL9bCO__i6QcENOW2IQD` / 30 BRL; acionador **consultor** |
| Criar | Tag `[NovoSite] Ads - form_quote_choice - aguardar` → label RPA nova / 30 BRL; acionador **aguardar** |
| Pausar | Acionador `[NovoSite] CE - form_quote_choice` (sem filtro) — nenhuma tag deve usá-lo |
| Não tocar | Tags `[NovoSite]` WA/telefone; todos os itens legados |

Antes do Publish: **Compare to Live** → só mudanças `[NovoSite]*`.

### Fase 3 — Preview + smoke (gate)

**Novo (`comparaseguroonline.com.br/cotacao`, consentimento ok):**

| Ação | Esperado |
|---|---|
| Passo 4 consultor | 1× tag consultor (KL9b); 0× RPA |
| Passo 4 aguardar | 1× tag aguardar (label RPA); 0× KL9b |
| Modal WA / telefone | só tags modal |
| `generate_lead` | nenhuma Ads NovoSite form |

**Legado (`segurosimediato.com.br`):**

| Ação | Esperado |
|---|---|
| Formulário / modal legado | tags **legadas** como antes |
| Tags `[NovoSite] Ads - form_quote_choice - *` | **não** disparam |

Só então Publish (nota: “NovoSite split form consultor/RPA + hostname; legado intocado”). Manter v38 para rollback.

### Fase 4 — Experimento Ads

1. Campaign experiment 50/50 (ou % menor no teste se quiser reduzir impacto no volume do legado).
2. Controle: URLs `segurosimediato.com.br`.
3. Teste: URLs equivalentes `comparaseguroonline.com.br`.
4. Métricas: goal compartilhado (WA + telefone + KL9b + RPA nova).
5. Não migrar 100% do tráfego até o experimento concluir.

**Como ler**

- **Website:** só Controle vs Experimento.
- **Botão RPA vs consultor:** só braço teste / domínio novo (KL9b vs action RPA).
- **Especialista maçãs-com-maçãs:** KL9b no controle (legado) vs KL9b no teste com `choice=consultor`.

### Estado Live **v39** (2026-08-02) — publicado

Publicado via API: versão **39** — “NovoSite split form consultor/RPA + hostname”. Rollback = republicar v38.

| Item | Nome | Detalhe |
|---|---|---|
| Variável | `[NovoSite] DLV - choice` | DLV `choice` |
| Acionador | `[NovoSite] CE - form_quote_choice - consultor` | CE + `choice=consultor` + hostname `comparaseguroonline.com.br` |
| Acionador | `[NovoSite] CE - form_quote_choice - aguardar` | CE + `choice=aguardar` + hostname `comparaseguroonline.com.br` |
| Acionador | `[NovoSite] CE - form_quote_choice` | **Removido** do workspace |
| Tag Ads | `[NovoSite] Ads - form_quote_choice - consultor` | `KL9bCO__i6QcENOW2IQD` · 30 BRL |
| Tag Ads | `[NovoSite] Ads - form_quote_choice - aguardar` | `9VjSCLSUx9ocENOW2IQD` · 30 BRL |
| Action Ads | `[Compartilhada] Form - RPA aguardar cálculo` | `AW-815139667/9VjSCLSUx9ocENOW2IQD` |

**Experimento Ads — Agendado/ENABLED (2026-08-02):**
- Nome: `Exp site novo vs legado 50/50` · conta NOVA `994-791-8772`
- Original: `ATIVA - Dias de Semana - 2026 - 04 - 22 - Diurna` id `21287198336` (SERVING, URLs legado)
- Tratamento: id `24095000558` (PENDING até 3/ago; depois SERVING esperado)
- Split 50/50; métricas Conversões + CPA; **sem** aplicação automática; sync ativado; 3/ago–27/set/2026
- Braço Exp: só domínio `comparaseguroonline.com.br`; sitelinks legado removidos; Auto ENABLED + 3 ads APPROVED

**Como ler:** website = Controle vs Tratamento; botão RPA vs consultor = `9VjS…` vs `KL9b…` no domínio novo.

**Ops API:** `npm run ads:whoami` · `node ads-audit-experiment.mjs` · `node ads-monitor-approvals.mjs` (snapshot local gitignored).

---

## A4 — GA4 / Ads (manual)

1. GA4: stream ou filtro `hostname` para `comparaseguroonline.com.br`.
2. DebugView: `generate_lead`, `whatsapp_modal_submit`.
3. Key events: os dois acima.
4. Ads: confirmar que as actions `Submit lead form` / `Other` das campanhas ativas recebem hits do domínio novo (mesmas actions do Maximize conversions).

---

## EspoCRM prod — campos funil (antes da onda 2 API direta)

**Concluído 2026-08-01** em `flyingdonkeys.com.br` + Firebase `imediato-seguros-site-novo`:

- Campos em **Lead** e **Opportunity**: `cEtapaFunil`, `cEscolhaCalculo`, `cStatusCalculo`, `cValorRecomendado`, `cValorAlternativo` + painel **“Cotação do Site”** + colunas list Lead
- Role **API** (userada por `add_travelangels` / chave Cloud Run prod): já tinha Task+User; **Note** create/read/edit ampliado
- Secret `ESPOCRM_API_CONFIG`: bloco `prod` com `baseUrl=https://flyingdonkeys.com.br`, API key do Cloud Run `add-flyingdonkeys-prod` (user `add_travelangels`), `taskAssignedUserId=668c4847e4cb545ee` (Lucas Andrade); `useDirect:true`; deploy `deliverLead`
- **Smoke onda 2:** `initial` → `cWebpage=comparaseguroonline.com.br`, `cEtapaFunil=Telefone informado`; `progress` → nome real + `Dados pessoais` no Lead e na Opportunity. RTDB/Lead de teste removidos.

---

## Virada CRM (já aplicada via env)

Interruptor: `NEXT_PUBLIC_APP_ENV=production` → backup Firebase `environment: "production"` → CF usa `ESPOCRM_PROD_URL` (proxy → `flyingdonkeys.com.br`) + e-mail PROD. Octadesk inalterado.

### Smoke 2026-07-29
- Lead RTDB `ld_fase_a_prod_*` com `environment=production`, `octadesk_sent=true` (sem WA).
- Resultado: `espocrmLeadId=6a6a00312d24538d3`, `espocrmOpportunityId=6a6a00317e6f598bc`, `SMOKE_ESPO_PROD PASS`.
- RTDB limpo; **apagar Lead/Opp de teste na UI de `flyingdonkeys.com.br`**.
- **Comercial:** novos leads do site novo passam a cair no CRM de **produção**.

### Smoke 6 momentos (2026-08-03) — Firebase → Espo prod + Octadesk

Telefone de teste `11-91653-5000`; nome complete `LUCIANO TESTE 6M`; e-mails `lroteroform6m` / `lroterowa6m` / `lroterotel6m` @gmail.com. CRM: `flyingdonkeys.com.br` via `useDirect` + user `add_travelangels`.

| Momento | Método | EspoCRM | Octadesk (RTDB flags) | Resultado |
|---|---|---|---|---|
| A1 Form initial | `POST /api/lead` stage=initial | Lead+Opp criados; nome/e-mail **simulados**; `cWebpage=comparaseguroonline.com.br`; `cEtapaFunil=Telefone informado`; Opp `Novo Sem Contato` (Lead `6a706dc565c83d6e1` / Opp `6a706dc67a8435828`) | HSM initial (confirmar no aparelho); CF prod | **PASS** |
| A2 Form complete | progress + consultant_requested + complete | Mesmo Lead; nome/e-mail reais; CPF/CEP/placa; `cEtapaFunil=Cálculo manual pendente`; `cEscolhaCalculo=Receber depois` | Sem reenvio HSM initial | **PASS** |
| B1 Modal WA initial | RTDB write `ld_6m_wa_*` (ver nota dedupe) | Lead+Opp simulados (`6a706f380cf8d82fd` / `6a706f392534fbe05`) | `octadesk_sent=true` | **PASS** |
| B2 Modal WA complete | RTDB update complete + extras | Lead/Opp atualizados (`lroterowa6m@…`) | `octadesk_sent` + **`octa_cotacao_dados_recebidos_sent=true`** | **PASS** |
| C1 Modal tel initial | RTDB write `ld_6m_tel_*` | Lead+Opp simulados (`6a706fc979367efcb` / `6a706fca980a28953`) | `octadesk_sent=true` | **PASS** |
| C2 Modal tel complete | RTDB update complete + extras | Lead/Opp atualizados (`lroterotel6m@…`) | `octadesk_sent` + **`octa_cotacao_dados_recebidos_sent=true`** | **PASS** |

**Notas ops:**
- Purge DELETE via API = **403** (Role do `add_travelangels` sem delete). Entre fluxos, leads de teste foram **arquivados** (PUT `cCelular`/`email` com prefixo `ARCHIVED` / `0000006M…`) para liberar o número. Apagar manualmente na UI se desejado.
- Após o Fluxo A, `POST /api/lead` stage=`initial` com o **mesmo** telefone+ramo em &lt;24h **não** recria lead (dedupe idempotente em `route.ts`) — por isso B/C usaram gravação direta no RTDB `environment=production` para exercitar a CF isoladamente (mesmo caminho que o site após o backup Firebase).
- Confirmar no WhatsApp do `91653-5000` as HSM `primeira_etapa` (3×) e `cotacao_dados_recebidos` (2× nos completes de modal).

### Opportunity nova por jornada (2026-08-04) — política do `useDirect`

Decisão do cliente: prospect recorrente (nova jornada, dias/meses depois) ganha **Opportunity nova** ("Novo Sem Contato", 10%); as antigas ficam intocadas. Implementado em [`firebase/functions/espocrm.js`](../firebase/functions/espocrm.js) (`deliverStage`) + deploy `deliverLead`:

- **Lead**: dedupe inalterado (`espocrmLeadId` salvo → e-mail real → `cCelular`) — continua 1 Lead por prospect, atualizado.
- **Opportunity**: reaproveitada só via `espocrmOpportunityId` do registro RTDB da jornada corrente. Removida a busca por `cLeadId` no CRM (`findOpportunityByLeadId`); PUT stale (404/403) cria nova direto.
- **Teste dev** (`dev.flyingdonkeys.com.br`, gravação direta no RTDB `environment=development`): 2 jornadas mesmo telefone → 1 Lead + **2 Opportunities**; `complete` manteve a Opp da jornada; ID stale forjado → Opp nova (não recuperou a antiga). Purge OK (Espo dev com a chave do bloco `dev` aceita DELETE, diferente do prod).
- **Ressalvas**: janela de dedupe de 24h do `/api/lead` ≈ mesma jornada; pipeline passa a ter múltiplas Opps por prospect — relatórios não devem assumir `cLeadId` único; fechamento das Opps antigas paradas fica a cargo do processo/automação no CRM. Site legado segue no proxy antigo (atualiza a Opp existente) — comportamentos coexistem na mesma base.
