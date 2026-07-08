# SVG_ASSETS_AUDIT

## Finalidade
Auditoria e classificação de todos os SVGs/assets visuais do site atual (tabelas 1–5).

## Origem
Auditoria real executada na Issue P-10, via inspeção do site publicado `https://www.segurosimediato.com.br` (página Home) com ferramenta de navegador (DOM, `Runtime.evaluate`/CDP). **Sem acesso ao Webflow Assets Manager nem ao Webflow Export** — a auditoria foi feita a partir do que é publicamente observável no HTML renderizado (elementos `<img>`, `<svg>` inline, `background-image` computado).

## Status
CONTEÚDO CRIADO (auditoria real parcial — ver "Limitações"). Concluído em 2026-07-01.

## Limitações desta rodada
- Apenas a **Home** (`/`) foi inspecionada. Outras páginas (`/equipe`, `/a-imediato`, LPs de ramo) podem conter assets adicionais não listados aqui.
- Todos os assets encontrados na Home estão hospedados em `cdn.prod.website-files.com` (CDN nativo do Webflow) — **nenhuma URL do Cloudinary foi encontrada** (0 ocorrências em busca no HTML completo da página). Ver `CLOUDINARY_ASSETS.md` para detalhamento.
- **Nada foi baixado ou copiado.** Este documento é apenas classificação/decisão, conforme exigido pela Issue P-10.
- Dos 169 elementos `<svg>` inline detectados, a maior parte pertence ao widget de terceiros Elfsight (ícones de avaliação/estrela) e a ícones utilitários da própria página (setas de carrossel) — não são assets de marca da Imediato.

---

## Tabela 1 — SVGs encontrados

