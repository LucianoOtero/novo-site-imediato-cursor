# Cards com foto da Suhai — registro para avaliação

Medido em 30/09/2026 em `https://suhaiseguradora.com/`, folha `themes/suhai/assets/css/main.css`.

O card de produto (moto, carro, caminhão) é a classe `card card--media-overlay card--featured card--link`. A foto ocupa o card inteiro e o texto fica no rodapé, sobre um véu verde-limão. O fundo do card, `#B0F867`, aparece se a imagem ainda não carregou.

## Regras que produzem o efeito

```css
.card--media-overlay {
  position: relative;
  background-color: var(--color-bg-highlight); /* #B0F867 */
  overflow: hidden;
  border-radius: 8px;
}
.card--media-overlay .card__media {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.card__media-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card__media-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    rgba(176, 248, 103, 0) 27.885%,
    rgba(176, 248, 103, 0.95) 85.577%
  );
}
.card--media-overlay .card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 500px;
  padding: 40px;
}
.card--media-overlay .card__title { color: #1D2D0F; font-size: 32px; font-weight: 700; }
.card--media-overlay .card__text { color: #1D2D0F; font-size: 20px; font-weight: 600; }
```

O gradiente começa transparente por volta de 28% da altura e chega a 95% de opacidade do verde-limão perto de 86%. O título e o texto usam o verde-escuro `#1D2D0F`, não branco.

## Variantes vistas na mesma folha, ainda não usadas aqui

- `card--media-horizontal`: foto em 50% da largura, `min-height: 300px`, imagem absoluta com `object-fit: cover`, texto centralizado ao lado.
- `card--editorial`: mídia com altura fixa de 372px e `object-fit: cover`.
- `card--editorial.card--featured`: linha com foto e texto em metades, foto com `min-height: 400px`.

## Onde entrou neste site

Só nos três cards de produto da landing `/marca-suhai`. O restante do site da Imediato fica para uma avaliação própria: o padrão pede foto em tela cheia no card e o véu da marca, e não combina com os cards de texto do tema navy.

Em 01/10/2026 as páginas de moto, carro e caminhão passaram a abrir com a hero no formato da home: a foto do produto à esquerda, com o título por cima, e o formulário de cotação à direita.
