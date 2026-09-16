# Deploy — dash produção comercial

**Status:** produção Vercel **UP** · release **`dash-v0.1.0`** (2026-09-16)  
**Projeto:** `lucianooteros-projects/dash-producao`  
**Root Directory:** `dash-producao`  
**Repo:** `LucianoOtero/novo-site-imediato-cursor` (auto-deploy só quando mudam caminhos do dash)

## URLs

| URL | Status |
|---|---|
| https://dash.segurosimediato.com.br | **produção** |
| https://dash-producao-taupe.vercel.app | alias Vercel |

## Secrets (Vercel env)

`SESSION_SECRET`, `ESPO_DASH_API_CONFIG`, `DATABASE_URL`, `ESPO_PREFER=prod`  
(Production + Preview + Development)

SSO Protection Vercel: **desligado** (login Espo é o gate; Cloudflare Access = Fase 6).

## DNS

Registro Cloudflare: **A** `dash` → `76.76.21.21` (DNS only). SSL Vercel emitido.

## Smoke

1. `https://dash.segurosimediato.com.br/login`  
2. Login usuário **humano** Espo (não a API key)  
3. KPIs / export  
4. `GET /api/meta/asof` autenticado → `aggerRun` + `espo.source`

## Versionamento

Tags `dash-v*` — ver [`../VERSIONING.md`](../VERSIONING.md) e [`CHANGELOG.md`](./CHANGELOG.md).
