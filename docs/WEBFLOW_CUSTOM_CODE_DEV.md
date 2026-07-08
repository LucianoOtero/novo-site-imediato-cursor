# WEBFLOW_CUSTOM_CODE_DEV

## Finalidade
Registro verbatim do Head Code e Footer Code do ambiente de **desenvolvimento** do Webflow (`https://segurosimediato-dev.webflow.io/`) — fonte primária para o mapeamento definitivo das integrações externas a implementar no novo site, complementando `docs/LEGACY_JS_AUDIT.md` e `docs/INTEGRACOES_ATUAIS.md` (que documentaram o ambiente de **produção**).

## Origem
Colado diretamente pelo usuário (Custom Code do Webflow, painel de Project Settings) em 2026-07-03. Não é uma extração via DevTools/CDP como as auditorias anteriores — é o código-fonte declarado, mais confiável que qualquer inferência.

## Status
CONTEÚDO CONFIRMADO (fonte primária, colada pelo usuário). Cruzado com os scripts externos já lidos (`FooterCodeSiteDefinitivoCompleto.js`, `MODAL_WHATSAPP_DEFINITIVO.js`, `MODAL_PHONE_LINK_DEFINITIVO.js`) e com 3 arquivos adicionais buscados nesta rodada (`config_env.js` dev/prod, `webflow_injection_limpo.js`) para fechar lacunas que auditorias anteriores haviam deixado como "não confirmado"/"investigar".

---

## Head Code (verbatim)

