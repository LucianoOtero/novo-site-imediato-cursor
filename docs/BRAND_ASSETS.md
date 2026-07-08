# BRAND_ASSETS

## Finalidade
Catálogo dos logos de marca (Imediato + seguradoras) com formato atual/ideal e decisão de migração.

## Origem
Auditoria real executada na Issue P-10, via inspeção do site publicado (Home). Ver metodologia e limitações em `SVG_ASSETS_AUDIT.md`.

## Status
✅ **Logos de seguradoras migrados em 2026-07-03** (ver nota abaixo). Auditoria original concluída em 2026-07-01.

## Observações
Todos os logos abaixo estavam hospedados em `cdn.prod.website-files.com` (CDN do Webflow), em formato SVG "cinza" (`grey`). **Contagem real confirmada nesta auditoria: 18 logos de seguradoras** — o cliente confirmou oficialmente o valor **18** em 2026-07-03 (ver `DADOS_OFICIAIS.md`), resolvendo a divergência "16 (texto) / 18 logos".

### Nota de migração (2026-07-03)

Os 18 logos de seguradoras + o logo principal da Imediato foram **baixados diretamente do site de produção** (`https://www.segurosimediato.com.br`, arquivos públicos, sem necessidade de credenciais) e migrados para `/public/logos/seguradoras/` e `/public/logos/imediato-seguros.svg`. Achados desta migração:

- **Achado corrigido sobre a versão colorida** (a primeira leitura desta rodada estava incompleta): 10 dos 18 arquivos (Porto, Bradesco, Azul, Itaú, HDI, Tokio, Sompo, Mapfre, Liberty, Allianz) são vetores SVG com cores cinza cravadas diretamente nos paths (ex.: `#838383`) — sem versão colorida. Mas os outros 8 (Loovi, Pier, Justos, Darwin, Usebens, Novo Seguros, Youse, Ezze) **embutem uma imagem rasterizada com a cor original da marca** dentro do próprio SVG. O site de produção usa `filter: grayscale(1)` via CSS (classe `img-seg-3`, confirmado inspecionando o CSS computado ao vivo) para uniformizar visualmente todos os 18 como cinza — não há, portanto, nenhum arquivo "colorido" separado, mas 8 dos 18 já contêm a cor original dentro do próprio arquivo. `InsurersGrid` (`components/home/InsurersGrid.tsx`) replica esse comportamento com `grayscale` (Tailwind) por padrão e `hover:grayscale-0`, revelando a cor real nesses 8 logos ao passar o mouse — mais fiel à spec ("cinza → colorido no hover") do que uma primeira versão deste componente, que usava apenas opacidade.
- **18º logo identificado:** o arquivo antes chamado "novo svg.svg" (não identificável pelo nome) é a seguradora real **Novo Seguros** — confirmado extraindo e visualizando a imagem rasterizada embutida no próprio arquivo SVG.
- **Divergência de grafia resolvida:** o arquivo de origem chamava-se "justus svg (1).svg", mas a grafia oficial da marca é **Justos** (seção 1.1 da especificação) — o arquivo local foi renomeado para `justos.svg`.
- **Alerta de performance:** os mesmos 8 arquivos com imagem rasterizada embutida variam de ~13KB a 341KB (`darwin.svg` 341KB, `novo-seguros.svg` 236KB, `youse.svg` 178KB, `justos.svg` 116KB, `loovi.svg` 66KB, `usebens.svg` 64KB, `pier.svg` 19KB, `ezze.svg` 13KB) — bem mais pesados que os 10 vetores puros (2–6KB).

### Vetorização concluída (2026-07-07) — recebida do freelancer externo

O cliente contratou um freelancer para vetorizar manualmente os 8 logos acima (maior fidelidade do que vetorização automática/`potrace`, sem depender de encontrar o vetor oficial em cada site de marca). Os 8 arquivos foram entregues em `assets/Novos/` e avaliados antes da substituição:

- **Confirmado: todos os 8 são vetores puros** — nenhum contém `<image>`/base64 embutido, todos compostos por `<path>`/`<rect>` reais (arquivos gerados no Inkscape). Tamanho caiu drasticamente (ex.: `darwin.svg` de 341KB → 12,6KB; `novo-seguros.svg` de 236KB → 12,3KB; a maioria dos outros para a faixa de 4–6KB, equivalente aos 10 vetores originais).
- **Cores da marca preservadas** (ex.: Darwin em `#fd1e6f`, Loovi em `#5c78fe`) — compatível com o efeito `grayscale` → `hover:grayscale-0` já implementado em `InsurersGrid`, sem necessidade de mudança de código.
- Arquivos substituídos em `/public/logos/seguradoras/` (mesmo nome de arquivo): `darwin.svg`, `ezze.svg`, `youse.svg`, `pier.svg`, `usebens.svg`, `loovi.svg`, `justos.svg`, `novo-seguros.svg`.
- Validado: `typecheck`/`lint`/`check:hardcode`/`build` limpos; confirmado visualmente que os 18 logos renderizam nítidos e consistentes (antes, os 8 rasterizados ficavam borrados/pixelizados em tamanhos maiores).
- `lib/seguradoras.ts` é a fonte de dados para `InsurersGrid`, com nome de exibição + caminho do arquivo para cada uma das 18 parceiras — sem mudança nesta rodada (só os arquivos de logo foram substituídos).

