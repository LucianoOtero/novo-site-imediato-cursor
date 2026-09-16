# Fase 1 — Status (DEV + PROD) · 2026-09-16

**Plano pai:** [`../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md`](../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md)  
**Inventário ACL (Fase 0):** [`ESPO_ACL_INVENTORY.md`](./ESPO_ACL_INVENTORY.md)

**Status:** Role + API User provisionados e smoke ACL **OK** em **DEV** e **PROD**.

---

## Produção (`https://flyingdonkeys.com.br`)

| Item | Valor |
|---|---|
| Role | `dashboard-producao-readonly` (`6aaaa181a6e6e6d32`) |
| API User | `api_dashboard_producao` (`6aaaa1b96d83b2e7a`) |
| type | `api` |
| authMethod | `ApiKey` (já na criação) |
| Role link | sim |
| Times | nenhum |

### Matriz Role

| Scope | create | read | edit | delete | stream |
|---|---|---|---|---|---|
| Opportunity | no | all | no | no | no |
| User | no | all | no | no | no |
| Team | no | all | no | no | no |
| Account | no | all | no | no | no |

**Specials:** export / dataPrivacy / assignment / user / massUpdate = **no**.

### Smoke prod

| Check | Resultado |
|---|---|
| `GET App/user` | 200 · `api_dashboard_producao` |
| ACL Opp/User/Team/Account | read=all; demais no |
| `GET Opportunity` (Vendido) | 200 · amostra 5/5 com `amount` + `cDataDeEmisso` + `assignedUserName` |
| `GET Role` / `GET Lead` | 403 |

---

## DEV (`https://dev.flyingdonkeys.com.br`)

| Item | Valor |
|---|---|
| Role | `dashboard-producao-readonly` (`6aaa9aa62466e9756`) |
| API User | `api_dashboard_producao` (`6aaa9ab818822fd73`) |
| authMethod | `ApiKey` |

Smoke DEV: App/user 200, Opp Vendido 200 (total 29), Role/Lead 403.

---

## Secrets

**Não** versionar API keys.  
**Não** misturar com `ESPOCRM_API_CONFIG` dos scripts/RPA.

| Destino | Status |
|---|---|
| Firebase Secret `ESPO_DASH_API_CONFIG` (project `imediato-seguros-site-novo`) | **criado** v1 — blocos `prod` + `dev` (`baseUrl`, `apiKey`, `userName`) |
| Local (fora do repo) `C:\AggerRpa\config\espo-dash-api.json` | **gravado** (mesmo conteúdo) |
| Vercel env do app `dash.segurosimediato.com.br` | pendente quando o app existir |

Formato do secret (ilustrativo): `{ "prod": { "baseUrl", "apiKey", "userName" }, "dev": { ... }, "note": "..." }`.

---

## Checklist Fase 1

- [x] Role + API User DEV + smoke
- [x] Role + API User PROD + smoke
- [x] Secret do dash separado (`ESPO_DASH_API_CONFIG` + arquivo local PC robô)
- [ ] Vercel env quando o app do dash existir
- [ ] Atualizar inventário Fase 0 (“ACL atual = necessária” para o user do dash)

---

## Riscos remanescentes

1. Key do dash no secret errado (acoplamento a scripts).
2. PII legível sem field-level deny (MVP).
3. Join / Renovação — Fase 2.
4. `add_travelangels` / `api_dev` continuam com create/edit — **não** usar no runtime do dash.