```html
<!-- ===== Google Tag Manager (primeiro no <head>) ===== -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PD6J398');
</script>
<!-- ===== End Google Tag Manager ===== -->

<link rel="canonical" href="https://www.segurosimediato.com.br/" />

<!-- Verificações Google -->
<meta name="google-site-verification" content="7ExRewM8GII1bwZ73ZEBX9euCX9Sx5m8243ITCyx7cM" />
<meta name="google-site-verification" content="OGCWNwHYOwmFiCvqJXojZvKRTGrh2P9hlXzrcKAeAao" />

<!-- Metas de app / viewport / tema -->

<meta name="mobile-web-app-capable" content="yes"></meta>
<meta name="viewport" content="width=device-width, maximum-scale=1" />
<meta name="apple-mobile-web-app-title" content="Imediato Solucoes em Seguros" />
<meta name="format-detection" content="telephone=no" />
<meta name="msapplication-tap-highlight" content="no" />
<meta name="keywords" content="seguro de auto, seguro de carro, seguro de automovel, seguro de veiculo, seguro de uber, seguro de taxi, seguro de utilitario, seguro de moto, seguro de frotas, seguro auto, seguro carro, seguro automovel, seguro veiculo, seguro uber, seguro taxi, seguro utilitario, seguro moto, seguro frotas" />
<meta name="author" content="Luciano Rodrigues Otero, lrotero@gmail.com" />
<meta name="owner" content="Luciano Rodrigues Otero, lrotero@gmail.com" />
<meta name="designer" content="Luciano Rodrigues Otero, lrotero@gmail.com" />
<meta name="url" content="https://www.segurosimediato.com.br" />
<meta name="identifier-URL" content="https://www.segurosimediato.com.br" />
<meta name="reply-to" content="lrotero@gmail.com" />
<meta name="subject" content="Corretora de Seguros de Auto" />
<meta name="copyright" content="Imediato Solucoes em Seguros" />
<meta name="Classification" content="Negocios, Seguros" />
<meta name="theme-color" content="#108fce" />
<meta name="apple-mobile-web-app-status-bar-style" content="#108fce" />
<meta name="msapplication-navbutton-color" content="#108fce" />

<!-- ===== Estilos originais ===== -->
<style>
  body { -webkit-tap-highlight-color: rgba(0,0,0,0); }
  select, input{ -webkit-appearance:none; -moz-appearance:none; }
  .w-lightbox-backdrop { background-color: rgba(0, 0, 0, 0); }
  .w-lightbox-backdrop img { border: 4px solid rgba(0,0,0,0.5); }
</style>

<style>
  .swal-text { text-align:center; }
</style>

<!-- BG dots -->
<style>
:root{ --dot-color: rgba(17, 24, 39, .07); --dot-size: 1px; --dot-gap: 10px; }
.bg-dots{
  background-color:#fff;
  background-image: radial-gradient(circle at var(--dot-size) var(--dot-size),
    var(--dot-color) var(--dot-size), transparent var(--dot-size));
  background-size: var(--dot-gap) var(--dot-gap);
}
.bg-dots--dark{ background-color:#0b1220; --dot-color: rgba(255,255,255,.08); }
</style>

<!-- Blue grid -->
<style>
:root{ --blue-base:#EAF4FF; --grid-color: rgba(17,24,39,.10); --grid-gap:14px; --grid-thickness:1px; }
.blue-grid{
  background-color: var(--blue-base);
  background-image:
    repeating-linear-gradient(0deg,var(--grid-color) 0 var(--grid-thickness),
      transparent var(--grid-thickness) var(--grid-gap)),
    repeating-linear-gradient(90deg,var(--grid-color) 0 var(--grid-thickness),
      transparent var(--grid-thickness) var(--grid-gap));
}
@media (max-width:768px){ .blue-grid{ --grid-gap:16px; } }
</style>

<!-- Tech header effects -->
<style>
:root{
  --tech-bg-dark:#0b1220; --tech-bg-light:#EAF4FF;
  --tech-grid-dark:rgba(255,255,255,.07); --tech-grid-light:rgba(17,24,39,.10);
  --tech-accent-1:#33aaff; --tech-accent-2:#7c3aed;
  --tech-grid-gap:14px; --tech-grid-thickness:1px;
  --tech-glow-opacity:.24; --tech-sweep-opacity:.06;
}
.tech-header,.Brand.New.Header.tech-header{
  position:relative; overflow:hidden; isolation:isolate; min-height:56vh;
}
.tech-header--dark{ background:var(--tech-bg-dark); }
.tech-header--light{ background:var(--tech-bg-light); }
.tech-header::before,.Brand.New.Header.tech-header::before{
  content:""; position:absolute; inset:-20% -10% -30% -10%; z-index:-1; pointer-events:none;
  opacity:var(--tech-glow-opacity);
  background:
    radial-gradient(50rem 28rem at 10% 15%, var(--tech-accent-1), transparent 60%),
    radial-gradient(42rem 24rem at 85% 10%, var(--tech-accent-2), transparent 60%),
    radial-gradient(48rem 26rem at 70% 85%, rgba(16,185,129,.55), transparent 65%);
}
.tech-header::after,.Brand.New.Header.tech-header::after{
  content:""; position:absolute; inset:0; z-index:-1; pointer-events:none;
  background-image:
    repeating-linear-gradient(0deg, var(--tech-grid-color) 0 var(--tech-grid-thickness),
      transparent var(--tech-grid-thickness) var(--tech-grid-gap)),
    repeating-linear-gradient(90deg, var(--tech-grid-color) 0 var(--tech-grid-thickness),
      transparent var(--tech-grid-thickness) var(--tech-grid-gap)),
    linear-gradient(90deg, transparent, rgba(255,255,255,var(--tech-sweep-opacity)), transparent);
  background-size: var(--tech-grid-gap) var(--tech-grid-gap),
                   var(--tech-grid-gap) var(--tech-grid-gap), 50% 100%;
  background-position: 0 0, 0 0, -200% 0;
  animation: tech-sweep 6s linear infinite;
}
.tech-header--dark::after  { --tech-grid-color: var(--tech-grid-dark); }
.tech-header--light::after { --tech-grid-color: var(--tech-grid-light); }
@keyframes tech-sweep { to { background-position: 0 0, 0 0, 200% 0; } }
@media (prefers-reduced-motion: reduce){
  .tech-header::after,.Brand.New.Header.tech-header::after{
    animation:none;
    background-image:
      repeating-linear-gradient(0deg, var(--tech-grid-color) 0 var(--tech-grid-thickness),
        transparent var(--tech-grid-thickness) var(--tech-grid-gap)),
      repeating-linear-gradient(90deg, var(--tech-grid-color) 0 var(--tech-grid-thickness),
        transparent var(--tech-grid-thickness) var(--tech-grid-gap));
  }
}
@media (max-width:991px){ :root{ --tech-grid-gap:16px; } }
@media (max-width:479px){ :root{ --tech-grid-gap:18px; } }
</style>

<!-- ===== IMPORTANTE =====
1) NÃO carregar aqui: CookieYes, GA4, Google Ads, CollectChat, Mailchimp.
   Todos eles devem ser inseridos via GTM com:
   - CookieYes CMP em "Consent Initialization - All Pages"
   - GA4: exigir analytics_storage
   - Ads/Conversion/Linker: exigir ad_storage (+ ad_user_data/ad_personalization)
   - CollectChat/Mailchimp: DOM Ready e respeitar consentimento
2) Se precisar de libs não rastreadoras (ex.: lazysizes, sweetalert), prefira carregá-las via GTM também.
===================================== -->
```

## Footer Code (verbatim)

