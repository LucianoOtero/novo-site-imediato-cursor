import type { Metadata } from "next";

import { MarcaSuhaiProduto } from "@/components/suhai/MarcaSuhaiProduto";

export const metadata: Metadata = {
  title: { absolute: "Seguro Moto Suhai | Imediato Seguros" },
  description:
    "Cotação do seguro Suhai para moto com a Imediato Seguros, corretora parceira. A placa identifica o veículo e o preço aparece na hora.",
  alternates: { canonical: "/marca-suhai/moto" },
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiMotoPage() {
  return <MarcaSuhaiProduto slug="moto" />;
}
