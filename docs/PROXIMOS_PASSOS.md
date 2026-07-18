# PRÓXIMOS PASSOS — Ponto de Parada (2026-07-03)

## Finalidade
Documento de referência para retomar o projeto na próxima sessão. Resume o que foi feito, o estado atual e exatamente o que falta, com responsável de cada pendência. Não substitui `docs/BACKLOG.md` (histórico completo, issue a issue) — este arquivo é o resumo executivo para retomada rápida.

## Origem
Gerado ao final da sessão de 2026-07-03, a pedido do usuário ("resumo do ponto em que parou").

---

## 1. O que foi feito nesta sessão (2026-07-03)

Partindo de um projeto já com as 24 issues do `PLANO_IMPLEMENTACAO.md` concluídas (ou parciais, bloqueadas por acesso externo), esta sessão executou uma extensão pós-Issue-24 em várias frentes:

### 1.1 Integrações externas do Webflow (plano dedicado, já aprovado antes desta sessão)
- **Documentação**: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (novo) com o Head/Footer Code real do ambiente DEV do Webflow + análise por integração.
- **EspoCRM + Octadesk**: `lib/leads/espocrm.ts`, `lib/leads/octadesk.ts`, `lib/leads/proxy-sender.ts`, `lib/leads/legacy-proxy-payload.ts` — envio de lead em paralelo aos dois destinos reais, com retry independente e status por destino em `LeadRecord`.
- **RPA**: `lib/rpa.ts` + `components/lead/RPAProgressModal.tsx` — disparo não-bloqueante após o lead ser salvo.
- **PH3A**: `lib/ph3a.ts` — enriquecimento de CPF server-side, não-bloqueante, desabilitado por padrão.
- **Consent Banner real**: `components/consent/ConsentBanner.tsx` — Aceitar tudo/Rejeitar/Preferências, atualiza Consent Mode v2 de verdade (antes só existia o estado *default* "denied").
- **SEO**: 2 tags `google-site-verification` confirmadas, adicionadas em `app/layout.tsx`.

### 1.2 FraudAlert + confirmação de dados oficiais
- `FraudAlert` inserido em `app/(marketing)/layout.tsx` (estava pronto desde a Issue 22, mas nunca posicionado).
- **Todos** os itens pendentes de `docs/DADOS_OFICIAIS.md` foram confirmados pelo cliente em sessão dedicada — aplicados em `lib/company.ts`. Três divergências do site legado foram resolvidas: anos de experiência (**25**, não 35+), nº de seguradoras (**18**, não 16), % de satisfação (**98%**, não 96%). Qtd. de avaliações atualizada para **+2.200**. Novo campo: horário de atendimento.
- Páginas `/politica-de-privacidade` e `/termos` criadas (não existiam) — textos genéricos redigidos a pedido explícito do cliente, adotados como oficiais (não é revisão jurídica formal — ver ressalva em `docs/DADOS_OFICIAIS.md`).

### 1.3 Assets reais migrados (arquivos públicos, sem necessidade de credenciais)
- **InsurersGrid**: 18 logos reais de seguradoras baixados do site de produção (`lib/seguradoras.ts`, `components/home/InsurersGrid.tsx`), integrados na Home e nas 10 LPs de ramo. Achado: 8 dos 18 logos têm cor original embutida (não são cinza puro) — o site legado usa `filter: grayscale(1)` para uniformizar; replicado com `grayscale`/`hover:grayscale-0`.
- **TeamStrip + `/equipe`**: 16 fotos reais da equipe, confirmadas pelo cliente como atuais antes de baixar (`lib/team.ts`, `components/home/TeamStrip.tsx`, `app/(marketing)/equipe/page.tsx`).
- **Testimonials**: carrossel Embla (`components/home/Testimonials.tsx`) com 12 avaliações reais do Google, extraídas do widget já publicado no site atual, usadas como fallback enquanto a API do Google Places (fonte primária decidida pelo cliente) não tem credenciais.

### 1.4 QA/acessibilidade
- Auditoria axe-core real na Home (0 violações) e verificação manual em `/equipe`.
- 1 problema real corrigido: dots do carrossel `Testimonials` tinham alvo de toque de 8×8px — aumentado para 28×28px e ocultado no mobile (onde 12 dots não cabem sem quebrar).
- Confirmado: sem overflow horizontal em 360px em nenhum bloco novo.

