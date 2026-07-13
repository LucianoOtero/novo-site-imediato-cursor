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
 *
 * Correção 2026-07-12 (achado ao investigar rejeição real do Octadesk):
 * o campo `DDD-CELULAR`, apesar do nome, carrega **só o DDD** (ex.:
 * "11") — não "DDD-CELULAR" concatenado. Confirmado lendo
 * `registrarPrimeiroContatoEspoCRM`/`enviarMensagemInicialOctadesk` em
 * `MODAL_WHATSAPP_DEFINITIVO.js` (`'DDD-CELULAR': String(ddd)`) e
 * validado com uma chamada real e isolada ao proxy Octadesk: com
 * `DDD-CELULAR: "11-988887777"` (o que este arquivo enviava antes desta
 * correção) o Octadesk respondia 500 `{"details":"Telefone inválido"}`;
 * com `DDD-CELULAR: "11"` respondeu 200 com sucesso. O EspoCRM tolerava
 * o formato errado (não valida esse campo com o mesmo rigor), por isso
 * o bug só afetava o Octadesk e passou despercebido nos testes de
 * EspoCRM. Ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md`.
 *
 * Correção 2026-07-13 (achado ao investigar rejeição real do EspoCRM):
 * o EspoCRM **exige** os campos `Email` e `NOME` não-vazios — sem eles,
 * rejeita o lead inteiro (`HTTP 200` com `{"status":"error","message":
 * "Campo email/nome é obrigatório"}`, um "falso sucesso" que nosso
 * código não detectava até essa investigação — ver correção em
 * `lib/leads/proxy-sender.ts`, que agora checa o corpo da resposta, não
 * só o status HTTP). Réplica exata do comportamento do modal legado:
 * quando `stage: "initial"` (só telefone confirmado) e o e-mail/nome
 * ainda não foram informados, usa valores "falsos" derivados do
 * telefone (`{ddd}{celular}@imediatoseguros.com.br` /
 * `{ddd}-{celular}-NOVO CLIENTE WHATSAPP`) — substituídos pelos valores
 * reais na atualização final (`stage: "complete"`), se o usuário
 * preencher.
 */
function splitPhoneE164(phoneE164: string): { ddd: string; celular: string } {
  return { ddd: phoneE164.slice(3, 5), celular: phoneE164.slice(5) };
}

export function buildLegacyProxyPayload(lead: LeadRecord, name: string) {
  const { ddd, celular } = splitPhoneE164(lead.phoneE164);
  const isInitial = lead.stage === "initial";
  const email = lead.email || (isInitial ? `${ddd}${celular}@imediatoseguros.com.br` : "");
  const nome = lead.nome || (isInitial ? `${ddd}-${celular}-NOVO CLIENTE WHATSAPP` : "");

  return {
    data: {
      "DDD-CELULAR": ddd,
      CELULAR: celular,
      GCLID_FLD: lead.utm?.gclid ?? "",
      NOME: nome,
      CPF: lead.cpf ?? "",
      CEP: lead.cep ?? "",
      PLACA: lead.placa ?? "",
      // O `LeadForm` multi-step (Issue 11) não coleta e-mail/veículo — só
      // o `ContactLeadModal` (integrações 2026-07-08) preenche esses 3
      // campos, replicando o modal do site legado.
      Email: email,
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
      // Presentes só na atualização final de um lead que já teve um
      // contato inicial (projeto 2026-07-13) — permite ao EspoCRM
      // atualizar o registro existente em vez de criar um duplicado
      // (mesmo padrão de `atualizarLeadEspoCRM` no modal legado).
      ...(lead.espocrmLeadId ? { lead_id: lead.espocrmLeadId, contact_id: lead.espocrmLeadId } : {}),
      ...(lead.espocrmOpportunityId ? { opportunity_id: lead.espocrmOpportunityId } : {}),
    },
    d: new Date().toISOString(),
    name,
  };
}
