import { InsuranceCard } from "@/components/home/InsuranceCard";
import { ramos } from "@/lib/ramos";

/**
 * RamoGrid — grid de cards de ramo (Issue 10).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 (wireframe da Home: "RamoGrid 9
 * InsuranceCards (Auto destacado) com preço 'a partir de'").
 *
 * Nota de fidelidade: o wireframe da seção 6.1 lista "9 InsuranceCards"
 * (sem "Assistência 24h/RCF" — mesma omissão já observada no menu
 * "Seguros" do Header, seção 5.1). A Issue 05 estabeleceu `lib/ramos.ts`
 * como fonte única dos 10 ramos (seção 22), e os 10 têm `priceFrom`/
 * `priceLabel` estruturalmente iguais — não há motivo de dado para excluir
 * um deles. Por consistência com a decisão já tomada no Header (Issue
 * 06), a grid é **derivada de `lib/ramos.ts`** (10 itens), não hardcoded
 * com uma lista paralela de 9.
 *
 * Sem heading/Section/Container próprios — composição de página fica
 * para a Issue 15 (Home), que é quem decide título e espaçamento.
 */
export function RamoGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {ramos.map((ramo) => (
        <InsuranceCard key={ramo.slug} ramo={ramo} featured={ramo.slug === "auto"} />
      ))}
    </div>
  );
}