**Validação final**: `npm run typecheck`, `npm run lint`, `npm run check:hardcode` e `npm run build` — todos limpos.

---

## 2. Estado atual do projeto

A Home agora tem **todos** os blocos do wireframe original (seção 6.1 da especificação) implementados: CredBar, Hero, RamoGrid, ComoFunciona, Benefits, InsurersGrid, CTASection, CoverageCards, Testimonials, TeamStrip, FAQ, CTASection final. As 10 LPs de ramo também têm InsurersGrid. `docs/DADOS_OFICIAIS.md` está com todos os itens confirmados (não há mais nenhum dado institucional/comercial pendente de confirmação do cliente).

---

## 3. Pendências — o que falta e de quem depende

### 3.1 ✅ Resolvido
- **Vetorização dos 8 logos de seguradoras** (2026-07-07) — o freelancer entregou os arquivos (`assets/Novos/`), avaliados como vetores puros de verdade (sem imagem embutida, cores da marca preservadas) e já substituídos em `/public/logos/seguradoras/`. Todos os 18 logos de seguradoras são agora vetores puros. Ver `docs/BRAND_ASSETS.md`.
- **API do Google Places para `Testimonials`** (2026-07-08) — cliente criou a `GOOGLE_PLACES_API_KEY` (projeto `leads-imediato-seguros`) e o Place ID correto foi encontrado automaticamente via chamada real à própria API. Integração ativa: avaliações + nota/contagem reais ao vivo, com filtro de nota mínima (≥4) para não exibir reclamações que o algoritmo do Google escolha como "relevantes". Ver `docs/BACKLOG.md`.
- **Retoques visuais no `Testimonials`** (2026-07-08): título alterado para "O que dizem sobre a `{company.tradeName}`" (nome em azul escuro da paleta, `text-brand-700`); selo de "% de satisfação" adicionado ao lado da nota, calculado ao vivo como `(nota do Google ÷ 5) × 100` (hoje 96%, a partir da nota 4,8) — métrica dinâmica, não hardcoded.

### 3.2 Aguardando decisão/acesso seu ou do seu time
| Item | O que é preciso | Onde já está preparado no código |
|---|---|---|
| Deploy de produção (Issue 24) | ~~Pré-requisito: criar repositório Git dedicado~~ — ✅ (2026-07-08). ~~Criar projeto na Vercel~~ — ✅ (2026-07-08): projeto `imediato-seguros` criado, conectado ao GitHub (deploy automático a cada push em `main`), domínio de teste `comparaseguroonline.com.br` adicionado. **Falta só a configuração de DNS** (ver seção 3.1.2) — depende só de você, no painel do seu registrador | `next.config.mjs`, `lib/env.ts` já validam e travam o build se faltar algo em produção |
| Integração real GTM/GA4/Google Ads (Issue 18) | Você confirmou acesso às contas (2026-07-08) — reaproveitar o mesmo container `GTM-PD6J398` (preserva histórico de GA4/Ads) usando o recurso de Environments do próprio GTM para testar com segurança no domínio temporário antes de publicar | Código de tracking (`lib/analytics.ts`, eventos) já implementado e disparando — só falta validar contra as contas reais |
| Habilitar RPA em produção | A flag `NEXT_PUBLIC_RPA_ENABLED` agora é um **gate real** (2026-07-18): ligada (`true`) na Vercel + novo deploy → aparece "Aguardar o cálculo"; desligada → oculta (kill-switch). CORS já liberado. Falta setar a flag na Vercel (homologação/produção) e validar no domínio. | Passo 4 do `LeadForm` com mecânica completa (16 fases, timer, 2 cartões, fallback) — ver `docs/RPA_ESCOLHA_CALCULO.md`. Cálculo já é **por veículo** (marca/modelo/ano + perfil) e só habilita com **todos os dados validados** e **não-caminhão**. Correção 2026-07-18: `lib/env.ts` lê a flag por referência direta (antes não chegava ao client). |
| Revisão jurídica dos textos genéricos | `/politica-de-privacidade` e `/termos` foram redigidos por mim a seu pedido — recomendável (não bloqueante) uma revisão pelo Jurídico em algum momento | Páginas já publicadas e indexáveis |

