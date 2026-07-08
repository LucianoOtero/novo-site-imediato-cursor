# DESIGN_SYSTEM

## Finalidade
Identidade visual, tokens de design, componentes, motion e sistema de imagens.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 8–14, 28–30, 35. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

## 8. Design System

Tokens-first, mapeados para `globals.css @theme` (Tailwind 4, CSS-first) e variáveis de shadcn/ui.

```
colors:  brand.50 #eef4fd · 100 #d8e6fb · 500 #1366d6 · 600 #0f55b8 · 700 #0a2540 (deep)
         whatsapp #1aa564 ; alert #d23b3b
         neutral.50 #f6f8fb · 200 #e2e8f1 · 500 #5b6b82 · 900 #0b1f3a
radius:  sm 8 · md 12 · lg 16 · xl 24 · full 9999
shadow:  sm 0 1 2 rgba(11,31,58,.06) ; md 0 6 20 rgba(11,31,58,.08) ; lg 0 18 50 rgba(11,31,58,.12)
font:    display "Manrope" ; sans "Inter"
ease:    standard cubic-bezier(.2,.7,.2,1) ; dur 160–240ms
```

**Princípios visuais:** muito espaço em branco (padding vertical 80–120px desktop); sombras discretas e gradientes suaves azul→branco; bordas hairline; confiança via azul profundo + tipografia sólida; nada de exageros.

## 9. Guia de identidade visual

**Personalidade:** confiável e estabelecida (25+ anos); humana e próxima ("gente de verdade"); moderna mas não fria; direta e transparente.
**Tom de voz:** sentence case, frases curtas, "você", benefício antes de recurso, urgência sem pressão.
**Logotipo:** manter o atual; SVG monocromático p/ fundos azuis e colorido p/ fundos claros; mínimo 120px (desktop) / 96px (mobile).
**Imagery:** fotos reais da equipe e atendimento com leve overlay azul; evitar banco de imagens genérico.

## 10. Biblioteca de ícones

**Lucide Icons** (open-source, tree-shakeable, traço 1.5–2px). Substitui todos os SVGs avulsos.

| Contexto | Ícone Lucide |
|---|---|
| Colisão / acidente | `car-front`, `shield-alert` |
| Roubo e furto | `shield`, `lock` |
| Assistência 24h / guincho | `truck`, `clock` |
| Vidros / faróis | `square-dashed`, `lightbulb` |
| Chaveiro / carro reserva | `key-round`, `car` |
| WhatsApp / telefone | `message-circle`, `phone` |
| Preço / bônus | `badge-percent`, `piggy-bank` |
| Confiança / SUSEP | `badge-check`, `star` |
| Fraude (alerta) | `triangle-alert` |

Logos de marca (WhatsApp, seguradoras) usam SVG oficial. Ícone decorativo recebe `aria-hidden="true"`; ícone com significado recebe `aria-label`.

## 11. Tipografia

- **Manrope (Display):** títulos, H1–H3, números de destaque. Pesos 700/800. `letter-spacing:-.02em` em tamanhos grandes.
- **Inter (Texto):** corpo, UI, labels, FAQ. Pesos 400/500/600. `line-height:1.6`.

| Token | Mobile → Desktop | Uso |
|---|---|---|
| display | 34 → 56px / 800 | H1 hero |
| h2 | 26 → 38px / 800 | títulos de seção |
| h3 | 20 → 24px / 700 | subtítulos |
| body | 16 → 17px / 400 | parágrafos |
| small | 13 → 14px / 500 | labels, legais |
| eyebrow | 12px / 700 · uppercase · tracking .16em | eyebrows |

Fontes **self-hosted** via `next/font` (subset latin, `display:swap`) → elimina render-blocking, melhora CWV/privacidade.

## 12. Paleta de cores

| Cor | Hex | Token | Uso |
|---|---|---|---|
| Azul profundo | `#0a2540` | brand.700 | fundo escuro, headers |
| Azul ação | `#1366d6` | brand.500 | CTAs, links |
| Azul suave | `#eef4fd` | brand.50 | fundos de seção |
| Branco | `#ffffff` | — | base |
| Cinza claro | `#f6f8fb` | neutral.50 | cards, alternância |
| Cinza texto | `#5b6b82` | neutral.500 | texto secundário |
| Verde | `#1aa564` | — | **só WhatsApp** |
| Vermelho | `#d23b3b` | — | **só alerta de fraude** |
| Tinta | `#0b1f3a` | neutral.900 | texto principal |

