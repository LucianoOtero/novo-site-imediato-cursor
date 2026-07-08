import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

/**
 * Layout do grupo de rotas `(legal)` — Issue 22.
 * Fonte: ESPECIFICACAO v3.md, seção 22 (`app/(legal)/{politica,termos,
 * alerta-de-fraude}/page.tsx`).
 *
 * Header/Footer para manter o chrome do site consistente, mas
 * deliberadamente **sem** `WhatsAppFAB`/`StickyCTA` (Issue 19) — páginas
 * legais não são páginas de conversão; os CTAs flutuantes de cotação
 * fariam menos sentido aqui do que no grupo `(marketing)`.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
