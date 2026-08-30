import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/cta/WhatsAppFAB";
import { StickyCTA } from "@/components/cta/StickyCTA";
import { PageAnalytics } from "@/components/analytics/PageAnalytics";
import { buildInsuranceAgencySchema } from "@/lib/schema";
import { publicEnv } from "@/lib/env";

/**
 * Layout do grupo de rotas `(marketing)` — Issue 13.
 * Fonte: ESPECIFICACAO v3.md, seção 22 (estrutura de diretórios:
 * `app/(marketing)/{page,cotacao,...}/page.tsx`).
 *
 * Header (Issue 06) e Footer (Issue 07) existiam como componentes
 * standalone desde suas issues, mas nenhuma página os renderizava ainda
 * — `/cotacao` é a primeira página real do projeto, então este layout
 * (que faltava) precisou ser criado agora para que ela tenha o chrome
 * do site. `app/page.tsx` (placeholder de scaffold da Home, na raiz,
 * fora deste grupo) continua sem Header/Footer até a Issue 15 mover a
 * Home real para dentro de `(marketing)`.
 *
 * `WhatsAppFAB` e `StickyCTA` (Issue 19) entram aqui — CTAs flutuantes
 * globais do sistema de CTAs (seção 16), não específicos de uma página.
 *
 * `PageAnalytics` (Issue 18) dispara `scroll_depth`/`engaged_time` em
 * toda página do grupo — não renderiza nada visível.
 *
 * JSON-LD `InsuranceAgency` (Issue 20) representa o negócio como um
 * todo — por isso fica no layout (aparece em toda página do grupo),
 * não em uma página específica.
 *
 * Alerta de fraude (Issue 22): o banner top foi removido (2026-08-30) —
 * aviso permanece no `Footer` + página `/alerta-de-fraude`.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const insuranceAgencySchema = buildInsuranceAgencySchema(publicEnv.siteUrl);

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- JSON-LD precisa ser injetado como script inline; conteúdo vem de `buildInsuranceAgencySchema`, não de input de usuário.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(insuranceAgencySchema) }}
      />
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <WhatsAppFAB />
      <StickyCTA />
      <PageAnalytics />
    </>
  );
}
