"use client";

import Script from "next/script";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";

const PERFIL_RA = "https://www.reclameaqui.com.br/empresa/suhai-seguradora/";

const FRASE =
  "A Suhai ainda não tem o nome das seguradoras tradicionais. No Reclame Aqui a reputação dela é pública, e em vários períodos fica à frente de marcas muito maiores. O selo mostra o retrato de agora.";

type SeloRaConfig = {
  src: string;
  id?: string;
  atributos?: Record<string, string>;
};

/**
 * Script oficial do painel da Suhai (compartilhar reputação ou selo).
 * Vazio: o bloco fica só com a frase e o link, sem pedido ao Reclame Aqui.
 */
export const SELO_RA: SeloRaConfig | null = null;

function SeloReclameAqui({ selo }: { selo: SeloRaConfig }) {
  return (
    <div className="mt-6 min-h-22.5">
      <Script id={selo.id ?? "selo-ra-suhai"} src={selo.src} strategy="lazyOnload" {...selo.atributos} />
    </div>
  );
}

function LinkPerfil({ className }: { className: string }) {
  return (
    <a href={PERFIL_RA} target="_blank" rel="noopener noreferrer" className={className}>
      Ver a Suhai no Reclame Aqui
    </a>
  );
}

export function ReputacaoSuhaiCard({ variante }: { variante: "suhai" | "imediato" }) {
  if (variante === "imediato") {
    return (
      <Section id="reputacao-suhai" tone="soft" className="py-16 md:py-20">
        <Container className="mx-auto max-w-3xl">
          <SectionHeader
            align="left"
            eyebrow="A seguradora"
            title="A Suhai é menos conhecida. A reputação dela é pública."
          />
          <article className="mt-8 rounded-2xl bg-white p-6 shadow-sm md:p-8">
            <p className="text-base text-neutral-700">{FRASE}</p>
            <LinkPerfil className="mt-4 inline-block text-sm font-semibold text-neutral-900 underline underline-offset-2" />
            {SELO_RA ? <SeloReclameAqui selo={SELO_RA} /> : null}
          </article>
        </Container>
      </Section>
    );
  }

  return (
    <section id="reputacao-suhai" className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <article className="rounded-2xl bg-white p-6 md:p-8">
        <h2 className="font-display text-2xl font-bold text-[#1D2D0F] md:text-3xl">
          Uma seguradora mais nova, com atendimento à vista de todo mundo
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-[#2B261C]/80 md:text-base">{FRASE}</p>
        <LinkPerfil className="mt-4 inline-block text-sm font-semibold text-[#1D2D0F] underline underline-offset-2" />
        {SELO_RA ? <SeloReclameAqui selo={SELO_RA} /> : null}
      </article>
    </section>
  );
}
