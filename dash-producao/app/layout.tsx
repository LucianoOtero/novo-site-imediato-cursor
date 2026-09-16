import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Produção comercial | Imediato",
  description: "Dashboard interno de produção Espo × Agger",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
