"use client";

import { useState } from "react";

import { LeadForm } from "@/components/lead/LeadForm";
import { RamoSelector } from "@/components/lead/RamoSelector";
import { useSubmitLead } from "@/lib/leads/use-submit-lead";

/**
 * CotacaoForm — combina seleção de ramo + LeadForm (`variant="page"`).
 * Mantido no codebase; `/cotacao` passou a usar o padrão home (`Hero` +
 * `LeadForm` inline). Isolado em Client Component para páginas Server.
 *
 * Envio via `useSubmitLead` — chama `/api/lead` e navega para `/obrigado`
 * com o `ramo` na querystring.
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
