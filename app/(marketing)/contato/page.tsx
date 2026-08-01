import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Clock, Mail, MapPin, MessageCircle, Phone, ShieldAlert } from "lucide-react";

import { CallButton } from "@/components/cta/CallButton";
import { CTASection } from "@/components/cta/CTASection";
import { WhatsAppButton } from "@/components/cta/WhatsAppButton";
import { ContactForm } from "@/components/contact/ContactForm";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "@/components/layout/social-icons";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { company } from "@/lib/company";
import { buildPageMetadata } from "@/lib/metadata";
import { buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * `/contato` — canais oficiais + formulário (destino: `company.contact.formEmail`).
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Contato",
  description: `Fale com a ${company.tradeName}: telefone, WhatsApp, e-mail, ouvidoria, endereço em São Paulo e formulário de contato.`,
  path: "/contato",
});

function formatAddress(): string {
  const { street, number, floor, district, city, state, zipCode } = company.address;
  const floorPart = floor ? `, ${floor}` : "";
  return `${street}, ${number}${floorPart} — ${district}, ${city}/${state} — CEP ${zipCode}`;
}

export default function ContatoPage() {
  const mapsHref = company.google?.profileUrl;
  const hours = company.business.hoursDisplay;

  return (
    <>
      <Section>
        <Container className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Contato</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-neutral-900 md:text-4xl">
            Fale com a {company.tradeName}
          </h1>
          <p className="mt-4 text-lg text-neutral-700">
            Escolha o canal que preferir — telefone, WhatsApp, e-mail, ouvidoria ou o formulário abaixo.
            Em horário comercial nosso time responde com prioridade.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <WhatsAppButton location="contato" skipModal>
              WhatsApp {company.contact.whatsappDisplay}
            </WhatsAppButton>
            <CallButton location="contato" skipModal variant="secondary">
              Ligar {company.contact.phoneDisplay}
            </CallButton>
          </div>
        </Container>
      </Section>

      <Section tone="soft">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
                Canais oficiais
              </h2>
              <ul className="mt-8 space-y-6">
                <Channel
                  icon={<Phone className="size-5" aria-hidden="true" />}
                  title="Telefone"
                  detail={company.contact.phoneDisplay}
                  href={`tel:${company.contact.phone}`}
                />
                <Channel
                  icon={<MessageCircle className="size-5" aria-hidden="true" />}
                  title="WhatsApp"
                  detail={company.contact.whatsappDisplay}
                  href={buildWhatsappUrl(undefined, false)}
                  external
                />
                <Channel
                  icon={<Mail className="size-5" aria-hidden="true" />}
                  title="E-mail comercial"
                  detail={company.contact.email}
                  href={`mailto:${company.contact.email}`}
                />
                {company.contact.ombudsmanPhone && company.contact.ombudsmanPhoneDisplay && (
                  <Channel
                    icon={<Phone className="size-5" aria-hidden="true" />}
                    title="Ouvidoria"
                    detail={company.contact.ombudsmanPhoneDisplay}
                    href={`tel:${company.contact.ombudsmanPhone}`}
                  />
                )}
                {company.contact.emergencyPhone && company.contact.emergencyPhoneDisplay && (
                  <Channel
                    icon={<ShieldAlert className="size-5" aria-hidden="true" />}
                    title="Emergência (fora do horário)"
                    detail={company.contact.emergencyPhoneDisplay}
                    href={`tel:${company.contact.emergencyPhone}`}
                  />
                )}
                {hours && (
                  <li className="flex gap-3">
                    <span className="mt-0.5 text-brand-600">
                      <Clock className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-semibold text-neutral-900">Horário de atendimento</p>
                      <p className="mt-0.5 text-neutral-700">{hours}</p>
                    </div>
                  </li>
                )}
                <li className="flex gap-3">
                  <span className="mt-0.5 text-brand-600">
                    <MapPin className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-neutral-900">Endereço</p>
                    <p className="mt-0.5 text-neutral-700">{formatAddress()}</p>
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                      >
                        Ver no Google Maps
                      </a>
                    )}
                  </div>
                </li>
              </ul>

              {company.social && (
                <div className="mt-10">
                  <p className="text-sm font-semibold text-neutral-500">Redes sociais</p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {company.social.facebook && (
                      <SocialAnchor href={company.social.facebook} label="Facebook">
                        <FacebookIcon className="size-5" />
                      </SocialAnchor>
                    )}
                    {company.social.instagram && (
                      <SocialAnchor href={company.social.instagram} label="Instagram">
                        <InstagramIcon className="size-5" />
                      </SocialAnchor>
                    )}
                    {company.social.linkedin && (
                      <SocialAnchor href={company.social.linkedin} label="LinkedIn">
                        <LinkedinIcon className="size-5" />
                      </SocialAnchor>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-neutral-900 md:text-3xl">
                Envie uma mensagem
              </h2>
              <p className="mt-2 text-neutral-600">
                Preencha o formulário — a mensagem chega à nossa equipe administrativa.
              </p>
              <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:p-6">
                <ContactForm />
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <CTASection
        ctaId="contato-cta"
        location="contato"
        heading="Prefere cotar agora?"
        description="Compare opções entre as seguradoras parceiras com atendimento humano do início ao fim."
        showCotarButton
        showCallButton
      />
    </>
  );
}

function Channel({
  icon,
  title,
  detail,
  href,
  external,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href: string;
  external?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 text-brand-600">{icon}</span>
      <div>
        <p className="font-semibold text-neutral-900">{title}</p>
        <a
          href={href}
          className="mt-0.5 text-brand-700 underline-offset-2 hover:underline"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {detail}
        </a>
      </div>
    </li>
  );
}

function SocialAnchor({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition-colors hover:text-brand-700"
    >
      {children}
      <span>{label}</span>
    </a>
  );
}
