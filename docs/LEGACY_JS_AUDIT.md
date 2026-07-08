# LEGACY_JS_AUDIT

## Finalidade
Mapa completo do JavaScript legado do Webflow (scripts, custom code, GTM, dataLayer, integrações).

## Origem
Auditoria real executada na Issue P-09, via inspeção do site publicado `https://www.segurosimediato.com.br` (página Home) com ferramenta de navegador (DevTools/CDP — leitura de DOM, scripts, `Runtime.evaluate`). **Sem acesso ao painel administrativo do Webflow (Custom Code) nem ao workspace do GTM** — a auditoria foi feita inteiramente a partir do que é publicamente observável no HTML/JS renderizado, incluindo os arquivos `.js` externos (alguns hospedados em bucket próprio no Google Cloud Storage) e o JS público compilado do container GTM.

## Status
CONTEÚDO CRIADO (auditoria real parcial — ver "Limitações" abaixo). Concluído em 2026-07-01; investigação em profundidade do modal de WhatsApp/telefone concluída em 2026-07-02 (clique real no site ao vivo + leitura completa dos 3 scripts externos envolvidos — ver seção correspondente abaixo).

## Limitações desta rodada
- Apenas a **Home** (`/`) foi inspecionada em profundidade. Outras páginas (LPs de ramo, `/contato`, `/cotacao` se existir) **não** foram auditadas individualmente nesta rodada — recomenda-se uma rodada de aprofundamento se houver formulários/scripts distintos por página.
- **Sem login no Webflow** — não foi possível ver o Custom Code diretamente no editor (Project Settings/Page Settings/Embed blocks); a presença desses scripts foi inferida pelo que é carregado no HTML renderizado.
- **Sem login no GTM** — tags, triggers e variables não puderam ser inspecionados no workspace; parte da configuração foi inferida lendo o JS público compilado do container (`gtm.js?id=GTM-PD6J398`), que é minificado/ofuscado por natureza.
- **Nenhum envio real de formulário foi realizado** — para não gerar um lead falso no CRM/sistema de produção real, o clique em "CALCULE AGORA!" não foi executado. O comportamento pós-envio foi inferido por leitura de código-fonte, não observado em runtime.
- Um script de mesma origem (item 5 da Tabela 1) tem finalidade não identificada nesta rodada.

---

## Tabela 1 — Scripts encontrados

