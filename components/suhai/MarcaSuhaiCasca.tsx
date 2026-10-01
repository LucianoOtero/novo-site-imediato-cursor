"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { company } from "@/lib/company";
import { useWhatsappHref } from "@/lib/use-whatsapp-href";

const SUHAI = "https://suhaiseguradora.com";
const AJUDA = "Olá! Preciso de ajuda com o seguro Suhai.";

const MENU = [
  { href: `${SUHAI}/empresa/`, rotulo: "Institucional" },
  { href: `${SUHAI}/seguro-carro/`, rotulo: "Seguros" },
  { href: `${SUHAI}/aviso-de-sinistro/`, rotulo: "Área do Cliente" },
  { href: `${SUHAI}/blog/`, rotulo: "Blog" },
] as const;

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
        <a href="#cotacao" className="shrink-0">
          <Image src="/marca-suhai/logo-dark.svg" alt="Suhai Seguradora" width={110} height={48} priority />
        </a>
        <nav aria-label="Navegação principal" className="hidden items-center gap-6 text-sm lg:flex">
          {MENU.map((item) => fora(item.href, item.rotulo))}
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
                <span className="block font-semibold">WhatsApp</span>
                <a className="underline" href={ajuda} target="_blank" rel="noopener noreferrer">
                  {company.contact.whatsappDisplay}
                </a>
              </p>
              <p>
                <span className="block font-semibold">Central de Atendimento</span>
                <a className="underline" href="tel:08007721214">
                  0800-772-1214
                </a>
                <span className="block text-white/70">De segunda a sexta, das 8h às 19h</span>
              </p>
              <p>
                <span className="block font-semibold">Aviso de roubo ou furto</span>
                3003-0335 (SP e RJ) · 0800-784-2410 (demais regiões) · 24h
              </p>
              <p>
                <span className="block font-semibold">Atendimento ao segurado</span>
                Colisão e danos, ou boleto, apólice e assunto administrativo
                <span className="block text-white/70">3003-0335 (SP e RJ) · 0800-784-2410 (demais regiões)</span>
                <span className="block text-white/70">De segunda a sexta, das 8h às 19h</span>
              </p>
              <p>
                <span className="block font-semibold">Assistência 24h</span>
                Troca de pneu, guincho e auxílio mecânico
                <span className="block">
                  <a className="underline" href="tel:08003278424">
                    0800-327-8424
                  </a>
                </span>
              </p>
              <p>
                <span className="block font-semibold">Ouvidoria</span>
                <a className="underline" href="tel:08007721214">
                  0800-772-1214
                </a>
                {" · "}
                <a className="underline" href="mailto:ouvidoria@suhaiseguradora.com">
                  ouvidoria@suhaiseguradora.com
                </a>
              </p>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-semibold">No site da Suhai</p>
            <ul className="mt-3 space-y-2">
              <li>{fora(`${SUHAI}/aviso-de-sinistro/`, "Abrir sinistro", "underline")}</li>
              <li>{fora(`${SUHAI}/perguntas-frequentes/`, "Perguntas frequentes", "underline")}</li>
            </ul>
            <p className="mt-8 text-white/60">© 2026 Suhai Seguradora</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
