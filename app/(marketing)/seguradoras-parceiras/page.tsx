import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Phone } from "lucide-react";

import { CTASection } from "@/components/cta/CTASection";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { company } from "@/lib/company";
import { buildPageMetadata } from "@/lib/metadata";
import { seguradoras } from "@/lib/seguradoras";

/**
 * `/seguradoras-parceiras` — lista das companhias parceiras com canais
 * de assistência 24h e área do cliente (nav "A Imediato" + link do
 * InsurersGrid). Contatos em `lib/seguradoras.ts` (pesquisa em canais
 * oficiais, 2026-08-01).
 */
export const metadata: Metadata = buildPageMetadata({
  title: `Seguradoras parceiras | ${company.tradeName}`,
  description: `Conheça as ${company.business.insurersCount} seguradoras parceiras da ${company.tradeName} e os canais de assistência 24h de cada companhia.`,
  path: "/seguradoras-parceiras",
});

export default function SeguradorasParceirasPage() {
  return (
    <>
      <Section>
        <Container className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Parceiras</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 md:text-4xl">
            Seguradoras parceiras
          </h1>
          <p className="mt-4 text-lg text-neutral-600">
            Comparamos condições entre {company.business.insurersCount} seguradoras registradas na SUSEP.
            Abaixo você encontra, para cada companhia, o canal de assistência 24h e o acesso à área do
            cliente — quando a marca disponibiliza portal público.
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
                  Em emergência, ligue direto para a seguradora
                </h2>
                <p>
                  Em caso de <strong>pane elétrica ou mecânica</strong>, falta de combustível, troca de
                  pneu, necessidade de guincho, chaveiro ou qualquer{" "}
                  <strong>acidente ou emergência coberta pela apólice</strong>, o caminho mais rápido é
                  acionar a <strong>central de assistência 24h da companhia seguradora</strong> — pelo
                  telefone, WhatsApp ou aplicativo indicados abaixo (e sempre confirmados na sua
                  apólice).
                </p>
                <p>
                  A central da seguradora já tem o processo, a rede de prestadores e a autorização do
                  serviço. Passar primeiro pelo corretor nesses momentos cria um{" "}
                  <strong>gargalo desnecessário</strong>: o corretor precisaria acionar a mesma central
                  por você, o que atrasa o atendimento quando cada minuto importa.
                </p>
                <p>
                  A {company.tradeName} continua à disposição para orientar, acompanhar o sinistro e
                  esclarecer dúvidas <strong>depois</strong> do socorro imediato — em horário comercial
                  ({company.business.hoursDisplay}) pelos nossos canais oficiais. Em emergência na
                  rua, priorize a seguradora.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seguradoras.map((s) => (
              <li
                key={s.slug}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-14 items-center justify-center rounded-lg bg-neutral-50 px-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- logos locais SVG já otimizados. */}
                  <img
                    src={s.logo}
                    alt=""
                    width={160}
                    height={48}
                    className="max-h-10 w-auto max-w-full object-contain grayscale"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <h2 className="mt-4 font-display text-lg font-bold text-neutral-900">{s.nome}</h2>

                <div className="mt-3 flex-1 space-y-2 text-sm text-neutral-700">
                  <p className="font-semibold text-neutral-500">Assistência 24h</p>
                  {s.assistancePhoneDisplay && s.assistancePhoneTel ? (
                    <a
                      href={`tel:${s.assistancePhoneTel}`}
                      className="inline-flex items-start gap-2 font-medium text-brand-700 underline-offset-2 hover:underline"
                    >
                      <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{s.assistancePhoneDisplay}</span>
                    </a>
                  ) : (
                    <p>Consulte o número na apólice ou no aplicativo da seguradora.</p>
                  )}
                  {s.assistanceNote && <p className="text-neutral-500">{s.assistanceNote}</p>}
                </div>

                {s.clientAreaUrl ? (
                  <a
                    href={s.clientAreaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                  >
                    Área do cliente
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-neutral-500">Área do cliente: consulte o app ou o site da marca.</p>
                )}
              </li>
            ))}
          </ul>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-neutral-500">
            Os telefones e links foram levantados em canais oficiais das seguradoras e podem mudar.
            Em caso de divergência, prevalecem a apólice, o cartão do segurado e os canais indicados
            pela companhia. Registro SUSEP da corretora: {company.susep}.
          </p>
        </Container>
      </Section>

      <CTASection
        ctaId="seguradoras-parceiras-cta"
        location="seguradoras_parceiras"
        heading="Quer cotar com essas seguradoras?"
        description="Um especialista compara as melhores condições para você, sem compromisso."
        showCotarButton
        showCallButton
      />
    </>
  );
}
