# Changelog — dash produção comercial

Versões com tag GitHub `dash-vX.Y.Z` (independentes de `v0.2.x` do site).  
Ver [`docs/VERSIONING.md`](../VERSIONING.md).

---

## [0.3.0] — 2026-11-06 (Fase 5: rotas do MVP + export com filtros)

### Added
- Rotas `/vendedores` (consolidado por vendedor com projeção, média 3m e linhas com flag),
  `/analitico` (linha a linha com filtros de dia, vendedor e inconsistência, link para a Opp no Espo)
  e `/inconsistencias` (flags agrupadas por tipo), com navegação comum (`app/components/dash.tsx`).
- `/api/production/lines` e `/api/production/export` aceitam os mesmos filtros (`day`, `vendorKey`, `flag`);
  o Excel traz as abas `resumo`, `analitico`, `vendedores` e `inconsistencias` do recorte filtrado.
- Rótulos das flags em `lib/flag-labels.ts`.

### Fixed
- `lib/espo.ts`: a busca das Opps vendidas do mês mandava `where` como JSON, que o Espo ignora
  (devolvia todas as Opps e o filtro local achava só parte delas). Agora vai `where[i][campo]`,
  ordenado por `id` com dedupe. Novembro passou de 17 para todas as Opps vendidas no Espo
  (27 em 06/11), e o resumo caiu de ~75 s para ~5 s.

---

## [0.2.0] — 2026-11-03 (Fase 6: Cloudflare Access + runbook)

### Added
- Middleware exige o JWT do Cloudflare Access (`lib/cf-access.ts`, `jose`) antes do login Espo,
  quando `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` estão definidos. Bloqueia acesso pelo alias
  `*.vercel.app` e pelo IP da Vercel sem passar pela Cloudflare.
- [`RUNBOOK.md`](./RUNBOOK.md): falha da ingestão Agger, key/login Espo, Cloudflare Access.

### Infra
- Cloudflare Access na aplicação `dash-producao` (domínios Imediato + exceção nominal, código por e-mail).
- DNS `dash` com proxy; Configuration Rule SSL Full (strict) só para o host.

---

## [0.1.0] — 2026-09-16 (MVP Fase 4 em produção)

### Added
- App Next.js 15 em `dash-producao/`: login Espo (Basic) → sessão HMAC, middleware, UI desk mínima.
- APIs: `/api/production`, `/api/production/lines`, `/api/production/export`, `/api/meta/asof`.
- Motor de domínio em `scripts/dash-producao/lib` (join Espo↔Agger, projeção úteis SP, flags).
- Deploy Vercel projeto `dash-producao` + domínio `dash.segurosimediato.com.br`.

### Docs
- Plano e fases 0–4 em `docs/dash-producao/` e `docs/PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md`.
- [`DEPLOY.md`](./DEPLOY.md).
