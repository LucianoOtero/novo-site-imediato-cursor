import type { Metadata } from "next";

import { MarcaSuhaiLanding } from "@/components/suhai/MarcaSuhaiLanding";

export const metadata: Metadata = {
  title: { absolute: "Seguro Suhai para Carro, Moto e Caminhão | Imediato Seguros" },
  description:
    "Cotação do seguro Suhai com a Imediato Seguros, corretora parceira. Placa, CEP e CPF, e o preço aparece na hora.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

export default function MarcaSuhaiPage() {
  return <MarcaSuhaiLanding />;
}
