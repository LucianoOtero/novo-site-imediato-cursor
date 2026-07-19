import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { InsuranceBranch } from "@/lib/ramos";
import { cn } from "@/lib/utils";

/**
 * InsuranceCard — card de ramo (Issue 10).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 ("InsuranceCard | default ·
 * destaque · compacto | hover lift; preço da lib | link 'Cotar {ramo}'")
 * e seção 56.2 ("InsuranceCard: name, icon, priceFrom/Label, eyebrow,
 * slug"). Implementa as variantes `default`/`destaque` — `compacto` fica
 * para quando um consumidor real precisar dela (não usada nesta issue).
 *
 * O card inteiro é um único `<Link>` (maior alvo de toque, sem elementos
 * interativos aninhados); o texto final "Cotar {shortName}" garante o
 * nome acessível exigido pela especificação.
 *
 * Versão visual v2 — Fase 5 (2026-07-19, aprovada pelo cliente): os
 * ícones Lucide genéricos foram substituídos por ícones 3D exclusivos
 * no estilo da marca (renders navy/azul gerados via Higgsfield MCP, ver
 * docs/VISUAL_HIGGSFIELD.md) — as chaves de `ramo.icon` (lib/ramos)
 * mapeiam para `/public/icons-3d/ramo-{chave}.webp` (~4 KB cada).
 */
const RAMO_ICON_SRC: Record<string, string> = {
  "car-front": "/icons-3d/ramo-car-front.webp",
  bike: "/icons-3d/ramo-bike.webp",
  truck: "/icons-3d/ramo-truck.webp",
  car: "/icons-3d/ramo-car.webp",
  "car-taxi-front": "/icons-3d/ramo-car-taxi-front.webp",
  package: "/icons-3d/ramo-package.webp",
  "building-2": "/icons-3d/ramo-building-2.webp",
  "paw-print": "/icons-3d/ramo-paw-print.webp",
  "key-round": "/icons-3d/ramo-key-round.webp",
  "life-buoy": "/icons-3d/ramo-life-buoy.webp",
};

export interface InsuranceCardProps {
  ramo: InsuranceBranch;
  /** Destaca o card (ex.: Auto na RamoGrid da Home) — seção 6.1. */
  featured?: boolean;
  className?: string;
}

export function InsuranceCard({ ramo, featured = false, className }: InsuranceCardProps) {
  const iconSrc = RAMO_ICON_SRC[ramo.icon] ?? RAMO_ICON_SRC.car;

  return (
    <Link
      href={ramo.seo.canonicalPath}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-[0_1px_2px_rgba(11,31,58,0.06)] outline-none",
        "transition-all duration-200 ease-[var(--ease-standard)]",
        "hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(11,31,58,0.12)] focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        featured ? "border-brand-500 ring-1 ring-brand-500" : "border-neutral-200",
        className
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white shadow-[0_8px_24px_rgba(19,102,214,0.28)]">
          Mais procurado
        </span>
      )}

      <Image
        src={iconSrc}
        alt=""
        width={64}
        height={64}
        className="size-16 transition-transform duration-200 group-hover:scale-110"
        aria-hidden="true"
      />

      <div>
        {ramo.eyebrow && <p className="text-xs font-semibold text-neutral-500">{ramo.eyebrow}</p>}
        <h3 className="font-display text-lg font-bold text-neutral-900">{ramo.shortName}</h3>
        <p className="mt-1 text-sm text-neutral-500">{ramo.priceLabel}</p>
      </div>

      <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-brand-600 transition-[gap] group-hover:gap-2">
        Cotar {ramo.shortName}
        <ArrowRight className="size-4" aria-hidden="true" />
      </span>
    </Link>
  );
}
