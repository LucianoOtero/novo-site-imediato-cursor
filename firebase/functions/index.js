/**
 * firebase/functions/index.js — Cloud Function de entrega de leads a
 * EspoCRM/Octadesk (projeto Firebase "imediato-seguros-site-novo",
 * dedicado ao site novo — NÃO é o projeto do site legado
 * "leads-imediato-seguros", usado por segurosimediato.com.br).
 *
 * Reescrita em 2026-07-13 — arquitetura "Firebase-only" (ver
 * docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md e
 * docs/ANALISE_ESPOCRM_OCTADESK_FIREBASE_CLOUDRUN.md): antes desta
 * mudança, esta função só entrava em ação como rede de segurança
 * ("retryLeadDelivery"), quando a entrega direta feita pelo site
 * (Vercel) falhava. Agora ela é a **única** via de entrega a
 * EspoCRM/Octadesk — o site (`app/api/lead/route.ts`) nunca mais chama
 * os proxies Cloud Run direto, só grava em `leads_backup/{leadId}` e
 * responde ao usuário imediatamente. Réplica fiel do modo
 * "Firebase-Only" que já é a configuração **ativa** confirmada no site
 * legado (`window.MODAL_FIREBASE_ONLY = true`).
 *
 * Motivo da mudança (achados reais em produção, 2026-07-13):
 * - A entrega direta em paralelo (`stage: "initial"` + `stage:
 *   "complete"`, cada uma chamando EspoCRM **e** Octadesk) fazia o
 *   Octadesk notificar o cliente 2 vezes por conversão — corrigido
 *   aqui: Octadesk só é chamado no estágio `"initial"`.
 * - O fallback de `NOME`/`Email` "falsos" só valia no estágio
 *   `"initial"` — no `"complete"`, se o valor real continuasse vazio
 *   (sempre o caso do `ContactLeadModal`, que não coleta "Nome"), o
 *   EspoCRM rejeitava a atualização. Corrigido: o fallback vale sempre
 *   que o valor estiver vazio, em qualquer estágio.
 *
 * O que este arquivo faz:
 * 1. Observa toda gravação em `leads_backup/{leadId}` (Realtime Database).
 * 2. Se `autoSync !== true`, não faz nada (registro já processado ou
 *    não é candidato a entrega — ex.: gravação feita pela própria
 *    função, com `autoSync:false` no final).
 * 3. `stage === "initial"`: envia a EspoCRM (cria) e Octadesk (mensagem
 *    inicial) o que ainda não tiver sido enviado (`*_sent !== true`).
 *    Grava `espocrmLeadId`/`espocrmOpportunityId` de volta no registro.
 * 4. `stage === "complete"` (e demais estágios de evento — ver abaixo):
 *    sempre tenta atualizar o EspoCRM (usa `espocrmLeadId`/
 *    `espocrmOpportunityId` já salvos no registro, se existirem, para
 *    atualizar em vez de duplicar) — nunca reenvia a mensagem inicial
 *    ao Octadesk.
 * 5. Atualiza o registro com o resultado. Se algo ainda falhar, o
 *    próprio `update()` dispara uma nova execução (gatilho
 *    "onValueWritten") — limitado a `MAX_CF_ATTEMPTS_TOTAL` rodadas por
 *    lead, depois do que marca `status: "failed_permanently"`.
 *
 * Projeto "leads EspoCRM/Octadesk por momento" (2026-07-20):
 * - Novos estágios de evento vindos do site: `"progress"` (prospect
 *   concluiu os passos 2/3 do formulário), `"rpa_result"` (cálculo
 *   automático terminou, com resumo em `data.rpaResultado`) e
 *   `"consultant_requested"` (prefere receber o cálculo completo
 *   depois). Todos atualizam o EspoCRM via proxy, como o "complete".
 * - Enriquecimento da ficha via API REST do EspoCRM (secret
 *   `ESPOCRM_API_CONFIG`): Note no Stream por momento (escolha do
 *   passo 4, resultado do cálculo com valores) + resumo do cálculo na
 *   `description`. Best-effort, com dedupe por estágio.
 * - Campos do painel "Cotação do Site" (`cEtapaFunil`,
 *   `cEscolhaCalculo`, `cStatusCalculo`, `cValorRecomendado`,
 *   `cValorAlternativo` — mesmos nomes no Lead e na Opportunity) +
 *   `cWebpage` = "novo.segurosimediato.com.br" (origem; sobrescreve o
 *   "mdmidia.com.br" fixo do proxy) gravados via PUT direto nas DUAS
 *   entidades a cada momento do funil (2026-07-28).
 * - Mensagens Octadesk pós-iniciais via API direta (secret
 *   `OCTADESK_API_CONFIG`, com kill-switch `enabled`): "cálculo pronto",
 *   "cálculo manual" e "cálculo completo depois" — templates aprovados
 *   pela Meta (ver docs/GUIA_OCTADESK_TEMPLATES.md).
 *
 * Integração 100% direta (plano "Fluxo formulário CRM WhatsApp",
 * 2026-07-28 — módulos espocrm.js/octadesk.js):
 * - `useDirect:true` no secret `ESPOCRM_API_CONFIG` liga a entrega
 *   EspoCRM SEM o proxy legado: dedupe (e-mail real → telefone),
 *   criação/atualização de Lead + Opportunity com o mapeamento completo
 *   (todas as UTMs, cVeiculo/cAnoFab, cDataDoLead, cLeadId na Opp) —
 *   por ambiente (bloco `prod` vazio = produção continua no proxy).
 * - Mensagem inicial personalizada `primeira_etapa` via API direta,
 *   com fallback automático para o proxy legado se o envio falhar.
 * - Task "Efetuar cálculo manual e enviar ao cliente" (D+1) criada no
 *   4b (consultant_requested) e na falha do RPA.
 */
