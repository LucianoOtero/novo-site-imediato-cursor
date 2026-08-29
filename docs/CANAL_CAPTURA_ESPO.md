# Campo EspoCRM `cCanalCaptura` (Fase 4)

Campo Enum necessário para filtrar vendas por tipo de captura **nativamente** no CRM.
A Cloud Function envia `cCanalCaptura` em **PUT best-effort separado** do funil; se o
atributo não existir, só esse PUT falha em log — a entrega Lead/Opp principal **não**
depende dele (`cCanalCaptura` **não** entra no POST de criação).

**Status CF:** `canalCapturaFields()` + PUT separado deployados; pacote Ads na Opp via
`attributionOpportunityFields` (Fase 2, 2026-08-29). Enum `cCanalCaptura` criado no
Espo **DEV** (Fase 0). Espelhar em prod na Fase 5 — runbook
[`FASE5_ROLLOUT_PRODUCAO.md`](FASE5_ROLLOUT_PRODUCAO.md).

Contrato ampliado de atribuição Ads (click IDs / UTMs na Opp): ver
[`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](ATRIBUICAO_ADS_SITE_NOVO_ESPO.md).
Testes: [`AMBIENTE_TESTES_SITE_NOVO.md`](AMBIENTE_TESTES_SITE_NOVO.md).
Script de inventário/create: [`scripts/espo-ops/fase0-attribution-fields.mjs`](../scripts/espo-ops/fase0-attribution-fields.mjs).

## Criar no Entity Manager — ordem obrigatória

**1º `dev.flyingdonkeys.com.br` → validar em staging → 2º espelhar em `flyingdonkeys.com.br`.**

Não criar primeiro em produção.

Para **Lead** e **Opportunity** (mesmas opções):

1. Administração → Entity Manager → Lead → Fields → Add Field → Enum
2. Name: digite `canalCaptura` (o Espo prefixa `c` → fica `cCanalCaptura`; label: `Canal de captura`)
3. Options (valores internos / rótulos):
   - `formulario` → Formulário
   - `whatsapp` → Modal WhatsApp
   - `telefone` → Modal telefone
4. Repetir em Opportunity
5. Layout Manager: adicionar ao painel "Cotação do Site" (Lead e Opp)
6. Rebuild + Clear cache

`api_dev` **não** cria campos (HTTP 403 em `Admin/fieldManager`) — preferir UI admin
com usuário administrador, ou ampliar a Role API com Field Manager e usar
`fase0-attribution-fields.mjs --create`.

## Origem do valor (site novo)

| `captureChannel` | `modalChannel` | `cCanalCaptura` |
|---|---|---|
| `lead_form` | — | `formulario` |
| `contact_modal` | `whatsapp` | `whatsapp` |
| `contact_modal` | `phone` | `telefone` |
| `contact_modal` | (ausente) | `whatsapp` (default) |

Persistência: `modalChannel` no payload `/api/lead` → RTDB `data.modalChannel` → CF `canalCapturaFields()`.

**Legado:** intocado (decisão da medição / descontinuação breve).
