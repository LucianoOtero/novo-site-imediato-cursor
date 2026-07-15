import type { ReactNode } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, ShieldAlert } from "lucide-react";

import { Container } from "@/components/ui/container";
import { CookiePreferencesLink } from "@/components/layout/CookiePreferencesLink";
import { FooterPhoneLink } from "@/components/layout/FooterPhoneLink";
import { FooterWhatsappLink } from "@/components/layout/FooterWhatsappLink";
import { WhatsAppIcon } from "@/components/shared/WhatsAppIcon";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "@/components/layout/social-icons";
import { aImediatoNavLinks, mainNavLinks, segurosNavLinks, type NavLink } from "@/components/layout/nav-data";
import { company } from "@/lib/company";

/**
 * Footer — rodapé institucional/legal (Issue 07).
 * Fonte: ESPECIFICACAO v3.md, seções 5 ("Footer: SUSEP · CNPJ · endereço ·
 * ouvidoria · legais · alerta de fraude"), 9 (cor de âncora `#0a2540` em
 * blocos como o footer) e 55 (fonte única `lib/company.ts` — zero
 * hardcode de dado institucional/regulatório/comercial).
 *
 * Server Component (seção 24: "Footer" está na lista de Server por
 * padrão) — partes interativas ("Preferências de cookies", links de
 * telefone que abrem o `ContactLeadModal`, integrações 2026-07-08) são
 * isoladas em Client Components próprios (`CookiePreferencesLink`,
 * `FooterPhoneLink`) para não forçar `"use client"` aqui.
 *
 * **Exceção — Ouvidoria (2026-07-15, decisão do cliente)**: o telefone
 * da Ouvidoria não abre o `ContactLeadModal` — vai direto para o
 * WhatsApp (`FooterWhatsappLink`, mesmo número normalizado para o
 * formato do `wa.me`), com o ícone do WhatsApp (`WhatsAppIcon`) no
 * lugar do ícone de telefone genérico.
 *
 * Nota: o texto do bloco de fraude é um resumo genérico, não a cópia
 * oficial do site atual — `docs/DADOS_OFICIAIS.md` marca o "texto oficial
 * do alerta de fraude" como ainda não confirmado (pendente Jurídico). A
 * página dedicada (`/alerta-de-fraude`, Issue 22) é responsável pelo texto
 * final; aqui o vermelho (`--color-alert`) não é usado, pois a
 * especificação reserva essa cor exclusivamente ao componente `FraudAlert`
 * (seção 29.3: "único uso do vermelho").
 *
 * **Logotipo (2026-07-08)**: substitui o texto `company.tradeName` que
 * fazia esse papel antes. O arquivo (`imediato-seguros-2026.svg`) tem o
 * texto "IMEDIATO SEGUROS" desenhado em azul escuro (`#003881`), quase
 * idêntico ao fundo escuro deste rodapé (`--color-brand-700: #0a2540`)
 * — ficaria praticamente invisível direto sobre o fundo. Por isso o
 * logo fica sobre um cartão branco arredondado, preservando as cores
 * originais do arquivo sem exigir uma variante clara/invertida.
 */
const footerLinkClass =
  "rounded-sm text-white/75 outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white/60";

export function Footer() {
  const year = new Date().getFullYear();
  const { address } = company;
  const fullAddress = `${address.street}, ${address.number}${address.floor ? ` — ${address.floor}` : ""}, ${address.district}, ${address.city}/${address.state} — CEP ${address.zipCode}`;

  return (
    <footer className="bg-brand-700 text-white">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="inline-flex rounded-lg bg-white p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG local com gradientes; next/image não otimiza SVG, sem benefício da chamada extra ao endpoint de otimização aqui. */}
            <img src="/logos/imediato-seguros-2026.svg" alt={company.tradeName} className="h-16 w-auto" />
          </div>
          <address className="mt-4 space-y-3 text-sm text-white/75 not-italic">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{fullAddress}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              <FooterPhoneLink
                phoneNumber={company.contact.phone}
                phoneDisplay={company.contact.phoneDisplay}
                location="footer"
                className={footerLinkClass}
              />
            </p>
            {company.contact.ombudsmanPhone && (
              <p className="flex items-center gap-2">
                <WhatsAppIcon className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  Ouvidoria:{" "}
                  <FooterWhatsappLink
                    phoneNumber={company.contact.ombudsmanPhone}
                    phoneDisplay={company.contact.ombudsmanPhoneDisplay ?? company.contact.ombudsmanPhone}
                    location="footer_ouvidoria"
                    className={footerLinkClass}
                  />
                </span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              <a href={`mailto:${company.contact.email}`} className={footerLinkClass}>
                {company.contact.email}
              </a>
            </p>
          </address>

          {company.social && (
            <div className="mt-5 flex gap-2">
              {company.social.facebook && (
                <SocialLink href={company.social.facebook} label="Facebook">
                  <FacebookIcon className="size-4" />
                </SocialLink>
              )}
              {company.social.instagram && (
                <SocialLink href={company.social.instagram} label="Instagram">
                  <InstagramIcon className="size-4" />
                </SocialLink>
              )}
              {company.social.linkedin && (
                <SocialLink href={company.social.linkedin} label="LinkedIn">
                  <LinkedinIcon className="size-4" />
                </SocialLink>
              )}
            </div>
          )}
        </div>

        <FooterNavColumn title="Seguros" links={segurosNavLinks} />
        <FooterNavColumn title="A Imediato" links={[...aImediatoNavLinks, ...mainNavLinks]} />

        <div>
          <h2 className="text-xs font-bold tracking-[0.16em] text-white/50 uppercase">Legal</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href={company.legalUrls.privacyPolicy} className={footerLinkClass}>
                Política de Privacidade
              </Link>
            </li>
            <li>
              <Link href={company.legalUrls.terms} className={footerLinkClass}>
                Termos de Uso
              </Link>
            </li>
            <li>
              <Link href={company.legalUrls.fraudAlert} className={footerLinkClass}>
                Alerta de Fraude
              </Link>
            </li>
            <li>
              <CookiePreferencesLink className={`text-left ${footerLinkClass}`} />
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex items-start gap-3 py-6 text-sm text-white/75">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Fique atento a golpes: desconfie de qualquer cobrança via PIX em nome da {company.tradeName}.{" "}
            <Link
              href={company.legalUrls.fraudAlert}
              className="rounded-sm font-medium text-white underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Saiba mais no alerta de fraude
            </Link>
            .
          </p>
        </Container>
      </div>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {company.legalName}. Todos os direitos reservados.
          </p>
          <p>
            CNPJ {company.cnpj} · SUSEP {company.susep}
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterNavColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h2 className="text-xs font-bold tracking-[0.16em] text-white/50 uppercase">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={footerLinkClass}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {children}
    </a>
  );
}
