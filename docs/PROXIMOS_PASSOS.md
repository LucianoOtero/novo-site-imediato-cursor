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
| Deploy de produção (Issue 24) | **Pré-requisito novo (2026-07-08)**: criar um repositório Git dedicado a este projeto (hoje ele está "preso" dentro de um repositório muito mais amplo, enraizado em `C:/Users/Luciano`, que rastreia por engano um projeto diferente) e subir para o GitHub; depois, criar o projeto na Vercel e configurar as variáveis de ambiente reais de produção (14 listadas em `.env.example`/`lib/env.ts`) | `next.config.mjs`, `lib/env.ts` já validam e travam o build se faltar algo em produção |
| Integração real GTM/GA4/Google Ads (Issue 18) | Você confirmou acesso às contas (2026-07-08) — reaproveitar o mesmo container `GTM-PD6J398` (preserva histórico de GA4/Ads) usando o recurso de Environments do próprio GTM para testar com segurança no domínio temporário antes de publicar | Código de tracking (`lib/analytics.ts`, eventos) já implementado e disparando — só falta validar contra as contas reais |
| Habilitar RPA em produção | Você confirmou (2026-07-08) que a TI já aceita CORS de `rpaimediatoseguros.com.br` para o novo domínio — falta só ligar `NEXT_PUBLIC_RPA_ENABLED=true` no ambiente de produção da Vercel, quando chegarmos lá | `lib/rpa.ts`/`RPAProgressModal` prontos, desabilitados por padrão |
| Revisão jurídica dos textos genéricos | `/politica-de-privacidade` e `/termos` foram redigidos por mim a seu pedido — recomendável (não bloqueante) uma revisão pelo Jurídico em algum momento | Páginas já publicadas e indexáveis |

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

### 3.4 Próximo passo já decidido, ainda não implementado
- **Remover o `ContactLeadModal` da página `/obrigado`** (`ObrigadoContent`) — decisão do cliente (2026-07-08): o botão "Falar agora no WhatsApp" ali deve voltar a ser um link direto (`wa.me`), sem reabrir o modal de captura, porque o usuário acabou de preencher DDD/celular no `LeadForm` segundos antes — reabrir o modal pedindo os mesmos dados é fricção redundante. Único ponto de contato do site que fica de fora do `ContactLeadModal` (todos os outros — Header, Footer, FAB, StickyCTA, CTASection, LPs de ramo — continuam abrindo o modal, conforme decisão anterior de "todos os pontos de contato").

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
