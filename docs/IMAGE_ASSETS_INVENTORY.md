# IMAGE_ASSETS_INVENTORY

## Finalidade
Inventário de imagens (fotos de equipe/escritório, PNG/WebP, hero) com dimensões, peso e prioridade.

## Origem
Auditoria real executada na Issue P-10, via inspeção do site publicado (Home). Ver metodologia e limitações em `SVG_ASSETS_AUDIT.md`.

## Status
✅ **Fotos da equipe migradas em 2026-07-03** (ver nota abaixo). Auditoria original concluída em 2026-07-01.

## Observações
Todas as imagens abaixo estão hospedadas em `cdn.prod.website-files.com` (CDN do Webflow), já em formato **WebP** (o site atual já usa um formato moderno para fotos, diferente do que a especificação assumia como problema genérico de performance — ponto positivo a registrar). Peso em disco de cada arquivo **não foi medido** nesta auditoria (exigiria download, fora do escopo de "não baixar assets" da Issue P-10); dimensões de exibição (`naturalWidth`/`naturalHeight`) retornaram `0×0` para imagens com `lazyload` ainda não carregadas no momento da inspeção — **não confirmado**, não inventado.

---

## Fotos da equipe (reais, confirmadas)

16 fotos individuais de colaboradores encontradas na Home (seção "CONHEÇA NOSSA EQUIPE DE ESPECIALISTAS", que exibe "16 COLABORADORES PARA MELHOR ATENDÊ-LO" — uma foto por nome, hospedadas em `cdn.prod.website-files.com/5f4547a72eb9133a64c8b085/...webp`):

| Nome (arquivo) | Formato | Prioridade sugerida | Migrar? |
|---|---|---|---|
| Alberto | WebP | Lazy (abaixo da dobra) | ✅ **Migrado (2026-07-03)** — `public/team/alberto.webp` |
| Alex | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Andressa | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Camila | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Débora | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Diogo | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Erica | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Fernando | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Heloisa | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Kayrine | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Luara | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Luciano | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Nay | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Pedro | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Sales | WebP | Lazy | ✅ **Migrado (2026-07-03)** |
| Thiago | WebP | Lazy | ✅ **Migrado (2026-07-03)** |

> Os 16 nomes já haviam sido confirmados na auditoria original (tabela acima). A página `/equipe` foi inspecionada nesta rodada (2026-07-03): mostra exatamente o mesmo conjunto de 16, sem cargo/função, só o primeiro nome como legenda.

### Nota de migração (2026-07-03)

As 16 fotos foram **baixadas diretamente do site de produção** (`/equipe` e Home), arquivos públicos em WebP, sem necessidade de credenciais, e migradas para `/public/team/`. Diferente dos logos de seguradoras (ativos de marca), são fotos de pessoas reais — por isso a migração só ocorreu após confirmação explícita do cliente de que todos os 16 colaboradores seguem na empresa e as fotos continuam atuais (nenhuma imagem de ex-colaborador ou desatualizada foi migrada sem essa confirmação).

`lib/team.ts` (novo) é a fonte de dados para `TeamStrip` (resumo de 8 na Home) e para a página completa `/equipe` (`app/(marketing)/equipe/page.tsx`, todos os 16) — ambos implementados nesta rodada, ver `docs/BACKLOG.md`.

**Nota sobre "39 especialistas"**: a especificação (seção 6.1) usa "39 especialistas, gente de verdade" como texto de exemplo do wireframe — **não é um dado confirmado**. O valor real e oficial é **16** (mesma contagem do próprio site de produção, "16 COLABORADORES PARA MELHOR ATENDÊ-LO"), usado em `team.length` como fonte única de verdade, nunca hardcoded como "39" nem como "16" em texto solto.

## Imagens ilustrativas ("Canais"/diferenciais — autenticidade não confirmada)

| Asset | Uso | Prioridade | Migrar? |
|---|---|---|---|
| `call-center-menina-gray.webp` | Ilustração de atendimento (seção "Canais") | Lazy | **Investigar** — confirmar com Marketing se é foto real da operação ou imagem genérica/stock antes de decidir |
| `equipe-experiente-gray.webp` | Ilustração de equipe (seção "Canais") | Lazy | Investigar |
| `visao-geral-equipe-gray.webp` | Ilustração de equipe (seção "Canais") | Lazy | Investigar |
| `reputação-gray.webp` | Ilustração de reputação (seção "Canais") | Lazy | Investigar |

## Imagens de hero/decorativas (SVG, não fotográficas)

Ver `SVG_ASSETS_AUDIT.md` Tabela 4 — `grid-12.svg`/`header-grid-nodes-12-standard.svg`, usadas como `background-image` em múltiplas seções (não são fotos, são padrões decorativos vetoriais).

## Achado — nenhuma imagem de hero fotográfica encontrada na Home

Diferente do que a seção 6.1 da especificação descreve como wireframe (hero com foto/ilustração de fundo), a Home atual usa um **fundo decorativo SVG** (`grid-12.svg`) no bloco do hero, não uma fotografia. Não há, portanto, uma "imagem LCP de hero" fotográfica a auditar aqui — o elemento de maior peso visual no hero é o próprio formulário e o SVG decorativo (leve, vetorial). Isso é uma boa notícia para o orçamento de LCP da nova implementação (seção 35.1 da spec, hero ≤120KB), já que o site atual não depende de uma foto pesada nessa posição.

---

> Auditoria real (não é `PENDING`). Nenhuma imagem foi baixada. Pesos exatos em KB não foram medidos (fora do escopo desta rodada, que evitou download de arquivos); dimensões `0×0` refletem imagens `lazyload` não carregadas no momento da inspeção, não ausência do asset.