| Asset | Origem | Tipo | Local atual | Uso atual | Tamanho | Duplicado? | Crítico? | Decisão | Observações |
|---|---|---|---|---|---|---|---|---|---|
| Logo Imediato Seguros | `.../5f845624fe08f9f0d0573fee_logotipo-imediato-seguros.svg` | Webflow CDN | Header (`<img class="image-30">`) | Logotipo principal | 179×150 (arquivo pode ser maior — dimensão renderizada) | Não | **Sim** | **Migrar obrigatório** | Ver Tabela 2 (Logos de marca) |
| Ícone telefone (azul) | `.../5caf3d1c5db33b3cc3ee36c1_fone%20azul.svg` | Webflow CDN | Header (links de telefone) | Ícone de telefone | 484×484 | Sim (usado 2×) | Não | **Substituir por Lucide** (`phone`) | Ícone genérico |
| Ícone WhatsApp (azul) | `.../5caf62fd9e5e1c4c2811e865_whatsapp%20azul%202.svg` | Webflow CDN | Header | Ícone de WhatsApp | 484×484 | Não | Não | Migrar opcional (revisar se é a marca oficial do WhatsApp) | Verificar conformidade com guidelines de marca do WhatsApp |
| Ícone WhatsApp (branco, grande) | `.../5ee7b3733ab8d09b9e30167b_whatsapp-icon-seeklogo.com.svg` | Webflow CDN | Botão flutuante de WhatsApp | Ícone de WhatsApp (fonte: **seeklogo.com**, repositório genérico de logos) | 2489×2500 (arquivo grande para um ícone) | Não | Não | **Descartar/Substituir** | Não é o asset oficial de marca do WhatsApp (baixado de repositório de terceiros); recomenda-se usar o ícone/branding oficial |
| Logo ramo "Auto" | `.../5cc34fffffd30f2ab3bdf3f1_logo-auto-sem-linha.svg` | Webflow CDN | RamoGrid (card Auto) | Ícone do ramo Auto | 591×354 | Não | Sim (identidade do ramo) | **Substituir por Lucide** (`car-front` ou `car`) | `lib/ramos.ts` já prevê `icon: string` como nome de ícone Lucide (seção 56.1) — alinhado com decisão já tomada na spec |
| Logo ramo "Caminhão" | `.../6123b64c567800209abed277_caminhao-0.svg` | Webflow CDN | RamoGrid | Ícone do ramo Caminhão | 233×150 | Não | Sim | **Substituir por Lucide** (`truck`) | — |
| Logo ramo "Uber" | `.../5cc34fff3d71025a487e4863_logo-uber-sem-linha.svg` | Webflow CDN | RamoGrid | Ícone do ramo Uber/App | 591×354 | Não | Sim | **Substituir por Lucide** (`car` + badge, ou `smartphone`) | — |
| Logo ramo "Utilitário" | `.../5cc350003a80e854a166ea2e_logo-utilitario-sem-linha.svg` | Webflow CDN | RamoGrid | Ícone do ramo Utilitário | 591×354 | Não | Sim | **Substituir por Lucide** (`truck` variante ou `car`) | — |
| Logo ramo "Moto" | `.../5cc34fffa34976d27b97d375_logo-moto-sem-linha.svg` | Webflow CDN | RamoGrid | Ícone do ramo Moto | 591×354 | Não | Sim | **Substituir por Lucide** (`bike`) | — |
| Ícone "colisão" usado entre ramos | `.../5cace248832adc47e35fff0a_colisao%20branco%20centralizado.svg` | Webflow CDN | RamoGrid (posição entre Moto e Táxi — possivelmente ramo "RCF/24hs") | Não confirmado a que ramo pertence exatamente | 567×567 | Não | Investigar | **Investigar** | Nome do arquivo ("colisão") não corresponde ao contexto esperado (RCF/24hs); confirmar antes de mapear para `lib/ramos.ts` |
| Logo ramo "Táxi" | `.../5cc34fff3a80e803ad66ea2c_logo-taxi-sem-linha.svg` | Webflow CDN | RamoGrid | Ícone do ramo Táxi | 591×354 | Não | Sim | **Substituir por Lucide** (`car-taxi-front` se disponível, ou `car`) | — |
| Logo ramo "Pet" | `.../61c34bad3cae4b7f672c4d55_pet-pequeno.svg` | Webflow CDN | RamoGrid | Ícone do ramo Pet | 150×150 | Não | Sim | **Substituir por Lucide** (`paw-print`) | — |
| Logo ramo "Aluguel/Fiança" | `.../61c34dc08c354b6608106c6e_rental.svg` | Webflow CDN | RamoGrid | Ícone do ramo Fiança/Aluguel | 150×150 | Não | Sim | **Substituir por Lucide** (`key-round` ou `home`) | — |
| Ícone "preço" | `.../614b5f4379212b82493dd07a_BEST%20PRICE%204.svg` | Webflow CDN | Seção de diferenciais | Ícone do diferencial "preço" | — | Não | Não | **Substituir por Lucide** (`badge-percent`, já sugerido na seção 10 da spec) | — |
| Ícone "bônus" | `.../614b64a58daf49c3c5d82392_BONUS4.svg` | Webflow CDN | Seção de diferenciais | Ícone do diferencial "bônus" | — | Não | Não | **Substituir por Lucide** (`piggy-bank`, já sugerido na seção 10 da spec) | — |
| Ícone "sob medida" | `.../614b659c8f34cd8a2af36c76_SOB-MEDIDA-2.svg` | Webflow CDN | Seção de diferenciais | Ícone do diferencial "sob medida" | — | Não | Não | **Substituir por Lucide** (sugestão: `ruler` ou `settings-2`) | — |
| Ícone "sinistro" | `.../5cae56df8bbb463e8cda6dec_sinistro.svg` | Webflow CDN | Seção de diferenciais | Ícone do diferencial "sinistro" | — | Não | Não | **Substituir por Lucide** (sugestão: `life-buoy` ou `shield-alert`) | — |
| Ícone "canais" | `.../5caf2c1c7963817271e53b91_canais%2019.svg` | Webflow CDN | Seção de diferenciais | Ícone do diferencial "canais de comunicação" | — | Não | Não | **Substituir por Lucide** (sugestão: `radio` ou `share-2`) | — |
| 16 ícones de coberturas ("img-std-1", estilo "padded-circle") | `.../68ac6...` (16 arquivos, um por cobertura: colisão, roubo, incêndio, danos pessoais, danos materiais, 24hs, chaveiro, vidros, pane seca/elétrica/mecânica, faróis, táxi, retrovisor, pneu, carro reserva) | Webflow CDN | Seção "Coberturas" | Ícones de cada uma das 16 coberturas listadas na especificação (seção 1.1) | — | Não | Sim (16 itens, todos usados) | **Substituir por Lucide** — mapeamento já definido na seção 10 da spec para a maioria (`car-front`/`shield-alert`, `shield`/`lock`, `truck`/`clock`, `square-dashed`/`lightbulb`, `key-round`/`car`) | Confirma exatamente as 16 coberturas da especificação; ícones atuais são de um pacote genérico ("forced-white-padded-circle"), não desenhos próprios da marca |
| Ícone de fechar banner CookieYes | `cdn-cookieyes.com/assets/images/close.svg` | Externo (terceiro) | Banner de consentimento | UI do CookieYes | 10×10 | — | Não | **Descartar** | Pertence à ferramenta de terceiro que será substituída (Consent Mode v2 nativo) |
| ~169 SVGs inline (Elfsight + utilitários de página) | Inline no HTML | Inline | Widget de avaliações (Elfsight) e ícones de carrossel | Estrelas de avaliação, setas de navegação | — | Sim (muitos repetidos, ex.: mesmo path de estrela repetido) | Não | **Descartar** | Pertencem ao widget Elfsight (a ser substituído pelo `Testimonials` custom) ou a interações nativas do Webflow — não são assets de marca a preservar |

