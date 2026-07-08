import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { GtmNoScript, GtmScripts, consentDefaultScript } from "@/components/consent/GtmConsentScripts";
import { StagingBanner } from "@/components/shared/StagingBanner";
import { ContactModalProvider } from "@/components/cta/ContactModalContext";
import { ContactLeadModal } from "@/components/cta/ContactLeadModal";
import { isProduction, publicEnv } from "@/lib/env";

// next/font/google baixa os arquivos em build time e serve pelo próprio
// domínio — sem requisição em runtime a fonts.googleapis.com (seção 11).
// As CSS variables usam os mesmos nomes dos tokens da Issue 02
// (--font-display / --font-sans), sobrescrevendo os valores genéricos
// declarados em app/globals.css com a fonte real self-hosted.
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

/**
 * `metadataBase` (Issue 20) — necessário para o Next.js resolver URLs
 * relativas de Open Graph/Twitter (ex.: `opengraph-image.tsx`) em URLs
 * absolutas. Sem `NEXT_PUBLIC_SITE_URL` configurada (ainda pendente,
 * seção 45), cai em `http://localhost:3000` — correto para dev; passa a
 * usar a URL real assim que a env var for configurada (Issue 24).
 *
 * `robots` global condicional (Issue 23A): fora de produção, força
 * `noindex,nofollow` em **todas** as páginas, independentemente do que
 * cada página define — reforça (não substitui) o bloqueio de
 * `robots.ts`. Uma página específica (ex.: `/obrigado`) pode continuar
 * declarando seu próprio `robots: {index:false}` normalmente; em
 * produção, esse valor por página é o único aplicado (o padrão do
 * layout raiz não define `robots` quando `isProduction`, deixando cada
 * página decidir).
 */
export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl || "http://localhost:3000"),
  title: "Imediato Seguros",
  description: "Scaffold inicial do projeto. Conteúdo final ainda não implementado.",
  // Tags de verificação do Google Search Console (integrações 2026-07-03).
  // Confirmadas lendo o Head Code do ambiente DEV do Webflow — ver
  // docs/WEBFLOW_CUSTOM_CODE_DEV.md e docs/DADOS_OFICIAIS.md. Preservam a
  // verificação de propriedade do domínio durante/depois da migração.
  verification: {
    google: ["7ExRewM8GII1bwZ73ZEBX9euCX9Sx5m8243ITCyx7cM", "OGCWNwHYOwmFiCvqJXojZvKRTGrh2P9hlXzrcKAeAao"],
  },
  ...(isProduction ? {} : { robots: { index: false, follow: false } }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <Script id="consent-default" strategy="beforeInteractive">
          {consentDefaultScript}
        </Script>
        <GtmNoScript />
        {/*
          Link "pular para o conteúdo" (Issue 23, QA a11y) — WCAG 2.4.1
          "Bypass Blocks" (nível A). Primeiro elemento focável da página;
          fica invisível até receber foco por teclado (`sr-only` →
          `focus:not-sr-only`). Aponta para `id="main-content"`, definido
          em cada `<main>` dos layouts `(marketing)`/`(legal)`.
        */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
        >
          Pular para o conteúdo
        </a>
        <StagingBanner />
        {/*
          ContactModalProvider/ContactLeadModal (integrações 2026-07-08):
          renderizado uma única vez aqui, no layout raiz, para cobrir
          `(marketing)` e `(legal)` — os gatilhos (WhatsAppButton,
          CallButton, WhatsAppFAB, StickyCTA, links de telefone do
          Footer) ficam espalhados por vários Client Components e
          compartilham este único modal via Context.
        */}
        <ContactModalProvider>
          {children}
          <ContactLeadModal />
        </ContactModalProvider>
        <ConsentBanner />
        <GtmScripts />
      </body>
    </html>
  );
}
