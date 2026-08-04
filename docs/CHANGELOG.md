# CHANGELOG

## Finalidade
Histórico de mudanças do projeto (Conventional Commits).

## Origem
Derivado de `ESPECIFICACAO v3.md` (convenção das seções 23/58) e `PLANO_IMPLEMENTACAO.md` rev. 4.1 (seção 4).

## Status
ATIVO (preenchido a cada release)

---

## [0.2.16] — 2026-08-04 (consent opt-out, paridade com o legado)

### Changed
- [`components/consent/GtmConsentScripts.tsx`](components/consent/GtmConsentScripts.tsx): Consent Mode v2 default passa de denied para **granted** (opt-out), lendo a rejeição salva (`imediato_consent`) ainda beforeInteractive; [`components/consent/ConsentBanner.tsx`](components/consent/ConsentBanner.tsx) vira informativo (toggles default true; "Rejeitar" continua funcionando e persiste). Decisão do cliente, 2026-08-04, espelhando o legado (CookieYes grava `_ga` sem interação).
- **Motivo (achado da auditoria via GA4 Data API)**: com opt-in, a "Tag do Google G-694K3F1XQ1" (consent obrigatório `analytics_storage`, acionador de page load) **nunca disparava** no site novo — page load sempre antecede o aceite. Resultado: 1 sessão GA4 no site novo vs 492 no legado em 03/08 e **zero conversões Ads no braço Exp** apesar de 5 leads reais com `gclid` no RTDB. A medição do experimento estava assimétrica; leitura limpa a partir de 5/ago.

### Ops (fora do app Next)
- OAuth kit: `--with-analytics` agora inclui `analytics.readonly` (GA4 Data API para relatórios); "Google Analytics Data API" habilitada no projeto GCP via gcloud. Zero mudanças no GTM (Live segue v45) e zero mudanças no legado.

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
