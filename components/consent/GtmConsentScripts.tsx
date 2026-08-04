import Script from "next/script";
import { publicEnv } from "@/lib/env";

/**
 * Texto do script de Consent Mode v2 default (seção 57.1/57.5 da
 * especificação). Exportado como string — o ESLint (regra
 * `@next/next/no-before-interactive-script-outside-document`) só
 * reconhece `strategy="beforeInteractive"` quando o `<Script>` é
 * renderizado diretamente em `app/layout.tsx`, então o componente
 * `<Script>` em si é montado lá, usando este conteúdo.
 *
 * Deve carregar ANTES de qualquer tag do GTM/GA4/Ads.
 *
 * Postura de consentimento (decisão do cliente, 2026-08-04): **opt-out**,
 * espelhando o site legado (CookieYes lá grava `_ga` sem interação). O
 * modelo opt-in anterior (default denied até clicar "Aceitar tudo")
 * zerava GA4/conversões Ads do braço experimento: a "Tag do Google"
 * exige `analytics_storage` no momento do page load, que sempre acontece
 * antes do aceite — medição ficava assimétrica vs legado.
 *
 * Default = granted, exceto se o visitante já tiver REJEITADO no banner
 * (`ConsentBanner`, localStorage `imediato_consent`) — a rejeição é lida
 * aqui mesmo, beforeInteractive, para valer já no primeiro page_view.
 */
export const consentDefaultScript = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  (function () {
    var analytics = 'granted';
    var marketing = 'granted';
    try {
      var raw = window.localStorage.getItem('imediato_consent');
      if (raw) {
        var stored = JSON.parse(raw);
        analytics = stored.analytics ? 'granted' : 'denied';
        marketing = stored.marketing ? 'granted' : 'denied';
      }
    } catch (e) {}
    gtag('consent', 'default', {
      ad_storage: marketing,
      ad_user_data: marketing,
      ad_personalization: marketing,
      analytics_storage: analytics,
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
  })();
`;

/**
 * Container do Google Tag Manager (seção 19/20/45 da especificação).
 * O ID nunca é hardcoded — vem exclusivamente de `publicEnv.gtmId`
 * (lib/env.ts, validado a partir de `NEXT_PUBLIC_GTM_ID`; ver
 * .env.example). Se a variável não estiver definida (ex.: ambiente local
 * sem .env.local), os scripts simplesmente não são renderizados — nenhum
 * ID inventado ou placeholder é injetado.
 *
 * Integração real (validação no GTM Preview/DebugView) é da Issue 18.
 */
export function GtmScripts() {
  const gtmId = publicEnv.gtmId;

  if (!gtmId) {
    return null;
  }

  return (
    <Script id="gtm-container" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `}
    </Script>
  );
}

/** Fallback `<noscript>` do GTM — mesmo ID de `GtmScripts`, mesma condição. */
export function GtmNoScript() {
  const gtmId = publicEnv.gtmId;

  if (!gtmId) {
    return null;
  }

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="gtm-noscript"
      />
    </noscript>
  );
}
