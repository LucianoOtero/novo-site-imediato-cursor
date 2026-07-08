import { ImageResponse } from "next/og";

import { company } from "@/lib/company";

/**
 * opengraph-image.tsx — imagem OG padrão do site (Issue 20).
 * Fonte: ESPECIFICACAO v3.md, seção 35.2 ("OG 1.91:1 via
 * `opengraph-image.tsx`") e seção 17 ("Open Graph... com `/og` dinâmica").
 *
 * Convenção de arquivo do Next.js App Router — gera a imagem OG padrão
 * para qualquer página que não defina a sua própria (ex.: uma LP de
 * ramo, Issue 16, pode sobrescrever com seu próprio `opengraph-image.tsx`
 * dentro da própria rota). Usa o gradiente de marca (`--gradient-brand`,
 * seção 28.5) — replicado aqui em CSS inline porque `ImageResponse`
 * (Satori) não lê `app/globals.css`.
 */
export const alt = `${company.tradeName} — Cotação de seguro grátis e sem compromisso`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 24,
          padding: "80px",
          background: "linear-gradient(160deg, #0a2540 0%, #0f55b8 78%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{company.tradeName}</div>
        <div style={{ fontSize: 32, opacity: 0.85 }}>Cotação de seguro grátis, sem compromisso</div>
        <div style={{ fontSize: 24, opacity: 0.7, marginTop: 24 }}>Comparamos as melhores condições entre seguradoras parceiras</div>
      </div>
    ),
    { ...size }
  );
}
