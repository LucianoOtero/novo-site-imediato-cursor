import type { Metadata } from "next";

import { MarcaSuhaiProduto } from "@/components/suhai/MarcaSuhaiProduto";

export const metadata: Metadata = {
  title: { absolute: "Seguro Carro Suhai | Imediato Seguros" },
  description:
    "Cotação do seguro Suhai para carro com a Imediato Seguros, corretora parceira. A placa identifica o veículo e o preço aparece na hora.",
  alternates: { canonical: "/marca-suhai/carro" },
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiCarroPage() {
  return <MarcaSuhaiProduto slug="carro" />;
}
