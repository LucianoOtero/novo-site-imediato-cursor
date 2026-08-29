# Espo-ops — medição + smokes de atribuição

Scripts de inventário/análise EspoCRM e smokes Fases 0–5.

## Credenciais

```powershell
$env:ESPOCRM_API_CONFIG = gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo
```

`resolveEspoConfig({ prefer })` usa o bloco `dev`/`prod` do JSON — **não** é mascarado por `ESPO_BASE_URL`.

Fallback: `ESPO_BASE_URL` + `ESPO_API_KEY`.

## Inventário de campos (Fase 0 / gate Fase 5)

```powershell
node fase0-attribution-fields.mjs --prefer=dev
node fase0-attribution-fields.mjs --prefer=prod   # inventário prod (read-only)
# CREATE em prod: evitar; se necessário: --create --i-know-this-is-prod
```

## Smokes atribuição

```powershell
# DEV / staging
node fase2-attribution-smoke.mjs
node --env-file=../../.env.local fase2-rtdb-attribution-smoke.mjs
node --env-file=../../.env.local fase4-ads-url-smoke.mjs

# PROD (Fase 5) — exige flag consciente
node --env-file=../../.env.local fase5-prod-smoke.mjs --i-know-this-is-prod
```

Runbook: [`docs/FASE5_ROLLOUT_PRODUCAO.md`](../../docs/FASE5_ROLLOUT_PRODUCAO.md).

## Análise comercial

```powershell
node espo-discover-sales.mjs
node espo-analyze-sales-by-lead-type.mjs
```

Ver [`docs/EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](../../docs/EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md).

## Canal de captura

[`docs/CANAL_CAPTURA_ESPO.md`](../../docs/CANAL_CAPTURA_ESPO.md) — Enum `cCanalCaptura` (DEV feito; espelhar prod na Fase 5).
