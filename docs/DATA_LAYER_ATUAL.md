# DATA_LAYER_ATUAL

## Finalidade
Inventário dos eventos `dataLayer.push` e das tags/triggers do GTM atualmente em uso no site.

## Origem
Auditoria real executada na Issue P-09 — ver metodologia e limitações em `LEGACY_JS_AUDIT.md`. Sem acesso ao workspace do GTM (tags/triggers/variables não puderam ser inspecionados diretamente); os achados abaixo vêm de: (a) inspeção do `window.dataLayer` em runtime na Home; (b) leitura de padrões de texto no JS público compilado do container (`gtm.js?id=GTM-PD6J398`); (c) leitura do script customizado `FooterCodeSiteDefinitivoCompleto.js`.

## Status
CONTEÚDO CRIADO (auditoria real parcial). Concluído em 2026-07-01; atualizado em 2026-07-02 com a investigação do modal de WhatsApp/telefone (ver `LEGACY_JS_AUDIT.md`), que confirmou o nome exato do evento de Enhanced Conversions (`whatsapp_modal_submit`) lendo o código-fonte dos scripts do modal diretamente — sem precisar de acesso ao GTM Preview/DebugView para esse item específico.

## Observações
Sem o GTM Preview/DebugView reais (exigiria interação de formulário ou acesso à conta), **não foi possível confirmar o nome exato** de todos os eventos customizados nem os triggers associados. Isso está marcado explicitamente onde aplicável — exceto o evento `whatsapp_modal_submit`, confirmado por leitura direta do código-fonte do modal (não do GTM em si; o *trigger*/tag configurados no workspace do GTM para esse evento continuam não inspecionados).

---

## IDs confirmados

| Item | Valor confirmado | Como foi confirmado |
|---|---|---|
| Container GTM | `GTM-PD6J398` | Script `gtm.js?id=GTM-PD6J398` carregado na Home; coincide com o valor já observado na especificação |
| GA4 Measurement ID | `G-694K3F1XQ1` | Script `gtag/js?id=G-694K3F1XQ1` carregado diretamente + snippet inline `gtag('config','G-694K3F1XQ1')` |
| Google Ads Conversion ID | `AW-815139667` | Encontrado no JS público compilado do container GTM (`vtp_tagId`, `productSettings`), com `preAutoPii:true` |
| Google Ads Conversion Label | Não extraído nesta auditoria | Referência a `vtp_conversionLabel` encontrada, mas o valor concreto não foi capturado |

## Tabela 3 — Eventos de dataLayer/GTM

