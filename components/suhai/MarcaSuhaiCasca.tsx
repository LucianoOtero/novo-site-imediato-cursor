"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PRODUTOS_SUHAI } from "@/components/suhai/marca-suhai-produtos";
import { company } from "@/lib/company";
import { SITE_PRINCIPAL } from "@/lib/suhai-host";
import { seguradoraSuhai as suhai } from "@/lib/suhai/seguradora";
import { useWhatsappHref } from "@/lib/use-whatsapp-href";

const AJUDA = "Olá! Preciso de ajuda com o seguro Suhai.";

const ROTULO_MENU = { moto: "Seguro Moto", carro: "Seguro Carro", caminhao: "Seguro Caminhão" } as const;

function fora(href: string, children: ReactNode, className?: string) {
  return (
    <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export function MarcaSuhaiCasca({ children }: { children: ReactNode }) {
  const ajuda = useWhatsappHref(undefined, undefined, AJUDA);

  return (
    <div className="marca-suhai min-h-screen bg-[#EEEDE8] text-[#2B261C]">
      <style>{`
        .marca-suhai .bg-brand-500 { background-color: #B0F867; color: #1D2D0F; }
        .marca-suhai .text-brand-700,
        .marca-suhai .text-brand-600 { color: #1D2D0F; }
        .marca-suhai .bg-brand-50 { background-color: #F4FBE6; }
        .marca-suhai .border-brand-500,
        .marca-suhai .border-brand-100 { border-color: #1D2D0F; }
      `}</style>

      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/" className="shrink-0">
            <Image src="/marca-suhai/logo-dark.svg" alt={suhai.tradeName} width={110} height={48} priority />
          </Link>
          <p className="border-l border-[#1D2D0F]/25 pl-3 text-xs leading-tight text-[#2B261C]/80">
            Cotação com a
            <strong className="block text-sm text-[#1D2D0F]">{company.tradeName}</strong>
            corretora parceira
          </p>
        </div>
        <nav aria-label="Navegação principal" className="hidden items-center gap-6 text-sm lg:flex">
          {PRODUTOS_SUHAI.map((produto) => (
            <Link key={produto.slug} href={produto.href} className="hover:underline">
              {ROTULO_MENU[produto.slug]}
            </Link>
          ))}
        </nav>
        <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
          <a
            href={ajuda}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap text-sm font-semibold text-[#1D2D0F] underline-offset-2 hover:underline"
          >
            Preciso de ajuda agora
          </a>
          <a
            href="#cotacao"
            className="shrink-0 whitespace-nowrap rounded-lg bg-[#B0F867] px-3 py-2.5 text-sm font-semibold text-[#1D2D0F] sm:px-4"
          >
            Iniciar Cotação
          </a>
        </div>
      </header>

      {children}

      <footer className="bg-[#1D2D0F] text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:px-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#B0F867]">Fale conosco, estamos aqui pra ajudar você</h2>
            <div className="mt-6 space-y-4 text-sm">
              <p>
                <span className="block font-semibold">{company.tradeName}: cotação e proposta</span>
                <a className="underline" href={ajuda} target="_blank" rel="noopener noreferrer">
                  WhatsApp {company.contact.whatsappDisplay}
                </a>
                <span className="block text-white/70">{company.business.hoursDisplay}</span>
              </p>
            </div>
            <h3 className="mt-8 font-semibold text-[#B0F867]">Canais da {suhai.tradeName}</h3>
            <div className="mt-4 space-y-4 text-sm">
              <p>
                <span className="block font-semibold">Central de Atendimento</span>
                <a className="underline" href={`tel:${suhai.central.tel}`}>
                  {suhai.central.display}
                </a>
                <span className="block text-white/70">{suhai.horario}</span>
              </p>
              <p>
                <span className="block font-semibold">Aviso de roubo ou furto</span>
                {suhai.rouboFurto} · 24h
              </p>
              <p>
                <span className="block font-semibold">Atendimento ao segurado</span>
                Colisão e danos, ou boleto, apólice e assunto administrativo
                <span className="block text-white/70">{suhai.rouboFurto}</span>
                <span className="block text-white/70">{suhai.horario}</span>
              </p>
              <p>
                <span className="block font-semibold">Assistência 24h</span>
                Troca de pneu, guincho e auxílio mecânico
                <span className="block">
                  <a className="underline" href={`tel:${suhai.assistencia.tel}`}>
                    {suhai.assistencia.display}
                  </a>
                </span>
              </p>
              <p>
                <span className="block font-semibold">Ouvidoria</span>
                <a className="underline" href={`tel:${suhai.ouvidoria.tel}`}>
                  {suhai.ouvidoria.display}
                </a>
                {" · "}
                <a className="underline" href={`mailto:${suhai.ouvidoria.email}`}>
                  {suhai.ouvidoria.email}
                </a>
              </p>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-semibold">No site da Suhai</p>
            <ul className="mt-3 space-y-2">
              <li>{fora(`${suhai.site}/aviso-de-sinistro/`, "Abrir sinistro", "underline")}</li>
              <li>{fora(`${suhai.site}/perguntas-frequentes/`, "Perguntas frequentes", "underline")}</li>
            </ul>
            <div className="mt-8 space-y-3 text-white/75">
              <p>
                Site operado por {company.legalName}, CNPJ {company.cnpj}, corretora de seguros registrada na SUSEP sob
                o nº {company.susep}, parceira da {suhai.tradeName}.
              </p>
              <p>
                O seguro é emitido pela {suhai.legalName}, CNPJ {suhai.cnpj}, código SUSEP {suhai.susep}. A marca Suhai
                pertence à {suhai.tradeName}.
              </p>
              <p>
                {fora(`${SITE_PRINCIPAL}${company.legalUrls.privacyPolicy}`, "Política de privacidade", "underline")}
                {" · "}
                {fora(`${SITE_PRINCIPAL}${company.legalUrls.terms}`, "Termos de uso", "underline")}
              </p>
            </div>
            <p className="mt-8 text-white/60">
              © {new Date().getFullYear()} {company.tradeName}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