| Origem | URL/Local | Tipo | Carrega em | Finalidade aparente | Crítico? | Migrar? | Observações |
|---|---|---|---|---|---|---|---|
| CookieYes | `cdn-cookieyes.com/client_data/.../script.js` | Externo | Home (provável: todas as páginas) | Banner de consentimento LGPD/GDPR | Sim | Não — substituir por Consent Mode v2 nativo (Issue 03) | Ferramenta terceirizada de consentimento; site atual **não** usa banner customizado |
| CookieYes | `cdn-cookieyes.com/client_data/.../banner.js` | Externo | Home | Renderização do banner de consentimento | Sim | Não | Complementa o script acima |
| Google gtag.js | `googletagmanager.com/gtag/js?id=G-694K3F1XQ1` | Externo | Home | Carrega GA4 **diretamente** via gtag.js, em paralelo ao GTM | Sim | Substituir — no novo site GA4 só via GTM (seção 19 da spec) | **Duplicidade**: GA4 é inicializado tanto por gtag.js direto quanto pelo GTM na mesma página |
| Google GTM | `googletagmanager.com/gtm.js?id=GTM-PD6J398` | Externo | Home | Container GTM principal | Sim | Sim, mesmo container (se Mkt confirmar reaproveitamento) | Confirma o ID já observado/assumido na especificação (seção 1, seção 45) |
| Script de mesma origem (ofuscado) | `segurosimediato.com.br/v2645sy3qzdjNTllYjgwN2Y5ZDE2OTUwMDAxZTIwMmFm/Dk_pyE63ouaIGH-KzHF2WAlaqKo` | Mesma origem | Home | **Não identificado nesta auditoria** — nome sugere hash de asset Webflow ou possível gateway de tagging server-side | **Investigar** | Investigar | Requer investigação adicional (inspecionar conteúdo/comportamento) antes da migração |
| Sentry | `js-de.sentry-cdn.com/9cbeefde9ce7c0b959b51a4c5e6e52dd.min.js` | Externo | Home | Observabilidade de erros client-side | Não | Sim — já previsto na Issue 03A/seção 51 da spec | Confirma que Sentry **já está em uso** no site atual; útil para decidir DSN/projeto a reaproveitar |
| Elfsight | `universe-static.elfsightcdn.com/.../googleReviews.js` | Externo | Home | Widget de avaliações Google (carrossel "Testimonials") | Não | Substituir por Testimonials custom (Embla, seção 21.1/29.3) | Prova social hoje depende de serviço terceirizado pago |
| Elfsight | `universe-static.elfsightcdn.com/.../facebookReviews.js` | Externo | Home | Widget de avaliações Facebook | Não | Substituir | — |
| Elfsight | `static.elfsight.com/platform/platform.js` + `apps.elfsight.com/p/platform.js` | Externo (2 URLs) | Home | Runtime do widget Elfsight (carregado duplicado) | Não | Substituir | 2 URLs distintas para o mesmo runtime — redundância |
| jQuery 3.5.1 | `d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min...js` (CDN do Webflow) | Externo | Home | Dependência padrão do Webflow | Não | Não (Next.js não depende de jQuery) | — |
| Bundle Webflow | `cdn.prod.website-files.com/.../segurosimediato.48802946...js` | Externo | Home | JS compilado do site (interações IX2, menu, animações) | Sim — contém toda a lógica de interação visual atual | Não copiar — reimplementar em React/Framer Motion (Issues 02/06/08) | Qualquer efeito visual dependente deve ser mapeado manualmente, não migrado como arquivo |
| jQuery 3.6.0 | `cdnjs.cloudflare.com/.../jquery.min.js` | Externo | Home | Segunda cópia de jQuery (versão diferente) | **Investigar** — risco de conflito de versões | Não | **Duplicidade de jQuery** (3.5.1 + 3.6.0) já existente no site atual; não replicar |
| jQuery Mask | `cdnjs.cloudflare.com/.../jquery.mask.min.js` | Externo | Home | Máscaras de input (telefone, CEP, CPF, placa) | Sim | Substituir por máscaras nativas/Zod no novo LeadForm (Issue 11) | Define o comportamento de máscara que `lib/validators.ts` precisa igualar/superar |
| SweetAlert2 | `cdn.jsdelivr.net/npm/sweetalert2@11.14.0/...js` | Externo | Home | Modais de alerta/sucesso/erro pós-envio | Sim | Substituir por `SuccessState`/Toast nativos (shadcn/Sonner) | **Indício de que o site atual usa modal de sucesso, não uma página `/obrigado` dedicada** — ver `FORMULARIOS_ATUAIS.md` |
| `config_env.js` (script próprio) | `storage.googleapis.com/bssegurosimediato-cdn/js/config_env.js` | Externo (bucket próprio) | Home (Custom Code) | Define URLs de microsserviços e chaves de API em `window.*` | **Sim — CRÍTICO** | Sim, como base do contrato de `/api/lead` (Issue 12) — **nunca client-side** | Expõe endpoints de backend e chaves de API diretamente no client (ver `INTEGRACOES_ATUAIS.md`) — risco de segurança já existente |
| `FooterCodeSiteDefinitivoCompleto.js` (script próprio) | `storage.googleapis.com/bssegurosimediato-cdn/js/FooterCodeSiteDefinitivoCompleto.js` | Externo (bucket próprio) | Footer Custom Code (Webflow) | **Núcleo funcional do site**: captura GCLID/GBRAID, valida CPF/placa via API, enriquece CEP via ViaCEP, logging customizado, envio de lead a 2 destinos, Enhanced Conversions | **Sim — CRÍTICO** | **Sim, com paridade obrigatória** (Issues 11 e 12) | ~183KB; existe versão de desenvolvimento em `dev.bssegurosimediato.com.br/webhooks/FooterCodeSiteDefinitivoCompleto_dev.js` — confirma ambiente de staging próprio já existente |

