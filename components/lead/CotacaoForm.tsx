"use client";

import { useState } from "react";

import { LeadForm } from "@/components/lead/LeadForm";
import { RamoSelector } from "@/components/lead/RamoSelector";
import { useSubmitLead } from "@/lib/leads/use-submit-lead";

/**
 * CotacaoForm — combina seleção de ramo + LeadForm para `/cotacao`
 * (Issue 13). Isolado em Client Component para a página em si
 * (`app/(marketing)/cotacao/page.tsx`) continuar Server Component.
 *
 * Envio via `useSubmitLead` (Issue 15) — chama `/api/lead` de verdade
 * (Issue 12) e navega para `/obrigado` (Issue 14) com o `ramo` na
 * querystring; usado quando o usuário escolhe "Prefiro falar com um
 * consultor depois" no passo 4 do `LeadForm`. A opção "Aguardar o
 * cálculo" (RPA de verdade, projeto 2026-07-16) é orquestrada
 * inteiramente dentro do próprio `LeadForm`, sem passar por aqui.
 */
export function CotacaoForm() {
  const [ramo, setRamo] = useState("auto");
  const { submitLead } = useSubmitLead(ramo);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium text-neutral-900">Tipo de seguro</p>
        <RamoSelector value={ramo} onChange={setRamo} />
      </div>
      <LeadForm ramo={ramo} variant="page" onSuccess={submitLead} />
    </div>
  );
}
