import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { CTASection } from "@/components/cta/CTASection";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { coberturasAuto } from "@/lib/coberturas-auto";
import { company } from "@/lib/company";
import { buildPageMetadata } from "@/lib/metadata";

/**
 * `/coberturas` — hub de coberturas de Seguro Auto (mapa do site seção 4;
 * 16 itens confirmados em `lib/ramos.ts` / `lib/coberturas-auto.ts`).
 * Link no menu principal (`nav-data.ts`).
 */
export const metadata: Metadata = buildPageMetadata({
  title: `Coberturas de Seguro Auto | ${company.tradeName}`,
  description: `Conheça as principais coberturas de seguro de automóvel: colisão, roubo, assistência 24h, vidros, carro reserva e mais. Compare com a ${company.tradeName}.`,
  path: "/coberturas",
});

export default function CoberturasPage() {
  return (
    <>
      <Section>
        <Container className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Seguro Auto</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 md:text-4xl">
            Coberturas de seguro de automóvel
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            Esta página reúne as principais coberturas e assistências tipicamente oferecidas no{" "}
            <strong>seguro de automóvel</strong> — as mesmas que destacamos nas cotações de{" "}
            <Link href="/seguro-auto" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
              Seguro Auto
            </Link>
            . Use-a como guia de referência antes de conversar com um especialista.
          </p>
        </Container>
      </Section>

      <Section tone="soft">
        <Container className="mx-auto max-w-3xl">
          <div
            role="note"
            className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-6 text-amber-950 md:px-8 md:py-7"
          >
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 size-6 shrink-0 text-amber-700" aria-hidden="true" />
              <div className="space-y-3">
                <h2 className="font-display text-xl font-bold md:text-2xl">
                  Leia a apólice e as Condições Gerais com atenção
                </h2>
                <p>
                  As coberturas <strong>variam de seguradora para seguradora</strong> e de plano para
                  plano. A apólice <strong>pode ou não incluir</strong> cada item abaixo — e, quando
                  inclui, os limites, franquias, carências e exclusões mudam.
                </p>
                <p>
                  Antes de contar com qualquer proteção,{" "}
                  <strong>examine profundamente a apólice e as Condições Gerais</strong> do seguro
                  contratado (ou da proposta em análise). Em dúvida, fale com um especialista da{" "}
                  {company.tradeName}: ajudamos a interpretar o que está (e o que não está) coberto.
                </p>
                <p className="text-sm text-amber-900/90">
                  As descrições desta página são ilustrativas, para facilitar o entendimento. Não
                  substituem o texto contratual da companhia seguradora.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
            O que cada cobertura costuma abranger
          </h2>
          <p className="mt-2 max-w-2xl text-neutral-600">
            {coberturasAuto.length} itens do Seguro Auto. Toque ou role para ler a descrição de cada um.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {coberturasAuto.map((c) => (
              <li
                key={c.name}
                id={c.name
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .replace(/\s+/g, "-")}
                className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <Image
                  src={c.iconSrc}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-display text-lg font-bold text-neutral-900">{c.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{c.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-neutral-500">
            Precisa de assistência em emergência com a apólice já emitida? Acione a central 24h da{" "}
            <Link
              href="/seguradoras-parceiras"
              className="font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              seguradora parceira
            </Link>
            , não o corretor primeiro.
          </p>
        </Container>
      </Section>

      <CTASection
        ctaId="coberturas-cta"
        location="coberturas"
        heading="Compare coberturas na sua cotação"
        description="Um especialista mostra o que cada seguradora inclui no seu perfil — sem compromisso."
        showCotarButton
        showCallButton
        ramo="auto"
      />
    </>
  );
}