const { onValueWritten, onValueCreated } = require("firebase-functions/v2/database");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

// Módulos da integração direta (2026-07-28 — plano "Fluxo formulário
// CRM WhatsApp"): EspoCRM (dedupe, Lead + Opportunity, Note, Task,
// description, campos) e Octadesk (todas as mensagens por template).
const espo = require("./espocrm");
const octa = require("./octadesk");
const emailNotif = require("./email-notification");
const contactEmail = require("./contact-email");

const DATABASE_URL = "https://imediato-seguros-site-novo-default-rtdb.firebaseio.com";

initializeApp({ databaseURL: DATABASE_URL });

// Configurados via `firebase functions:secrets:set <NOME>` (ver firebase/README.md).
// Mesmas URLs Cloud Run que o site novo usava antes de 2026-07-13 (ver
// histórico de lib/env.ts / .env.example) — agora só usadas aqui.
const ESPOCRM_DEV_URL = defineSecret("ESPOCRM_DEV_URL");
const ESPOCRM_PROD_URL = defineSecret("ESPOCRM_PROD_URL");
const OCTADESK_URL = defineSecret("OCTADESK_URL");

/**
 * Integração direta com a API REST do EspoCRM (projeto "leads EspoCRM/
 * Octadesk por momento", 2026-07-20) — usada para enriquecer a ficha do
 * lead com o que o proxy legado não carrega: escolha do passo 4, resumo
 * do cálculo RPA (Note no Stream + description), campos do funil e
 * `cWebpage`. JSON com um bloco por ambiente (mesma separação dev/prod
 * do site legado — leads com `environment:"production"` usam `prod`,
 * todo o resto usa `dev`):
 *   {"dev":{"baseUrl":"https://dev.flyingdonkeys.com.br","apiKey":"..."},
 *    "prod":{"baseUrl":"https://flyingdonkeys.com.br","apiKey":"..."}}
 * (O formato antigo, com `baseUrl`/`apiKey` no topo, segue aceito e vale
 * para os dois ambientes.) Enquanto o bloco do ambiente estiver vazio/
 * incompleto, o enriquecimento é silenciosamente pulado — a entrega via
 * proxy continua intacta.
 */
const ESPOCRM_API_CONFIG = defineSecret("ESPOCRM_API_CONFIG");

/**
 * Envio direto de templates WhatsApp pela API do Octadesk (mesmo projeto,
 * 2026-07-20) — usado nos momentos "cálculo pronto"/"cálculo manual"/
 * "cálculo completo depois" (a mensagem inicial continua no proxy legado).
 * JSON:
 *   {"enabled":true,"baseUrl":"https://SUBDOMINIO.apiprd.octadesk.services",
 *    "apiKey":"...","fromNumber":"+5511...",
 *    "templates":{"calculo_pronto":"<id>","calculo_manual":"<id>","calculo_completo_depois":"<id>"}}
 * Kill-switch: `enabled:false` (ou JSON vazio) desliga tudo — permite
 * subir os estágios EspoCRM antes de os templates serem aprovados pela
 * Meta (ver docs/GUIA_OCTADESK_TEMPLATES.md).
 */
const OCTADESK_API_CONFIG = defineSecret("OCTADESK_API_CONFIG");

/**
 * Notificação admin por e-mail — mesmo Cloud Run do site legado
 * (`SEND_EMAIL_NOTIFICATION_URL` em config_env.js). A CF comanda o
 * disparo no lugar do browser (que no Firebase-Only nunca chegava lá).
 */
const SEND_EMAIL_NOTIFICATION_URL_DEV = defineSecret("SEND_EMAIL_NOTIFICATION_URL_DEV");
const SEND_EMAIL_NOTIFICATION_URL_PROD = defineSecret("SEND_EMAIL_NOTIFICATION_URL_PROD");

/**
 * SMTP do formulário `/contato` (2026-08-01) — JSON com host/port/user/
 * pass/from/to. Ver firebase/functions/contact-email.js.
 */
const CONTACT_SMTP_CONFIG = defineSecret("CONTACT_SMTP_CONFIG");

const RETRY_DELAYS_MS = [1000, 4000, 9000];
/**
 * Limite de rodadas com FALHA de entrega (Espo/Octadesk) antes de
 * desistir. Estágios bem-sucedidos NÃO consomem este orçamento
 * (correção 2026-07-28: antes cada invocação de estágio incrementava e
 * o funil completo queimava o teto em ~5 writes).
 */
const MAX_CF_ATTEMPTS_TOTAL = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mesma estrutura `{data, d, name}` — contrato fixo dos proxies Cloud
 * Run legados (EspoCRM/Octadesk), não controlado por nós.
 *
 * Fallback de `NOME`/`Email`: o EspoCRM exige os dois campos não-vazios
 * (rejeita com `HTTP 200` + erro no corpo, um "falso sucesso"). Usa
 * valores "falsos" derivados do telefone sempre que o valor real
 * estiver vazio — em **qualquer** estágio (correção 2026-07-13; antes
 * só valia no "initial", o que quebrava a atualização final de leads
 * do `ContactLeadModal`, que nunca coleta "Nome").
 */
