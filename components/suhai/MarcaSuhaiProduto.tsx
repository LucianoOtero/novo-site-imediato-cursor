"use client";

import Image from "next/image";

import { CardsNumerados, PerguntasSuhai } from "@/components/suhai/MarcaSuhaiBlocos";
import { PagamentoSuhaiCard } from "@/components/suhai/PagamentoSuhaiCard";
import { MarcaSuhaiCasca } from "@/components/suhai/MarcaSuhaiCasca";
import { CotacaoSuhaiExperiencia } from "@/components/suhai/CotacaoSuhaiExperiencia";
import {
  ASSISTENCIA,
  ASSISTENCIA_CAMINHAO,
  COBERTURAS,
  COBERTURAS_MOTO,
  FESTIVAL_MOTO,
  MOTIVOS_CAMINHAO,
  MOTIVOS_CARRO,
  MOTIVOS_MOTO,
  NOTA_PRECO,
  PASSOS,
  PERGUNTAS_CAMINHAO,
  PERGUNTAS_CARRO,
  PERGUNTAS_MOTO,
} from "@/components/suhai/marca-suhai-conteudo";
import { produtoSuhai, type ProdutoSuhaiSlug } from "@/components/suhai/marca-suhai-produtos";

const POR_SLUG = {
  moto: {
    coberturas: COBERTURAS_MOTO,
    coberturaTexto: "Roubo e furto, perda total, danos a terceiros e assistência 24h, no tamanho da sua rotina.",
    nota: "O preço nesta página sai de três planos: Essencial, Completo e Completo + Terceiros. A assistência da cotação é escolhida à parte: sem guincho, até 200 km ou até 500 km.",
    assistencia: null,
    motivos: MOTIVOS_MOTO,
    motivosTexto: "O seguro acompanha o estilo e a rotina de quem vive sobre duas rodas.",
    perguntas: PERGUNTAS_MOTO,
    perguntasTexto: "Tire as dúvidas de quem protege a moto e o bolso.",
  },
  carro: {
    coberturas: COBERTURAS,
    coberturaTexto: "Monte o plano do carro com o que faz sentido para rodar sem preocupação.",
    nota: NOTA_PRECO,
    assistencia: ASSISTENCIA,
    motivos: MOTIVOS_CARRO,
    motivosTexto: "O seguro se adapta à realidade do carro, no lazer ou no trabalho.",
    perguntas: PERGUNTAS_CARRO,
    perguntasTexto: "Respostas para escolher a proteção do carro com tranquilidade.",
  },
  caminhao: {
    coberturas: COBERTURAS,
    coberturaTexto: "Coberturas para o caminhão, a van ou o VUC que não pode parar.",
    nota: NOTA_PRECO,
    assistencia: ASSISTENCIA_CAMINHAO,
    motivos: MOTIVOS_CAMINHAO,
    motivosTexto: "O veículo é o instrumento de trabalho, e o plano respeita quem vive na estrada.",
    perguntas: PERGUNTAS_CAMINHAO,
    perguntasTexto: "Respostas para quem não pode perder tempo com o veículo parado.",
  },
} as const;

export function MarcaSuhaiProduto({ slug }: { slug: ProdutoSuhaiSlug }) {
  const produto = produtoSuhai(slug);
  const bloco = POR_SLUG[slug];

  return (
    <MarcaSuhaiCasca>
      <CotacaoSuhaiExperiencia
        cabecalho={(formulario) => (
          <div className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
            <section className="grid items-center gap-8 overflow-hidden rounded-[28px] bg-[#1D2D0F] lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-[280px] px-6 py-10 md:px-10 md:py-14">
                <Image
                  src={produto.imagem}
                  alt=""
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1024px) 60vw, 100vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(105deg,#1D2D0F_0%,rgba(29,45,15,0.88)_42%,rgba(29,45,15,0.2)_78%)]" />
                <div className="relative max-w-xl">
                  <h1 className="font-display text-4xl font-bold leading-[1.05] text-[#B0F867] md:text-5xl">
                    {produto.titulo}
                  </h1>
                  <p className="mt-4 max-w-md text-base text-white/90 md:text-lg">{produto.texto}</p>
                  <p className="mt-3 max-w-md text-sm text-white/80">{produto.paraQuem}</p>
                </div>
              </div>
              <div id="cotacao" className="scroll-mt-6 px-4 pb-6 lg:py-8 lg:pr-8 lg:pl-0">
                {formulario}
              </div>
            </section>
          </div>
        )}
      />

      <CardsNumerados
        titulo="Escolha e combine as coberturas do seu jeito"
        texto={bloco.coberturaTexto}
        itens={bloco.coberturas}
        nota={bloco.nota}
      />

      {bloco.assistencia ? (
        <CardsNumerados
          titulo="Assistência 24h para não ficar parado"
          texto="Proteção extra, com socorro em qualquer lugar do Brasil."
          itens={bloco.assistencia}
        />
      ) : null}

      <CardsNumerados titulo="Por que a Suhai" texto={bloco.motivosTexto} itens={bloco.motivos} />

      {slug === "moto" ? (
        <section className="mx-auto max-w-6xl px-4 py-4 md:px-6">
          <article className="rounded-2xl bg-white p-6">
            <p className="text-sm font-semibold text-[#1D2D0F]">Reputação</p>
            <h2 className="mt-2 font-display text-2xl font-bold">{FESTIVAL_MOTO.titulo}</h2>
            <p className="mt-2 text-sm text-[#2B261C]/80">{FESTIVAL_MOTO.texto}</p>
          </article>
        </section>
      ) : null}

      <PagamentoSuhaiCard variante="suhai" />

      <CardsNumerados
        titulo="Contratar o seguro da Suhai é simples e rápido"
        texto="Comece online, com total tranquilidade"
        itens={PASSOS}
        colunas={3}
      />

      <PerguntasSuhai
        titulo={slug === "moto" ? "Perguntas sobre o seguro de moto" : slug === "carro" ? "Perguntas sobre o seguro de carro" : "Perguntas sobre caminhão, van e VUC"}
        texto={bloco.perguntasTexto}
        itens={bloco.perguntas}
      />
    </MarcaSuhaiCasca>
  );
}
