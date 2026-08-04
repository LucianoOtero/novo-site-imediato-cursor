/**
 * firebase/functions/espocrm.js — integração direta com a API REST do
 * EspoCRM (projeto "Firebase como cofre, Functions como camada única de
 * entrega", 2026-07-28 — ver plano "Fluxo formulário CRM WhatsApp" e
 * docs/FLUXO_LEADFORM_CRM_WHATSAPP.md).
 *
 * Réplica fiel da lógica do proxy Cloud Run legado (fonte estudado:
 * add_flyingdonkeys.php), com as "manhas" documentadas:
 * - NUNCA enviar campos vazios em PUT (o EspoCRM pode rejeitar o request);
 * - NUNCA `amount: 0` (validação de currency);
 * - NUNCA `leadId` em atualização de Opportunity;
 * - duplicata não é erro: vira atualização do lead existente
 *   (dedupe por e-mail real e por telefone/cCelular).
 *
 * Divergência deliberada do proxy legado (decisão do cliente,
 * 2026-08-04): o dedupe vale só para o **Lead**. A Opportunity é
 * **uma por jornada de conversão** — reaproveitada apenas via
 * `espocrmOpportunityId` do registro RTDB corrente; sem busca por
 * `cLeadId` no CRM. Cada retorno do prospect vira um negócio novo no
 * pipeline (as Opportunities antigas ficam intocadas).
 *
 * Extensões além do proxy (inventário de campos de 2026-07-28):
 * - conjunto COMPLETO de UTM (o proxy só envia cGclid/cUtmSource/
 *   cUtmCampaign) + cGbraid;
 * - cVeiculo/cAnoFab (o proxy só preenche cMarca/cAnoMod);
 * - cDataDoLead (data de captura);
 * - cWebpage = SITE_WEBPAGE (o proxy grava "mdmidia.com.br" fixo);
 * - na Opportunity, cLeadId (vínculo em texto usado pelos relatórios).
 */

/**
 * Origem gravada em `cWebpage` no Lead E na Opportunity (decisão do
 * cliente, 2026-07-28: o domínio real do site novo) — discriminador de
 * origem entre os dois sites nas listas/relatórios do CRM.
 */
const SITE_WEBPAGE = "comparaseguroonline.com.br";

/** Fallbacks de nome/e-mail "falsos" derivados do telefone — o EspoCRM exige os dois não-vazios (mesma regra do proxy/CF). */
function fallbackIdentity(leadData) {
  const phoneE164 = leadData.phoneE164 || "";
  const ddd = phoneE164.slice(3, 5);
  const celular = phoneE164.slice(5);
  return {
    nome: leadData.nome || `${ddd}-${celular}-NOVO CLIENTE WHATSAPP`,
    email: leadData.email || `${ddd}${celular}@imediatoseguros.com.br`,
    celular: `${ddd}${celular}`,
  };
}

/** Remove chaves com valor vazio/nulo — regra do proxy: nunca enviar campo vazio ao EspoCRM. */
function compact(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}

