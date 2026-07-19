import Image from "next/image";
import {
  Briefcase,
  CalendarClock,
  ClipboardList,
  FileText,
  FileWarning,
  Home,
  LifeBuoy,
  Package,
  PackageCheck,
  Phone,
  Receipt,
  Scale,
  Shield,
  ShieldCheck,
  Siren,
  Smartphone,
  Stethoscope,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { getRamo } from "@/lib/ramos";

/**
 * CoverageCards — coberturas principais (Home, Issue 15; generalizado
 * para LPs de ramo, Issue 16, seção 6.2 "Coberturas coberturas
 * filtradas").
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("CoverageCards coberturas
 * principais (6 + link 'ver todas')").
 *
 * As coberturas em si vêm de `ramos.find(ramoSlug).coverages` (Issue
 * 05). **Mostra todas as coberturas** (2026-07-09, pedido do cliente) em
 * grid fixo de 4 colunas — ver histórico completo no git.
 *
 * Versão visual v2 — Fase 5 (2026-07-19, aprovada pelo cliente): as 16
 * coberturas do ramo Auto ganharam ícones 3D exclusivos no estilo da
 * marca (renders navy/azul via Higgsfield MCP, `COVERAGE_ICON_SRC` →
 * `/public/icons-3d/cov-*.webp`, ~4 KB cada, lazy). As coberturas dos
 * demais ramos (rascunho genérico) continuam com o fallback Lucide
 * (`COVERAGE_ICONS`) até o set 3D ser estendido a elas.
 */
const COVERAGE_ICON_SRC: Record<string, string> = {
  Colisão: "/icons-3d/cov-colisao.webp",
  "Roubo e furto": "/icons-3d/cov-roubo.webp",
  Incêndio: "/icons-3d/cov-incendio.webp",
  "Danos pessoais": "/icons-3d/cov-danos-pessoais.webp",
  "Danos materiais": "/icons-3d/cov-danos-materiais.webp",
  "Assistência 24h": "/icons-3d/cov-assistencia.webp",
  Chaveiro: "/icons-3d/cov-chaveiro.webp",
  Vidros: "/icons-3d/cov-vidros.webp",
  "Pane seca": "/icons-3d/cov-pane-seca.webp",
  "Pane elétrica": "/icons-3d/cov-pane-eletrica.webp",
  "Pane mecânica": "/icons-3d/cov-pane-mecanica.webp",
  Faróis: "/icons-3d/cov-farois.webp",
  Táxi: "/icons-3d/cov-taxi.webp",
  Retrovisores: "/icons-3d/cov-retrovisores.webp",
  Pneus: "/icons-3d/cov-pneus.webp",
  "Carro reserva": "/icons-3d/cov-carro-reserva.webp",
};

/** Fallback Lucide para coberturas ainda sem ícone 3D (ramos além de auto). */
const COVERAGE_ICONS: Record<string, LucideIcon> = {
  "RCF (danos a terceiros)": Scale,
  "RCF-V (danos a terceiros)": Scale,
  "Reposição de acessórios": PackageCheck,
  "Casco (colisão, roubo e incêndio)": ShieldCheck,
  "Carga transportada (opcional)": Package,
  "Assistência 24h para veículos pesados": LifeBuoy,
  "Assistência 24h para toda a frota": LifeBuoy,
  "Cobertura para uso por aplicativo": Smartphone,
  "Danos a passageiros": Users,
  "Uso profissional coberto": Briefcase,
  "Gestão centralizada de apólices": FileText,
  "Consultas em rede credenciada": Stethoscope,
  "Emergência veterinária 24h": Siren,
  "Exames básicos": ClipboardList,
  "Orientação veterinária por telefone": Phone,
  "Aluguéis em atraso": CalendarClock,
  "Multas contratuais": FileWarning,
  "Danos ao imóvel": Home,
  "Encargos condominiais e de consumo (conforme plano)": Receipt,
  Guincho: Truck,
};

export function CoverageCards({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  const coverages = ramo?.coverages ?? [];

  if (coverages.length === 0) return null;

  return (
    <Section>
      <Container>
        <SectionHeader eyebrow="Proteção completa" title="Coberturas principais" />
        <div className="mt-12 grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {coverages.map((coverage) => {
            const iconSrc = COVERAGE_ICON_SRC[coverage];
            const Icon = COVERAGE_ICONS[coverage] ?? Shield;
            return (
              <div
                key={coverage}
                className="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 text-center shadow-[0_1px_2px_rgba(11,31,58,0.06)] transition-all duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-[0_6px_20px_rgba(11,31,58,0.08)]"
              >
                {iconSrc ? (
                  <Image
                    src={iconSrc}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 transition-transform duration-200 group-hover:scale-110"
                    aria-hidden="true"
                  />
                ) : (
                  <Icon className="size-7 shrink-0 text-brand-500" aria-hidden="true" />
                )}
                <span className="text-sm leading-tight font-medium text-neutral-900">{coverage}</span>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
