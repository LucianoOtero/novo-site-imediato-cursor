# Changelog — dash produção comercial

Versões com tag GitHub `dash-vX.Y.Z` (independentes de `v0.2.x` do site).  
Ver [`docs/VERSIONING.md`](../VERSIONING.md).

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
