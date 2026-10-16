import type { Metadata } from "next";

import { MarcaSuhaiProduto } from "@/components/suhai/MarcaSuhaiProduto";

export const metadata: Metadata = {
  title: { absolute: "Seguro Suhai para Caminhões, Vans e VUCs | Imediato Seguros" },
  description:
    "Cotação do seguro Suhai para caminhão, van e VUC com a Imediato Seguros, corretora parceira. A placa identifica o veículo e o preço aparece na hora.",
  alternates: { canonical: "/marca-suhai/caminhao" },
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiCaminhaoPage() {
  return <MarcaSuhaiProduto slug="caminhao" />;
}