**Regra de cor:** verde e vermelho são funcionais e exclusivos (WhatsApp / fraude). Nunca decoração.
**Contraste (WCAG AA):** tinta/branco 15.8:1 ✓ · azul ação/branco 4.7:1 ✓ · branco/azul profundo 14.6:1 ✓ · cinza secundário/branco 5.6:1 ✓.

## 13. Espaçamentos

Escala base **4px** (alinha com Tailwind).

| Token | px | Uso |
|---|---|---|
| space-1…3 | 4 · 8 · 12 | gaps internos, ícone+texto |
| space-4 · 6 | 16 · 24 | padding de card, gap de grid |
| space-8 · 12 | 32 · 48 | blocos, margens de título |
| section-y | 64 (mob) → 112 (desk) | padding vertical de seção |
| container | máx 1200px · gutter 20/32 | largura de conteúdo |

## 14. Responsividade

| Breakpoint | Largura | Layout |
|---|---|---|
| base (mobile) | < 640px | 1 coluna · StickyCTA ativo · menu drawer |
| sm | ≥ 640px | grids 2 col |
| md (tablet) | ≥ 768px | nav expande · hero 2 colunas |
| lg (desktop) | ≥ 1024px | nav completa · grids 3–4 col · sticky lateral no form |
| xl | ≥ 1280px | container 1200px centralizado |

**Mobile-first:** 70%+ do tráfego vem de Ads no smartphone. Alvos de toque ≥ 44px; CTA primário sempre visível (sticky); form acima da dobra; imagens com `sizes` corretos; sem hover como único meio de interação.

## 28. Identidade visual exclusiva

### 28.1 Conceito de marca — "Imediato"
Imediatismo com cuidado humano. Três tensões equilibradas: **rapidez** (resposta, movimento curto, clareza), **solidez** (25+ anos, SUSEP, azul profundo) e **proximidade** (gente de verdade, calor sutil).

### 28.2 Os 6 elementos de assinatura (DNA Imediato) — reconhecível sem logo
1. **Traço Imediato:** linha/seta diagonal ascendente (~18°) da esquerda→direita, como divisor de seção, sublinhado de keyword e direção de movimento.
2. **Azul profundo dominante** `#0a2540` em blocos âncora (hero, CTA-faixa, footer), texto branco, respiro amplo.
3. **Cartões "lift":** brancos sobre cinza-nuvem, raio 16px, sombra md, borda hairline; elevam +4px no hover.
4. **Selo de confiança recorrente:** pílula "★ 4.8 · +2.000 avaliações · SUSEP" como motivo.
5. **Numeral em destaque:** preços/estatísticas em Manrope 800, `tabular-nums`, sufixo em peso menor.
6. **Gradiente "amanhecer azul":** `#0a2540 → #0f55b8` a 160° com glow ciano, exclusivo de hero/CTA. Nunca em texto.

> **Teste do "squint":** ao desfocar, ler: bloco azul no topo, faixa de cards elevados, pílula de confiança, faixa azul de CTA, footer azul. Esse ritmo cromático é a impressão digital da marca.

### 28.3 Princípios de design
Clareza acima de tudo · Confiança visível (prova social/SUSEP a ≤1 scroll) · Respiro é recurso · Movimento com propósito (<240ms) · Humano no centro · Consistência sistêmica (tudo deriva de tokens, zero valor mágico).

### 28.4 Direção de arte & estilo fotográfico
- **Fotografia:** pessoas reais (equipe/clientes BR), luz natural difusa, ambientes autênticos, ar à volta do sujeito. Nunca "stock sorridente".
- **Tratamento:** color grade frio-neutro; overlay azul `#0a2540` 8–14% sobre texto; granulação zero; contraste médio.
- **Proporções:** hero 16:9/3:2; retratos 4:5; thumbs 1:1; OG 1.91:1.
- **Ilustração:** mínima e geométrica (traço 2px, paleta da marca). Sem mascotes, flat genérico ou "corporate Memphis".
- **Proibições:** gradientes arco-íris, glassmorphism exagerado, sombras coloridas, emojis institucionais.

### 28.5 Gradientes, sombras & bordas (tokens estendidos)
```css
/* globals.css @theme */
@theme {
  --gradient-brand: linear-gradient(160deg,#0a2540 0%,#0f55b8 78%);
  --gradient-glow:  radial-gradient(60% 80% at 70% 0%, rgba(34,140,255,.25), transparent 70%);
  --gradient-soft:  linear-gradient(180deg,#f6f8fb 0%,#ffffff 100%);
  --shadow-sm: 0 1px 2px rgba(11,31,58,.06);
  --shadow-md: 0 6px 20px rgba(11,31,58,.08);
  --shadow-lg: 0 18px 50px rgba(11,31,58,.12);
  --shadow-cta:0 8px 24px rgba(19,102,214,.28);   /* só botão primário */
  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:24px; --radius-pill:9999px;
  --border-hair:1px solid #e2e8f1;
}
```
Sombras sempre azuladas, nunca além de `lg` (exceto CTA). Bordas hairline `#e2e8f1`. Raios crescem com a importância (chips 8 → cards 16 → hero 24).

