/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixa a raiz do projeto explicitamente: o Next.js detectou um
  // package-lock.json adicional fora desta pasta e inferiu a raiz errada.
  outputFileTracingRoot: import.meta.dirname,

  // Fase 4 do redesign v2 (2026-07-19): AVIF antes de WebP no pipeline do
  // next/image — compressão ~20-30% melhor para as imagens fotográficas do
  // hero (Higgsfield), com fallback automático para WebP.
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Nota (2026-07-20): `experimental.inlineCss` foi testado e REVERTIDO —
  // melhorou o FCP (~150 ms) mas piorou o LCP (~200-400 ms no 4G simulado):
  // os ~62 KB de CSS inline aumentam o HTML e atrasam o início do download
  // da imagem do hero, que é o elemento LCP. Não reativar sem medir.

  /**
   * Redirects 301 da migração (Issue 24).
   * Fonte: docs/INVENTARIO_URLS.md, seção 59 (tabela de migração).
   *
   * Apenas 1 redirect está listado como **confirmado** ("301", sem "?")
   * na tabela: `/seguro-motos` (plural, URL antiga) → `/seguro-moto`
   * (singular, URL nova — normalização de slug). Todos os demais itens
   * da tabela são "manter" (mesma URL, sem redirect necessário), "novo"
   * (sem URL antiga) ou estão marcados com "?"/`TBD` (não confirmados —
   * ex.: Política de Privacidade, Termos, Seguro Pet) — a própria regra
   * do documento é clara: "nenhuma URL antiga vai para produção sem
   * decisão explícita" e a tabela 65.1 (auditoria real com Screaming
   * Frog/Search Console) continua pendente. Adicionar redirects para
   * URLs incertas seria pior do que não redirecionar (pode mascarar um
   * 404 real ou redirecionar para o destino errado) — por isso só o
   * único item 100% confirmado está aqui. Revisar esta lista assim que
   * a auditoria real (seção 65) for concluída.
   */
  /**
   * Headers de segurança (auditoria 2026-08-07). A Vercel já envia HSTS;
   * estes complementam o básico recomendado sem risco de quebrar nada:
   * - nosniff: impede MIME-sniffing de respostas.
   * - Referrer-Policy: origem completa só em navegação same-origin
   *   (não afeta GA4/Ads — o gtag envia a URL da página por parâmetro).
   * - frame-ancestors 'self': anti-clickjacking (equivalente moderno do
   *   X-Frame-Options; site não é embedado por terceiros).
   * CSP completa (script-src etc.) fica fora por ora: GTM injeta scripts
   * dinamicamente e uma CSP mal calibrada derrubaria a medição.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/seguro-motos",
        destination: "/seguro-moto",
        permanent: true,
      },
      // Alias do rótulo de menu "Sobre" → rota canônica do mapa do site
      {
        source: "/sobre",
        destination: "/a-imediato",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
