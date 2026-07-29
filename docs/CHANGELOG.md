# CHANGELOG

## Finalidade
Histórico de mudanças do projeto (Conventional Commits).

## Origem
Derivado de `ESPECIFICACAO v3.md` (convenção das seções 23/58) e `PLANO_IMPLEMENTACAO.md` rev. 4.1 (seção 4).

## Status
ATIVO (preenchido a cada release)

---

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
