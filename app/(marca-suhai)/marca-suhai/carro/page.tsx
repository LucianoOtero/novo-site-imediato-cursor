import type { Metadata } from "next";

import { MarcaSuhaiProduto } from "@/components/suhai/MarcaSuhaiProduto";

export const metadata: Metadata = {
  title: { absolute: "Seguro Carro | Suhai" },
  description: "Cotação do seguro Suhai para carro. A placa identifica o veículo e o preço aparece na hora.",
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiCarroPage() {
  return <MarcaSuhaiProduto slug="carro" />;
}