### Scripts inline relevantes (não listados linha a linha)
- Snippet padrão de detecção de touch do Webflow (não migrar).
- **JSON-LD `InsuranceAgency`** já implementado hoje (nome: "Imediato Soluções Corretora de Seguros LTDA") — usar como referência de conteúdo para a Issue 20, mas os dados devem vir de `lib/company.ts`, não copiados diretamente.
- **JSON-LD `Product` duplicado 3×** na mesma página, com `name`/`brand.name` genéricos idênticos ao título da página — indício de schema mal configurado hoje; **não replicar esse padrão** na nova implementação (seguir seção 17 da spec).
- Snippet `gtag('config', 'G-694K3F1XQ1')` com `developer_id` setado duas vezes.
- Loader padrão do GTM (`GTM-PD6J398`).
- **Handler de submit de um formulário `id="form-wp"`** que constrói um link `https://api.whatsapp.com/send?phone=551141718837&text=...` — ver achado crítico na seção "WhatsApp" abaixo. Este `id` (`form-wp`) **não corresponde** ao formulário encontrado na Home (`wf-form-Home`), sugerindo que este snippet pertence a outra página/versão (possível remanescente de migração) — **investigar em qual página este formulário `#form-wp` realmente existe**.
- Comentário `window.MODAL_FIREBASE_ONLY = true;` — indício de integração com **Firebase** não confirmada em profundidade nesta auditoria. **Investigar.**

## Tabela 5 — Cookies/Storage e parâmetros capturados

| Item | Tipo | Chave | Origem | Finalidade | Consentimento? | Migrar? |
|---|---|---|---|---|---|---|
| Consentimento CookieYes | Cookie | `cookieyes-consent` | CookieYes | Armazena estado de consentimento por categoria (necessary/functional/analytics/performance/advertisement) | N/A (é o próprio registro) | Sim, mas via Consent Mode v2 nativo (Issue 03), não CookieYes |
| GCLID/GBRAID (cookie) | Cookie | Nome exato não determinado nesta auditoria (função `readCookie`/gravação por `document.cookie =` observada em `FooterCodeSiteDefinitivoCompleto.js`) | Script próprio | Persistir `gclid`/`gbraid` entre páginas/sessão | Não aparenta depender de consentimento (tratado como funcional) | Sim — paridade obrigatória (seção 43.2 da spec já prevê `gclid`/`wbraid`/`gbraid`) |
| `GCLID_FLD` | localStorage | `GCLID_FLD` | Script próprio | Persistir valor de `gclid` para preencher campo oculto do formulário | Não determinado | Sim |
| `GCLID_FLD_WP` | localStorage | `GCLID_FLD_WP` | Script próprio | Variante do acima (sufixo "_WP" sugere formulário/página diferente, possivelmente remanescente de outra versão/CMS) | Não determinado | **Investigar propósito exato antes de migrar** |

## Achado — texto real do banner de consentimento (CookieYes)

Banner observado ao vivo: título **"Valorizamos sua privacidade"**; texto: *"Utilizamos cookies para aprimorar sua experiência de navegação, exibir anúncios ou conteúdo personalizado e analisar nosso tráfego. Ao clicar em 'Aceitar todos', você concorda com nosso uso de cookies"*; botões: **Personalizar · Rejeitar · Aceitar tudo**. Estado inicial (antes de qualquer interação) observado como consentimento negado em todas as categorias (`consent:no, analytics:no, advertisement:no...`). Isso é consistente com o comportamento esperado do Consent Mode v2 (defaults `denied`) que a Issue 03/57 da spec já planeja nativamente — apenas a ferramenta (CookieYes) muda, não o princípio.

## Achado adicional — dados institucionais observados na página (fora do escopo de JS, registrado por completude)

Durante a auditoria, a Home exibiu ao vivo: **"16 COLABORADORES PARA MELHOR ATENDÊ-LO"** (não 39, como a especificação assumia na seção 1.1) e **"MAIS DE 35 ANOS DE EXPERIÊNCIA"** (resolve parcialmente a divergência "25 vs 35+" da especificação, indicando 35+ como o valor atualmente exibido). **Isto não substitui a confirmação oficial do Comercial em `DADOS_OFICIAIS.md`** — é apenas uma observação ao vivo do site atual, registrada aqui para apoiar a decisão do time responsável por resolver esses itens `RESOLVER`/`A_CONFIRMAR`. Nenhum valor foi alterado em `DADOS_OFICIAIS.md` a partir desta observação.

## Achado crítico — WhatsApp: número exibido difere do número funcional

