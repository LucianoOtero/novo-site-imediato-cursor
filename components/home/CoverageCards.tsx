import Image from "next/image";
import { Shield } from "lucide-react";

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
 * Versão visual v2 — Fase 5 completa (2026-07-19, estilo aprovado pelo
 * cliente): TODAS as coberturas (16 do auto + as dos outros 9 ramos)
 * usam ícones 3D exclusivos no estilo da marca (renders navy/azul via
 * Higgsfield MCP, prompt kit em docs/VISUAL_HIGGSFIELD.md) — WebP 256px
 * ~4 KB cada, lazy via next/image. Nomes equivalentes reutilizam o
 * mesmo asset (RCF/RCF-V; as 3 variações de assistência). `Shield`
 * (Lucide) permanece apenas como fallback para nomes futuros fora do
 * mapa.
 */
const COVERAGE_ICON_SRC: Record<string, string> = {
  // Auto (16)
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
  // Demais ramos (mesmo prompt kit; nomes equivalentes reutilizam o asset)
  "RCF (danos a terceiros)": "/icons-3d/cov-rcf.webp",
  "RCF-V (danos a terceiros)": "/icons-3d/cov-rcf.webp",
  "Reposição de acessórios": "/icons-3d/cov-reposicao-acessorios.webp",
  "Casco (colisão, roubo e incêndio)": "/icons-3d/cov-casco.webp",
  "Carga transportada (opcional)": "/icons-3d/cov-carga.webp",
  "Assistência 24h para veículos pesados": "/icons-3d/cov-assistencia.webp",
  "Assistência 24h para toda a frota": "/icons-3d/cov-assistencia.webp",
  "Cobertura para uso por aplicativo": "/icons-3d/cov-app.webp",
  "Danos a passageiros": "/icons-3d/cov-danos-passageiros.webp",
  "Uso profissional coberto": "/icons-3d/cov-uso-profissional.webp",
  "Gestão centralizada de apólices": "/icons-3d/cov-gestao-apolices.webp",
  "Consultas em rede credenciada": "/icons-3d/cov-consultas-rede.webp",
  "Emergência veterinária 24h": "/icons-3d/cov-emergencia-vet.webp",
  "Exames básicos": "/icons-3d/cov-exames.webp",
  "Orientação veterinária por telefone": "/icons-3d/cov-orientacao-telefone.webp",
  "Aluguéis em atraso": "/icons-3d/cov-alugueis.webp",
  "Multas contratuais": "/icons-3d/cov-multas.webp",
  "Danos ao imóvel": "/icons-3d/cov-danos-imovel.webp",
  "Encargos condominiais e de consumo (conforme plano)": "/icons-3d/cov-encargos.webp",
  Guincho: "/icons-3d/cov-guincho.webp",
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
                  <Shield className="size-7 shrink-0 text-brand-500" aria-hidden="true" />
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
