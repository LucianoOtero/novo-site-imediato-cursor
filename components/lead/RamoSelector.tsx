"use client";

import { Chip } from "@/components/ui/chip";
import { ramos } from "@/lib/ramos";

/**
 * RamoSelector — seletor de tipo de produto para `/cotacao` (Issue 13).
 * Fonte: ESPECIFICACAO v3.md, seção 6.3 ("Passo 1: Tipo de veículo + DDD
 * + Celular"). O `LeadForm` (Issue 11) recebe `ramo` como prop fixa
 * (definida pela página que o usa: nas LPs de ramo é implícita; aqui,
 * em `/cotacao` — página genérica, sem ramo pré-definido — precisa ser
 * escolhida pelo usuário).
 *
 * Reaproveita `Chip` (Issue 08, `aria-pressed`) em vez de criar um novo
 * primitive de seleção única — o grupo (`role="group"`) garante só um
 * selecionado por vez via o estado do componente pai.
 */
export function RamoSelector({ value, onChange }: { value: string; onChange: (ramo: string) => void }) {
  return (
    <div role="group" aria-label="Tipo de seguro" className="flex flex-wrap gap-2">
      {ramos.map((ramo) => (
        <Chip
          key={ramo.slug}
          variant={value === ramo.slug ? "info" : "neutro"}
          selected={value === ramo.slug}
          onSelectedChange={() => onChange(ramo.slug)}
        >
          {ramo.shortName}
        </Chip>
      ))}
    </div>
  );
}