- Os 3 elementos rotulados "WhatsApp" no DOM da Home (`#whatsappfone1`, `#whatsappfone2`, `#whatsapplink`) têm `href="#"` — **link não funcional**, confirmando exatamente o alerta já registrado na especificação (seção 64: "WhatsApp oficial ... link usa `#`!").
- O texto exibido nesses elementos é **"(11) 3230-1422"** — o mesmo número do telefone principal, não um número de WhatsApp distinto.
- Porém, o snippet inline do formulário `#form-wp` (ver acima) constrói dinamicamente um link para **`+55 11 4171-8837`** (`551141718837`) — um número **diferente** do exibido.
- **Isto não confirma qual é o número oficial real.** Apenas evidencia uma inconsistência técnica já presente no site atual. A confirmação do número oficial de WhatsApp continua sendo responsabilidade do time Comercial, conforme `DADOS_OFICIAIS.md` (item **CRÍTICO/BLOQUEANTE**).
- Números de telefone confirmados via `tel:` links (coincidem com a especificação): principal `+551132301422`, emergência `+5511953288466`, ouvidoria `+5511976687668`.

## Achado crítico (relatado pelo usuário, 2026-07-02; investigado em profundidade em 2026-07-02) — WhatsApp e telefone abrem modal de captura de lead antes de navegar

**Origem:** relatado pelo usuário; **investigação completa realizada** via inspeção ao vivo de `https://www.segurosimediato.com.br` (DevTools/CDP: `jQuery._data()` para extrair handlers reais, leitura dos scripts externos completos, clique real no botão de WhatsApp com captura de screenshot do modal). Todas as perguntas da rodada de investigação (listadas na versão anterior desta seção) foram respondidas — nenhuma ficou pendente.

### Qual "código externo" implementa o modal

Cadeia completa de carregamento, toda hospedada em `https://storage.googleapis.com/bssegurosimediato-cdn/js/` (`window.APP_BASE_URL`):

1. **`FooterCodeSiteDefinitivoCompleto.js`** (já lido nesta auditoria) — anexa os handlers de clique via jQuery (`$('#whatsapplink').on('click', ...)` etc.) a `whatsappfone1`, `whatsappfone2`, `whatsapplink`, `whatsapplinksucesso` (WhatsApp) e a `sp-fone-link`, `sp-cellfone-link`, `sp-fone-link-footer`, `ouvidoria-fone` (telefone). Cada handler chama `e.preventDefault()` + `e.stopPropagation()` (bloqueando a navegação nativa do `href`/`tel:`) e então `openWhatsAppModal()` ou `openPhoneLinkModal(id)`.
2. Essas funções, sob demanda (lazy-load), injetam dinamicamente 2 scripts adicionais via `<script>` criado em runtime:
   - **`firebase_backup_leads.js`** — carregado **sempre primeiro**, configura o Firebase Realtime Database (`leads-imediato-seguros-default-rtdb.firebaseio.com`) e expõe `saveLeadToFirebase()`/`updateLeadStatusInFirebase()` globalmente. Confirma e nomeia o "indício Firebase" do item 11 de `INTEGRACOES_ATUAIS.md`.
   - **`MODAL_WHATSAPP_DEFINITIVO.js`** (clique em WhatsApp) ou **`MODAL_PHONE_LINK_DEFINITIVO.js`** (clique em telefone) — o cabeçalho deste último script confirma textualmente: *"Comportamento idêntico ao modal WhatsApp (captura, EspoCRM, Octadesk). Ação final: ligação tel:{numero}. Duplicação integral do MODAL_WHATSAPP_DEFINITIVO.js com IDs e ação final adaptados."*
3. `window.MODAL_FIREBASE_ONLY` está **confirmado como `true`** no site ao vivo (não é mais só um indício) — controla o parâmetro `syncMode=firebase` (vs. `endpoints`) passado a esses scripts.

### Dois modais distintos (não um único)

- **`#whatsapp-modal`** (clique em WhatsApp) e **`#phone-link-modal`** (clique em telefone) são elementos e scripts **separados**, embora o segundo seja uma cópia quase integral do primeiro (mesmo próprio comentário do arquivo o descreve como "duplicação integral").
- `PHONE_LINK_NUMBER_MAP[linkId]` mapeia qual dos 4 links de telefone foi clicado para o número correto a discar (principal, celular/emergência, rodapé, ouvidoria).

### O que o modal exibe e faz (confirmado com screenshot real)

