"use client";

import Image from "next/image";
import Link from "next/link";

import { CardsNumerados, PerguntasSuhai } from "@/components/suhai/MarcaSuhaiBlocos";
import { PagamentoSuhaiCard } from "@/components/suhai/PagamentoSuhaiCard";
import { MarcaSuhaiCasca } from "@/components/suhai/MarcaSuhaiCasca";
import { CotacaoSuhaiExperiencia } from "@/components/suhai/CotacaoSuhaiExperiencia";
import { ASSISTENCIA, COBERTURAS, NOTA_PRECO, PASSOS, PERGUNTAS_HOME } from "@/components/suhai/marca-suhai-conteudo";
import { PRODUTOS_SUHAI } from "@/components/suhai/marca-suhai-produtos";

const PILARES = [
  { titulo: "Seguro Essencial", texto: "Contrate apenas o que você precisa, com valor que cabe no seu bolso" },
  { titulo: "Preço Acessível", texto: "Seguro de verdade, com preços até 60% mais acessíveis que a média do mercado" },
  {
    titulo: "Alta aceitação",
    texto: "Do mais antigo ao mais novo, de híbridos e elétricos a modificados e de leilão, da moto ao caminhão: a Suhai protege seu veículo.",
  },
  { titulo: "Atendimento Acolhedor", texto: "Conte com o suporte do nosso time, 24 horas por dia, 7 dias por semana" },
  {
    titulo: "É seguro de verdade, não é proteção veicular",
    texto: "A Suhai é uma seguradora regulamentada pela SUSEP, o que significa garantia, confiança e tranquilidade quando você mais precisa",
  },
  {
    titulo: "Contratação 100% online",
    texto: "Resolva tudo pelo celular ou pelo computador, de forma rápida e segura, sem papelada",
  },
] as const;

export function MarcaSuhaiLanding() {
  return (
    <MarcaSuhaiCasca>
      <CotacaoSuhaiExperiencia
        cabecalho={(formulario) => (
          <div className="mx-auto max-w-6xl px-4 pb-8 md:px-6">
            <section className="grid items-center gap-8 overflow-hidden rounded-[28px] bg-[#1D2D0F] lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative min-h-[280px] px-6 py-10 md:px-10 md:py-14">
                <Image
                  src="/marca-suhai/hero.webp"
                  alt=""
                  fill
                  priority
                  className="object-cover object-right"
                  sizes="(min-width: 1024px) 60vw, 100vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(105deg,#1D2D0F_0%,rgba(29,45,15,0.88)_42%,rgba(29,45,15,0.2)_78%)]" />
                <div className="relative max-w-xl">
                  <h1 className="font-display text-4xl font-bold leading-[1.05] text-[#B0F867] md:text-5xl">
                    Seguro essencial para o seu carro, moto ou caminhão
                  </h1>
                  <p className="mt-4 max-w-md text-base text-white/90 md:text-lg">
                    Na Suhai, o seguro é simples e feito pra quem quer tranquilidade sem pagar mais por isso.
                  </p>
                </div>
              </div>
              <div id="cotacao" className="scroll-mt-6 px-4 pb-6 lg:py-8 lg:pr-8 lg:pl-0">
                {formulario}
              </div>
            </section>
          </div>
        )}
      />

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <h2 className="max-w-xl font-display text-3xl font-bold md:text-4xl">
          Cada veículo tem suas necessidades. A Suhai entende todas elas
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUTOS_SUHAI.map((produto) => (
            <Link
              key={produto.slug}
              href={produto.href}
              className="relative flex min-h-[500px] overflow-hidden rounded-lg bg-[#B0F867]"
            >
              <span className="absolute inset-0 overflow-hidden">
                <Image
                  src={produto.imagem}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
              </span>
              <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(176,248,103,0)_27.885%,rgba(176,248,103,0.95)_85.577%)]" />
              <span className="relative z-[1] mt-auto flex min-w-0 flex-col gap-3 p-6 lg:p-10">
                <h3 className="font-display text-2xl font-bold leading-tight text-[#1D2D0F] lg:text-[2rem]">
                  {produto.titulo}
                </h3>
                <p className="text-base font-semibold text-[#1D2D0F] lg:text-xl">{produto.texto}</p>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <CardsNumerados
        titulo="Escolha e combine as coberturas do seu jeito"
        texto="Roubo e furto, perda total, danos a terceiros e a opção mais ampla, com conserto de batida menor."
        itens={COBERTURAS}
        nota={NOTA_PRECO}
      />

      <CardsNumerados
        titulo="Assistência 24h para não ficar parado"
        texto="Proteção extra, com socorro em qualquer lugar do Brasil."
        itens={ASSISTENCIA}
      />

      <PagamentoSuhaiCard variante="suhai" />

      <CardsNumerados
        titulo="Contratar o seguro da Suhai é simples e rápido"
        texto="Comece online, com total tranquilidade"
        itens={PASSOS}
        colunas={3}
      />

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <h2 className="max-w-3xl font-display text-3xl font-bold">
          A Suhai Seguradora nasceu com um objetivo claro: tornar o seguro mais justo e acessível
        </h2>
        <p className="mt-4 max-w-3xl text-[#2B261C]/80">
          Desde 2013, evoluímos nossas soluções para proteger motos, carros e caminhões, com planos simples,
          acessíveis e alinhados à realidade de quem usa o veículo todos os dias.
        </p>
        <p className="mt-3 max-w-3xl text-[#2B261C]/80">
          Da moto ao caminhão, do 0km ao usado, a Suhai cuida do que é seu em todas as fases.
        </p>
        <p className="mt-3 max-w-3xl text-[#2B261C]/80">
          Desde 2013, mais de 1,5 milhão de clientes. A Suhai é regulada pela SUSEP e publica preços até 60% mais
          acessíveis que a média do mercado.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILARES.map((pilar, indice) => (
            <article key={pilar.titulo} className="rounded-2xl bg-white p-6">
              <p className="text-sm font-semibold text-[#1D2D0F]">0{indice + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{pilar.titulo}</h3>
              <p className="mt-2 text-sm text-[#2B261C]/80">{pilar.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <PerguntasSuhai
        titulo="Quer entender melhor como o seguro Suhai funciona?"
        texto="Veja as respostas para as dúvidas mais comuns e descubra como é fácil garantir a proteção ideal para o seu dia a dia."
        itens={PERGUNTAS_HOME}
      />
    </MarcaSuhaiCasca>
  );
}
