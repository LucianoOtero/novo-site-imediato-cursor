import { env } from "@/lib/env";
import { leadStore } from "@/lib/leads/store";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/ph3a.ts — enriquecimento de CPF via PH3A (integrações 2026-07-03).
 * Fonte: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 10) e
 * `docs/INTEGRACOES_ATUAIS.md` (item 10B).
 *
 * PH3A é uma API de terceiros que, dado um CPF, retorna sexo/data de
 * nascimento/estado civil — usada no site legado (quando habilitada)
 * para autopreencher campos do formulário em tempo real
 * (`extractDataFromPH3A`, `FooterCodeSiteDefinitivoCompleto.js`).
 *
 * Decisão de design deste site (mais simples que a legada, preservando o
 * `LeadForm` enxuto da Issue 11): enriquecimento **server-side e
 * não-bloqueante**, disparado depois de já persistir o lead, sem nenhum
 * campo novo visível no formulário. O resultado (se houver) é anexado ao
 * `LeadRecord` e passado adiante no payload para EspoCRM/Octadesk
 * (`lib/leads/legacy-proxy-payload.ts`), não exibido ao usuário.
 *
 * Acessado através do mesmo proxy Cloud Run que já valida CPF no site
 * legado (`CPF_VALIDATE_URL` lá, `CPF_VALIDATE_PROXY_URL` aqui) — não é
 * uma integração direta com a PH3A (não temos credenciais para isso).
 *
 * Nota de fidelidade: o formato exato da resposta do proxy quando a
 * consulta PH3A está habilitada não foi confirmado nesta rodada (só a
 * função de transformação do lado do site legado, `extractDataFromPH3A`,
 * foi lida — não o JSON bruto retornado pelo proxy). O parsing abaixo é
 * defensivo (aceita `sexo`/`dataNascimento`/`estadoCivil` no nível raiz
 * ou dentro de `data`) e loga quando o formato não bate, em vez de
 * presumir uma estrutura não confirmada.
 */
type Ph3aResult = { sexo?: string; dataNascimento?: string; estadoCivil?: string };

function extractPh3aFields(json: unknown): Ph3aResult {
  if (!json || typeof json !== "object") return {};
  const root = json as Record<string, unknown>;
  const source = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;

  const asString = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined);
  return {
    sexo: asString(source.sexo),
    dataNascimento: asString(source.dataNascimento),
    estadoCivil: asString(source.estadoCivil),
  };
}

/**
 * Consulta o PH3A (via proxy) e atualiza o `LeadRecord` com os campos
 * retornados, se houver. Não lança erro — falhas são apenas logadas,
 * pois este enriquecimento nunca deve bloquear ou reverter a captura do
 * lead (que já foi persistido e enviado ao CRM antes desta chamada).
 */
export async function enrichLeadWithPh3a(lead: LeadRecord): Promise<void> {
  if (!env.ph3aEnrichmentEnabled) return;
  if (!lead.cpf) return;
  if (!env.cpfValidateProxyUrl) {
    console.warn("[lib/ph3a] PH3A_ENRICHMENT_ENABLED=true mas CPF_VALIDATE_PROXY_URL não configurada — pulando.");
    return;
  }

  try {
    const response = await fetch(env.cpfValidateProxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cpf: lead.cpf }),
    });

    if (!response.ok) {
      console.warn(`[lib/ph3a] Proxy retornou status ${response.status} para o lead ${lead.id} — enriquecimento não aplicado.`);
      return;
    }

    const json = await response.json();
    const { sexo, dataNascimento, estadoCivil } = extractPh3aFields(json);

    if (!sexo && !dataNascimento && !estadoCivil) {
      console.info(`[lib/ph3a] Nenhum campo de enriquecimento retornado para o lead ${lead.id} (CPF sem dados no PH3A, ou formato de resposta inesperado).`);
      return;
    }

    await leadStore.update(lead.id, { ph3aSexo: sexo, ph3aDataNascimento: dataNascimento, ph3aEstadoCivil: estadoCivil });
    console.info(`[lib/ph3a] Lead ${lead.id} enriquecido via PH3A.`);
  } catch (error) {
    console.error(`[lib/ph3a] Erro ao consultar PH3A para o lead ${lead.id}:`, error);
  }
}
