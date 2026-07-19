import {
  AppWindow,
  Briefcase,
  CalendarClock,
  Car,
  CarFront,
  CarTaxiFront,
  CircleDot,
  ClipboardList,
  Eye,
  FileText,
  FileWarning,
  Flame,
  Fuel,
  Hammer,
  HeartPulse,
  Home,
  KeyRound,
  Lightbulb,
  LifeBuoy,
  Package,
  PackageCheck,
  Phone,
  Receipt,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Smartphone,
  Stethoscope,
  Truck,
  Users,
  Wrench,
  Zap,
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
 * semanticamente relacionado.
 *
 * **Estendido aos outros 9 ramos** (2026-07-09, mesmo dia — "replicar
 * as alterações da Home para as outras páginas"): como `CoverageCards`
 * já era compartilhado com `RamoLandingPage` (Issue 16), o grid de 4
 * colunas e a lista completa já valiam para as 10 LPs de ramo sem
 * nenhuma mudança — só faltava mapear os nomes de cobertura
 * específicos dos outros 9 ramos (ex.: "RCF (danos a terceiros)",
 * "Cobertura para uso por aplicativo"), que sem isso cairiam todos no
 * ícone genérico `Shield` (fallback, mantido para qualquer nome futuro
 * fora do mapa).
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
  // Ramos além de "auto" (moto, caminhão, uber, táxi, utilitário, frota, pet, fiança, assistência 24h/RCF):
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
            const Icon = COVERAGE_ICONS[coverage] ?? Shield;
            return (
              <div
                key={coverage}
                className="group flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 text-center shadow-[0_1px_2px_rgba(11,31,58,0.06)] transition-all duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-[0_6px_20px_rgba(11,31,58,0.08)]"
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
