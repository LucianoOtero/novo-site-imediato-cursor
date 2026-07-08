import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
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
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">Seguradoras parceiras</h2>
          <p className="mt-2 text-neutral-500">
            Comparamos condições entre {company.business.insurersCount} seguradoras registradas na SUSEP para
            encontrar a melhor opção para você.
          </p>
        </div>

        {/*
          Tamanho do logo dobra no desktop (`md:h-20`, 80px vs. 40px no
          mobile/tablet) — a pedido do cliente (2026-07-08), que achou os
          logos pequenos demais na versão desktop. Mantém 6 por linha
          (`md:grid-cols-6`) — só o tamanho de cada logo aumenta, não a
          quantidade por linha. `gap-y` aumentado no desktop também, para
          dar respiro proporcional aos logos maiores.
        */}
        <div className="mt-10 grid grid-cols-3 items-center gap-x-6 gap-y-8 sm:grid-cols-4 md:grid-cols-6 md:gap-y-12">
          {seguradoras.map((seguradora) => (
            <div
              key={seguradora.slug}
              className="flex items-center justify-center grayscale transition-[filter] duration-[var(--dur-fast)] hover:grayscale-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- SVGs locais com dados rasterizados embutidos (até 341KB); next/image não otimiza SVG, e a chamada extra ao endpoint de otimização não traria benefício aqui. */}
              <img
                src={seguradora.logo}
                alt={seguradora.nome}
                loading="lazy"
                decoding="async"
                width={120}
                height={48}
                className="h-10 w-auto max-w-full object-contain md:h-20"
              />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/seguradoras-parceiras"
            className="rounded-md text-sm font-medium text-brand-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Ver todas as seguradoras parceiras
          </Link>
        </div>
      </Container>
    </Section>
  );
}