### 28.6 Grid, espaçamento & ritmo
Grid 12 colunas, gutter 24/16px, container 1200px, margem mín. 20px. Base 4px. Ritmo de seção: alternância branco ↔ cinza-nuvem; bloco azul profundo a cada ~3 seções. Medida de leitura 60–75ch. Cadência: eyebrow → título → subtítulo → conteúdo → (opcional) CTA.

### 28.7 Motion language (resumo)
Movimento curto, decidido, direcional (esquerda→direita). Easing `cubic-bezier(.2,.7,.2,1)`, 160–240ms, respeitando `prefers-reduced-motion`. Detalhe na seção 30.

## 29. Design System empresarial

### 29.1 Template de documentação (todo componente)
Finalidade · Propriedades (TS) · Variantes · Estados (default/hover/focus/active/disabled/loading/error/success/empty) · Comportamento · Acessibilidade (ARIA/teclado/foco/contraste) · Animações (tokens da seção 30) · Responsividade · Exemplos de uso · Boas práticas · Anti-padrões.

### 29.2 Fichas-chave

**Button** — variantes `primary | secondary | ghost | whatsapp | destructive`; sizes `sm|md|lg`; props `iconLeft/iconRight, loading, fullWidth, asChild, href`. Estados: hover (−2px Y), active (scale .98), focus-visible (anel 2px), disabled (.6), loading (spinner, aria-busy). A11y: `<button>`/`<a>` semântico, ≥44px, foco visível. Boas práticas: 1 primary por viewport, verbo de ação. Anti: 2+ primary, "clique aqui".

**FAQ/Accordion** — props `items:{q,a}[], type:'single'|'multiple', emitSchema`. Radix: `aria-expanded`, `aria-controls`, teclado ↑↓ Home End. Animação altura 220ms + fade; chevron 180°. Emitir FAQPage JSON-LD. Anti: todos abertos por padrão.

**Toast/Sonner** — variantes success/error/info. `role=status` (polite) p/ sucesso, `role=alert` p/ erro; auto-dismiss 5s pausável. Anti: toast p/ erro de validação de campo (usar inline).

### 29.3 Matriz completa de componentes

| Componente | Variantes | Estados / notas | A11y crítico |
|---|---|---|---|
| Hero | home · ramo · simples | com form / CTA; LCP-priority | H1 único; foco lógico |
| InsuranceCard | default · destaque · compacto | hover lift; preço da lib | link "Cotar {ramo}" |
| CoverageCard | grid · lista · destaque | "ver todas" expande | ícone aria-hidden |
| PricingCard | simples · recomendado | numeral tabular; selo popular | preço legível por SR |
| ComparisonTable | 2–4 colunas | scroll-x mobile; linha destaque | `<table>` scope; caption |
| Timeline | vertical · horizontal | "como funciona"; reveal | lista ordenada |
| Testimonials | carrossel · grid | Embla; autoplay pausável | setas+teclado; aria-roledescription |
| TrustIndicators | barra · grid | SUSEP, nota, anos | números com contexto |
| FloatingCTA/WhatsAppFAB | WhatsApp · multi | msg por ramo | label descritivo |
| StickyCTA | barra mobile | some no footer; safe-area | não rouba foco |
| MegaMenu | desktop · drawer | colunas por categoria | focus trap; Esc; aria-expanded |
| Drawer/Sheet | esq · dir · bottom | overlay; scroll-lock | focus trap; retorno de foco |
| EmptyState | busca · resultado | ilustração mínima + CTA | texto descritivo |
| ErrorState | inline · 404/500 | mensagem humana + recuperação + WhatsApp | role=alert; foco |
| SuccessState | inline · /obrigado | confirma + dispara conversão | role=status |
| Skeleton | texto · card · imagem | shimmer 1.4s; evita CLS | aria-hidden; aria-busy |
| ProgressIndicator | barra · passos · circular | form multi-step; % visível | aria-valuenow/min/max |
| ContactCard | WhatsApp · tel · email · endereço | tel:/wa.me/mailto; Maps | links rotulados; lazy mapa |
| Breadcrumb | padrão | BreadcrumbList schema | nav aria-label; aria-current |
| Badge/Chip | info · success · alert · neutro · filtro | removível/selecionável | chip selecionável = button; aria-pressed |
| FeatureCard | ícone-topo · ícone-lado | hover lift | título como heading |
| FraudAlert | banner dismissível · página | único uso do vermelho; dismiss em cookie | role=region; não auto-fechar |

