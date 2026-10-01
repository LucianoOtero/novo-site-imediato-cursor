import { FAQ } from "@/components/shared/FAQ";
import type { CardSuhai, PerguntaSuhai } from "@/components/suhai/marca-suhai-conteudo";

export function CardsNumerados({
  titulo,
  texto,
  itens,
  nota,
  colunas = 2,
}: {
  titulo: string;
  texto?: string;
  itens: readonly CardSuhai[];
  nota?: string;
  colunas?: 2 | 3;
}) {
  const grade = colunas === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h2 className="max-w-3xl font-display text-3xl font-bold">{titulo}</h2>
      {texto ? <p className="mt-2 max-w-3xl text-[#2B261C]/80">{texto}</p> : null}
      <div className={`mt-8 grid gap-4 ${grade}`}>
        {itens.map((item, indice) => (
          <article key={item.titulo} className="rounded-2xl bg-white p-6">
            <p className="text-sm font-semibold text-[#1D2D0F]">0{indice + 1}</p>
            <h3 className="mt-2 text-lg font-semibold">{item.titulo}</h3>
            <p className="mt-2 text-sm text-[#2B261C]/80">{item.texto}</p>
          </article>
        ))}
      </div>
      {nota ? <p className="mt-4 max-w-3xl text-sm text-[#2B261C]/70">{nota}</p> : null}
    </section>
  );
}

export function PerguntasSuhai({ titulo, texto, itens }: { titulo: string; texto: string; itens: readonly PerguntaSuhai[] }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h2 className="font-display text-3xl font-bold">{titulo}</h2>
      <p className="mt-3 text-[#2B261C]/80">{texto}</p>
      <div className="mt-8">
        <FAQ items={[...itens]} />
      </div>
    </section>
  );
}
