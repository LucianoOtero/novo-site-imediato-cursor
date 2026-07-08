# CLOUDINARY_ASSETS

## Finalidade
Registro de assets hospedados no Cloudinary (URL, uso, dimensões, prioridade), quando esse serviço for utilizado.

## Origem
Auditoria real executada na Issue P-10, via inspeção do site publicado (Home) — busca por ocorrências de "cloudinary" no HTML completo renderizado. Ver metodologia em `SVG_ASSETS_AUDIT.md`. Este documento também está ligado à ADR-0009 (`DECISIONS.md`, status "Proposta").

## Status
PENDING (condicional). **Explícito:** nenhuma URL do Cloudinary foi encontrada no site publicado (Home) nesta auditoria, **e o inventário externo de URLs do Cloudinary (se existente em conta/projeto separado) ainda não foi fornecido** pelo time responsável. Este documento permanece vazio/placeholder até que esse inventário seja fornecido.

## Achado
Uma busca por `cloudinary` no HTML completo renderizado da Home (537.379 caracteres) retornou **0 ocorrências**. Todos os 76 elementos `<img>` e todos os `background-image` encontrados apontam exclusivamente para `cdn.prod.website-files.com` (CDN nativo do Webflow) — 115 referências a `website-files.com` no HTML. Ver inventário completo em `SVG_ASSETS_AUDIT.md` e `IMAGE_ASSETS_INVENTORY.md`.

## O que isso significa
- O Cloudinary **não está em uso no site publicado atual** (pelo menos não na Home, única página auditada nesta rodada).
- Se existem imagens "já geradas e hospedadas no Cloudinary" (conforme contexto que originou a ADR-0009), elas provavelmente estão em uma conta/projeto Cloudinary **separado**, preparado para o redesign, e não fazem parte do site em produção hoje.
- **Esta auditoria não pode, portanto, preencher a Tabela 5 com URLs reais** — isso exigiria acesso direto à conta/projeto Cloudinary mencionada, que não foi fornecido nesta sessão.

## Próximos passos (não executados nesta auditoria)
1. O time de Marketing/Dev deve fornecer o inventário real de URLs do Cloudinary, se existirem, para preencher a Tabela 5 abaixo.
2. Somente após esse inventário, a ADR-0009 pode evoluir de "Proposta" para "Aceita" ou ser reavaliada/descartada caso não haja de fato imagens no Cloudinary a aproveitar.
3. Enquanto isso, o plano de assets pode avançar com a suposição de que **todos os assets serão locais** (`/public`, via `lib/assets.ts`), sem dependência de Cloudinary — o que é a alternativa mais simples já considerada na própria ADR-0009 ("hospedar todas as imagens localmente em `/public`").

## Tabela 5 — Assets no Cloudinary (vazia — aguardando inventário real)

| Asset | URL Cloudinary | Uso previsto | Alt text | Width | Height | Formato | Peso estimado | Priority? | Migrar para `lib/assets.ts`? | Observações |
|---|---|---|---|---|---|---|---|---|---|---|
| *(nenhum item — nenhuma URL do Cloudinary foi encontrada nesta auditoria)* | | | | | | | | | | |

---

> Auditoria real (não é um `PENDING` por omissão — é um `PENDING` documentado com evidência de que a busca foi feita e não encontrou uso atual). Nenhuma URL foi inventada. Este documento permanece condicional: só passa a ter conteúdo real se o Cloudinary for de fato adotado (ADR-0009 aceita) e um inventário de URLs for fornecido pelo time responsável.