```html
<!-- ====================== -->
<!-- Google Tag Manager (noscript) - manter -->
<noscript>
  <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PD6J398"
          height="0" width="0"
          style="display:none;visibility:hidden"></iframe>
</noscript>
<!-- ====================== -->

<!-- ====================== -->
<!-- Submissão especial: abre WhatsApp e depois envia o form -->
<script>
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('form-wp');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var whatsappUrl = "https://api.whatsapp.com/send?phone=551141718837&text=Ola.%20Quero%20fazer%20uma%20cotacao%20de%20seguro.";
      window.open(whatsappUrl, '_blank');
      form.submit();
    });
  });
</script>
<!-- ====================== -->

<!-- ====================== -->
<!-- Bibliotecas base -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.mask/1.14.16/jquery.mask.min.js" crossorigin="anonymous"></script>

<!-- SweetAlert2 v11.14.0 -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.14.0/dist/sweetalert2.all.min.js" defer></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11.14.0/dist/sweetalert2.min.css"/>
<!-- ====================== -->

<!-- ====================== -->
<!-- Configuração de Debug (ANTES do script principal) -->
<script>
  // Definir DEBUG_CONFIG ANTES do script principal para garantir que exista quando logUnified executar
  window.DEBUG_CONFIG = window.DEBUG_CONFIG || {
    level: 'all',
    enabled: true,  // false = logs desabilitados | true = logs habilitados
    exclude: [],
    environment: 'auto'
  };
</script>
<!-- ====================== -->

<!-- 1. Carregar variáveis de ambiente do Cloud Storage DEV (OBRIGATÓRIO - ANTES do script principal) -->
<script src="https://storage.googleapis.com/bssegurosimediato-cdn-dev/js/config_env.js"></script>

<script>
    // PROJETO: Firebase-Only Modal
    // Ativar modo Firebase-Only para usar apenas Firebase (sem chamadas diretas aos endpoints)
    window.MODAL_FIREBASE_ONLY = true;
</script>

<!-- 2. Carregar script principal (usa variáveis do window injetadas pelo Cloud Storage DEV) -->
<script 
    src="https://storage.googleapis.com/bssegurosimediato-cdn-dev/js/FooterCodeSiteDefinitivoCompleto.js"
    data-app-base-url="https://storage.googleapis.com/bssegurosimediato-cdn-dev/js"
    data-app-environment="development"
    data-log-environment="dev"
    data-log-level="all"
    data-log-console-enabled="true"
    data-log-console-min-level="all"
    data-rpa-enabled="true"
    data-use-phone-api="true"
    data-validar-ph3a="false"
    data-success-page-url="https://segurosimediato-dev.webflow.io/sucesso"
    data-whatsapp-api-base="https://api.whatsapp.com"
    data-whatsapp-phone="551132301422"
    data-whatsapp-default-message="Ola.%20Quero%20fazer%20uma%20cotacao%20de%20seguro."
></script>
```

---

## Análise por integração

### 1. Google Tag Manager — `GTM-PD6J398`
Mesmo container já confirmado em produção (`docs/LEGACY_JS_AUDIT.md`). Sem mudança de achado.

### 2. Comentário "IMPORTANTE" do Head Code — confirma o desenho de arquitetura de tags
Achado novo e relevante: o próprio código declara que **CookieYes, GA4, Google Ads, CollectChat e Mailchimp nunca devem ser carregados fora do GTM** — tudo entra como tag dentro do container, com consentimento controlado por 2 sinais (`analytics_storage` para GA4; `ad_storage`+`ad_user_data`+`ad_personalization` para Ads/Conversion/Linker). Isso:
- Confirma que **CookieYes é o CMP usado hoje** (gerencia o consentimento antes das demais tags).
- Confirma que **Mailchimp é uma integração real** do site atual — nunca havia aparecido em nenhuma auditoria anterior (nem como indício).
- Reforça que **CollectChat é real** (já havia indício via `window.CollectChatAttributes` em `FooterCodeSiteDefinitivoCompleto.js` — ver item 6 abaixo).
- **Decisão do usuário (2026-07-03): CookieYes não será usado no novo site** (mantém-se o Consent Mode v2 nativo, Issue 03) e **Mailchimp/CollectChat não serão implementados** (usuário confirmou que "não estão mais funcionando").

