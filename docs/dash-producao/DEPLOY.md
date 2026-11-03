# Deploy — dash produção comercial

**Status:** produção Vercel **UP** · release **`dash-v0.2.0`** (2026-11-03, Cloudflare Access)  
**Projeto:** `lucianooteros-projects/dash-producao`  
**Root Directory:** `dash-producao`  
**Repo:** `LucianoOtero/novo-site-imediato-cursor` (auto-deploy só quando mudam caminhos do dash)  
**Operação:** [`RUNBOOK.md`](./RUNBOOK.md)

## URLs

| URL | Status |
|---|---|
| https://dash.segurosimediato.com.br | **produção** (Cloudflare Access + login Espo) |
| https://dash-producao-taupe.vercel.app | alias Vercel — **403** (sem JWT do Access) |

## Secrets (Vercel env)

`SESSION_SECRET`, `ESPO_DASH_API_CONFIG`, `DATABASE_URL`, `ESPO_PREFER=prod`  
(Production + Preview + Development)

`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD` — **só Production** (previews não passam pela Cloudflare).

SSO Protection Vercel: **desligado** (o gate é Cloudflare Access + login Espo; previews ficam só com login Espo).

## Cloudflare

- DNS: **A** `dash` → `76.76.21.21` **Proxied**. SSL Vercel emitido.
- Configuration Rule `dash - SSL Full strict` (só este hostname).
- Zero Trust → Access → Applications → `dash-producao` (self-hosted, `dash.segurosimediato.com.br`),
  policy `Imediato` (Allow): e-mails terminando em `@imediatoseguros.com.br` / `@segurosimediato.com.br`
  + exceções nominais. Login: código por e-mail (one-time PIN).

## Smoke

1. Aba anônima → `https://dash.segurosimediato.com.br` → tela do Access → código por e-mail  
2. `/login` → usuário **humano** Espo (não a API key)  
3. KPIs / export  
4. `GET /api/meta/asof` autenticado → `aggerRun` + `espo.source`  
5. `https://dash-producao-taupe.vercel.app/login` → 403

## Versionamento

Tags `dash-v*` — ver [`../VERSIONING.md`](../VERSIONING.md) e [`CHANGELOG.md`](./CHANGELOG.md).
