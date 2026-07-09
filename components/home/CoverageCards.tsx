import Link from "next/link";
import {
  AppWindow,
  Car,
  CarFront,
  CarTaxiFront,
  CircleDot,
  Eye,
  Flame,
  Fuel,
  Hammer,
  HeartPulse,
  KeyRound,
  Lightbulb,
  LifeBuoy,
  Shield,
  ShieldAlert,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getRamo } from "@/lib/ramos";

/**
 * CoverageCards — coberturas principais (Home, Issue 15; generalizado
 * para LPs de ramo, Issue 16, seção 6.2 "Coberturas coberturas
 * filtradas").
 * Fonte: ESPECIFICACAO v3.md, seção 6.1 ("CoverageCards coberturas
 * principais (6 + link 'ver todas')").
 *
 * As coberturas em si vêm de `ramos.find(ramoSlug).coverages` (Issue
 * 05) — "auto" tem a lista completa e confirmada (`AUTO_COVERAGES`,
 * 16 itens); os demais ramos têm um rascunho genérico (2026-07-08).
 * Componente retorna `null` quando vazio.
 *
 * **Mostra todas as coberturas** (2026-07-09, pedido do cliente) — não
 * só as 6 primeiras como na versão anterior (wireframe original da
 * seção 6.1 previa só 6 + link "ver todas"; o cliente decidiu exibir a
 * lista completa direto na página). Link "ver todas" mantido mesmo
 * assim — aponta para `/coberturas` (hub dedicado, seção 4 do mapa do
 * site), página ainda não construída (issue futura), com mais contexto
 * por cobertura do que cabe aqui.
 *
 * **Ícone por cobertura** (2026-07-09, pedido do cliente: "pesquise
 * ícones svg que combinem com essas coberturas") — `COVERAGE_ICONS`
 * mapeia cada um dos 16 nomes de `AUTO_COVERAGES` a um ícone
 * `lucide-react` (mesma biblioteca já usada em todo o projeto)
 * semanticamente relacionado. Ramos além de "auto" têm nomes de
 * cobertura diferentes (ex.: "RCF (danos a terceiros)") — o ícone
 * genérico `Shield` continua sendo o fallback para qualquer nome fora
 * do mapa, em vez de deixar sem ícone.
 */
const COVERAGE_ICONS: Record<string, LucideIcon> = {
  Colisão: CarFront,
  "Roubo e furto": ShieldAlert,
  Incêndio: Flame,
  "Danos pessoais": HeartPulse,
  "Danos materiais": Hammer,
  "Assistência 24h": LifeBuoy,
  Chaveiro: KeyRound,
  Vidros: AppWindow,
  "Pane seca": Fuel,
  "Pane elétrica": Zap,
  "Pane mecânica": Wrench,
  Faróis: Lightbulb,
  Táxi: CarTaxiFront,
  Retrovisores: Eye,
  Pneus: CircleDot,
  "Carro reserva": Car,
};

export function CoverageCards({ ramoSlug }: { ramoSlug: string }) {
  const ramo = getRamo(ramoSlug);
  const coverages = ramo?.coverages ?? [];

  if (coverages.length === 0) return null;

  return (
    <Section>
      <Container>
        <h2 className="text-center font-display text-2xl font-bold text-neutral-900 md:text-3xl">Coberturas principais</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coverages.map((coverage) => {
            const Icon = COVERAGE_ICONS[coverage] ?? Shield;
            return (
              <div key={coverage} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4">
                <Icon className="size-5 shrink-0 text-brand-500" aria-hidden="true" />
                <span className="text-sm font-medium text-neutral-900">{coverage}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/coberturas"
            className="rounded-md text-sm font-medium text-brand-700 underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Ver todas as coberturas
          </Link>
        </div>
      </Container>
    </Section>
  );
}