### 3. Meta tags diversas
- `google-site-verification` (2 tags) — valores confirmados, a portar para o novo site (seção "SEO" abaixo).
- `theme-color`/`apple-mobile-web-app-status-bar-style`/`msapplication-navbutton-color` (`#108fce`) — cor de marca antiga (diferente do novo Design System, que usa `--color-brand-500`). **Não portar o valor** — o novo site já tem sua própria paleta confirmada (Issue 02).
- `author`/`owner`/`designer`/`reply-to` = dados pessoais do desenvolvedor do site legado (Luciano Rodrigues Otero) — **não portar**, não é informação institucional da Imediato.
- `keywords` — baixo valor de SEO nos motores modernos, mas inofensivo; **fora de escopo** desta rodada (Issue 20 já cobre metadata via `generateMetadata`).
- `format-detection: telephone=no` — impede que navegadores mobile transformem números de telefone em links `tel:` automaticamente. Sem efeito no novo site (usamos `tel:` explícito nos nossos próprios componentes).

### 4. CSS decorativo (bg-dots, blue-grid, tech-header)
Efeitos visuais de fundo (pontilhado, grade azul, grade animada com glow no header) usados em alguma seção do site Webflow. **Fora de escopo** — o novo site já tem seu próprio Design System (Issue 02/08); replicar esses efeitos seria uma decisão de design nova, não uma integração externa.

### 5. `#form-wp` — submissão especial que abre WhatsApp
Script inline que, ao submeter um formulário com `id="form-wp"`, abre `https://api.whatsapp.com/send?phone=551141718837&text=...` numa nova aba e **também** envia o formulário nativamente (`form.submit()`, sem AJAX). O número usado aqui (`551141718837` = `(11) 4171-8837`) é **diferente** do número usado no fluxo principal do modal (`data-whatsapp-phone="551132301422"` = `(11) 3230-1422`, o mesmo já confirmado e usado em `lib/company.ts`). Achado técnico, sem ação necessária — o novo site já usa exclusivamente o número confirmado (3230-1422).

### 6. Bibliotecas base (jQuery, jQuery Mask, SweetAlert2)
Já documentadas em auditorias anteriores (`FORMULARIOS_ATUAIS.md`). Sem novo achado — o novo site não usa jQuery/SweetAlert2 (React + Design System próprio).

### 7. `config_env.js` (variante **DEV**, `bssegurosimediato-cdn-dev`)
Confirma que existe um **bucket separado para desenvolvimento** (`bssegurosimediato-cdn-dev`), distinto do de produção (`bssegurosimediato-cdn`). URLs Cloud Run confirmadas (dev):
```
LOG_ENDPOINT_URL              = https://log-endpoint-dev-6r55ex3u6q-rj.a.run.app/
CPF_VALIDATE_URL              = https://cpf-validate-dev-6r55ex3u6q-rj.a.run.app/
PLACA_VALIDATE_URL            = https://placa-validate-dev-6r55ex3u6q-rj.a.run.app/
SEND_EMAIL_NOTIFICATION_URL   = https://send-email-notification-dev-6r55ex3u6q-rj.a.run.app/
ADD_FLYINGDONKEYS_URL (EspoCRM) = https://add-flyingdonkeys-dev-6r55ex3u6q-rj.a.run.app/
ADD_WEBFLOW_OCTA_URL (Octadesk) = https://add-webflow-octa-dev-6r55ex3u6q-rj.a.run.app/
```
E, para comparação, a variante **produção** (`bssegurosimediato-cdn`, já buscada nesta rodada para fechar a lacuna):
```
LOG_ENDPOINT_URL              = https://log-endpoint-prod-br2qvvxwhq-rj.a.run.app/
CPF_VALIDATE_URL              = https://cpf-validate-prod-br2qvvxwhq-rj.a.run.app/
PLACA_VALIDATE_URL            = https://placa-validate-prod-br2qvvxwhq-rj.a.run.app/
SEND_EMAIL_NOTIFICATION_URL   = https://send-email-notification-prod-br2qvvxwhq-rj.a.run.app/
ADD_FLYINGDONKEYS_URL (EspoCRM) = https://add-flyingdonkeys-prod-br2qvvxwhq-rj.a.run.app/
ADD_WEBFLOW_OCTA_URL (Octadesk) = https://add-webflow-octa-prod-br2qvvxwhq-rj.a.run.app/
```
`APILAYER_KEY`, `SAFETY_TICKET`, `SAFETY_API_KEY` são **idênticos em dev e prod** (client-side, já expostos publicamente em ambos os ambientes — mesmo achado de segurança já registrado em `INTEGRACOES_ATUAIS.md`, itens 8/9). `RPA_API_BASE_URL` (`https://rpaimediatoseguros.com.br`) também é **idêntico em dev e prod** — não há ambiente de desenvolvimento separado para o RPA.

