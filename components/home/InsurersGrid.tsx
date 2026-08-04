import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { company } from "@/lib/company";
import { seguradoras } from "@/lib/seguradoras";

/**
 * InsurersGrid — grade de logos das seguradoras parceiras (Home, Issue 15;
 * implementado na extensão de 2026-07-03, ver `docs/BACKLOG.md`).
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("InsurersGrid logos cinza →
 * cor no hover").
 *
 * Ficou fora da Home original (Issue 15) por falta dos assets reais —
 * os 18 logos foram baixados diretamente do site de produção nesta
 * rodada (arquivos públicos, ver `docs/BRAND_ASSETS.md` e
 * `lib/seguradoras.ts`) e salvos em `/public/logos/seguradoras/`.
 *
 * `company.business.insurersCount` (confirmado pelo cliente em
 * 2026-07-03) é usado no subtítulo, mantendo a contagem como fonte
 * única de verdade — não duplicado como número mágico aqui.
 *
 * Correção (2026-07-03, verificação adicional no site legado real via
 * CDP): a suposição inicial de que "nenhum logo tem versão colorida"
 * estava **incorreta**. 10 dos 18 arquivos são vetores puros já cinza
 * (Porto, Bradesco, Azul, Itaú, HDI, Tokio, Sompo, Mapfre, Liberty,
 * Allianz), mas os outros 8 (Loovi, Pier, Justos, Darwin, Usebens, Novo
 * Seguros, Youse, Ezze) embutem uma imagem rasterizada **com a cor
 * original da marca** — o site legado usa `filter: grayscale(1)` via
 * CSS para uniformizar visualmente todos os 18 como cinza (confirmado
 * inspecionando o CSS computado ao vivo). Por isso o grid abaixo aplica
 * `grayscale` por padrão e remove no hover (`hover:grayscale-0`): revela
 * cor de verdade nos 8 logos com imagem colorida embutida, e não tem
 * efeito visual nos 10 vetores já cinza (grayscale de cinza = o mesmo
 * cinza) — comportamento final mais próximo da spec ("cinza → colorido
 * no hover") do que a primeira versão deste componente.
 */
export function InsurersGrid() {
  return (
    <Section className="bg-neutral-50">
      <Container>
        <SectionHeader
          eyebrow="Rede de parceiras"
          title="Seguradoras parceiras"
          description={`Comparamos condições entre ${company.business.insurersCount} seguradoras registradas na SUSEP para encontrar a melhor opção para você.`}
        />

        {/*
          Colunas só em divisores de 21: 3 no mobile (7×3) e 7 a partir
          de `md` (3×7). Cada célula usa aspect 2/1 + object-contain; os
          SVGs foram normalizados para o mesmo aspect com o desenho
          centralizado — assim a linha óptica fica homogênea.
        */}
        <div className="mt-10 grid grid-cols-3 items-center gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-7 md:gap-x-5 md:gap-y-10">
          {seguradoras.map((seguradora) => (
            <Link
              key={seguradora.slug}
              href="/seguradoras-parceiras"
              aria-label={`${seguradora.nome} — dados detalhados das seguradoras parceiras`}
              className="flex aspect-[2/1] w-full items-center justify-center rounded-md grayscale brightness-[0.72] contrast-[1.15] transition-[filter] duration-[var(--dur-fast)] outline-none hover:grayscale-0 hover:brightness-100 hover:contrast-100 focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- SVGs locais com dados rasterizados embutidos (até 341KB); next/image não otimiza SVG, e a chamada extra ao endpoint de otimização não traria benefício aqui. */}
              <img
                src={seguradora.logo}
                alt={seguradora.nome}
                loading="lazy"
                decoding="async"
                width={200}
                height={100}
                className="h-full w-full object-contain"
              />
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/seguradoras-parceiras"
            className="rounded-md text-sm font-medium text-brand-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Dados detalhados das Seguradoras
          </Link>
        </div>
      </Container>
    </Section>
  );
}
