# Direção visual v2 — assets gerados via Higgsfield MCP

## Finalidade
Documentar a direção de arte, o prompt kit e os custos dos assets visuais gerados com IA (Higgsfield MCP, `https://mcp.higgsfield.ai/mcp`) para a versão mais visual do site (branch `v2-visual`, preview da Vercel; produção intocada até aprovação do merge).

## Regras de marca
- **Paleta**: tudo deve harmonizar com os tokens de `app/globals.css` — `brand-500 #1366d6`, `brand-600 #0f55b8`, `brand-700 #0a2540` (azul profundo); gradiente da marca `160deg, #0a2540 → #0f55b8`.
- **Sem rostos humanos gerados por IA** — pessoas reais já existem em `public/team/`. IA fica para veículos, cenas urbanas, estradas e texturas.
- **Sem texto/logos/placas legíveis** embutidos nas imagens.
- Fotorrealismo cinematográfico limpo; cenas brasileiras (São Paulo, estradas, cidade); luz natural; espaço negativo para o texto do hero.

## Modelos e custos (confirmados via preflight, 2026-07-19)
| Modelo | Uso | Custo/imagem |
|---|---|---|
| `nano_banana_pro` | Heros e imagens 4K de qualidade | 2 créditos |
| `nano_banana_2` | Iterações rápidas/exploração | 1,5 créditos |
| Vídeo (Seedance 2.0 etc.) | 1 experimento (Etapa 3) | ~23 créditos |

Conta: plano trial Plus (2026-07-19). Preflight sempre com `get_cost: true` antes de gerar.

## Prompt kit (heros)

Base comum (todas as gerações de hero):
- `16:9`, wide, fotorealista, cinematográfico, HDR contido
- Cor: navy profundo `#0a2540` + azul `#1366d6` na gradação de luz/céu
- Espaço negativo no lado esquerdo ou topo (o texto/formulário do Hero fica sobreposto)
- Negativos: `no people faces, no text, no logos, no readable license plates`

### Variação A — "Blue hour urbano" (home/auto)
> Cinematic wide photograph of a modern silver SUV driving on an elevated avenue in Sao Paulo, Brazil at dusk (blue hour). Deep navy sky (#0a2540) transitioning to vibrant blue (#1366d6) city lights, subtle light trails, clean minimal composition with copy space on the left, photorealistic, 35mm, f/8, no people visible, no text, no logos, no readable license plates.

### Variação B — "Manhã clean" (home)
> Minimalist photorealistic wide image of a modern car and a motorcycle parked side by side in a bright clean urban plaza in Brazil, early morning soft natural light, blue-tinted color grade harmonizing with deep blue (#0f55b8), airy negative space at the top for website hero text, architectural background softly blurred, no visible faces, no text, no readable license plates.

## Log de gerações
| Data | Asset | Modelo | Créditos | Status |
|---|---|---|---|---|
| 2026-07-19 | Hero home — lote 1 (A×2, B×2) | nano_banana_pro | 8 | em avaliação |

## Integração (referência)
- Sempre `next/image` com `sizes` corretos; hero com `priority`; demais lazy.
- Formatos: AVIF/WebP; hero ≤ ~250 KB.
- Overlay de gradiente da marca para legibilidade do texto.
- Vídeo (se aprovado): `poster` + `preload="none"` + `prefers-reduced-motion`; ≤ 2–3 MB.
