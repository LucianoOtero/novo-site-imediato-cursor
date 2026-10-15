# Smoke HTTP — syncOpportunitySold (Fase 1)

Espo **ainda não** ligado. Teste manual após deploy da CF.

## Pré-requisitos

```bash
cd firebase
firebase use imediato-seguros-site-novo

# Secret do webhook (gerar valor forte e guardar)
firebase functions:secrets:set ESPO_SOLD_WEBHOOK_SECRET

# Índices + função
firebase deploy --only database,functions:syncOpportunitySold
```

**IAM legado:** SA `64754519959-compute@developer.gserviceaccount.com` com `roles/firebasedatabase.admin` no projeto `leads-imediato-seguros` (concedido 2026-09-05). O acesso cross-project ao RTDB legado é **best-effort** (timeout 20s); falha no legado **não** impede o sync do site novo.

Smoke site novo (2026-09-05): **set HTTP 200** (`sold*` gravados, `autoSync` false) → **clear HTTP 200** (`sold*` removidos).

No projeto legado, espelhar índice em `leads_backup`:

```json
"leads_backup": { ".indexOn": ["espocrmOpportunityId", "espocrmLeadId"] }
```

## Preparar registro de teste (site novo)

No RTDB `imediato-seguros-site-novo` → `leads_backup/smoke-sold-001`:

```json
{
  "espocrmOpportunityId": "smoke-opp-001",
  "espocrmLeadId": "smoke-lead-001",
  "status": "synced",
  "synced": true,
  "autoSync": false,
  "data": { "nome": "Smoke Sold", "phoneE164": "+5511999990001" }
}
```

## set

```bash
URL="https://us-central1-imediato-seguros-site-novo.cloudfunctions.net/syncOpportunitySold"
SECRET="<<< valor do ESPO_SOLD_WEBHOOK_SECRET >>>"

curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Espo-Webhook-Secret: $SECRET" \
  -d '{
    "action": "set",
    "opportunityId": "smoke-opp-001",
    "stage": "Vendido",
    "amount": 100.5,
    "cDataVenda": "2026-09-05",
    "cLeadId": "smoke-lead-001"
  }'
```

Esperado: HTTP 200, `updatedCount >= 1`. No nó: `sold=true`, `soldCommissionAmount=100.5`, `soldDate=2026-09-05`, **`autoSync` continua false**.

## clear

```bash
curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Espo-Webhook-Secret: $SECRET" \
  -d '{
    "action": "clear",
    "opportunityId": "smoke-opp-001",
    "stage": "Perdido",
    "previousStage": "Vendido"
  }'
```

Esperado: HTTP 200; chaves `sold*` removidas; `espocrmOpportunityId` / `status` intactos.

## sem match

Use `opportunityId` inexistente → HTTP 404, entrada em `sold_sync_errors/` e tentativa de e-mail para os destinatários de alerta (`lrotero@gmail.com`, `alexkaminski70@gmail.com`, `alex.kaminski@imediatoseguros.com.br`).

## Testes unitários (sem rede)

```bash
node scripts/espo-ops/sold-sync-unit-test.mjs
```
