# Offline Conversion Ads no evento Vendido (Firebase → Google Ads API)

**Status:** desde 2026-11-04 (fim do dia) em **envio real** (`enabled: true`, `mode: "complementar"`, `validateOnly: false`; `syncOpportunitySold` na revisão `00020-fov`, secret v11). As vendas sem `cGclid` são registradas no Ads (Data Manager, `user_data`), uma vez por oportunidade; as com `cGclid` seguem pelo lote CSV do Espo (ter–sáb 02:00). Antes houve 2 dias de validação (03–04/11): 26 vendas distintas validadas (~R$ 20,1 mil, 0 valor zerado, datas de 0 a 30 dias), 0 erro depois da troca do secret (os 9 `oauth_error` de 03/11 12:38–13:02 são anteriores à v10). Rollback: nova versão do secret com `enabled: false` (ou `validateOnly: true`) e `firebase deploy --only functions:syncOpportunitySold`.  
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
  "timezoneOffset": "-03:00",
  "mode": "completo",
  "completoDesde": "AAAA-MM-DD",
  "validateOnly": false
}
```

- `mode`: `completo` (padrão) envia todas as vendas. `complementar` pula as vendas cuja Opportunity tem `cGclid`, que seguem pelo CSV do Espo. Assim a mesma venda não chega duas vezes. As demais vendas sobem por gbraid/wbraid ou só pelos dados com hash.
- `completoDesde` (`AAAA-MM-DD`, só no `completo`): a venda com `cGclid` e `cDataVenda` anterior a essa data é pulada com `gclid_via_csv`, porque o CSV do Espo já a enviou. Uma edição posterior de uma venda antiga (valor, por exemplo) não gera conversão duplicada. Sem o campo, o `completo` envia tudo.
- `validateOnly`: `true` manda `validateOnly` ao `events:ingest`. O Google valida o formato e não registra a conversão. A auditoria grava `validated`, e o lead e `ads_offline_by_opportunity` não são marcados.

### Conversões otimizadas para leads (2026-11-03)

Cada evento leva `userData.userIdentifiers` com SHA-256 hex do celular em E.164 (`+55DDNNNNNNNNN`) e do e-mail (minúsculo, sem espaços, sem pontos antes de `@gmail.com`). A origem é o lead no Firebase (`data/phoneE164`, `data/email`; no legado, `DDD-CELULAR` + `CELULAR` e `Email`). Se faltar algum dado, a função lê `cCelular`/`cEmailAdress` da Opportunity no Espo, uma vez por venda. Esses dados não entram no payload, porque o payload vai para os logs e para `sold_sync_errors`. O e-mail "falso" `…@imediatoseguros.com.br` é descartado. Lead com `consent.marketing === false` não envia hash. Sem click e sem hash, a venda é pulada (`no_click_id`). A auditoria guarda só `userIdentifierCount`; `clickIdType = user_data` indica envio sem click.

Ligação recomendada: `enabled: true`, `mode: "complementar"`, `validateOnly: true` no primeiro dia. Conferir `ads_offline_audit` (`validated` versus `error`) e só então passar `validateOnly` para `false`. Rollback: `enabled: false`.

```bash
cd firebase
firebase functions:secrets:set GOOGLE_ADS_API_CONFIG
# cole o JSON com enabled:false (credenciais de scripts/google-ops)
firebase deploy --only functions:syncOpportunitySold
```

Notas:

- Desde 03/11 `enabled: true` com `validateOnly: true` (ver Status no topo); o registro de verdade depende do "pode" para `validateOnly: false`. O espelho `sold*` grava normalmente; o upload e o retract só rodam com a assinatura do webhook **PROD** e com `enabled: true`.
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
- [x] Sombra do lote diário ok em 30/09 (o aceite de 04/10 foi substituído pela sombra do Lote 2, abaixo, e pelo modo de validação de 03/11)

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
| 2 — 2026-10-27 | 2026-10-26 | 4 | 4 | 4 | 0 |
| 3 — 2026-11-05 | 2026-11-04 | 8 | 8 | 8 | 0 |

Os lotes gerados entre 28/10 e 04/11 não foram comparados: o Espo só publica o arquivo do dia.

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

---

## 10. Corte para o modo completo (alerta do Diagnóstico, 05/11/2026)

O Diagnóstico de conversões otimizadas marca como urgente "Nenhuma tentativa de importação com dados fornecidos pelo usuário" na `SegurosImediatoOffline`. O CSV do Espo só leva o gclid; o Firebase já manda celular e e-mail com hash, mas no `complementar` só cuida das vendas sem gclid. Com o corte, todas as vendas sobem pelo Firebase e o CSV é desligado.

Pré-requisitos: deploy do código com `completoDesde` e sombra limpa (tabela da seção 8).

Ordem, num dia útil depois do lote das 02:00 (que já mandou as vendas da véspera):

1. Nova versão do secret `GOOGLE_ADS_API_CONFIG`, igual à atual, com `mode: "completo"` e `completoDesde` = data do corte.
2. `firebase deploy --only functions:syncOpportunitySold`.
3. No Espo PROD, desligar os 5 Scheduled Jobs que geram `conversoes-google-latest.txt` (ter–sáb 02:00).
4. Conferir em `ads_offline_audit` as primeiras vendas: `uploaded`, `clickIdType: gclid` e `userIdentifierCount` maior que 0. Reler o Diagnóstico de 2 a 3 dias depois.

Rollback: secret de volta a `mode: "complementar"` (sem `completoDesde`), novo deploy e os 5 jobs religados. O primeiro lote depois do rollback traz as vendas da véspera; as que o Firebase já enviou (`uploaded` em `ads_offline_audit`) contariam duas vezes, então o ideal é religar os jobs num dia sem vendas com gclid já enviadas.

### Ação automática de leads qualificados

"Ação de conversão criada automaticamente para leads qualificados" (6665179423, `UPLOAD_CLICKS`, `QUALIFIED_LEAD`) foi criada pelo Google, é principal e nunca recebeu envio (0 conversão em 30 dias). Ela também está no alerta urgente. A meta "Lead qualificado" da conta tem lance só na campanha "ATIVA - Porto Seguro Cotacao - Site Novo", sem efeito porque a ação não tem conversões.

```bash
node scripts/google-ops/ads-conversion-action-primary.mjs            # relata
node scripts/google-ops/ads-conversion-action-primary.mjs --apply    # secundária
node scripts/google-ops/ads-conversion-action-primary.mjs --primary=true --apply   # rollback
```