**Todos os 18 logos de seguradoras são agora vetores puros** — pendência de otimização de performance totalmente resolvida.

---

## Tabela 2 — Logos de marca

| Marca | Tipo | Formato atual | Formato ideal | Origem | Uso novo | Migrar? | Observações |
|---|---|---|---|---|---|---|---|
| Imediato Seguros | Logo próprio | SVG (`logotipo-imediato-seguros.svg`) | SVG (manter) | Webflow CDN | Header, Footer, OG, favicon | ✅ **Migrado (2026-07-03)** — `public/logos/imediato-seguros.svg` | Ainda não conectado a `Header`/`Footer` (que hoje usam o nome em texto) — variante monocromática para fundo azul (spec seção 9) não confirmada, fora do escopo desta migração |
| Porto | Logo parceiro | SVG (`porto-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | Confirmado: não existe versão colorida separada — cor cinza cravada no vetor, não um filtro CSS |
| Bradesco | Logo parceiro | SVG (`bradesco-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| Azul Seguros | Logo parceiro | SVG (`azul-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| Itaú | Logo parceiro | SVG (`itau-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| HDI | Logo parceiro | SVG (`hdi-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| Tokio Marine | Logo parceiro | SVG (`tokio-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| Sompo | Logo parceiro | SVG (`sompo-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| Mapfre | Logo parceiro | SVG (`mapfre-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| Liberty Seguros | Logo parceiro | SVG (`liberty-grey.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | — |
| Allianz | Logo parceiro | SVG (`allianz-grey-quadrado.svg`) | SVG | Webflow CDN | InsurersGrid | ✅ **Migrado (2026-07-03)** | Único arquivo disponível é a variante "quadrada" — usado como está |
| Loovi | Logo parceiro | SVG (vetor puro, `#5c78fe`) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado e vetorizado (2026-07-07)** | Era imagem rasterizada embutida (66KB); agora vetor puro (3,8KB) |
| Pier Seguradora | Logo parceiro | SVG (vetor puro) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado e vetorizado (2026-07-07)** | Era imagem rasterizada embutida (19KB); agora vetor puro (5,0KB) |
| Justos | Logo parceiro | SVG (vetor puro) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado e vetorizado (2026-07-07)** | Arquivo de origem usava "justus"; grafia oficial confirmada como "Justos" (seção 1.1). Era imagem rasterizada embutida (116KB); agora vetor puro (4,5KB) |
| Darwin Seguros | Logo parceiro | SVG (vetor puro, `#fd1e6f`) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado e vetorizado (2026-07-07)** | Era imagem rasterizada embutida (341KB); agora vetor puro (12,6KB) |
| Usebens | Logo parceiro | SVG (vetor puro) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado e vetorizado (2026-07-07)** | Era imagem rasterizada embutida (64KB); agora vetor puro (4,3KB) |
| Novo Seguros | Logo parceiro | SVG (vetor puro) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado, identificado (2026-07-03) e vetorizado (2026-07-07)** | Antes "não identificado" — confirmado como **Novo Seguros** ao extrair a imagem rasterizada embutida no arquivo original. Era 236KB; agora vetor puro (12,3KB) |
| Youse | Logo parceiro | SVG (vetor puro) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado e vetorizado (2026-07-07)** | Era imagem rasterizada embutida (178KB); agora vetor puro (5,6KB) |
| Ezze Seguros | Logo parceiro | SVG (vetor puro) | SVG | Freelancer (2026-07-07) | InsurersGrid | ✅ **Migrado e vetorizado (2026-07-07)** | Era imagem rasterizada embutida (13KB); agora vetor puro (4,8KB) |
| WhatsApp (ícone de marca) | Ícone de marca (não parceiro de seguros) | SVG (`whatsapp-icon-seeklogo.com.svg`) — fonte: repositório de terceiros (seeklogo.com), **não é o asset oficial da marca WhatsApp** | SVG oficial do WhatsApp (baixar do brand kit oficial da Meta) | Webflow CDN (fonte não oficial) | WhatsAppFAB, botões de contato | **Substituir** | Recomenda-se substituir pelo ícone oficial da marca antes da migração, por conformidade de marca |

## Cobertura vs. lista da especificação (seção 1.1)

A especificação lista 17 nomes de seguradoras parceiras: *Porto, Bradesco, Azul, Itaú, HDI, Tokio, Sompo, Mapfre, Liberty, Allianz, Loovi, Pier, Justos, Darwin, Usebens, Youse, Ezze*. Todas as 17 foram encontradas como arquivo SVG na Home, **mais um 18º logo** — identificado nesta rodada (2026-07-03) como **Novo Seguros**. O cliente confirmou oficialmente o total de **18 seguradoras parceiras** (`docs/DADOS_OFICIAIS.md`), resolvendo a divergência "16 texto / 18 logos".

---

> Auditoria original (2026-07-01) sem download de assets. **Migração de todos os 18 logos + logo principal concluída em 2026-07-03** (ver nota de migração acima) — arquivos reais em `/public/logos/`, componente `InsurersGrid` implementado e integrado na Home e nas LPs de ramo.