### 8. EspoCRM (via proxy `ADD_FLYINGDONKEYS_URL`) e Octadesk (via proxy `ADD_WEBFLOW_OCTA_URL`) — **confirmados pelo usuário como reais**
- **EspoCRM é o CRM real**, instalado no domínio FlyingDonkeys. Ambiente de dev a ser usado agora: `dev.flyingdonkeys.com.br`.
- **Octadesk é o sistema de comunicação com o cliente via WhatsApp**, também real. **Sem ambiente de dev** — usa produção mesmo durante testes.
- Payload confirmado (lido em `MODAL_WHATSAPP_DEFINITIVO.js`, idêntico para os dois destinos):
  ```
  POST, Content-Type: application/json (sem header de autenticação visível no client-side)
  Body: {
    data: {
      "DDD-CELULAR", "CELULAR", "GCLID_FLD", "NOME", "CPF", "CEP", "PLACA", "Email",
      "VEICULO", "ANO", "SEXO", "DATA-DE-NASCIMENTO", "ESTADO-CIVIL", "ENDERECO",
      "produto", "landing_url", "utm_source", "utm_campaign"
    },
    d: "<ISO timestamp>",
    name: "<string descritiva, ex.: 'Modal WhatsApp - Dados Completos'>"
  }
  ```
- Nenhuma autenticação (API key/assinatura) é enviada pelo navegador — os proxies Cloud Run presumivelmente guardam as credenciais reais do EspoCRM/Octadesk no lado servidor. **A ser confirmado com o time de TI antes de produção** se essa é toda a proteção existente.

### 9. RPA (`rpaimediatoseguros.com.br`) — `data-rpa-enabled="true"`
Não é apenas um nome de sistema — é uma **cotação automatizada real**, confirmada lendo `webflow_injection_limpo.js` (script adicional carregado sob demanda via `loadRPAScript()`, que define as classes `MainPage` e `ProgressModalRPA`). Fluxo:
1. `POST https://rpaimediatoseguros.com.br/api/rpa/start` com os dados do formulário → retorna um `sessionId`.
2. Polling em `GET https://rpaimediatoseguros.com.br/api/rpa/progress/{sessionId}` → retorna `{ progress: { etapa_atual, fase_atual, status, mensagem } }`.
3. A UI (`ProgressModalRPA`) exibe uma barra/modal de progresso enquanto o processo roda no backend (provavelmente automação de navegação nos portais das seguradoras para obter cotações reais).
- **Decisão do usuário: incluir nesta rodada.**

### 10. PH3A — enriquecimento de dados de CPF
API de terceiros (empresa brasileira de enriquecimento/validação de dados) acessada através do proxy já existente `CPF_VALIDATE_URL` — não é uma URL própria separada. Quando habilitada (`VALIDAR_PH3A === true`), ao validar um CPF a API retorna `sexo`, `dataNascimento` e `estadoCivil`, usados para preencher automaticamente os campos correspondentes no formulário legado. **Está desabilitada mesmo em DEV** (`data-validar-ph3a="false"`).
- **Decisão do usuário: incluir nesta rodada** (como enriquecimento server-side não-bloqueante, sem replicar o preenchimento ao vivo do formulário legado — ver plano de implementação).

### 11. CollectChat — confirmado como integração real, porém obsoleta
`window.CollectChatAttributes = { gclid: ... }` é definido explicitamente em `FooterCodeSiteDefinitivoCompleto.js` para passar o GCLID capturado da URL ao widget de chat CollectChat (carregado via GTM, conforme o comentário do Head Code). **Usuário confirmou (2026-07-03) que não está mais funcionando** — não será implementado.

### 12. Mailchimp — mencionado apenas no comentário do Head Code
Nunca apareceu em nenhum script já lido (nem como variável, nem como chamada). **Usuário confirmou que não está mais funcionando** — não será implementado.

### 13. `/sucesso` — página de obrigado do ambiente legado
Confirma a existência de uma página de agradecimento própria (`data-success-page-url="https://segurosimediato-dev.webflow.io/sucesso"`), equivalente ao `/obrigado` do novo site (já implementado, Issue 14). Mostra o mesmo número de WhatsApp divergente do item 5 acima, e um link para uma "Pesquisa de Satisfação" externa (não identificada/investigada nesta rodada — fora de escopo).

---

> Este documento cruza uma fonte primária (código colado pelo usuário) com auditorias estáticas anteriores. Onde a fonte primária confirma ou contradiz um achado anterior marcado como "indício"/"não confirmado", isso está detalhado item a item acima — nenhum dado foi inventado; URLs/valores de configuração vêm literalmente do código fornecido ou dos arquivos buscados para completar o mapeamento.
