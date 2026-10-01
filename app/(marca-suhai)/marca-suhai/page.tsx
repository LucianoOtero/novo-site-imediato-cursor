import type { Metadata } from "next";

import { MarcaSuhaiLanding } from "@/components/suhai/MarcaSuhaiLanding";

export const metadata: Metadata = {
  title: { absolute: "Seguro de Carro, Moto e Caminhão | Suhai" },
  description: "Cotação do seguro Suhai para carro, moto e caminhão. Placa, CEP e CPF, e o preço aparece na hora.",
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiPage() {
  return <MarcaSuhaiLanding />;
}
