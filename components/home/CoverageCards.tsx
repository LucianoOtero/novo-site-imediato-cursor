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
 * lista completa direto na página). Link "ver todas as coberturas"
 * removido no mesmo dia — perdeu o sentido depois que a lista completa
 * passou a ser exibida direto aqui (não é mais um link para uma
 * página com "o resto" da lista). O item de navegação "Coberturas" do
 * Header/Footer (apontando para `/coberturas`, hub ainda não
 * construído) é outro link, fora do escopo desta remoção.
 *
 * **Ícone por cobertura** (2026-07-09, pedido do cliente: "pesquise
 * ícones svg que combinem com essas coberturas") — `COVERAGE_ICONS`
 * mapeia cada um dos 16 nomes de `AUTO_COVERAGES` a um ícone
 * `lucide-react` (mesma biblioteca já usada em todo o projeto)
 * semanticamente relacionado. Ramos além de "auto" têm nomes de
 * cobertura diferentes (ex.: "RCF (danos a terceiros)") — o ícone
 * genérico `Shield` continua sendo o fallback para qualquer nome fora
 * do mapa, em vez de deixar sem ícone.
 *
 * **Layout do card (2026-07-09, pedido do cliente, agora com 16 itens
 * visíveis)**: grid fixo de 4 colunas em qualquer largura (antes 1 no
 * mobile → 2 → 3), para caber as 16 coberturas em 4 linhas mesmo no
 * mobile. Isso deixa cada card bem mais estreito, então o conteúdo
 * mudou de horizontal (ícone ao lado do texto) para vertical (ícone
 * acima, texto abaixo, centralizado) — texto ao lado do ícone não
 * caberia numa coluna estreita. `gap`/`padding` reduzidos (`gap-2`/
 * `p-2.5`, antes `gap-4`/`p-4`) para sobrar espaço de conteúdo com 4
 * colunas; `min-h-28` dá altura mínima para o card ficar mais
 * "quadrado" (antes bem mais largo que alto, com ícone+texto numa só
 * linha). Ícone (`size-7`, antes `size-5`) e texto (`text-sm` com
 * `leading-tight`, antes só `text-sm`) aumentados.
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
        <div className="mt-10 grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {coverages.map((coverage) => {
            const Icon = COVERAGE_ICONS[coverage] ?? Shield;
            return (
              <div
                key={coverage}
                className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white p-2.5 text-center"
              >
                <Icon className="size-7 shrink-0 text-brand-500" aria-hidden="true" />
                <span className="text-sm leading-tight font-medium text-neutral-900">{coverage}</span>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