function buildLegacyProxyPayload(leadData, name) {
  const phoneE164 = leadData.phoneE164 || "";
  const ddd = phoneE164.slice(3, 5);
  const celular = phoneE164.slice(5);
  const utm = leadData.utm || {};
  const email = leadData.email || `${ddd}${celular}@imediatoseguros.com.br`;
  const nome = leadData.nome || `${ddd}-${celular}-NOVO CLIENTE WHATSAPP`;

  return {
    data: {
      "DDD-CELULAR": ddd,
      CELULAR: celular,
      GCLID_FLD: utm.gclid || "",
      NOME: nome,
      CPF: leadData.cpf || "",
      CEP: leadData.cep || "",
      PLACA: leadData.placa || "",
      Email: email,
      ANO: leadData.veiculoAno || "",
      VEICULO: leadData.veiculoMarcaModelo || "",
      SEXO: "",
      "DATA-DE-NASCIMENTO": "",
      "ESTADO-CIVIL": "",
      produto: leadData.ramo || "",
      utm_source: utm.utm_source || "",
      utm_campaign: utm.utm_campaign || "",
      ...(leadData.espocrmLeadId ? { lead_id: leadData.espocrmLeadId, contact_id: leadData.espocrmLeadId } : {}),
      ...(leadData.espocrmOpportunityId ? { opportunity_id: leadData.espocrmOpportunityId } : {}),
    },
    d: new Date().toISOString(),
    name,
  };
}

/**
 * Extrai `leadIdFlyingDonkeys`/`opportunityIdFlyingDonkeys` do corpo de
 * resposta do EspoCRM — mesmo contrato confirmado em
 * `lib/leads/webhook.ts` (histórico do site, antes de 2026-07-13).
 */
function extractEspoCrmIds(responseData) {
  if (!responseData || typeof responseData !== "object") return {};
  const data = responseData.data || responseData;
  const leadId = data.leadIdFlyingDonkeys || data.lead_id || data.contact_id;
  const opportunityId = data.opportunityIdFlyingDonkeys || data.opportunity_id;
  return {
    leadId: typeof leadId === "string" ? leadId : undefined,
    opportunityId: typeof opportunityId === "string" ? opportunityId : undefined,
  };
}

