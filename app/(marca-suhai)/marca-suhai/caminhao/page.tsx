import type { Metadata } from "next";

import { MarcaSuhaiProduto } from "@/components/suhai/MarcaSuhaiProduto";

export const metadata: Metadata = {
  title: { absolute: "Seguro para Caminhões, Vans e VUCs | Suhai" },
  description: "Cotação do seguro Suhai para caminhão, van e VUC. A placa identifica o veículo e o preço aparece na hora.",
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiCaminhaoPage() {
  return <MarcaSuhaiProduto slug="caminhao" />;
}
