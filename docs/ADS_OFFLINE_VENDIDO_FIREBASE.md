# Offline Conversion Ads no evento Vendido (Firebase → Google Ads API)

**Status:** modelo corrigido em 2026-09-21 — upload **continua desligado** (`enabled: false`). O lote CSV do Espo (ter–sáb 02:00) segue sendo o que o Google recebe.  
**Plano:** Ads offline on Vendido  
**Depende de:** sync Espo `Vendido` → Firebase ([`ESPO_VENDIDO_FIREBASE_SYNC.md`](ESPO_VENDIDO_FIREBASE_SYNC.md), Fase 4 OK)

**Código:** [`firebase/functions/ads-offline-conversion.js`](../firebase/functions/ads-offline-conversion.js) · hook em `sold-sync.handleSoldSync` · secret `GOOGLE_ADS_API_CONFIG`  
**Auditoria:** RTDB `ads_offline_audit` (linha a linha) · Ads só diagnóstico agregado  
**Unitários:** `node scripts/espo-ops/ads-offline-unit-test.mjs`  
**Diagnóstico Ads:** `node scripts/google-ops/ads-offline-diagnostics.mjs`

---

## 1. Veredito Fase 0

| Item | Resultado |
|---|---|
| Conversion action alvo | **`SegurosImediatoOffline`** — OK para upload por clique |
| Conta Ads (customer) | **`9947918772`** (não usar só o AW-815139667 da tag) |
| Formato batch legado | CSV clássico Google Ads (`Google Click ID` + nome + tempo + valor + BRL) |
| Upload automatizado neste repo | **Não existe** |
| Processo batch atual | **Espo PROD** — Scheduled Job(s) ter–sáb **02:00**, arquivo público [`conversoes-google-latest.txt`](https://flyingdonkeys.com.br/conversoes-google-latest.txt) |
| Credenciais para CF | Viáveis a partir de `scripts/google-ops` + espelho `Imediato/adwords` (MCC) |

---

## 2. Conversion action (API, 2026-09-05)

Consulta: `node scripts/google-ops/ads-offline-action-detail.mjs`  
Lista geral: `node scripts/google-ops/ads-audit-conversions.mjs`

| Campo | Valor |
|---|---|
| Resource | `customers/9947918772/conversionActions/303889427` |
| Nome | `SegurosImediatoOffline` |
| Status | `ENABLED` |
| Type | `UPLOAD_CLICKS` |
| Category | `PURCHASE` |
| Counting | `ONE_PER_CLICK` |
| Primary for goal | `true` |
| Include in “Conversões” | `true` |
| Click-through window | **90** dias |
| View-through window | 1 dia |
| Default value | `250` BRL |
| Always use default | **`false`** (valor do upload prevalece) |

### Volume recente (últimos 30 dias, audit)

- `conversions` (métrica primária reportada no script): **0**
- `all_conversions`: **~131**

Interpretação: a action ainda recebe uploads/atribuição em `all_conversions`; o placar “Conversões” no script pode divergir por modelo/campanha. Na sombra API vs batch, comparar **Diagnóstico de upload** + `all_conversions` da action, não só o número agregado de campanha.

Tag online (GTM) continua em **`AW-815139667`** — é o conversion tracking ID da conta; o **customerId da API** para esta action é **`9947918772`**.

MCC de referência (projeto `Imediato/adwords/env.example`): login customer **`4321602293`**. Em `scripts/google-ops/config.local.json` o `customerId` já é `9947918772` (acesso direto funcionou no audit sem `loginCustomerId`).

---

## 3. Inventário do batch (Espo PROD — vivo)

### Job / agendamento (confirmado ops 2026-09-05)

| | |
|---|---|
| Ambiente | EspoCRM PROD `flyingdonkeys.com.br` |
| Artefato | [`https://flyingdonkeys.com.br/conversoes-google-latest.txt`](https://flyingdonkeys.com.br/conversoes-google-latest.txt) |
| Schedule | **Weekly** às **02:00** — **Tuesday, Wednesday, Thursday, Friday, Saturday** (5 jobs Enabled) |
| Status | Enabled |

Cutover: só depois da sombra sem divergência grave e de um aceite explícito. Nesse mesmo momento, `enabled: true` e desligar os 5 jobs. Rollback = religar os jobs e voltar `enabled: false`. Detalhe na seção 9.

### Formato do arquivo vivo (amostra 2026-09-04)

```text
Parameters:TimeZone=-0300,,,,
"Google Click ID","Conversion Name","Conversion Time","Conversion Value","Conversion Currency"
{gclid},SegurosImediatoOffline,"{yyyy-MM-dd HH:mm:ss}",{valor},BRL
```

- Conversion Name = `SegurosImediatoOffline`
- Timezone **-0300**
- Só **gclid** nas linhas atuais (sem gbraid/wbraid)
- Valor = comissão (ex.: 813.69, 270.64 BRL)
- Timestamp de conversão com data recente (arquivo regenerado pelo fluxo Espo)

### Artefatos históricos (OneDrive — referência)

| Arquivo | Última escrita | Papel |
|---|---|---|
| `Imediato/conversoesoffline.csv` | 2021-07-15 | Template antigo (mesmo schema) |
| `Imediato/conversoesoffline.csv.txt` | 2021-04-28 | Idem |
| `Imediato/conversoes-offline-19 e 20.xlsx` | 2021-01-20 | Planilha auxiliar |

### Onde **não** está

- Nenhum upload offline no repo `Novo Site Imediato Cursor`
- Projeto `Imediato/adwords` = performance/GTM/creds; sem este gerador
- Firebase CF: Data Manager `events:ingest` + audit; **`enabled: false`** até cutover Fase 3

### Checklist cutover batch

Não executar este checklist como parte da correção de 2026-09-21. A ordem, quando houver aceite:

1. Rodar a sombra (`ads-offline-shadow-csv.mjs`) e não ter divergência grave de gclid, valor ou data civil.
2. Aceite explícito para ligar o upload.
3. No mesmo momento: `enabled: true` na CF **e** desabilitar os 5 Scheduled Jobs Espo (ter–sáb 02:00).
4. Manter a action `SegurosImediatoOffline` ativa.
5. Rollback: reativar os 5 jobs e voltar `enabled: false`.

---

## 4. Mapeamento Firebase → Ads (Data Manager API)

Integrações novas **não** podem usar `customers.uploadClickConversions` (Ads API).  
Caminho oficial: [`events:ingest`](https://developers.google.com/data-manager/api/reference/rest/v1/events/ingest) · [field mappings](https://developers.google.com/data-manager/api/devguides/events/google-ads/offline/upgrade/field-mappings).

| Data Manager `Event` | Origem |
|---|---|
| `adIdentifiers.gclid` **ou** `gbraid` **ou** `wbraid` | Site novo: `data.utm.*`; legado: `GCLID_FLD` / `gclid` |
| `destinations[].productDestinationId` | `303889427` (`SegurosImediatoOffline`) |
| `destinations[].operatingAccount` | `GOOGLE_ADS` / `9947918772` |
| `eventTimestamp` | Data civil de `cDataVenda` às 23:59:59 `-03:00` se for anterior a hoje; se for hoje, o instante do webhook (nunca no futuro) |
| `conversionValue` | Comissão (`amount`). `<= 0` não sobe. Milhar brasileiro (`1.234,56`) vira `1234.56` |
| `currency` | `BRL` |
| `transactionId` | id da Opportunity (dedupe). Mudança de comissão já `uploaded` = RESTATEMENT no mesmo id |
| `eventSource` | `WEB` |

OAuth: escopo `https://www.googleapis.com/auth/datamanager` (+ re-login `npm run auth -- --with-ads`). Developer token **não** é exigido no Data Manager.

Preferência de click ID: **gclid > gbraid > wbraid**. Se o Google recusar o gclid com `INVALID_GCLID` e houver outro click, a função tenta o seguinte. Sem click ID → skip (não é erro). Sem nó no Firebase, o click `cGclid` / `cGbraid` / `cWbraid` da Opportunity vale, com auditoria em `ads_offline_audit` e estado em `ads_offline_by_opportunity/{orderId}` — sem inventar `leads_backup`.

HTTP 200 de `events:ingest` grava `accepted` e o `requestId`. `uploaded` só quando o status assíncrono do pedido é `SUCCESS`. `FAILED` grava `error` (o smoke de 10/09, que ficou `uploaded` com `INVALID_GCLID`, passaria a `error`). `accepted` e `error` permitem novo envio. `alreadyUploaded` exige `uploaded` e o mesmo id da Opportunity.

Flags no nó `leads_backup`:

- `adsOfflineConversionStatus`: `accepted` | `uploaded` | `restated` | `retracted` | `skipped` | `error`
- `adsOfflineRequestId` — pedido Data Manager, para confirmar o status
- `adsOfflineConversionUploadedAt` — preenchido em `uploaded`, `restated` e `retracted`
- `adsOfflineClickIdType`
- `adsOfflineOrderId`
- `adsOfflineJobId` — `jobId` do upload (cruzar com `job_summaries` Ads)
- `adsOfflineAuditKey` — pushId do último evento em `ads_offline_audit`

---

## 4.1 Auditoria local (`ads_offline_audit`) — fonte de verdade linha a linha

**O Google Ads não lista conversões offline individuais** por `orderId` / gclid. A API só oferece:

| Camada | Uso |
|---|---|
| Resposta de `uploadClickConversions` | `results[]`, `jobId`, `partialFailureError` — só no momento do POST |
| `offline_conversion_upload_conversion_action_summary` | Saúde agregada (status, contagens, alerts, 7 dias / 7 jobs) |
| Relatórios / UI | Totais da action; atraso; sem prova “opp X” |

Por isso a CF grava **append-only** em RTDB site novo: `ads_offline_audit/{pushId}`.

Campos principais:

| Campo | Conteúdo |
|---|---|
| `status` | `accepted` \| `uploaded` \| `restated` \| `retracted` \| `skipped` \| `error` \| `noop_already_uploaded` |
| `reason` | ex. `upload_ok`, `no_click_id`, `disabled`, `partial_failure`, `oauth_error` |
| `opportunityId` / `orderId` | Espo Opp id |
| `leadId` / `projectId` | nó Firebase + ambiente |
| `clickIdType` / `clickId` | click enviado |
| `conversionValue` / `currencyCode` / `conversionDateTime` | payload |
| `adsJobId` | job diário (`YYYYMMDD01`, ex. `2026090501`) + valor devolvido pela API |
| `adsRequestId` | se a API/header fornecer |
| `error` / `responseSnippet` | falha / trecho truncado da resposta |

Erros e sucessos vão para o **mesmo** nó (não depender só de `ads_offline_errors`). Conferência comercial: filtrar `ads_offline_audit` por `opportunityId`.

Ops Ads (agregado): `node scripts/google-ops/ads-offline-diagnostics.mjs`  
Doc: [Monitor offline data diagnostics](https://developers.google.com/google-ads/api/docs/conversions/upload-summaries).

---

## 5. Credenciais para Cloud Function (sem valores no git)

### Já disponíveis localmente (ops)

| Fonte | Uso |
|---|---|
| `scripts/google-ops/config.local.json` | `customerId=9947918772`, `developerToken` |
| `scripts/google-ops/client_secret.json` + `token.json` | OAuth Desktop + refresh (escopo `adwords`) |
| `Imediato/adwords/env.example` | MCC `4321602293` + customer `9947918772` |

### Secret `GOOGLE_ADS_API_CONFIG` (Fase 1)

JSON (exemplo de **shape**; valores só no Secret Manager):

```json
{
  "enabled": false,
  "developerToken": "…",
  "clientId": "….apps.googleusercontent.com",
  "clientSecret": "…",
  "refreshToken": "…",
  "customerId": "9947918772",
  "loginCustomerId": "4321602293",
  "conversionActionId": "303889427",
  "currencyCode": "BRL",
  "timezoneOffset": "-03:00"
}
```

```bash
cd firebase
firebase functions:secrets:set GOOGLE_ADS_API_CONFIG
# cole o JSON com enabled:false (credenciais de scripts/google-ops)
firebase deploy --only functions:syncOpportunitySold
```

Notas:

- `enabled: false` permanece até o corte da seção 9. O espelho `sold*` grava normalmente; o upload e o retract só rodam com a assinatura do webhook **PROD** e com `enabled: true`.
- Preferir refresh token de conta com acesso à conta Ads (ops Luciano / MCC).
- **Não** commitir tokens; não colar no chat.
- Tag `AW-815139667` permanece para conversões **online** GTM; offline API usa `customerId` + `conversionActionId` acima.
- Cada tentativa (skip/aceite/upload/erro/estorno) → `ads_offline_audit` (best-effort).
- Sair de `Vendido` com status `uploaded` envia `RETRACTION` no mesmo `transactionId` e grava `retracted`. Se a API recusar, fica `error`. Sem conversão confirmada, o clear só apaga `sold*` e não chama o Ads. Ajuste de valor exige `developerToken`.

---

## 6. Dual ambiente (legado × site novo)

| | Site novo | Legado |
|---|---|---|
| RTDB | `imediato-seguros-site-novo` | `leads-imediato-seguros` |
| Click IDs | `gclid`/`gbraid`/`wbraid` em `data.utm` | sobretudo `GCLID_FLD` / `gclid` |
| sold* | via `syncOpportunitySold` | best-effort dual |
| Cobertura esperada upload | Alta se veio de Ads | Menor se sem gclid |

Uma única action Ads serve os dois braços (mesma conta), como já ocorre nos reports do experimento.

---

## 7. Próximas fases (resumo)

1. ~~**Fase 1** — módulo + hook + secret (flag off).~~ **Feito** (deploy + secret)
2. ~~**Fase 2** — unitários + smoke API/CF.~~ **Feito** (Data Manager; §7.1)
3. **Fase 3** — sombra sem divergência grave, aceite explícito, aí sim `enabled: true` e desligar o CSV no mesmo momento. Ver seção 9. A correção de 2026-09-21 **não** liga o upload.

### 7.1 Checklist Fase 2 (smoke) — executado 2026-09-05

```bash
# Unitários
node scripts/espo-ops/ads-offline-unit-test.mjs
node scripts/espo-ops/sold-sync-unit-test.mjs

# API Data Manager (não liga a CF)
node scripts/google-ops/ads-offline-smoke-upload.mjs              # validateOnly
node scripts/google-ops/ads-offline-smoke-upload.mjs --live
node scripts/google-ops/ads-offline-smoke-upload.mjs --live --from-batch

# CF (enable + redeploy + set + disable + redeploy)
node scripts/espo-ops/fase2-ads-offline-cf-smoke.mjs

# Diagnóstico agregado Ads (ainda só client WEB/batch até enable permanente)
node scripts/google-ops/ads-offline-diagnostics.mjs
```

**Achado crítico:** `UploadClickConversions` rejeita integrações novas → CF usa **Data Manager** `events:ingest`. OAuth precisa do escopo `datamanager` (`npm run auth -- --with-ads`).

**Smokes OK:** validateOnly + live (sintético e gclid do CSV) + CF set → `status=uploaded` + `adsRequestId` + `ads_offline_audit`; clear sem Ads; secret voltou `enabled:false`.

**Verificação agendada:** `2026-09-10 02:00` (Task Scheduler `Imediato-AdsOffline-SmokeVerify-2026-09-10`).

```bash
# Dry-run / reexecução manual
node scripts/google-ops/ads-offline-smoke-verify.mjs --asof=2026-09-06
# Inventário: scripts/google-ops/ads-offline-smoke-inventory-2026-09-05.json
# Relatório: docs/ADS_OFFLINE_SMOKE_VERIFY_asof-YYYY-MM-DD.md
```

Dry-run 2026-09-06: **GO-WITH-WARNINGS** — gclid do batch `SUCCESS`; sintéticos `FAILED`/`INVALID_GCLID` (esperado); CF audit `uploaded`. Ver [`ADS_OFFLINE_SMOKE_VERIFY_asof-2026-09-06.md`](ADS_OFFLINE_SMOKE_VERIFY_asof-2026-09-06.md).

Comparar vendas reais API vs batch → **sombra Fase 3**.

---

## 8. Pendências humanas (antes do cutover)

- [x] Frequência: **ter–sáb 02:00** (Espo Scheduled Jobs)
- [x] Onde roda: **Espo PROD** → `https://flyingdonkeys.com.br/conversoes-google-latest.txt`
- [ ] MCC `4321602293` no secret — em 30/09 o campo `loginCustomerId` está vazio. `customerId` é `9947918772`. `enabled` continua `false`. Não preencher nem ligar antes do aceite de domingo.
- [x] Pós-smoke: dry-run verify 2026-09-06 (GO-WITH-WARNINGS) + tarefa **10/09/2026 02:00**
- [x] 2026-09-21: falso `uploaded` corrigido no código; `enabled` continua `false`
- [ ] Sombra do lote diário ok em 30/09; aceite para ligar fica para domingo 04/10 (abaixo)

### Sombra 2026-09-30 07:33 BRT

`ads-offline-shadow-csv.mjs --from-espo` contra `conversoes-google-latest.txt`. Self-test ok. Upload não foi ligado.

O arquivo do dia tem 8 linhas, todas de 2026-09-29, nome `SegurosImediatoOffline`. As 8 casaram em gclid, valor e data civil. Nenhuma divergência de valor ou data. Nenhuma projeção de 29/09 ficou de fora do arquivo.

O script saiu com código 1 porque marca como grave toda Opportunity antiga que a função enviaria e que não está nesse arquivo diário: 1551 `missing_in_csv`, zero `mismatch`. Isso descreve o lote de um dia, não um desvio do CSV vivo. A lista do Espo usada pelo script para em 20 páginas.

Decisão de `enabled: true` e de desligar os cinco jobs: domingo 04/10, se houver aceite. Até lá o CSV segue como canal.

### Sombra do projeto funil v2 (Lote 2, a partir de 2026-10-25)

Os scripts `ads-offline-shadow-csv.mjs` e `ads-offline-diagnostics.mjs` passaram para o repositório. A sombra ganhou `--since=AAAA-MM-DD` e `--janela-csv` (compara só as datas que o próprio lote cobre), o que elimina os 1.551 falsos `missing_in_csv` de 30/09. Uso diário:

```bash
node scripts/google-ops/ads-offline-shadow-csv.mjs --file=conversoes-google-latest.txt --from-espo --janela-csv
```

Critério para o corte: 5 lotes seguidos sem divergência grave.

| Rodada | Lote (data das vendas) | Linhas | Projetadas | Casadas | Graves |
|---|---|---|---|---|---|
| 1 — 2026-10-25 | 2026-10-23 | 4 | 4 | 4 | 0 |

---

## 9. Correção de 2026-09-21 (upload ainda desligado)

O lote CSV continua sendo o canal vivo. `GOOGLE_ADS_API_CONFIG.enabled` permanece `false`. Os cinco Scheduled Jobs do Espo permanecem ligados. Esta seção descreve o modelo que a função passa a ter; a ativação não faz parte da implementação.

| Regra | Comportamento |
|---|---|
| Confirmação | `accepted` no HTTP 200; `uploaded` só com `requestStatus=SUCCESS`; `FAILED` → `error` |
| Reenvio | `accepted` e `error` disparam novo envio, inclusive em set no-op do Firebase |
| Click inválido | `INVALID_GCLID` tenta o próximo click (`gbraid`, depois `wbraid`) |
| Comissão | `<= 0` não sobe. Valor alterado com upload já confirmado → `RESTATEMENT` no mesmo id |
| Valor | `1.234,56` e `439,50` |
| Ambiente | Espelho `sold*` para DEV e PROD. Upload e retract só com a assinatura do webhook PROD |
| Horário | `cDataVenda` anterior a hoje → 23:59:59 `-03:00`. Hoje → instante do webhook |
| Estorno | Sair de `Vendido` com `uploaded` → `RETRACTION`. Recusa da API fica `error` |
| Sem nó Firebase | Usa `cGclid` / `cGbraid` / `cWbraid` da Opportunity. Sem click, skip |

Sombra, sem POST no Google:

```bash
node scripts/google-ops/ads-offline-shadow-csv.mjs --self-test
node scripts/google-ops/ads-offline-shadow-csv.mjs --file=conversoes-google-latest.txt --opps=opps.json
node scripts/google-ops/ads-offline-shadow-csv.mjs --file=conversoes-google-latest.txt --from-espo
```

`enabled` só vira `true` depois dessa sombra sem divergência grave (gclid, valor, data civil) e de um aceite explícito. No mesmo momento, desligar os cinco jobs. Rollback = religar os jobs e voltar `enabled: false`.

Deploy da função corrigida pode ir com o secret ainda desligado. Conversão avançada por e-mail ou telefone fica fora deste modelo.
