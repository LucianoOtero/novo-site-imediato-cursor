import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";

/**
 * Como o prêmio chega na Suhai. Os fatos são os mesmos nas duas vozes.
 * A landing no visual da Suhai descreve o processo. A cotação no visual
 * da Imediato deixa a intermediação explícita.
 */
export function PagamentoSuhaiCard({ variante }: { variante: "suhai" | "imediato" }) {
  if (variante === "imediato") {
    return (
      <Section tone="soft" className="py-16 md:py-20">
        <Container className="mx-auto max-w-3xl">
          <SectionHeader align="left" eyebrow="Pagamento" title="A Imediato cota. O pagamento é da Suhai." />
          <article className="mt-8 rounded-2xl bg-white p-6 shadow-sm md:p-8">
            <p className="text-base text-neutral-700">
              A Imediato cota e acompanha. O pagamento é feito direto para a Suhai, e não na conta da Imediato
              Seguros. Nesta página a proposta segue no boleto, em até 12 parcelas conforme o plano. Depois do
              envio, a nossa equipe acompanha a emissão da apólice e manda o boleto da 1ª parcela.
            </p>
          </article>
        </Container>
      </Section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <article className="rounded-2xl bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl font-bold text-[#1D2D0F] md:text-3xl">
          O pagamento vai direto para a Suhai
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-[#2B261C]/80 md:text-base">
          O prêmio é pago para a Suhai, e não para a conta de nenhum corretor. Nesta página a proposta segue no
          boleto, em até 12 parcelas conforme o plano. Depois do envio, a equipe da Imediato Seguros, corretora
          parceira, acompanha a emissão da apólice e manda o boleto da 1ª parcela.
        </p>
      </article>
    </section>
  );
}
