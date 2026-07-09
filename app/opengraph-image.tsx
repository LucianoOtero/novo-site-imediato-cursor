import { readFileSync } from "node:fs";
import { join } from "node:path";
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
 *
 * **Logotipo (2026-07-08)**: adiciona o ícone "M" do novo logotipo
 * (`public/logos/imediato-seguros-icon.svg` — só o ícone, não o lockup
 * completo com texto; ver nota em `docs/BRAND_ASSETS.md`) ao lado do
 * nome. Embutido como data URI base64 (lido em disco em request time,
 * runtime Node.js padrão deste arquivo) — Satori (motor do
 * `ImageResponse`) não suporta `import` de asset SVG diretamente, mas
 * renderiza `<img src="data:image/svg+xml;base64,...">` normalmente,
 * incluindo os gradientes do ícone (rasterização final via resvg).
 * Fundo sobre cartão branco pelo mesmo motivo do Rodapé — o `#003881`
 * do texto do logotipo (não usado aqui) e os tons escuros do ícone
 * teriam contraste baixo no gradiente azul escuro de fundo.
 */
export const alt = `${company.tradeName} — Cotação de seguro grátis e sem compromisso`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const iconSvg = readFileSync(join(process.cwd(), "public/logos/imediato-seguros-icon.svg"), "utf-8");
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

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
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", background: "#ffffff", borderRadius: 20, padding: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori (next/og) não suporta next/image; imagem gerada (PNG final), não uma página real — alt não se aplica. */}
            <img src={iconDataUri} width={64} height={64} alt="" />
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{company.tradeName}</div>
        </div>
        <div style={{ fontSize: 32, opacity: 0.85 }}>Cotação de seguro grátis, sem compromisso</div>
        <div style={{ fontSize: 24, opacity: 0.7, marginTop: 24 }}>Comparamos as melhores condições entre seguradoras parceiras</div>
      </div>
    ),
    { ...size }
  );
}
