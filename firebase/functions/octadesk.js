/**
 * firebase/functions/octadesk.js — envio direto de templates WhatsApp
 * pela API do Octadesk (projeto "Firebase como cofre, Functions como
 * camada única de entrega", 2026-07-28 — ver plano "Fluxo formulário
 * CRM WhatsApp" e docs/GUIA_OCTADESK_TEMPLATES.md).
 *
 * Extraído de index.js (formato validado em produção em 2026-07-27):
 * `POST {baseUrl}/chat/send-template` com `origin`/`target` no formato
 * `{channel, code}` — o formato `phoneContact`/`from.number` é do
 * endpoint antigo (`/chat/conversation/send-template`, deprecado) e
 * devolve HTTP 500 {"code":"NOT_MAPPED"} neste.
 *
 * Templates aprovados pela Meta (todos Utilitário, 2026-07-27/28):
 * - `primeira_etapa`  → primeira_etapa_util (SEM variáveis — na etapa 1
 *   não há nome real, só o telefone)
 * - `calculo_pronto`  → opcao_recomendada_util (var-1 nome, var-2
 *   veículo, var-3 valor)
 * - `calculo_manual`  → calculo_falhou_util (var-1 nome)
 * - `calculo_completo_depois` → ultima_confirmacao_calculo (var-1 nome)
 */

/** Primeiro nome "humano" do lead — evita usar o NOME "falso" (`11-999...-NOVO CLIENTE WHATSAPP`) em mensagens/notas. */
function firstName(nome) {
  if (!nome || /NOVO CLIENTE WHATSAPP/i.test(nome)) return "";
  return nome.trim().split(/\s+/)[0];
}

/**
 * Envia um template. `templateKey` indexa `config.templates`;
 * `variables` é a lista de valores na ordem das variáveis do template
 * ({{var-1}}, {{var-2}}…) — vazia para templates sem variáveis.
 * `target.contact.name`/`email` alimentam as variáveis padrão
 * {{nome-contato}}/{{email-contato}} e o cadastro do contato — só são
 * enviados quando existem valores reais (não os "falsos" derivados do
 * telefone).
 */
async function sendTemplate(config, templateKey, leadData, variables, leadId) {
  const templateId = config.templates && config.templates[templateKey];
  if (!templateId) throw new Error(`Template "${templateKey}" sem ID configurado em OCTADESK_API_CONFIG`);

  const payload = {
    origin: { contact: { channel: "whatsapp", code: config.fromNumber } },
    target: {
      contact: {
        channel: "whatsapp",
        code: leadData.phoneE164,
        ...(firstName(leadData.nome) ? { name: leadData.nome } : {}),
        ...(leadData.email && !/@imediatoseguros\.com\.br$/i.test(leadData.email) ? { email: leadData.email } : {}),
      },
    },
    content: {
      templateMessage: {
        id: templateId,
        variables: variables.map((value, index) => ({ key: `var-${index + 1}`, value: value || "" })),
      },
    },
    options: { automaticAssign: false },
  };

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/send-template`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json", "X-API-KEY": config.apiKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`send-template "${templateKey}" HTTP ${response.status} (lead ${leadId}): ${body.slice(0, 300)}`);
  }
}

module.exports = { sendTemplate, firstName };
