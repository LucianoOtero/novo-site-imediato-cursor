# Fase 4 — App Next (`dash-producao/`)

**Status:** CONCLUÍDA (scaffold + auth + APIs + UI mínima) — 2026-09-16  
**Plano pai:** [`../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md`](../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md)  
**Motor:** [`FASE3_MOTOR_DOMINIO.md`](./FASE3_MOTOR_DOMINIO.md)

---

## App

Caminho: `dash-producao/` (Next.js 15 App Router, porta **3200**).

| Área | Arquivos |
|---|---|
| Auth | `lib/auth.ts`, `middleware.ts`, `app/api/login`, `app/api/logout` |
| Espo | `lib/espo.ts` (API key dash + Basic login humano) |
| Domínio | `lib/production.ts` → `@dash-core/*` (`scripts/dash-producao/lib`) |
| DB | `lib/db.ts` (`DATABASE_URL` → `agger_*`) |
| UI | `app/login`, `app/page.tsx` (KPIs + vendedores + linhas) |

### APIs

| Rota | Auth | Função |
|---|---|---|
| `POST /api/login` | público | Espo Basic → cookie HMAC |
| `POST /api/logout` | sessão | limpa cookie |
| `GET /api/production?month=YYYY-MM` | sessão | KPIs casa + vendedores (sem rows) |
| `GET /api/production/lines` | sessão | linhas paginadas (`vendor`, `flag`, `source`) |
| `GET /api/production/export` | sessão | XLSX |
| `GET /api/meta/asof` | sessão | asOf SP + último `agger_run` |

### Env (`.env.local`, não versionar)

Copiar de `.env.example`. Mínimo: `SESSION_SECRET` (≥16).

No Windows do robô, Espo/DB são lidos automaticamente de:
- `C:\AggerRpa\config\espo-dash-api.json`
- `C:\AggerRpa\config\database.url`

Overrides: `ESPO_DASH_API_CONFIG` / `ESPO_BASE_URL`+`ESPO_API_KEY`, `DATABASE_URL`, `ESPO_PREFER=prod|dev`.

---

## Smoke local

```powershell
cd dash-producao
npm install
# garantir .env.local
npm run dev
```

1. Abrir `http://localhost:3200/login`  
2. Login com usuário **humano** Espo (não a API key)  
3. Home: KPIs do mês corrente; trocar mês anterior  
4. `GET /api/meta/asof` (cookie) → `aggerRun` + `espo.source`  
5. Export XLSX  

### Aceite Fase 4

| Critério | Status |
|---|---|
| Middleware protege rotas | OK |
| Login Espo → cookie | OK (código) |
| APIs production/lines/meta/export | OK |
| UI mínima desk | OK |
| Docs + `.env.example` | OK |

**Smoke com dados reais:** depende de `.env.local` + rede Espo + Postgres no PC do operador.

---

## Próximo

Fase 5 — hardening (ACL por papel na UI, cache/asOf, deploy `dash.segurosimediato.com.br`) · Fase 6 — gráficos / visão dual mês.
