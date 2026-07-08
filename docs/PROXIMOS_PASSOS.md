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
| Habilitar RPA em produção | Você confirmou (2026-07-08) que a TI já aceita CORS de `rpaimediatoseguros.com.br` para o novo domínio — falta só ligar `NEXT_PUBLIC_RPA_ENABLED=true` no ambiente de produção da Vercel, quando chegarmos lá | `lib/rpa.ts`/`RPAProgressModal` prontos, desabilitados por padrão |
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

---

## 4. Sugestão de por onde retomar na segunda-feira

Pela ordem de "menor esforço, maior impacto":

1. ~~Se os arquivos vetorizados do freelancer já chegaram~~ — ✅ feito em 2026-07-07.
2. ~~Se você já tem a API key do Google Places~~ — ✅ feito em 2026-07-08.
3. **Revisar as pendências de conteúdo da seção 3.3** (cargos da equipe, FAQ/objeções por ramo) — são decisões rápidas que destravam mais conteúdo real.
4. **Providenciar acessos/credenciais da seção 3.2** conforme forem ficando disponíveis (GTM/GA4/Ads, Vercel, EspoCRM/Octadesk produção) — cada uma pode ser conectada independentemente, sem depender das outras.

---

> Para o histórico completo issue a issue (incluindo todas as 24 issues originais + as extensões desta sessão), ver `docs/BACKLOG.md`. Para o estado de cada dado institucional/comercial, ver `docs/DADOS_OFICIAIS.md`.