/** Requisição autenticada à API REST (`X-Api-Key`). Lança em resposta não-OK; devolve o JSON do corpo quando houver. */
async function espoRequest(config, method, path, body) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/v1/${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Api-Key": config.apiKey },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const error = new Error(`${method} ${path} HTTP ${response.status}: ${text.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
  const text = await response.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Mapeamento site → campos do Lead (nomes confirmados no CRM dev e no
 * fonte do proxy). Só o que existe no payload entra (compact) — o
 * fallback de nome/e-mail é aplicado apenas na criação (`isCreate`),
 * para nunca sobrescrever um nome real com um "falso" numa atualização.
 */
function buildLeadFields(leadData, { isCreate = false, capturedAt } = {}) {
  const fb = fallbackIdentity(leadData);
  const utm = leadData.utm || {};
  return compact({
    firstName: isCreate ? fb.nome : leadData.nome,
    emailAddress: isCreate ? fb.email : leadData.email,
    cCelular: fb.celular,
    addressPostalCode: leadData.cep,
    ...(isCreate ? { addressCountry: "Brasil", source: "Site", cDataDoLead: (capturedAt || new Date().toISOString()).slice(0, 10) } : {}),
    cCpftext: leadData.cpf,
    cMarca: leadData.veiculoMarca || leadData.veiculoMarcaModelo,
    cVeiculo: leadData.veiculoModelo,
    cAnoFab: leadData.veiculoAnoFabricacao,
    cAnoMod: leadData.veiculoAnoModelo || leadData.veiculoAno,
    cPlaca: leadData.placa,
    cGclid: utm.gclid,
    cGbraid: utm.gbraid,
    cUtmSource: utm.utm_source,
    cUtmMedium: utm.utm_medium,
    cUtmCampaign: utm.utm_campaign,
    cUtmContent: utm.utm_content,
    cUtmTerm: utm.utm_term,
    cWebpage: SITE_WEBPAGE,
  });
}

/** Campos da Opportunity espelhados do Lead (nomes próprios da entidade — `cEmailAdress`/`cCEP`). `leadId`/`stage`/`probability` só na criação; `name` no update só com nome real (paridade com proxy legado / Lead.firstName). */
function buildOpportunityFields(leadData, { isCreate = false, espoLeadId } = {}) {
  const fb = fallbackIdentity(leadData);
  const utm = leadData.utm || {};
  return compact({
    ...(isCreate
      ? {
          name: fb.nome,
          leadId: espoLeadId,
          cLeadId: espoLeadId,
          stage: "Novo Sem Contato",
          probability: 10,
          leadSource: "Site",
        }
      : { name: leadData.nome }),
    cCelular: fb.celular,
    cEmailAdress: isCreate ? fb.email : leadData.email,
    cCEP: leadData.cep,
    cCpftext: leadData.cpf,
    cMarca: leadData.veiculoMarca || leadData.veiculoMarcaModelo,
    cVeiculo: leadData.veiculoModelo,
    cAnoFab: leadData.veiculoAnoFabricacao,
    cAnoMod: leadData.veiculoAnoModelo || leadData.veiculoAno,
    cPlaca: leadData.placa,
    cGclid: utm.gclid,
    cWebpage: SITE_WEBPAGE,
  });
}

/**
 * Dedupe do proxy: procura Lead existente por e-mail REAL (nunca o
 * "falso" derivado do telefone) e depois por telefone (`cCelular`).
 * Devolve o id do primeiro encontrado ou `null`.
 */
async function findExistingLead(config, leadData) {
  const fb = fallbackIdentity(leadData);
  const searches = [];
  if (leadData.email && !/@imediatoseguros\.com\.br$/i.test(leadData.email)) {
    searches.push({ attribute: "emailAddress", value: leadData.email });
  }
  if (fb.celular) searches.push({ attribute: "cCelular", value: fb.celular });

  for (const { attribute, value } of searches) {
    const params = new URLSearchParams({
      maxSize: "1",
      "where[0][type]": "equals",
      "where[0][attribute]": attribute,
      "where[0][value]": value,
    });
    const result = await espoRequest(config, "GET", `Lead?${params.toString()}`);
    const found = result && Array.isArray(result.list) && result.list[0];
    if (found && found.id) return found.id;
  }
  return null;
}

/**
 * Tenta PUT; em 404/403 (ID apagado no CRM / sem permissão) devolve
 * `stale:true` para o caller recriar. Outros erros propagam.
 */
async function putOrDetectStale(config, path, fields) {
  try {
    if (Object.keys(fields).length > 0) await espoRequest(config, "PUT", path, fields);
    return { stale: false };
  } catch (error) {
    if (error.status === 404 || error.status === 403) {
      return { stale: true, status: error.status };
    }
    throw error;
  }
}

/**
 * Entrega de um estágio ao EspoCRM via API direta — o coração do modo
 * `useDirect`. Lead: cria (com dedupe) ou atualiza. Opportunity: uma
 * por jornada — atualiza somente quando `espoOpportunityId` veio do
 * registro RTDB desta jornada; senão cria nova (2026-08-04). Devolve
 * `{leadId, opportunityId}` (os IDs do CRM, para gravar de volta no
 * registro do RTDB).
 *
 * Se o RTDB guarda um `espocrmLeadId` stale (ex.: Lead apagado no E2E),
 * o PUT 404/403 invalida o ID, refaz dedupe e cria de novo se preciso.
 */
async function deliverStage(config, leadData, { espoLeadId, espoOpportunityId, capturedAt } = {}) {
  let leadId = espoLeadId || null;
  let opportunityId = espoOpportunityId || null;
  let recoveredStaleLead = false;

  if (!leadId) {
    leadId = await findExistingLead(config, leadData);
  }

  if (!leadId) {
    const created = await espoRequest(config, "POST", "Lead", buildLeadFields(leadData, { isCreate: true, capturedAt }));
    if (!created || !created.id) throw new Error("POST Lead sem id na resposta");
    leadId = created.id;
  } else {
    const fields = buildLeadFields(leadData, { isCreate: false });
    const put = await putOrDetectStale(config, `Lead/${leadId}`, fields);
    if (put.stale) {
      recoveredStaleLead = true;
      leadId = await findExistingLead(config, leadData);
      opportunityId = null;
      if (!leadId) {
        const created = await espoRequest(config, "POST", "Lead", buildLeadFields(leadData, { isCreate: true, capturedAt }));
        if (!created || !created.id) throw new Error("POST Lead (recover) sem id na resposta");
        leadId = created.id;
      } else if (Object.keys(fields).length > 0) {
        await espoRequest(config, "PUT", `Lead/${leadId}`, fields);
      }
    }
  }

  // Opportunity NOVA por jornada (decisão do cliente, 2026-08-04): o id
  // só vem do registro RTDB da jornada corrente (`espocrmOpportunityId`,
  // gravado na primeira entrega) — não existe mais busca por `cLeadId`
  // no CRM. Prospect recorrente (nova jornada, dias/meses depois) ganha
  // outra Opportunity ("Novo Sem Contato", 10%); as antigas ficam
  // intocadas, com estágio/histórico preservados. `cLeadId` deixa de
  // ser 1:1 com o Lead.
  if (!opportunityId) {
    const created = await espoRequest(
      config,
      "POST",
      "Opportunity",
      buildOpportunityFields(leadData, { isCreate: true, espoLeadId: leadId })
    );
    opportunityId = (created && created.id) || null;
  } else {
    const fields = buildOpportunityFields(leadData, { isCreate: false });
    const put = await putOrDetectStale(config, `Opportunity/${opportunityId}`, fields);
    if (put.stale) {
      // ID da jornada apagado no CRM: cria outra (nunca "ressuscita" a
      // Opportunity de uma jornada antiga).
      const created = await espoRequest(
        config,
        "POST",
        "Opportunity",
        buildOpportunityFields(leadData, { isCreate: true, espoLeadId: leadId })
      );
      opportunityId = (created && created.id) || null;
    }
  }

  return { leadId, opportunityId, recoveredStaleLead };
}

/** PUT de campos avulsos em qualquer entidade (painel "Cotação do Site" + cWebpage no Lead e na Opportunity). */
async function putFields(config, entityType, entityId, fields, leadId) {
  const clean = compact(fields);
  if (Object.keys(clean).length === 0) return;
  try {
    await espoRequest(config, "PUT", `${entityType}/${entityId}`, clean);
  } catch (error) {
    throw new Error(`PUT ${entityType} (lead ${leadId}): ${error.message}`);
  }
}

/** POST /api/v1/Note — post no Stream do lead (best-effort; 1 tentativa). */
async function postNote(config, espoLeadId, text, leadId) {
  try {
    await espoRequest(config, "POST", "Note", { type: "Post", parentType: "Lead", parentId: espoLeadId, post: text });
  } catch (error) {
    throw new Error(`Note (lead ${leadId}): ${error.message}`);
  }
}

/** Acrescenta texto à `description` do Lead (GET + PUT — a API não tem append nativo). */
async function appendDescription(config, espoLeadId, text, leadId) {
  const lead = await espoRequest(config, "GET", `Lead/${espoLeadId}`);
  const existing = lead && typeof lead.description === "string" && lead.description.trim() ? `${lead.description.trim()}\n\n` : "";
  try {
    await espoRequest(config, "PUT", `Lead/${espoLeadId}`, { description: `${existing}${text}` });
  } catch (error) {
    throw new Error(`PUT description (lead ${leadId}): ${error.message}`);
  }
}

/**
 * POST /api/v1/Task — "Efetuar cálculo manual e enviar ao cliente",
 * vinculada ao Lead, prazo D+1 (etapa 4b e falha do RPA). Acionável:
 * aparece em Atividades/dashboards do vendedor e não se perde como um
 * post no Stream.
 */
async function createManualCalcTask(config, espoLeadId, leadData, leadId) {
  const fb = fallbackIdentity(leadData);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  try {
    await espoRequest(config, "POST", "Task", {
      name: "Efetuar cálculo manual e enviar ao cliente",
      status: "Not Started",
      dateEnd: `${tomorrow} 18:00:00`,
      parentType: "Lead",
      parentId: espoLeadId,
      // Este CRM valida `assignedUser` como obrigatório em Task (achado
      // 2026-07-28, HTTP 400 validationFailure). O responsável vem do
      // bloco do ambiente no secret (`taskAssignedUserId`) — no dev é o
      // admin; em produção, o usuário/distribuidor que o time escolher.
      ...(config.taskAssignedUserId ? { assignedUserId: config.taskAssignedUserId } : {}),
      description: `Prospect ${fb.nome} (${leadData.phoneE164 || ""}) aguarda o cálculo completo do seguro — preparar a cotação nas 18 seguradoras e retornar pelo WhatsApp.`,
    });
  } catch (error) {
    throw new Error(`Task (lead ${leadId}): ${error.message}`);
  }
}

module.exports = {
  SITE_WEBPAGE,
  deliverStage,
  putFields,
  postNote,
  appendDescription,
  createManualCalcTask,
};