/** Extrai só o JSON entre a 1ª `{` e a última `}` — o proxy PHP às vezes emite avisos HTML antes/depois do JSON de resposta. */
function parseJsonTolerant(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/** Config JSON de um secret opcional (`ESPOCRM_API_CONFIG`/`OCTADESK_API_CONFIG`) — `null` quando vazio/inválido/incompleto. */
function parseJsonConfig(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Primeiro nome "humano" do lead — evita usar o NOME "falso" em mensagens/notas (movido para octadesk.js; alias local). */
const firstName = octa.firstName;

/**
 * Texto da Note (post no Stream do lead no EspoCRM) por momento do funil
 * (projeto 2026-07-20) — a linha do tempo que o vendedor vê ao abrir a
 * ficha. Retorna `null` quando o momento não tem nada a contar.
 */
function buildMomentNote(stage, leadData) {
  const resultado = leadData.rpaResultado || {};
  if (stage === "consultant_requested") {
    return "📞 Prospect prefere RECEBER O CÁLCULO COMPLETO DEPOIS — preparar a cotação nas 18 seguradoras e retornar com os valores.";
  }
  if (stage === "complete" && leadData.rpaChoice === "aguardar") {
    return "⚡ Prospect escolheu ACOMPANHAR O CÁLCULO AUTOMÁTICO agora (RPA) — resultado será registrado nesta ficha ao concluir.";
  }
  if (stage === "rpa_result") {
    if (resultado.status === "sucesso") {
      const linhas = ["✅ CÁLCULO AUTOMÁTICO CONCLUÍDO — valores apresentados ao prospect:"];
      if (resultado.valorRecomendado) {
        linhas.push(
          `• Recomendado: ${resultado.valorRecomendado}` +
            (resultado.formaPagamentoRecomendado ? ` (${resultado.formaPagamentoRecomendado})` : "") +
            (resultado.franquiaRecomendado ? ` — franquia ${resultado.franquiaRecomendado}` : "")
        );
      }
      if (resultado.valorAlternativo) {
        linhas.push(
          `• Alternativo: ${resultado.valorAlternativo}` +
            (resultado.formaPagamentoAlternativo ? ` (${resultado.formaPagamentoAlternativo})` : "") +
            (resultado.franquiaAlternativo ? ` — franquia ${resultado.franquiaAlternativo}` : "")
        );
      }
      linhas.push("Ligar para revisar os detalhes e fechar — o prospect JÁ VIU esses valores na tela.");
      return linhas.join("\n");
    }
    return "⚠️ Cálculo automático NÃO concluído — fazer a cotação manual e retornar ao prospect (ele foi avisado de que um especialista assumiu).";
  }
  return null;
}

/**
 * Campos do painel "Cotação do Site" (existem com os MESMOS nomes no
 * Lead e na Opportunity do CRM — criados em 2026-07-27/28) a gravar em
 * cada momento do funil, sempre somados a `cWebpage` (origem). Os
 * valores dos enums são EXATAMENTE as options configuradas no CRM
 * (entityDefs custom) — qualquer divergência faz o EspoCRM rejeitar o
 * PUT. Retorna `null` quando o momento não altera nenhum campo.
 */
function buildFunnelFields(stage, leadData) {
  const resultado = leadData.rpaResultado || {};

  if (stage === "initial") {
    return { cEtapaFunil: "Telefone informado" };
  }
  if (stage === "progress") {
    // O site emite "progress" após o passo 2 (dados pessoais) e o passo
    // 3 (dados do veículo) — a presença de dados do veículo distingue.
    const temVeiculo = Boolean(leadData.placa || leadData.veiculoMarcaModelo || leadData.veiculoAno);
    return { cEtapaFunil: temVeiculo ? "Dados do veículo" : "Dados pessoais" };
  }
  if (stage === "complete" && leadData.rpaChoice === "aguardar") {
    return { cEtapaFunil: "Aguardando cálculo", cEscolhaCalculo: "Aguardar cálculo" };
  }
  if (stage === "consultant_requested") {
    return {
      cEtapaFunil: "Cálculo manual pendente",
      cEscolhaCalculo: "Receber depois",
      cStatusCalculo: "Manual solicitado",
    };
  }
  if (stage === "rpa_result") {
    if (resultado.status === "sucesso") {
      return {
        cEtapaFunil: "Cálculo concluído",
        cStatusCalculo: "Concluído",
        ...(resultado.valorRecomendado ? { cValorRecomendado: resultado.valorRecomendado } : {}),
        ...(resultado.valorAlternativo ? { cValorAlternativo: resultado.valorAlternativo } : {}),
      };
    }
    return { cEtapaFunil: "Cálculo manual pendente", cStatusCalculo: "Falhou" };
  }
  return null;
}

/**
 * Retorna `{delivered, attempts, responseData}` — `responseData` (JSON
 * já parseado) é usado para extrair os IDs do EspoCRM e para detectar
 * falhas que vêm com `HTTP 200` (o EspoCRM responde 200 mesmo rejeitando
 * o lead no corpo, ex.: `{"status":"error","message":"Campo NOME é
 * obrigatório"}` — `response.ok` sozinho não detecta isso).
 */
async function sendWithRetry(url, payload, label, leadId) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await response.text().catch(() => "");

      if (!response.ok) {
        logger.warn(`[deliverLead/${label}] Lead ${leadId}: resposta não-OK (status ${response.status}) na tentativa ${attempt + 1}: ${text}`);
      } else {
        const responseData = parseJsonTolerant(text);
        const body = responseData;
        if (body && (body.status === "error" || body.success === false)) {
          logger.warn(`[deliverLead/${label}] Lead ${leadId}: HTTP 200 mas corpo indica falha na tentativa ${attempt + 1}: ${body.message || text}`);
        } else {
          return { delivered: true, attempts: attempt + 1, responseData };
        }
      }
    } catch (error) {
      logger.error(`[deliverLead/${label}] Lead ${leadId}: tentativa ${attempt + 1} falhou.`, error);
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  return { delivered: false, attempts: RETRY_DELAYS_MS.length + 1 };
}

/**
 * Disparo best-effort do e-mail admin (Cloud Run legado). Dedupe por
 * flag no RTDB. Nunca incrementa cf_retry_count nem bloqueia sync.
 */
async function maybeSendAdminEmail({
  url,
  leadData,
  leadId,
  record,
  updates,
  flag,
  momento,
  erro,
}) {
  if (!url || record[flag] === true || updates[flag] === true) return;
  const payload = emailNotif.buildEmailPayload(leadData, { momento, erro: erro || null });
  if (!payload) return;
  const result = await emailNotif.sendAdminEmail(url, payload, leadId);
  if (result.success) {
    updates[flag] = true;
    logger.info(`[deliverLead] Lead ${leadId}: e-mail admin enviado (${momento}, flag=${flag}).`);
  }
}

exports.deliverLead = onValueWritten(
  {
    ref: "/leads_backup/{leadId}",
    instance: "imediato-seguros-site-novo-default-rtdb",
    region: "us-central1",
    secrets: [
      ESPOCRM_DEV_URL,
      ESPOCRM_PROD_URL,
      OCTADESK_URL,
      ESPOCRM_API_CONFIG,
      OCTADESK_API_CONFIG,
      SEND_EMAIL_NOTIFICATION_URL_DEV,
      SEND_EMAIL_NOTIFICATION_URL_PROD,
    ],
  },
  async (event) => {
    const leadId = event.params.leadId;
    const snapshot = event.data.after;
    const record = snapshot && snapshot.val();

    // Registro apagado, ou já processado (autoSync desligado pela própria função) — não faz nada.
    if (!record || record.autoSync !== true) return;

    // Ignora writes só de metadados (ex.: flags da própria CF) — evita
    // reentrada quando o update final/parcial não muda `data`/`autoSync`
    // de forma relevante para um novo estágio do site.
    const before = event.data.before && event.data.before.val();
    if (before) {
      const dataUnchanged = JSON.stringify(before.data || {}) === JSON.stringify(record.data || {});
      const autoSyncUnchanged = before.autoSync === record.autoSync;
      if (dataUnchanged && autoSyncUnchanged) return;
    }

    if ((record.cf_retry_count || 0) > MAX_CF_ATTEMPTS_TOTAL) {
      logger.error(
        `[deliverLead] Lead ${leadId} excedeu ${MAX_CF_ATTEMPTS_TOTAL} falhas de entrega — desistindo (failed_permanently).`
      );
      await snapshot.ref.update({
        autoSync: false,
        status: "failed_permanently",
        cf_retry_count: record.cf_retry_count || 0,
      });
      return;
    }

    const workingRecord = record;
    const leadData = workingRecord.data || {};
    // Estágios de evento (projeto 2026-07-20): "progress" (passos 2/3),
    // "rpa_result" (cálculo terminou) e "consultant_requested" (prefere
    // o cálculo completo depois) — todos atualizam o EspoCRM como o
    // "complete"; nenhum reenvia a mensagem inicial do Octadesk.
    const KNOWN_STAGES = ["initial", "progress", "complete", "rpa_result", "consultant_requested"];
    const stage = KNOWN_STAGES.includes(leadData.stage) ? leadData.stage : "complete";
    const updates = {};
    const cfAttempts = workingRecord.cf_retry_count || 0;

    const emailUrl =
      workingRecord.environment === "production"
        ? SEND_EMAIL_NOTIFICATION_URL_PROD.value()
        : SEND_EMAIL_NOTIFICATION_URL_DEV.value();

    // EspoCRM via proxy: no "initial" só envia se ainda não tiver sido
    // enviado; "progress"/"complete" tentam SEMPRE (atualização com dados
    // novos). "rpa_result"/"consultant_requested" NÃO passam pelo proxy
    // (achado na validação de 2026-07-20: não carregam nenhum campo novo
    // do payload legado, e uma atualização sem `espocrmLeadId` faz o
    // proxy devolver erro de ambiguidade) — o valor deles está no
    // enriquecimento via API direta (Note/description) abaixo.
    const needsEspocrm =
      stage === "initial" ? workingRecord.espocrm_sent !== true : stage === "progress" || stage === "complete";
    // Octadesk (mensagem inicial via proxy legado): só no "initial" —
    // nunca depois, para não duplicar a notificação (achado 2026-07-13).
    // As mensagens dos momentos pós-inicial saem pela API direta abaixo.
    const needsOctadesk = stage === "initial" && workingRecord.octadesk_sent !== true;

    // Bloco do ambiente do lead (`dev`/`prod` — ver docstring do secret);
    // formato antigo com as chaves no topo vale para os dois ambientes.
    const espoApiConfigAll = parseJsonConfig(ESPOCRM_API_CONFIG.value());
    const espoApiConfig =
      espoApiConfigAll && (espoApiConfigAll.dev || espoApiConfigAll.prod)
        ? (workingRecord.environment === "production" ? espoApiConfigAll.prod : espoApiConfigAll.dev) || null
        : espoApiConfigAll;
    const espoApiReady = Boolean(espoApiConfig && espoApiConfig.baseUrl && espoApiConfig.apiKey);
    // Flag de transição (plano 2026-07-28): `useDirect:true` no topo do
    // secret liga a entrega EspoCRM via API direta (espocrm.js — dedupe,
    // Lead + Opportunity, campos completos incl. todas as UTMs). SÓ vale
    // para ambientes cujo bloco esteja configurado — `prod` vazio mantém
    // os leads de produção no caminho proxy, intocado.
    const useEspoDirect = Boolean(espoApiConfigAll && espoApiConfigAll.useDirect === true && espoApiReady);
    const octaConfig = parseJsonConfig(OCTADESK_API_CONFIG.value());
    const octaReady = Boolean(
      octaConfig && octaConfig.enabled === true && octaConfig.baseUrl && octaConfig.apiKey && octaConfig.fromNumber
    );

    if (needsEspocrm && useEspoDirect) {
      // ——— EspoCRM via API direta (espocrm.js) ———
      // Mesmo contrato de retry/flags do caminho proxy; os IDs do CRM
      // continuam sendo gravados de volta no registro.
      let delivered = false;
      let attempt = 0;
      for (attempt = 0; attempt <= RETRY_DELAYS_MS.length && !delivered; attempt += 1) {
        try {
          const ids = await espo.deliverStage(espoApiConfig, leadData, {
            espoLeadId: leadData.espocrmLeadId || workingRecord.espocrmLeadId,
            espoOpportunityId: leadData.espocrmOpportunityId || workingRecord.espocrmOpportunityId,
            capturedAt: workingRecord.timestamp,
          });
          if (ids.leadId) updates.espocrmLeadId = ids.leadId;
          if (ids.opportunityId) updates.espocrmOpportunityId = ids.opportunityId;
          if (ids.recoveredStaleLead) {
            logger.info(`[deliverLead] Lead ${leadId}: espocrmLeadId stale recuperado → ${ids.leadId}`);
          }
          delivered = true;
        } catch (error) {
          logger.warn(`[deliverLead/espocrm-direto] Lead ${leadId}: tentativa ${attempt + 1} falhou.`, error);
          if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
      updates.espocrm_sent = delivered;
      updates.espocrm_attempts = (workingRecord.espocrm_attempts || 0) + attempt;
      updates.espocrm_last_error = delivered
        ? null
        : `Falha (API direta) após ${attempt} tentativa(s) — falhas acumuladas ${cfAttempts}`;

      if (delivered && stage === "initial") {
        await maybeSendAdminEmail({
          url: emailUrl,
          leadData,
          leadId,
          record: workingRecord,
          updates,
          flag: "email_espocrm_initial_sent",
          momento: "initial",
        });
      } else if (delivered && stage === "complete") {
        await maybeSendAdminEmail({
          url: emailUrl,
          leadData,
          leadId,
          record: workingRecord,
          updates,
          flag: "email_espocrm_update_sent",
          momento: "update",
        });
      }
    } else if (needsEspocrm) {
      // ——— EspoCRM via proxy legado (caminho de transição/fallback) ———
      const espocrmUrl =
        workingRecord.environment === "production" ? ESPOCRM_PROD_URL.value() : ESPOCRM_DEV_URL.value();
      const payloadData = {
        ...leadData,
        espocrmLeadId: leadData.espocrmLeadId || workingRecord.espocrmLeadId,
        espocrmOpportunityId: leadData.espocrmOpportunityId || workingRecord.espocrmOpportunityId,
      };
      const result = await sendWithRetry(
        espocrmUrl,
        buildLegacyProxyPayload(payloadData, stage === "initial" ? "Cloud Function — Lead Inicial EspoCRM" : "Cloud Function — Atualização EspoCRM"),
        "espocrm",
        leadId
      );
      updates.espocrm_sent = result.delivered;
      updates.espocrm_attempts = (workingRecord.espocrm_attempts || 0) + result.attempts;
      updates.espocrm_last_error = result.delivered
        ? null
        : `Falha após ${result.attempts} tentativa(s) — falhas acumuladas ${cfAttempts}`;

      const ids = extractEspoCrmIds(result.responseData);
      if (ids.leadId) updates.espocrmLeadId = ids.leadId;
      if (ids.opportunityId) updates.espocrmOpportunityId = ids.opportunityId;

      if (result.delivered && stage === "initial") {
        await maybeSendAdminEmail({
          url: emailUrl,
          leadData,
          leadId,
          record: workingRecord,
          updates,
          flag: "email_espocrm_initial_sent",
          momento: "initial",
        });
      } else if (result.delivered && stage === "complete") {
        await maybeSendAdminEmail({
          url: emailUrl,
          leadData,
          leadId,
          record: workingRecord,
          updates,
          flag: "email_espocrm_update_sent",
          momento: "update",
        });
      }
    }

    if (needsOctadesk) {
      // ——— Mensagem inicial ———
      // Preferência: template personalizado `primeira_etapa` (aprovado
      // pela Meta como Utilitário, SEM variáveis) via API direta. Se o
      // envio direto falhar (ou não estiver configurado), fallback para
      // o proxy legado — o prospect nunca fica sem a mensagem inicial.
      let sentDirect = false;
      let octaError = null;
      if (octaReady && octaConfig.templates && octaConfig.templates.primeira_etapa) {
        try {
          await octa.sendTemplate(octaConfig, "primeira_etapa", leadData, [], leadId);
          sentDirect = true;
          updates.octadesk_sent = true;
          updates.octadesk_attempts = (workingRecord.octadesk_attempts || 0) + 1;
          updates.octadesk_last_error = null;
        } catch (error) {
          octaError = error;
          logger.warn(`[deliverLead/octa-inicial] Lead ${leadId}: envio direto falhou — caindo para o proxy.`, error);
        }
      }
      if (!sentDirect) {
        const result = await sendWithRetry(
          OCTADESK_URL.value(),
          buildLegacyProxyPayload(leadData, "Cloud Function — Mensagem Inicial Octadesk"),
          "octadesk",
          leadId
        );
        updates.octadesk_sent = result.delivered;
        updates.octadesk_attempts = (workingRecord.octadesk_attempts || 0) + result.attempts;
        updates.octadesk_last_error = result.delivered
          ? null
          : `Falha após ${result.attempts} tentativa(s) — falhas acumuladas ${cfAttempts}`;
        if (!result.delivered && !octaError) {
          octaError = new Error(updates.octadesk_last_error || "Octadesk initial falhou");
        }
      }

      if (updates.octadesk_sent === true) {
        await maybeSendAdminEmail({
          url: emailUrl,
          leadData,
          leadId,
          record: workingRecord,
          updates,
          flag: "email_octa_initial_sent",
          momento: "initial",
        });
      } else {
        await maybeSendAdminEmail({
          url: emailUrl,
          leadData,
          leadId,
          record: workingRecord,
          updates,
          flag: "email_octa_initial_error_sent",
          momento: "initial_error",
          erro: emailNotif.errorPayload(octaError),
        });
      }
    }

    // ——— Enriquecimento da ficha no EspoCRM por momento (2026-07-20) ———
    // Note no Stream (linha do tempo que o vendedor vê) + description com
    // o resumo do cálculo. Best-effort com dedupe por estágio
    // (`espo_note_{stage}_sent`): falha aqui nunca segura a entrega
    // principal nem dispara retry — só é logada.
    const espoLeadIdForApi = updates.espocrmLeadId || workingRecord.espocrmLeadId || leadData.espocrmLeadId;
    const espoOppIdForApi =
      updates.espocrmOpportunityId || workingRecord.espocrmOpportunityId || leadData.espocrmOpportunityId;

    // Campos do painel "Cotação do Site" + `cWebpage` (origem) no Lead E
    // na Opportunity (2026-07-28) — via API direta, pois o proxy legado
    // não carrega nenhum deles (e grava cWebpage="mdmidia.com.br" fixo,
    // que é sobrescrito aqui). Mesmo contrato best-effort/dedupe das
    // Notes (`espo_fields_{stage}_sent`); o PUT é idempotente.
    const funnelFields = buildFunnelFields(stage, leadData);
    const fieldsFlag = `espo_fields_${stage}_sent`;
    if (espoApiReady && espoLeadIdForApi && funnelFields && workingRecord[fieldsFlag] !== true) {
      const payload = {
        ...funnelFields,
        cWebpage: espo.SITE_WEBPAGE,
      };
      try {
        await espo.putFields(espoApiConfig, "Lead", espoLeadIdForApi, payload, leadId);
        if (espoOppIdForApi) {
          await espo.putFields(espoApiConfig, "Opportunity", espoOppIdForApi, payload, leadId);
        }
        updates[fieldsFlag] = true;
      } catch (error) {
        logger.warn(`[deliverLead/espo-api] Lead ${leadId}: campos do funil (${stage}) falharam (best-effort).`, error);
      }
      // Canal de captura (2026-08-17): PUT separado — se o Enum
      // `cCanalCaptura` ainda não existir no Entity Manager, não pode
      // derrubar o PUT do funil (cEtapaFunil / cWebpage).
      const canal = espo.canalCapturaFields(leadData);
      if (Object.keys(canal).length > 0) {
        try {
          await espo.putFields(espoApiConfig, "Lead", espoLeadIdForApi, canal, leadId);
          if (espoOppIdForApi) {
            await espo.putFields(espoApiConfig, "Opportunity", espoOppIdForApi, canal, leadId);
          }
        } catch (error) {
          logger.warn(
            `[deliverLead/espo-api] Lead ${leadId}: cCanalCaptura falhou (campo pode não existir ainda).`,
            error,
          );
        }
      }
    }

    // Atribuição Ads (Fase 2): Lead extended + Opportunity pacote completo.
    // PUT best-effort separado do funil/canal — campos novos ou Opp sem
    // schema espelhado (prod até Fase 5) só falham em log.
    const attrFlag = `espo_attribution_${stage}_sent`;
    if (espoApiReady && espoLeadIdForApi && workingRecord[attrFlag] !== true) {
      const leadExt = espo.attributionLeadExtendedFields(leadData);
      const oppAttr = espo.attributionOpportunityFields(leadData);
      const hasAttr = Object.keys(leadExt).length > 0 || Object.keys(oppAttr).length > 0;
      if (hasAttr) {
        let attrOk = true;
        if (Object.keys(leadExt).length > 0) {
          try {
            await espo.putFields(espoApiConfig, "Lead", espoLeadIdForApi, leadExt, leadId);
          } catch (error) {
            attrOk = false;
            logger.warn(
              `[deliverLead/espo-api] Lead ${leadId}: atribuição extended falhou (campo pode não existir ainda).`,
              error,
            );
          }
        }
        if (espoOppIdForApi && Object.keys(oppAttr).length > 0) {
          try {
            await espo.putFields(espoApiConfig, "Opportunity", espoOppIdForApi, oppAttr, leadId);
          } catch (error) {
            attrOk = false;
            logger.warn(
              `[deliverLead/espo-api] Lead ${leadId}: atribuição Opportunity falhou (schema Opp incompleto?).`,
              error,
            );
          }
        }
        if (attrOk) updates[attrFlag] = true;
      }
    }
    const noteText = buildMomentNote(stage, leadData);
    const noteFlag = `espo_note_${stage}_sent`;
    if (espoApiReady && espoLeadIdForApi && noteText && workingRecord[noteFlag] !== true) {
      try {
        await espo.postNote(espoApiConfig, espoLeadIdForApi, noteText, leadId);
        // O resumo do cálculo também vai para a description — o campo
        // sempre visível no topo da ficha, sem precisar rolar o Stream.
        if (stage === "rpa_result") {
          await espo.appendDescription(espoApiConfig, espoLeadIdForApi, noteText, leadId);
        }
        updates[noteFlag] = true;
      } catch (error) {
        logger.warn(`[deliverLead/espo-api] Lead ${leadId}: enriquecimento (${stage}) falhou (best-effort).`, error);
      }
    }

    // ——— Task "Efetuar cálculo manual" (plano 2026-07-28) ———
    // Criada nos DOIS caminhos que exigem ação humana: o prospect pediu
    // o cálculo completo depois (4b) ou o RPA falhou. Acionável no CRM
    // (Atividades/dashboards) — não se perde como um post no Stream.
    const needsManualTask =
      stage === "consultant_requested" ||
      (stage === "rpa_result" && (leadData.rpaResultado || {}).status !== "sucesso");
    const taskFlag = `espo_task_${stage}_sent`;
    if (espoApiReady && espoLeadIdForApi && needsManualTask && workingRecord[taskFlag] !== true) {
      try {
        await espo.createManualCalcTask(espoApiConfig, espoLeadIdForApi, leadData, leadId);
        updates[taskFlag] = true;
      } catch (error) {
        logger.warn(`[deliverLead/espo-api] Lead ${leadId}: Task de cálculo manual (${stage}) falhou (best-effort).`, error);
      }
    }

    // ——— Mensagens Octadesk por momento, via API direta (2026-07-20) ———
    // "calculo_pronto"/"calculo_manual" (fim do RPA),
    // "calculo_completo_depois" (escolheu especialista) e
    // "cotacao_dados_recebidos" (complete do ContactLeadModal com dados
    // extras — 2026-07-29). Atrás do kill-switch `enabled` em
    // OCTADESK_API_CONFIG — só liga depois de os templates serem
    // aprovados pela Meta (docs/GUIA_OCTADESK_TEMPLATES.md).
    if (octaReady) {
      const nome = firstName(leadData.nome) || "cliente";
      let templateKey = null;
      let variables = [];

      if (stage === "consultant_requested") {
        templateKey = "calculo_completo_depois";
        variables = [nome];
      } else if (stage === "rpa_result") {
        const resultado = leadData.rpaResultado || {};
        if (resultado.status === "sucesso" && resultado.valorRecomendado) {
          templateKey = "calculo_pronto";
          // Ordem das variáveis conforme o template aprovado no Octadesk
          // (2026-07-27): var-1 = nome, var-2 = veículo, var-3 = valor.
          variables = [nome, leadData.veiculoMarcaModelo || "veículo", resultado.valorRecomendado];
        } else {
          templateKey = "calculo_manual";
          variables = [nome];
        }
      } else if (stage === "complete" && leadData.captureChannel === "contact_modal") {
        // Segunda HSM só no modal WA/tel, e só se o prospect preencheu
        // algo além do telefone (e-mail real / CEP / CPF / placa / nome).
        // LeadForm complete nunca entra aqui (captureChannel=lead_form).
        const emailReal =
          leadData.email && !/@imediatoseguros\.com\.br$/i.test(leadData.email) ? leadData.email : null;
        const hasExtra = Boolean(
          emailReal || leadData.cep || leadData.cpf || leadData.placa || firstName(leadData.nome)
        );
        if (hasExtra) {
          templateKey = "cotacao_dados_recebidos";
          variables = [];
        }
      }

      const octaFlag = templateKey ? `octa_${templateKey}_sent` : null;
      if (templateKey && workingRecord[octaFlag] !== true) {
        try {
          await octa.sendTemplate(octaConfig, templateKey, leadData, variables, leadId);
          updates[octaFlag] = true;
          await maybeSendAdminEmail({
            url: emailUrl,
            leadData,
            leadId,
            record: workingRecord,
            updates,
            flag: `email_octa_${templateKey}_sent`,
            momento: "update",
          });
        } catch (error) {
          logger.warn(`[deliverLead/octa-api] Lead ${leadId}: template "${templateKey}" falhou (best-effort).`, error);
          await maybeSendAdminEmail({
            url: emailUrl,
            leadData,
            leadId,
            record: workingRecord,
            updates,
            flag: `email_octa_${templateKey}_error_sent`,
            momento: "update_error",
            erro: emailNotif.errorPayload(error),
          });
        }
      }
    }

    const espocrmOk = needsEspocrm ? updates.espocrm_sent : true;
    const octadeskOk = needsOctadesk
      ? updates.octadesk_sent
      : workingRecord.octadesk_sent === true || stage !== "initial";
    const stillFailing = !espocrmOk || !octadeskOk;

    // cf_retry_count só sobe em falha de entrega — estágios ok não queimam o teto.
    if (stillFailing) {
      updates.cf_retry_count = cfAttempts + 1;
    }

    // Se ainda falhar, mantém autoSync:true — o próprio update() abaixo
    // dispara uma nova rodada desta função (até MAX_CF_ATTEMPTS_TOTAL falhas).
    updates.autoSync = stillFailing;
    if (!stillFailing) {
      updates.status = "synced";
      updates.synced = true;
    }

    await snapshot.ref.update(updates);

    logger.info(
      `[deliverLead] Lead ${leadId} (stage=${stage}), falhas=${stillFailing ? updates.cf_retry_count : cfAttempts}: espocrm_sent=${updates.espocrm_sent ?? workingRecord.espocrm_sent}, octadesk_sent=${updates.octadesk_sent ?? workingRecord.octadesk_sent}, autoSync=${updates.autoSync}.`
    );
  }
);

/**
 * E-mail do formulário `/contato` (2026-08-01).
 *
 * Achado: o servidor cPanel bloqueia SMTP e HTTP/API vindos de IPs GCP
 * (535 / 403). Por isso esta função NÃO envia mais o e-mail — só marca
 * o registro como pendente. O cron no cPanel
 * (`process-contact-queue.php`) puxa as pendentes via
 * `listPendingContactMessages` (saída cPanel→GCP funciona) e envia
 * com Exim local. Ver firebase/functions/contact-email.js.
 */
exports.sendContactEmail = onValueCreated(
  {
    ref: "/contact_messages/{messageId}",
    instance: "imediato-seguros-site-novo-default-rtdb",
    region: "us-central1",
  },
  async (event) => {
    const messageId = event.params.messageId;
    const message = event.data && event.data.val();
    if (!message || !message.mensagem) {
      logger.warn(`[sendContactEmail] ${messageId}: registro vazio/incompleto — ignorado.`);
      return;
    }
    // Deixa emailSent=false para o cron do cPanel processar.
    await event.data.ref.update({
      emailPending: true,
      emailPendingAt: new Date().toISOString(),
    });
    logger.info(`[sendContactEmail] ${messageId}: pendente para cron cPanel.`);
  }
);

/**
 * Lista mensagens `/contato` ainda não enviadas — chamado pelo cron PHP
 * no cPanel (outbound do servidor de e-mail para o GCP).
 * Auth: query `key` = `pullSecret` em CONTACT_SMTP_CONFIG.
 */
exports.listPendingContactMessages = onRequest(
  {
    region: "us-central1",
    secrets: [CONTACT_SMTP_CONFIG],
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "GET") {
      res.status(405).json({ ok: false, error: "method" });
      return;
    }
    const expected = contactEmail.getPullSecret(CONTACT_SMTP_CONFIG.value());
    if (!expected || req.query.key !== expected) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }

    try {
      const snap = await getDatabase().ref("contact_messages").limitToLast(50).get();
      const all = snap.val() || {};
      const pending = Object.entries(all)
        .filter(([, m]) => m && m.mensagem && m.emailSent !== true)
        .slice(0, 20)
        .map(([id, m]) => ({
          id,
          nome: m.nome || "",
          email: m.email || "",
          telefone: m.telefone || "",
          assunto: m.assunto || "",
          mensagem: m.mensagem || "",
          createdAt: m.createdAt || "",
        }));
      res.status(200).json({ ok: true, messages: pending });
    } catch (error) {
      logger.error("[listPendingContactMessages]", error);
      res.status(500).json({ ok: false, error: "db" });
    }
  }
);

/**
 * Marca mensagem como enviada após o cron PHP despachar o e-mail.
 */
exports.markContactMessageSent = onRequest(
  {
    region: "us-central1",
    secrets: [CONTACT_SMTP_CONFIG],
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "method" });
      return;
    }
    const expected = contactEmail.getPullSecret(CONTACT_SMTP_CONFIG.value());
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const key = req.query.key || body.key;
    if (!expected || key !== expected) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }
    const id = String(body.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    if (!id) {
      res.status(400).json({ ok: false, error: "id" });
      return;
    }
    try {
      await getDatabase().ref(`contact_messages/${id}`).update({
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        emailError: null,
        emailPending: false,
      });
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error("[markContactMessageSent]", error);
      res.status(500).json({ ok: false, error: "db" });
    }
  }
);