O modal (clique em WhatsApp) é um **card flutuante no canto inferior direito** (não um overlay de tela cheia), com:
- Header azul degradê: título "Solicitar Cotação" + subtítulo "Quer uma cotação de seguro? Comece pelo seu telefone!" + botão fechar (×).
- Formulário com **8 campos**: DDD, Celular (obrigatórios), Email, CEP, CPF, Placa, Ano do modelo, Marca/modelo (opcionais — mesmo padrão "colete o mínimo, o resto depois" já adotado no novo `LeadForm`, Issue 11).
- Botão de envio com texto literal **"IR PARA O WHATSAPP"**.
- Ao enviar: os dados são gravados no Firebase (`saveLeadToFirebase`, função `criarLeadEspoCRM`/`atualizarLeadEspoCRM` visíveis no código), enviados ao **EspoCRM** (CRM) e ao **Octadesk** (plataforma de atendimento/chat) — **duas integrações não documentadas em nenhum arquivo de auditoria até agora**, adicionadas a `INTEGRACOES_ATUAIS.md`. Em seguida, `registrarConversaoGoogleAds(dados)` faz `window.dataLayer.push({event: 'whatsapp_modal_submit', form_type: 'whatsapp_modal', modal_channel: 'whatsapp', user_data: {...}, ...})` — **isto resolve a lacuna "nome exato do evento não confirmado" de `DATA_LAYER_ATUAL.md`**: o evento chama-se literalmente `whatsapp_modal_submit` (Enhanced Conversions via `user_data`).
- **Só então** o modal desaparece (`fadeOut`) e `openWhatsApp(dados)` executa `window.open('https://api.whatsapp.com/send?phone=...&text=Ola.%20Quero%20fazer%20uma%20cotacao%20de%20seguro.', '_blank')` — mensagem fixa genérica, não personalizada por página/ramo. O fluxo do telefone é idêntico, mas termina em `window.location.href = 'tel:' + numero` (mesma aba, sem `_blank`).

### O usuário eventualmente chega a `wa.me`/`tel:`? Sim — mas com uma ressalva de UX

- **Se o usuário preenche e envia o formulário do modal**, ele chega ao WhatsApp/discador normalmente, só que **depois** de passar por uma etapa extra de captura de lead.
- **Se o usuário fecha o modal pelo "×"** (confirmado via código do handler): o modal só executa `fadeOut(300)` — **não há navegação alternativa nenhuma**. Ou seja, fechar o modal sem preencher é um **beco sem saída**: o usuário não chega ao WhatsApp/telefone por esse clique. Isto é um achado de UX/conversão relevante para o negócio, além do achado técnico.

### Reavaliação de `WhatsAppFAB`/`CallButton`/`StickyCTA` (Issue 19, já implementados) e `LeadForm` inline no Hero (Issue 15)

Os componentes já implementados nesta sessão (`wa.me`/`tel:` diretos, sem modal) **não replicam** o comportamento de captura de lead do site atual antes do redirecionamento. Isso é uma **decisão de produto**, não uma correção técnica — o comportamento atual (modal antes de sair do site) parece ser uma estratégia deliberada de geração de lead via CRM (EspoCRM/Octadesk), possivelmente valiosa para o negócio, mas também apresenta o risco de "beco sem saída" acima. Nenhuma mudança de código foi feita a partir deste achado — fica registrado para decisão explícita do usuário/negócio sobre se (e como) replicar esse padrão no novo site, e não implementado unilateralmente por não ter sido pedido.

## Achado — Pixels/tags configurados no GTM (via leitura do JS público do container)

Sem acesso ao workspace do GTM, o JS público compilado do container (`gtm.js?id=GTM-PD6J398`) foi inspecionado por padrões de texto:
- **Google Ads Conversion ID confirmado: `AW-815139667`**, com `preAutoPii: true` (Enhanced Conversions com detecção automática de PII habilitada).
- Referências a `conversion_label`/`conversion_id`/`send_to` presentes — confirma tag de conversão Google Ads configurada (valor exato do *label* não foi extraído nesta auditoria).
- **Nenhum** pixel de Meta/Facebook (`fbq`), TikTok, Pinterest, LinkedIn, Snapchat, Hotjar ou Microsoft Clarity foi encontrado — o ecossistema de tracking atual parece ser **exclusivamente Google** (GA4 + Google Ads).
- Referências a `UA-` (Universal Analytics, descontinuado) apareceram 4×, possivelmente resíduo de template/biblioteca do GTM, não necessariamente uma tag ativa — **investigar se necessário**.

---

> Auditoria real (não é `PENDING`), executada via inspeção do site publicado. Itens marcados **Investigar** requerem acesso administrativo (Webflow/GTM) ou inspeção adicional para serem resolvidos. Nenhum dado foi inventado; onde a informação não pôde ser confirmada (ex.: payload exato de alguns endpoints, valor do conversion label), isso está explicitamente registrado como limitação, não preenchido com suposição.
