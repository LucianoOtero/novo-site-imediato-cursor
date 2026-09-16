# Deploy — dash produção comercial

**Status:** produção Vercel **UP** (2026-09-16)  
**Projeto:** `lucianooteros-projects/dash-producao`  
**Root Directory:** `dash-producao`  
**Repo:** `LucianoOtero/novo-site-imediato-cursor` (auto-deploy em push em `main`)

## URLs

| URL | Status |
|---|---|
| https://dash-producao-taupe.vercel.app | **produção** (alias estável) |
| https://dash.segurosimediato.com.br | domínio anexado no projeto; **DNS Cloudflare pendente** |

## Secrets (Vercel env)

`SESSION_SECRET`, `ESPO_DASH_API_CONFIG`, `DATABASE_URL`, `ESPO_PREFER=prod`  
(Production + Preview + Development)

SSO Protection Vercel: **desligado** (login Espo é o gate; Cloudflare Access = Fase 6).

## DNS (Cloudflare) — pendente

Zona `segurosimediato.com.br` usa NS Cloudflare. Criar registro igual ao `backup`:

| Tipo | Nome | Conteúdo | Proxy |
|---|---|---|---|
| **A** | `dash` | `76.76.21.21` | DNS only (cinza) **ou** Proxied se Access na frente |

Alternativa: **CNAME** `dash` → `cname.vercel-dns.com` (DNS only).

Depois: validar `https://dash.segurosimediato.com.br/login`.

## Smoke

1. Abrir alias Vercel → `/login`  
2. Login usuário humano Espo  
3. KPIs / export  
4. `GET /api/meta/asof` autenticado → `aggerRun` + `espo.source`
