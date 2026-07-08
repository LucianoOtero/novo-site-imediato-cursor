import Link from "next/link";
import {
  ArrowRight,
  Bike,
  Building2,
  Car,
  CarFront,
  CarTaxiFront,
  KeyRound,
  LifeBuoy,
  Package,
  PawPrint,
  Truck,
  type LucideIcon,
} from "lucide-react";

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
 */
const RAMO_ICONS: Record<string, LucideIcon> = {
  "car-front": CarFront,
  bike: Bike,
  truck: Truck,
  car: Car,
  "car-taxi-front": CarTaxiFront,
  package: Package,
  "building-2": Building2,
  "paw-print": PawPrint,
  "key-round": KeyRound,
  "life-buoy": LifeBuoy,
};

export interface InsuranceCardProps {
  ramo: InsuranceBranch;
  /** Destaca o card (ex.: Auto na RamoGrid da Home) — seção 6.1. */
  featured?: boolean;
  className?: string;
}

export function InsuranceCard({ ramo, featured = false, className }: InsuranceCardProps) {
  const Icon = RAMO_ICONS[ramo.icon] ?? Car;

  return (
    <Link
      href={ramo.seo.canonicalPath}
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm outline-none",
        "transition-all duration-[var(--dur-fast)] ease-[var(--ease-standard)]",
        "hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        featured ? "border-brand-500 ring-1 ring-brand-500" : "border-neutral-200",
        className
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
          Mais procurado
        </span>
      )}

      <div className="flex size-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="size-6" aria-hidden="true" />
      </div>

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