| Evento/`dataLayer.push` | Quando dispara | Parâmetros | Tag/Trigger no GTM | Conversão Ads/GA4? | Migrar para seção 20? | Observações |
|---|---|---|---|---|---|---|
| `gtm.js` (evento padrão) | Carregamento da página (boilerplate do próprio GTM) | `gtm.start`, `event` | Trigger padrão "All Pages" (presumido, não confirmado) | Não | Não — é infraestrutura, não evento de negócio | — |
| `gtag('config', 'G-694K3F1XQ1')` / `gtag('js', ...)` | Carregamento da página | `developer_id.*` (setado 2×) | Configuração GA4 via gtag direto (fora do GTM) | Indireto (necessário para os demais eventos) | Não — no novo site GA4 só via GTM (seção 19) | GA4 inicializado 2× (gtag.js direto + GTM) — duplicidade a resolver na configuração real |
| `dataLayer.push(gtmEventData)` com `user_data` (Enhanced Conversions) | Pós-envio de formulário (achado em `FooterCodeSiteDefinitivoCompleto.js`, comentário "LOG ESPECÍFICO PARA ENHANCED CONVERSIONS") | `user_data` (hasheado); demais campos do objeto `gtmEventData` não detalhados nesta auditoria | Tag customizada de Enhanced Conversions (não inspecionada diretamente — sem acesso admin) | **Sim (Enhanced Conversions)** | **Sim — equivalente ao `generate_lead` da seção 20**, mas hoje já com paridade de Enhanced Conversions (seção 18/57.3) | **Nome do evento confirmado em 2026-07-02** (investigação do modal de WhatsApp/telefone, ver `LEGACY_JS_AUDIT.md`): o modal de WhatsApp dispara `dataLayer.push({event: 'whatsapp_modal_submit', form_type: 'whatsapp_modal', modal_channel: 'whatsapp', user_data: {...}, gclid, ...})` na função `registrarConversaoGoogleAds()`. Este é especificamente o evento do **modal de WhatsApp** — não confirma se o formulário principal de cotação (`#form-wp`) dispara um evento equivalente com outro nome; isso continua não verificado |
| Conversão Google Ads (`AW-815139667`) | Inferido: no mesmo fluxo pós-envio, via tag de conversão do GTM | `vtp_conversionId`/`vtp_conversionLabel` (label não extraído) | Tag "Google Ads Conversion Tracking" | Sim | **Sim — mapeia para `GOOGLE_ADS_CONVERSION_ID`/`LABEL` (seção 45)** | ID confirmado via leitura pública do `gtm.js`; label não capturado nesta sessão |
| Clique WhatsApp | **Confirmado em 2026-07-02** (ver `LEGACY_JS_AUDIT.md`): o clique em si (`#whatsapplink` etc.) **não** dispara nenhum evento — ele abre o modal de captura de lead. O evento (`whatsapp_modal_submit`, linha acima) só dispara se/quando o usuário **envia o formulário do modal**; se ele fecha o modal sem enviar, nenhum evento é registrado e o clique original fica sem rastreamento nenhum | `user_data`, `gclid`, campos "has_*" (ver linha acima) | Tag de conversão + trigger customizado do evento `whatsapp_modal_submit` (não inspecionado diretamente) | Sim (indireto, só após envio do modal) | Sim — mapeia para `whatsapp_click` (seção 20), mas com semântica diferente: o novo site dispara `whatsapp_click` no **clique direto** (sem modal, Issue 19); o site atual só rastreia o **envio do modal**, não o clique inicial | Confirma a suspeita anterior: `href="#"` realmente significa que o clique não é diretamente rastreável/navegável — é interceptado para abrir o modal |
| Clique telefone | **Confirmado em 2026-07-02**: mesmo padrão do WhatsApp — o clique em si abre `#phone-link-modal` (script `MODAL_PHONE_LINK_DEFINITIVO.js`, cópia do modal de WhatsApp); só dispara evento de conversão se o formulário do modal for enviado, com o payload nomeado `'Modal Phone Link - Submissão Completa (V2)'` | Mesma estrutura do WhatsApp | Mesmo padrão do WhatsApp, evento adaptado para telefone | Sim (indireto, só após envio do modal) | Sim — mapeia para `call_click` (seção 20), mesma ressalva de semântica acima | Os `tel:` links têm `href` correto no HTML, mas o clique é interceptado da mesma forma que o WhatsApp — confirma que a leitura estática original ("`tel:` funcional") não capturava o comportamento real em runtime |
| Scroll/tempo de engajamento | Não identificado nesta auditoria estática | — | GTM possui triggers nativos de "Scroll Depth" e "Timer" que podem estar configurados sem aparecer no client-side JS | Não confirmado | Sim — mapeia para `scroll_depth`/`engaged_time` (seção 20) | Requer acesso ao workspace do GTM para confirmar |
| `page_view`, `form_start`, `form_step`, `faq_open`, `cta_click` (eventos customizados da seção 20) | — | — | — | — | Sim — fazem parte do novo contrato (Issue 18/03B) | **Nenhuma evidência de que esses eventos customizados específicos já existem hoje** com esses nomes; o site atual não segue o contrato `snake_case` da seção 20 — é uma implementação legada distinta, não um subconjunto do novo modelo |

## Pixels/tags NÃO encontrados (achado negativo relevante)

Busca por padrões no JS público do GTM não encontrou: Meta/Facebook Pixel (`fbq`), TikTok (`ttq`), Pinterest (`pintrk`), LinkedIn Insight (`linkedin_partner_id`), Snapchat (`snaptr`), Hotjar, Microsoft Clarity. **O ecossistema de tracking atual parece ser exclusivamente Google (GA4 + Google Ads).** Isso é consistente com a especificação, que também só menciona GTM/GA4/Google Ads (seções 18–20) — nenhuma divergência aqui.

## Arquitetura de tags declarada no Head Code do ambiente DEV (confirmado em 2026-07-03)

O Head Code do ambiente de desenvolvimento (`docs/WEBFLOW_CUSTOM_CODE_DEV.md`) traz um comentário explícito confirmando como as tags são organizadas — informação que a leitura estática do JS público do GTM (minificado) não conseguia revelar diretamente:
- **CookieYes** funciona como CMP, configurado como tag "Consent Initialization - All Pages" — é ele quem inicializa o consentimento antes das demais tags dispararem.
- **GA4** dentro do GTM exige o sinal `analytics_storage`.
- **Google Ads (Conversion/Linker)** dentro do GTM exige `ad_storage` (+ `ad_user_data`/`ad_personalization`) — confirma os 4 sinais exatos que o Consent Mode v2 do novo site precisa cobrir (já implementados como estado *default* "denied" em `components/consent/GtmConsentScripts.tsx`; o banner que os atualiza para "granted" ainda estava pendente até esta rodada).
- **CollectChat e Mailchimp** também deveriam carregar só via GTM, respeitando DOM Ready e consentimento — ambos confirmados pelo usuário (2026-07-03) como **não funcionando mais**, não serão implementados no novo site.

---

> Auditoria real (não é `PENDING`). Onde o nome exato de um evento, trigger ou label não pôde ser confirmado sem acesso ao workspace do GTM, isso está marcado explicitamente como "não confirmado"/"requer teste real" — nenhum nome de evento foi inventado.
