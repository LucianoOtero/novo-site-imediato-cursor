# Versionamento no monorepo

O repositório `novo-site-imediato-cursor` hospeda **dois produtos** com linhas de versão **independentes**.

| Produto | Pasta | Tag GitHub | `package.json` | Vercel |
|---|---|---|---|---|
| Site novo (+ legado ops no mesmo app) | raiz (`app/`, `lib/`, …) | `v0.2.x` | raiz `version` | `imediato-seguros` |
| Dashboard produção comercial | `dash-producao/` (+ `scripts/dash-producao/`) | `dash-v0.1.x` | `dash-producao/version` | `dash-producao` |

## Regras

1. **Release do site** → bump `package.json` raiz, tag `vX.Y.Z`, entrada em `docs/CHANGELOG.md`, deploy `imediato-seguros`.  
2. **Release do dash** → bump `dash-producao/package.json`, tag `dash-vX.Y.Z`, entrada em `docs/dash-producao/CHANGELOG.md`, deploy `dash-producao`.  
3. **Não** misturar: mudança só do dash **não** incrementa `v0.2.x` do site.  
4. Cada projeto Vercel ignora build quando o diff do push não toca seus caminhos (Ignored Build Step).

## Histórico dash

Ver [`docs/dash-producao/CHANGELOG.md`](./dash-producao/CHANGELOG.md).