Implementação: primitives shadcn/ui (Radix), estendidos com `cva`; cada componente com entrada no Storybook (seção 37, Fase 2).

## 30. Motion Design System

### 30.1 Tokens
```css
--ease-standard: cubic-bezier(.2,.7,.2,1);   /* entradas/saídas UI */
--ease-emphasized: cubic-bezier(.2,.9,.1,1); /* hero, momentos-chave */
--ease-exit: cubic-bezier(.4,0,1,1);
--dur-instant:100ms; --dur-fast:160ms; --dur-base:200ms; --dur-slow:240ms; --dur-slower:320ms;
--stagger:60ms;
```
Regra: chip 100ms · botão 160ms · card 200ms · modal 240ms · transição de página 320ms. Nunca >320ms.

### 30.2 Catálogo de padrões

| Padrão | Duração/Easing | Especificação |
|---|---|---|
| Entrada | 200ms standard | fade + translateY 8→0 |
| Saída | 150ms exit | fade + translateY 0→4 |
| Hover card | 160ms standard | translateY −4 + sombra md→lg |
| Hover botão primário | 160ms | brilho +6% + Y −2 + sombra-cta |
| Active/press | 100ms | scale .98 |
| Focus | 120ms | anel 2px + offset 2px (sem shift) |
| Scroll reveal | 240ms · stagger 60ms | fade + Y 16→0 ao entrar 15%; `whileInView once`; direcional esq→dir |
| Stagger grid | filhos +60ms | máx 8 itens animados |
| Hero | 320ms emphasized | headline → subhead +80 → form +160 → prova +220; glow pulse 6s (off em reduced) |
| Sticky CTA | 200ms | slide-up ao passar do hero; slide-down no footer |
| Mega menu/drawer | 160/240ms | menu fade+scale; drawer slide-in + overlay |
| FAQ accordion | 220ms | altura auto + fade; chevron 180° |
| Form passo | 200ms | atual sai −24+fade, próximo entra da direita; barra 240ms |
| Form validação | 120ms | borda erro + shake ±4 (2×); ✓ scale-in |
| Loading | — | spinner 700ms linear; skeleton shimmer 1.4s |
| Toast | in 200 / out 150 | slide-up + fade; empilha |
| Transição de página | 320ms emphasized | fade + Y 12 (AnimatePresence / View Transitions) |
| Contador | 1.2s easeOut | preços contam de 0; tabular-nums |
| Logos seguradoras | 160ms | cinza→cor; marquee pausa no hover |

### 30.3 Quando usar
**Usar para:** confirmar ação, direcionar atenção, mostrar causa→efeito, comunicar carregamento. **Não usar:** decoração pura, atrasar info (nunca bloquear LCP), competir com outra animação, ou quando o usuário pediu `reduce`.

### 30.4 Implementação
```ts
// lib/motion.ts
export const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: .2, ease: [.2,.7,.2,1] } },
}
export const staggerGroup = { show: { transition: { staggerChildren: .06 } } }
```
```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{ animation-duration:.01ms!important; transition-duration:.01ms!important; scroll-behavior:auto!important }
}
```
Animar só `transform`/`opacity` (GPU). Nunca `width/height/top/left` em scroll. `will-change` só durante a animação.

## 35. Sistema de imagens

### 35.1 Pipeline técnico
| Etapa | Especificação |
|---|---|
| Formato | AVIF (1ª) + WebP fallback via `next/image`; JPEG só fallback final |
| Componente | `next/image` sempre: width/height (anti-CLS), `sizes`, `quality 70-80` |
| Prioridade | `priority` só no LCP (hero). Resto lazy |
| Placeholder | `placeholder="blur"` com blurDataURL (LQIP) |
| Responsividade | hero `100vw`; card `(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw` |
| Orçamento | hero ≤120KB · cards ≤40KB · thumbs ≤20KB · logos SVG |
| Entrega | otimização Vercel Image/CDN; cache longo + immutable; URLs com hash |

### 35.2 SEO de imagens
Alt descritivo e específico (sem stuffing); decorativas `alt=""`; nomes kebab-case semânticos; sitemap de imagens; OG 1.91:1 via `opengraph-image.tsx`.

> Fotos reais existentes (equipe, call-center) devem ser re-exportadas em AVIF/WebP e tratadas conforme 28.4 antes da produção.

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Nenhum conteúdo foi resumido, reinterpretado ou inventado nesta extração.
