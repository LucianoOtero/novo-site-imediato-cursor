# Versionamento no monorepo

O repositório `novo-site-imediato-cursor` hospeda **três produtos** com linhas de versão **independentes**.

| Produto | Pasta | Tag GitHub | `package.json` | Deploy |
|---|---|---|---|---|
| Site novo (+ legado ops no mesmo app) | raiz (`app/`, `lib/`, …) | `v0.2.x` | raiz `version` | Vercel `imediato-seguros` |
| Dashboard produção comercial | `dash-producao/` (+ `scripts/dash-producao/`) | `dash-v0.1.x` | `dash-producao/version` | Vercel `dash-producao` |
| Gateway Suhai | `suhai-gateway/` | `suhai-v0.1.x` | `suhai-gateway/version` | Cloud Run `suhai-gateway` |

As rotas e telas da jornada Suhai (`app/(marketing)/cotacao-suhai`, `app/api/suhai`, `components/suhai`, `lib/suhai`) fazem parte do **site** e seguem `v0.2.x`. Só o serviço em `suhai-gateway/` tem linha própria, porque é implantado fora da Vercel.

## Regras

1. **Release do site** → bump `package.json` raiz, tag `vX.Y.Z`, entrada em `docs/CHANGELOG.md`, deploy `imediato-seguros`.  
2. **Release do dash** → bump `dash-producao/package.json`, tag `dash-vX.Y.Z`, entrada em `docs/dash-producao/CHANGELOG.md`, deploy `dash-producao`.  
3. **Release do gateway** → bump `suhai-gateway/package.json`, tag `suhai-vX.Y.Z`, deploy por `gcloud run deploy` (ver `suhai-gateway/README.md`).  
4. **Não** misturar: mudança só do dash **não** incrementa `v0.2.x` do site.  
5. Cada projeto Vercel ignora build quando o diff do push não toca seus caminhos (Ignored Build Step). `suhai-gateway/` está no `.vercelignore` e no `exclude` do `tsconfig.json`.

## Histórico dash

Ver [`docs/dash-producao/CHANGELOG.md`](./dash-producao/CHANGELOG.md).