## Tabela 2 — Logos de marca

> Ver `BRAND_ASSETS.md` para a tabela completa (Imediato + 18 seguradoras), com formato atual/ideal e decisão de migração.

## Tabela 3 — Ícones e elementos genéricos

| Ícone/asset | Uso atual | Pode ser substituído por Lucide? | Lucide sugerido | Migrar? | Observações |
|---|---|---|---|---|---|
| Ícone telefone (SVG azul) | Header, links de contato | Sim | `phone` | Não | Já sugerido na seção 10 da spec |
| Ícone WhatsApp (SVG azul pequeno) | Header | Parcial (avaliar marca oficial) | `message-circle` (genérico) ou manter marca oficial do WhatsApp | Investigar | Distinção entre "ícone de ação" (Lucide `message-circle`) e "logo da marca WhatsApp" (deve ser oficial, não Lucide) |
| Ícones .gif de telefone/whatsapp/ouvidoria/e-mail (background-image no header) | Hover/estado dos links de contato no header | Sim | `phone`, `message-circle`, `headset` (ouvidoria), `mail` | Sim | **Técnica datada**: ícones de hover implementados como `.gif` de fundo CSS — substituir integralmente por ícones Lucide + estados CSS/Framer Motion |
| 16 ícones de coberturas | Ver Tabela 1 | Sim (maioria) | Ver seção 10 da spec + sugestões na Tabela 1 | Sim | — |
| 5 ícones de diferenciais (preço/bônus/sob medida/sinistro/canais) | Ver Tabela 1 | Sim | Ver Tabela 1 | Sim | — |
| Ícones de ramo (9 arquivos) | RamoGrid | Sim | Ver Tabela 1 | Sim | Alinhado à decisão já tomada em `lib/ramos.ts` (campo `icon` = nome Lucide, seção 56.1) |
| Setas de carrossel (Elfsight/nativo) | Testimonials/reviews | Sim | `chevron-left`/`chevron-right` | Sim (ao reimplementar Testimonials com Embla) | — |

## Tabela 4 — Assets decorativos

| Asset | Uso atual | Peso | Combina com novo Design System? | Migrar? | Substituir por quê? | Observações |
|---|---|---|---|---|---|---|
| `grid-12.svg` / `header-grid-nodes-12-standard.svg` (padrão de pontos/grade) | Fundo decorativo (`background-image`) repetido em ao menos 6 seções: header, hero, seção Facebook, "por-que", seguradoras, equipe, footer | Não medido nesta auditoria | **Não** — o novo Design System (seção 28.2/28.5 da spec) define como assinatura visual o "Traço Imediato" (linha/seta diagonal) e o gradiente "amanhecer azul", não um padrão de pontos/grade | **Substituir por novo Design System** | Traço diagonal + gradiente `--gradient-brand`/`--gradient-glow` (seção 28.5) | Padrão decorativo genérico, não é uma assinatura de marca distintiva |
| `bg-dots` (radial-gradient CSS, não é arquivo de imagem) | Fundo decorativo em várias seções | N/A (CSS puro, não é asset) | Não — mesmo motivo acima | N/A | Substituir por tokens do novo DS | Não é um arquivo de asset, é CSS gerado; registrado por completude |
| Imagens "-gray.webp" (call-center-menina, equipe-experiente, visao-geral-equipe, reputação) | Seção "Canais"/diferenciais, ilustrações em tom de cinza | Não medido | Não confirmado — autenticidade das fotos (reais vs. genéricas) não pôde ser verificada nesta auditoria | **Investigar** | A definir após revisão do Design/Marketing | Filenames sugerem fotos reais da operação, mas isso não foi confirmado visualmente em detalhe nesta auditoria — a regra da spec (28.4) prioriza fotos reais sobre genéricas, então vale a pena confirmar antes de descartar |
| Ícones .gif de hover no header | Ver Tabela 3 | Pequeno, mas tecnicamente datado (GIF para ícone estático) | Não | **Descartar** | Ícones Lucide + estados via CSS/Framer Motion | — |

## Tabela 5 — Assets no Cloudinary

> Ver `CLOUDINARY_ASSETS.md`. **Nenhum asset do Cloudinary foi encontrado** nesta auditoria (0 ocorrências de "cloudinary" no HTML completo da Home). Tabela mantida vazia/placeholder até que o time de Marketing/Dev forneça um inventário real de imagens hospedadas no Cloudinary, se existirem fora do site publicado.

---

> Auditoria real (não é `PENDING`), baseada em inspeção do site publicado. Nenhum asset foi baixado ou copiado. Classificações marcadas **Investigar** requerem confirmação do Design/Marketing antes de uma decisão final.
