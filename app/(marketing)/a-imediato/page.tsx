import type { Metadata } from "next";
import Link from "next/link";

import { CTASection } from "@/components/cta/CTASection";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { company } from "@/lib/company";
import { buildPageMetadata } from "@/lib/metadata";
import { team } from "@/lib/team";

/**
 * `/a-imediato` — página institucional "Sobre" (mapa do site, seção 4;
 * wireframe seção 6: história · números · SUSEP/CNPJ · valores · CTA).
 * Link "Sobre" em `components/layout/nav-data.ts`.
 *
 * Conteúdo só com dados confirmados em `lib/company.ts` /
 * `docs/DADOS_OFICIAIS.md` — sem biografia inventada.
 */
export const metadata: Metadata = buildPageMetadata({
  title: `Sobre a ${company.tradeName}`,
  description: `Conheça a ${company.tradeName}: corretora com ${company.business.yearsExperience}+ anos, registro SUSEP ${company.susep}, comparando ${company.business.insurersCount} seguradoras.`,
  path: "/a-imediato",
});

function formatAddress(): string {
  const { street, number, floor, district, city, state, zipCode } = company.address;
  const floorPart = floor ? ` — ${floor}` : "";
  return `${street}, ${number}${floorPart}, ${district}, ${city}/${state} — CEP ${zipCode}`;
}

const highlights = [
  {
    value: `${company.business.yearsExperience}+`,
    label: "anos de experiência",
  },
  {
    value: String(company.business.insurersCount),
    label: "seguradoras parceiras",
  },
  {
    value: company.business.googleRating.toFixed(1).replace(".", ","),
    label: `no Google · +${company.business.googleReviewsCount.toLocaleString("pt-BR")} avaliações`,
  },
  {
    value: String(team.length),
    label: "especialistas na equipe",
  },
] as const;

export default function AImediatoPage() {
  return (
    <>
      <Section>
        <Container className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">A Imediato</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 md:text-4xl">
            Sobre a {company.tradeName}
          </h1>
          <div className="mt-6 space-y-4 text-lg text-neutral-700">
            <p>
              Atuamos como corretores de seguros, intermediando companhias registradas na SUSEP — sem checkout
              online nem contratação automática. Toda cotação termina em atendimento humano.
            </p>
            <p>
              Com {company.business.yearsExperience}+ anos de atuação, comparamos condições entre{" "}
              {company.business.insurersCount} seguradoras parceiras para encontrar a melhor opção para o seu
              perfil, com apoio do início ao fim.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <h2 className="text-center font-display text-2xl font-bold text-neutral-900 md:text-3xl">Em números</h2>
          <dl className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            {highlights.map((item) => (
              <div key={item.label} className="text-center">
                <dt className="font-display text-3xl font-bold text-brand-700 md:text-4xl">{item.value}</dt>
                <dd className="mt-1 text-sm text-neutral-500">{item.label}</dd>
              </div>
            ))}
          </dl>
          {company.business.satisfactionRate != null && (
            <p className="mt-8 text-center text-neutral-600">
              {company.business.satisfactionRate}% de clientes satisfeitos
            </p>
          )}
        </Container>
      </Section>

      <Section>
        <Container className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">Dados oficiais</h2>
          <dl className="mt-6 space-y-3 text-neutral-700">
            <div>
              <dt className="text-sm font-semibold text-neutral-500">Razão social</dt>
              <dd>{company.legalName}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-neutral-500">CNPJ</dt>
              <dd>{company.cnpj}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-neutral-500">Registro SUSEP</dt>
              <dd>{company.susep}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-neutral-500">Endereço</dt>
              <dd>{formatAddress()}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-neutral-500">Horário</dt>
              <dd>{company.business.hoursDisplay}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-neutral-500">Contato</dt>
              <dd>
                {company.contact.phoneDisplay} · {company.contact.email}
                {company.contact.ombudsmanPhoneDisplay && (
                  <>
                    {" "}
                    · Ouvidoria {company.contact.ombudsmanPhoneDisplay}
                  </>
                )}
              </dd>
            </div>
          </dl>

          <p className="mt-8 text-neutral-600">
            Conheça também a{" "}
            <Link href="/equipe" className="font-semibold text-brand-700 underline-offset-2 hover:underline">
              nossa equipe
            </Link>{" "}
            e o{" "}
            <Link
              href={company.legalUrls.fraudAlert}
              className="font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              alerta de fraude
            </Link>
            .
          </p>
        </Container>
      </Section>

      <CTASection
        ctaId="a-imediato-cta"
        location="a_imediato"
        heading="Receba sua cotação hoje"
        description="Um especialista compara as melhores condições para você, sem compromisso."
        showCotarButton
        showCallButton
      />
    </>
  );
}
