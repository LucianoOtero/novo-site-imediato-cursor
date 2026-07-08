import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/legacy-proxy-payload.ts — payload dos proxies Cloud Run
 * legados (integrações 2026-07-03).
 *
 * EspoCRM (proxy "FlyingDonkeys") e Octadesk (proxy "Webflow Octa") são
 * sistemas já existentes e em produção — não controlamos o contrato de
 * payload deles. A estrutura abaixo (`{data, d, name}` com essas chaves
 * exatas) foi confirmada lendo `MODAL_WHATSAPP_DEFINITIVO.js` (site
 * legado) e está documentada em `docs/WEBFLOW_CUSTOM_CODE_DEV.md`
 * (item 8) — é idêntica para os dois destinos, só o campo `name` muda.
 *
 * `phoneE164` é sempre `+55{ddd}{celular}` (ver `app/api/lead/route.ts`,
 * `toE164()`) — por isso o DDD são sempre os caracteres 3-4 (índices
 * 3 e 4, 0-based) e o celular é o restante.
 */
function splitPhoneE164(phoneE164: string): { ddd: string; celular: string } {
  return { ddd: phoneE164.slice(3, 5), celular: phoneE164.slice(5) };
}

export function buildLegacyProxyPayload(lead: LeadRecord, name: string) {
  const { ddd, celular } = splitPhoneE164(lead.phoneE164);

  return {
    data: {
      "DDD-CELULAR": `${ddd}-${celular}`,
      CELULAR: celular,
      GCLID_FLD: lead.utm?.gclid ?? "",
      NOME: lead.nome ?? "",
      CPF: lead.cpf ?? "",
      CEP: lead.cep ?? "",
      PLACA: lead.placa ?? "",
      // O `LeadForm` multi-step (Issue 11) não coleta e-mail/veículo — só
      // o `ContactLeadModal` (integrações 2026-07-08) preenche esses 3
      // campos, replicando o modal do site legado.
      Email: lead.email ?? "",
      ANO: lead.veiculoAno ?? "",
      VEICULO: lead.veiculoMarcaModelo ?? "",
      // Preenchidos apenas se o enriquecimento PH3A estiver habilitado
      // (app/api/lead/route.ts) — vazios por padrão, nunca inventados.
      SEXO: lead.ph3aSexo ?? "",
      "DATA-DE-NASCIMENTO": lead.ph3aDataNascimento ?? "",
      "ESTADO-CIVIL": lead.ph3aEstadoCivil ?? "",
      produto: lead.ramo,
      utm_source: lead.utm?.utm_source ?? "",
      utm_campaign: lead.utm?.utm_campaign ?? "",
    },
    d: new Date().toISOString(),
    name,
  };
}