### 3.1.1 ✅ Resolvido (2026-07-08) — Repositório Git dedicado
- Criado [github.com/LucianoOtero/novo-site-imediato-cursor](https://github.com/LucianoOtero/novo-site-imediato-cursor) (antes, o projeto estava "preso" dentro de um repositório muito mais amplo, enraizado em `C:/Users/Luciano`, que rastreava por engano um projeto diferente).
- `.git` inicializado direto nesta pasta, branch `main`, primeiro commit (197 arquivos) já enviado.
- Confirmado antes do push: `.env.local` (segredos reais), `.data/` (leads locais), `node_modules/`, `.next/` — todos corretamente ignorados pelo `.gitignore` já existente; nada sensível foi commitado.
- Removido um arquivo `.zip` de 48MB (backup antigo do projeto, sem relação com o código-fonte) que tinha entrado por engano no primeiro `git add`, antes do push — adicionado ao `.gitignore` para não repetir.
- Pronto para conectar a um projeto Vercel.

### 3.1.2 ✅ Resolvido (2026-07-08) — Site de teste no ar
- Domínio: `comparaseguroonline.com.br` (e `www.comparaseguroonline.com.br`), no projeto Vercel `imediato-seguros`.
- DNS gerenciado via Cloudflare (decisão sua): 2 registros `A` → `76.76.21.21` (Vercel), proxy do Cloudflare **desligado** ("DNS only" — necessário para a emissão automática do certificado SSL da Vercel funcionar).
- Nameservers propagaram no registro.br (confirmado 2026-07-08 ~20h58 UTC, depois de ~1h50 de espera): zona Cloudflare `active`, DNS resolvendo corretamente para a Vercel.
- **✅ Site 100% no ar com HTTPS** (confirmado 2026-07-08 ~21h00 UTC): `https://comparaseguroonline.com.br` e `https://www.comparaseguroonline.com.br` respondem 200, certificado SSL válido, conteúdo real renderizando (`Cotação de Seguro Grátis | Imediato Seguros`).
- **Pronto para QA funcional real** — próximo passo natural: testar o fluxo de lead completo (formulário e/ou `ContactLeadModal`) usando seu próprio número de telefone, já que o Octadesk de produção está ativo (ver seção 3.2.1).
- **Nota técnica**: durante a configuração, encontrei e corrigi um bug real em `lib/env.ts` — o override manual `NEXT_PUBLIC_APP_ENV` não tinha prioridade de verdade sobre o `VERCEL_ENV` automático da Vercel (ver commit `fix: NEXT_PUBLIC_APP_ENV deve ter prioridade total sobre VERCEL_ENV`). Sem essa correção, o build falhava em produção por faltar as 10 variáveis que ainda não temos (GTM/GA4/Ads/Turnstile/banco de dados) — agora o deployment de teste roda classificado como "staging" internamente (banner de teste + `noindex` automáticos), mesmo estando no deployment "Production" da própria Vercel.
- A URL automática `*.vercel.app` do deployment pede login da Vercel para abrir (proteção padrão da plataforma) — isso é esperado e **não afeta o domínio customizado**, que fica público normalmente assim que o DNS propagar.

### 3.2.1 ✅ Resolvido (2026-07-08) — Credenciais reais EspoCRM/Octadesk
- **Decisão do cliente**: EspoCRM apontado para o ambiente dev (`dev.flyingdonkeys.com.br`); Octadesk usa produção mesmo (não existe ambiente de teste) — inclusive durante a fase de testes no domínio temporário.
- **URLs confirmadas** (2026-07-08, lendo o código-fonte real e o script de deploy no diretório `imediatoseguros-rpa-playwright/WEBFLOW-SEGUROSIMEDIATO`, sem alterar nada lá) e já configuradas em `.env.local`:
  - `LEAD_ESPOCRM_WEBHOOK_URL=https://add-flyingdonkeys-dev-6r55ex3u6q-rj.a.run.app/`
  - `LEAD_OCTADESK_WEBHOOK_URL=https://add-webflow-octa-prod-br2qvvxwhq-rj.a.run.app/`
- **Pergunta antiga resolvida**: confirmado no código-fonte PHP que **nenhum header de autenticação é esperado do lado do site** — a autenticação com EspoCRM/Octadesk acontece dentro do próprio proxy Cloud Run (variáveis de ambiente server-side), não em algo que o `/api/lead` precise enviar.
- **Contrato de payload validado**: os campos que `lib/leads/legacy-proxy-payload.ts` já enviava (`DDD-CELULAR`, `CELULAR`, `Email`, `CPF`, `PLACA`, `ANO`, `GCLID_FLD`, dentro de `{data, name}`) batem exatamente com o código-fonte real dos dois proxies.
- **⚠️ Atenção antes de testar**: com as duas URLs reais configuradas, `isMockMode` fica `false` — qualquer envio de lead pelo site (formulário normal ou `ContactLeadModal`) passa a **disparar uma mensagem de WhatsApp real via Octadesk de produção** para o número usado no teste. Não testei rodando o site agora por esse motivo — quando você for testar, use seu próprio número e avise o time que vai receber esses leads durante a fase de testes, para não confundirem com leads reais.

### 3.3 ✅ Resolvido (2026-07-08)
- **Cargo/função de cada colaborador** — decisão do cliente: manter só o nome, sem cargo (mesmo padrão do site legado).
- **FAQ/objeções por ramo + coberturas faltantes** — rascunho genérico redigido para os 10 ramos em `lib/ramos.ts` (sem inventar dados comerciais/regulatórios específicos). Coberturas já publicadas ao vivo nas LPs de ramo (decisão do cliente); FAQ/objeções aguardando revisão do time de Conteúdo antes de publicar (continuam fora da renderização). Ver nota em `docs/BACKLOG.md`.
- **Comportamento de modal em WhatsApp/telefone** — decisão do cliente: replicar o modal do site legado (8 campos antes de abrir WhatsApp/telefone), mas corrigindo o "beco sem saída" identificado na investigação (fechar sem preencher agora ainda leva ao destino). Implementado em todos os pontos de contato do site (`ContactLeadModal` + `ContactModalContext`, novo). Ver nota em `docs/BACKLOG.md`.

### 3.4 ✅ Resolvido (2026-07-08) — `/obrigado` sem `ContactLeadModal`
- `WhatsAppButton` ganhou uma prop `skipModal` — quando `true`, restaura a navegação direta (sem abrir o `ContactLeadModal`). Usada apenas em `ObrigadoContent` (`/obrigado`), já que o usuário acabou de preencher DDD/celular no `LeadForm` segundos antes — reabrir o modal pedindo os mesmos dados seria fricção redundante. Todos os outros pontos de contato do site continuam abrindo o modal normalmente.
- Validado com `typecheck`, `lint`, `check:hardcode` e `build` limpos.

### 3.5 Conteúdo/produto ainda em aberto (não é bloqueio técnico, é decisão de escopo)
- **Revisão de Conteúdo/Comercial do rascunho de FAQ/objeções por ramo** (`lib/ramos.ts`) antes de publicar nas LPs — ver seção 3.3 acima.

### 3.6b ✅ Resolvido (2026-07-08) — `WhatsAppFAB` responsivo + correção de sobreposição com a `StickyCTA`
- Tamanho do `WhatsAppFAB` dobrado no desktop (56px → 112px, `md:size-28`), mantendo o tamanho original no mobile (56px, já acima do mínimo de toque de 44px) — ícone escala junto, preservando a proporção.
- **Achado ao verificar a responsividade mobile**: a `StickyCTA` (barra opaca de largura total, só mobile) ficava por cima do `WhatsAppFAB` na mesma faixa inferior da tela, escondendo o FAB completamente sempre que a barra aparecia (sem quebra visual, mas o FAB ficava sem função). Corrigido extraindo a lógica de visibilidade para o hook compartilhado `useStickyCtaVisible` — o FAB agora se esconde no mobile exatamente quando a `StickyCTA` está visível (que já tem seu próprio ícone de WhatsApp); no desktop, onde a `StickyCTA` não existe, o FAB continua sempre visível.

### 3.6 ✅ Resolvido (2026-07-08) — Ajustes visuais no site de teste (feedback ao vivo)
- **Logos de seguradoras maiores no desktop**: 2 rodadas de ajuste no mesmo dia — 40px → 80px → 100px de altura (`InsurersGrid`, `md:h-[100px]`), mantendo 6 por linha (`md:grid-cols-6`); `max-w-full` no `<img>` garante que nenhum logo mais largo quebre a linha, mesmo no tamanho maior.
- **Ícone original do WhatsApp**: criado `components/shared/WhatsAppIcon.tsx` (glifo oficial da marca, path público do Simple Icons — mesmo padrão já usado em `components/layout/social-icons.tsx`), substituindo o ícone genérico (`MessageCircle`, lucide) em **todos** os pontos de contato: `WhatsAppButton`, `WhatsAppFAB`, `StickyCTA`, `ContactLeadModal`.
- **Pulso no `WhatsAppFAB`** (botão flutuante do canto inferior direito): anel verde pulsante (`animate-ping`), replicando o comportamento do site legado — desligado automaticamente para quem usa `prefers-reduced-motion` (a11y).
- Validado com `typecheck`, `lint`, `check:hardcode` e `build` limpos; conferido o HTML renderizado ao vivo em `comparaseguroonline.com.br`.

### 3.7 ✅ Resolvido (2026-07-08) — Novo logotipo Imediato Seguros
- Cliente forneceu o arquivo definitivo (`Novo Logotipo Imediato Final SVG.svg`) e pediu para conectá-lo ao `Header`, `Footer`, favicon e imagem Open Graph — escopo completo já previsto em `docs/BRAND_ASSETS.md`.
- **Achado técnico**: o arquivo é um lockup empilhado verticalmente (ícone "M" + "IMEDIATO"/"SEGUROS" em duas linhas, texto em `<path>`, não HTML), proporção quase quadrada — não uma faixa larga como um logo de cabeçalho tradicional. Decisão do cliente: usar o lockup completo (não só o ícone) e adaptar o `Header` para acomodá-lo — altura aumentada (`h-14`/`md:h-24`, encolhendo para `md:h-16` ao rolar). Ver nota completa em `docs/BRAND_ASSETS.md`.
- **Favicon**: usa só o ícone "M" recortado (`public/logos/imediato-seguros-icon.svg`) — exceção técnica necessária, não estética (favicon é sempre renderizado minúsculo, o texto do lockup ficaria ilegível em qualquer tamanho).
- **Contraste em fundos escuros**: o texto do logotipo (`#003881`) tem contraste baixo contra o fundo escuro já usado no `Footer`/imagem Open Graph (`#0a2540`) — resolvido colocando o logotipo sobre um cartão branco nesses dois lugares (decisão assumida por padrão, já que você pulou a pergunta específica sobre isso — fácil de trocar depois por outra abordagem, ex.: uma variante clara do logotipo, se preferir).
- Validado com `typecheck`, `lint`, `check:hardcode` e `build` limpos.

### 3.8 ⏳ Feedback registrado (2026-07-08) — Proposta de paleta/tipografia ("Projeto Visual.docx")
Você pediu para analisar e criticar o documento com a nova proposta de marca ("Digital Clarity Blue" + tipografia "Digital Trust Typeface") — análise feita, **nada foi aplicado ainda** (decisão sua: só registrar como feedback por enquanto).
- **Paleta compatível em direção** com a atual (`--color-brand-500`/`700` em `app/globals.css`), mas o azul "Secundária" (`#0088E8`) tem contraste calculado de **~3,7:1 contra branco** — abaixo do mínimo WCAG AA (4,5:1) para texto normal. O documento sugere esse azul no fundo de botões CTA com texto branco, o que reintroduziria o mesmo tipo de falha já corrigida uma vez neste projeto (botão do WhatsApp, Issue 23, `#1aa564` reprovado a 3,18:1 → `#0e8449` a 4,76:1). Se a paleta for adotada, esse ponto específico precisa de ajuste antes.
- **Tipografia**: troca de Manrope → Poppins nos títulos, com caixa alta + peso 600 — mudança de personalidade visual perceptível (Inter no corpo do texto permanece igual nos dois documentos).
- O documento é um refresh parcial (só cor + tipografia) — não cobre neutros, verde do WhatsApp, vermelho de alerta, raios, sombras nem motion, todos já definidos em `app/globals.css`.
- **Próximo passo, quando você decidir**: como a paleta já está centralizada em tokens CSS (`--color-brand-*` em `app/globals.css`, consumidos como classes Tailwind em todo o projeto), aplicar cores novas é uma mudança de baixo risco — só trocar os valores dos tokens, sem precisar editar cada componente individualmente. A troca de fonte (Manrope → Poppins) é uma decisão maior, à parte.

### 3.9 ✅ Resolvido (2026-07-09) — Coberturas completas + ícone por cobertura na Home
- Lista de coberturas do Auto (`AUTO_COVERAGES`, `lib/ramos.ts`) atualizada para os 16 itens confirmados por você (incluindo "Táxi", que uma leitura anterior tinha excluído por cautela, suspeitando de duplicidade na fonte original).
- `CoverageCards` (bloco "Coberturas principais" da Home) agora mostra **todas** as 16 coberturas, não só as 6 primeiras como antes (mudança do wireframe original).
- Cada cobertura ganhou um ícone específico (antes todas usavam o mesmo ícone genérico de escudo) — mapeados a partir da biblioteca `lucide-react` já usada em todo o projeto: Colisão → carro de frente, Roubo e furto → escudo de alerta, Incêndio → chama, Danos pessoais → coração com pulso, Danos materiais → martelo, Assistência 24h → boia de resgate, Chaveiro → chave, Vidros → janela, Pane seca → posto de combustível, Pane elétrica → raio, Pane mecânica → chave de fenda, Faróis → lâmpada, Táxi → carro de táxi, Retrovisores → olho, Pneus → círculo com ponto central, Carro reserva → carro.
- Ramos além de "auto" (nomes de cobertura diferentes, ex. "RCF (danos a terceiros)") continuam usando o ícone genérico de escudo como fallback — não fazem parte do mapa específico ainda.
- Validado com `typecheck`, `lint`, `check:hardcode` e `build` limpos; confirmado via terminal que as 16 coberturas aparecem na Home.
- **Ajuste de layout (2026-07-09, mesmo dia)**: grid fixo de 4 colunas em qualquer largura (antes 1 no mobile → 2 → 3) — cabe as 16 coberturas em 4 linhas mesmo no mobile. Card mudou de layout horizontal (ícone ao lado do texto) para vertical (ícone acima, texto abaixo, centralizado) — texto não caberia ao lado do ícone numa coluna tão estreita. `gap`/padding reduzidos para caber 4 por linha; ícone e texto aumentados; `min-h-28` deixa o card mais "quadrado". Confirmado visualmente (mobile 390px e desktop 1440px) — ficou como esperado nos dois.
- **Link "ver todas as coberturas" removido** (2026-07-09, mesmo dia) — perdeu o sentido depois que a lista completa passou a ser exibida direto na página.
- **Estendido às 10 LPs de ramo** (2026-07-09, mesmo dia — "replicar as alterações da Home para as outras páginas"): como `CoverageCards` já era compartilhado com `RamoLandingPage` (Issue 16), o grid de 4 colunas e a lista completa já valiam para as 10 LPs sem nenhuma mudança — só faltava mapear os nomes de cobertura específicos dos outros 9 ramos (ex.: "RCF (danos a terceiros)" → balança, "Cobertura para uso por aplicativo" → celular, "Aluguéis em atraso" → calendário, "Danos ao imóvel" → casa, entre outros 15 novos mapeamentos), que sem isso cairiam todos no ícone genérico de escudo. Confirmado visualmente nas LPs de Moto e Fiança.

### 3.10 ✅ Resolvido (2026-07-12) — Paridade EspoCRM/Octadesk + Firebase + Cloud Function (dev/UAT/produção)
Contexto: você pediu para investigar como o site legado chama EspoCRM/Octadesk usando Firebase/Cloud Functions/Cloud Run (análise em `docs/ANALISE_ESPOCRM_OCTADESK_FIREBASE_CLOUDRUN.md`), e depois pediu para reproduzir esse comportamento completo no site novo, respeitando os ambientes dev/UAT/produção. Decisão do cliente: replicar tudo (não só a entrega direta que já existia), incluindo backup no Firebase e uma Cloud Function própria — ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md` para o desenho completo.

- **Mapeamento de ambientes**: `LEAD_ESPOCRM_WEBHOOK_URL` (única) foi substituída por `LEAD_ESPOCRM_WEBHOOK_URL_DEV`/`_PROD`, resolvidas automaticamente por `appEnvironment` (`lib/env.ts`) — troca sozinho no dia do go-live real, sem reconfigurar o Vercel. Octadesk continua uma única URL (sempre produção).
- **Projeto Firebase novo e dedicado**: `imediato-seguros-site-novo` (Realtime Database, service account com permissão restrita, faturamento na mesma conta "Pagamento do Firebase" do legado) — criado, não reaproveitado do `leads-imediato-seguros` do legado, para não misturar dados dos dois sites.
- **Backup de leads**: `lib/leads/firebase-admin.ts` + `lib/leads/firebase-backup.ts` — todo lead (sucesso ou falha) é gravado em `leads_backup/{leadId}` via Firebase Admin SDK, de forma não-bloqueante, depois da tentativa de entrega direta a EspoCRM/Octadesk.
- **Cloud Function de reentrega**: `firebase/functions/index.js` (`retryLeadDelivery`) — implantada e testada de fato (diferente do legado, cuja Cloud Function equivalente nunca foi implementada, achado da auditoria). Reenvia automaticamente o que falhou, escolhendo a URL de EspoCRM pelo ambiente do próprio registro.
- **Validado com testes reais**: lead de teste via `/api/lead` local, e um registro manual simulando falha — a Cloud Function reagiu em segundos e corrigiu o status. Logs confirmados via `firebase functions:log`.
- Validado com `npm run typecheck` e `npm run check:hardcode` limpos.
- **Bug real encontrado e corrigido só depois do deploy em produção real** (2026-07-12, mesmo dia): o backup no Firebase funcionava em teste local, mas **nunca era gravado em produção real na Vercel**. Causa: a chamada a `saveLeadBackupToFirebase()` (e também `enrichLeadWithPh3a()`) era "fire-and-forget" (sem `await`) — o runtime serverless da Vercel pode congelar/encerrar a função assim que a resposta HTTP é enviada, matando qualquer tarefa em segundo plano ainda pendente. Corrigido trocando por `await` nas duas chamadas (nenhuma das duas lança erro por conta própria, então aguardá-las é seguro). Reconfirmado em produção real: backup gravado corretamente, e a Cloud Function reagiu de verdade a um Octadesk que continuou falhando de propósito no teste (`cf_retry_count` avançando, `octadesk_attempts` acumulando 4 a cada rodada).
### 3.12 ✅ Resolvido (2026-07-12) — Bug real na rejeição do Octadesk ("Telefone inválido")
Investigação do achado paralelo registrado acima: fiz uma chamada isolada e direta ao proxy Cloud Run do Octadesk (fora da aplicação) para capturar o corpo completo da resposta de erro — algo que o código não fazia (só registrava "falhou", sem o motivo).
- **Causa raiz**: `lib/leads/legacy-proxy-payload.ts` montava o campo `DDD-CELULAR` como `"11-988887777"` (DDD + celular concatenados); o contrato real dos dois proxies espera **só o DDD** nesse campo (ex.: `"11"`), confirmado lendo o código do modal legado.
- **Por que só o Octadesk quebrava**: o EspoCRM tolera o formato errado; o Octadesk valida e rejeitava com `"Telefone inválido"`.
- **Corrigido** no site (`lib/leads/legacy-proxy-payload.ts`) e na Cloud Function (`firebase/functions/index.js`, tinha uma cópia do mesmo código). Também melhorei o log de erro (`lib/leads/proxy-sender.ts`) para mostrar o corpo da resposta em falhas futuras — sem isso, esse bug teria continuado invisível.
- **Validado**: lead de teste local entregue a EspoCRM **e Octadesk** de primeira tentativa (antes, Octadesk sempre falhava após 4 tentativas). Isso significa que, desde o início desta integração (2026-07-03), **nenhuma mensagem de WhatsApp real via Octadesk chegou a ser enviada** — todos os leads foram entregues ao EspoCRM normalmente, mas a notificação por WhatsApp nunca funcionou até agora.

### 3.11 ✅ Resolvido (2026-07-12) — Correção do bug "Não foi possível enviar agora" (`lib/leads/store.ts`)
Correção imediata aprovada em sessão anterior, implementada nesta:
- `DATA_DIR` passa a usar `os.tmpdir()` (`/tmp` na Vercel) quando `process.env.VERCEL` está definido — o único diretório gravável no runtime serverless da Vercel; continua usando `.data/` localmente (sem mudança no dia a dia de desenvolvimento).
- `writeFile()` nunca mais lança exceção — falha de gravação (ex.: filesystem somente leitura) fica só como aviso no log; `/api/lead` não retorna mais 500 por causa deste store local.
- **Validado de verdade** simulando o ambiente Vercel localmente (`VERCEL=1`): lead de teste enviado, gravado corretamente em `%TEMP%\imediato-leads\leads.json` (equivalente Windows do `/tmp` do Linux), sem nenhum erro.
- **Ainda não é a solução definitiva** — continua sendo um store best-effort (`/tmp` na Vercel é efêmero, não sobrevive a cold starts novos nem é compartilhado entre instâncias); dedupe/idempotência ficam menos confiáveis em produção até haver um Postgres real. Isso é aceitável agora porque, desde a seção 3.10, todo lead **também** é gravado no Firebase Realtime Database (backup real e persistente, independente deste arquivo).
- Validado com `typecheck`/`check:hardcode` limpos.

### 3.13 ✅ Resolvido (2026-07-13) — Validação em tempo real (CPF/celular/e-mail) + captura em 2 fases
Contexto: depois de investigar por que uma mensagem funcionou no Octadesk mas o lead não chegou ao EspoCRM, você perguntou por que não fazer tudo pelo Firebase (como o site atual) e pediu uma análise profunda do comportamento do modal/formulário legado para planejar a validação em tempo real (CPF, celular, e-mail) e a captura em 2 fases. Ver arquitetura completa em `docs/VALIDACAO_TEMPO_REAL_E_CAPTURA_2_FASES.md`.

- **Validação local**: checksum de CPF (`isValidCpf`, `lib/validators.ts`) e celular sempre com 9 dígitos começando em "9" — mesmas regras do formulário principal legado.
- **Proxies server-side**: `app/api/validate/phone`/`/email` — testei as credenciais reais do legado (que você forneceu) diretamente antes de implementar. APILayer (celular) funciona de verdade; SafetyMails (e-mail) não respondeu em nenhuma das 2 variantes conhecidas — achado já documentado como não resolvido no próprio site legado, não é um problema introduzido aqui. Implementado mesmo assim, best-effort (nunca bloqueia), a seu pedido.
- **Captura em 2 fases**: `/api/lead` aceita `stage: "initial"` (só telefone, cria o lead) e `stage: "complete"` (atualiza o mesmo lead com os dados completos, sem duplicar) — replicado no `ContactLeadModal` (2 blocos visuais, etapa 2 aparece só depois do telefone validado) e no `LeadForm` (contato inicial disparado ao confirmar o passo 1, sem bloquear a navegação entre passos).
- **2 bugs adicionais encontrados e corrigidos** ao testar esse fluxo pela primeira vez: o EspoCRM também exige o campo `NOME` não-vazio (mesma classe de bug do `Email`, corrigido ontem); e o `proxy-sender.ts` não detectava esses erros porque o EspoCRM responde `HTTP 200` mesmo rejeitando o lead no corpo — corrigidos os dois, com testes reais confirmando `leadIdFlyingDonkeys`/`opportunityIdFlyingDonkeys` sendo capturados e reutilizados na atualização final.
- **Diálogo "Corrigir ou Prosseguir"** (novo `components/ui/alert-dialog.tsx`) no `LeadForm` — se o CPF não passar o checksum no envio final, oferece corrigir ou prosseguir assim mesmo (réplica do `SweetAlert` legado).
- **Validado de ponta a ponta com chamadas reais** (não só mock) contra o EspoCRM/Octadesk de verdade: fluxo `initial` → `complete` resultando em um único lead atualizado, sem duplicar. `typecheck`/`build`/`check:hardcode` limpos.
- Aproveitei para remover instrumentação de debug (`#region agent log`) deixada de uma sessão de depuração anterior já concluída, em `ContactLeadModal.tsx`, `use-submit-lead.ts`, `ObrigadoContent.tsx` e `PageAnalytics.tsx`.

---

## 4. Sugestão de por onde retomar na segunda-feira

Pela ordem de "menor esforço, maior impacto":

1. ~~Se os arquivos vetorizados do freelancer já chegaram~~ — ✅ feito em 2026-07-07.
2. ~~Se você já tem a API key do Google Places~~ — ✅ feito em 2026-07-08.
3. **Revisar as pendências de conteúdo da seção 3.3** (cargos da equipe, FAQ/objeções por ramo) — são decisões rápidas que destravam mais conteúdo real.
4. **Providenciar acessos/credenciais da seção 3.2** conforme forem ficando disponíveis (GTM/GA4/Ads, Vercel, EspoCRM/Octadesk produção) — cada uma pode ser conectada independentemente, sem depender das outras.
5. ~~Corrigir `lib/leads/store.ts` para o filesystem somente leitura do Vercel~~ — ✅ feito em 2026-07-12 (seção 3.11). Falta só o Postgres real como solução definitiva, sem data prevista.

---

> Para o histórico completo issue a issue (incluindo todas as 24 issues originais + as extensões desta sessão), ver `docs/BACKLOG.md`. Para o estado de cada dado institucional/comercial, ver `docs/DADOS_OFICIAIS.md`.
