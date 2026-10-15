import { getLeadBackupDatabase } from "@/lib/leads/firebase-admin";
import type {
  SuhaiCotacaoResumo,
  SuhaiOfertaResumo,
  SuhaiPropostaResumo,
  SuhaiStage,
} from "@/lib/leads/types";
import { encontrarPlano } from "@/lib/suhai/planos";
import type { CotacaoPayload, CotacaoResultado } from "@/lib/suhai/types";

/**
 * lib/leads/suhai-etapas.ts — grava no registro do lead (Firebase RTDB) os
 * marcos da cotação Suhai que só o servidor conhece: o protocolo e as
 * ofertas devolvidas pela Suhai, o plano escolhido e o número da proposta.
 *
 * A gravação reaproveita o gatilho da Cloud Function `deliverLead`, que
 * leva os dados ao EspoCRM, ao Octadesk e ao e-mail administrativo — o
 * mesmo caminho do modal e do LeadForm. Nunca cria registro novo: sem
 * lead de telefone anterior não há para onde levar a cotação.
 *
 * Nunca lança — a resposta da cotação ao cliente não depende disto.
 */

const LEAD_ID = /^ld_[a-f0-9]{12}$/;

/** `leadId` opcional que o formulário Suhai manda junto do corpo da cotação/proposta. */
export function lerLeadId(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const valor = (json as { leadId?: unknown }).leadId;
  return typeof valor === "string" && LEAD_ID.test(valor) ? valor : undefined;
}

export function suhaiAmbiente(): "homologacao" | "producao" {
  return process.env.SUHAI_AMBIENTE === "producao" ? "producao" : "homologacao";
}

export function resumirOfertas(resultado: CotacaoResultado): SuhaiOfertaResumo[] {
  return resultado.ofertas.map((oferta) => ({
    cdCobertura: oferta.cdCobertura,
    plano: encontrarPlano(oferta.planoId)?.nome ?? oferta.planoId,
    assistencia: oferta.assistencia,
    premioTotal: oferta.premioTotal,
    premioMensalEstimado: oferta.premioMensalEstimado,
    franquia: oferta.franquia,
    importanciaSegurada: oferta.importanciaSegurada,
    parcelamentoMaximo: oferta.parcelamentoMaximo,
  }));
}

export function resumirCotacao(
  payload: CotacaoPayload,
  saida: { resultado: CotacaoResultado } | { erro: string; codigoSuhai?: string | null },
): SuhaiCotacaoResumo {
  const premissas = {
    utilizacao: payload.uso.utilizacao,
    tipoUtilizacao: payload.uso.tipoUtilizacao,
    garagemResidencia: payload.uso.garagem.residencia,
    garagemTrabalho: payload.uso.garagem.trabalho,
    garagemEscola: payload.uso.garagem.escola,
    classeBonus: payload.contrato.classeBonus,
    cepPernoite: payload.uso.cepPernoite,
  };
  const veiculo = [payload.veiculo.marca, payload.veiculo.modelo, payload.veiculo.anoModelo].filter(Boolean).join(" ");
  const base = { ambiente: suhaiAmbiente(), veiculo, premissas, geradoEm: new Date().toISOString() };

  if ("resultado" in saida) {
    return {
      ...base,
      status: "sucesso",
      simulado: saida.resultado.simulado,
      protocolo: saida.resultado.protocolo,
      valorFipe: saida.resultado.veiculo.valorFipe,
      ofertas: resumirOfertas(saida.resultado),
    };
  }
  return { ...base, status: "falha", simulado: false, erro: saida.erro, codigoSuhai: saida.codigoSuhai ?? null };
}

/** Remove `undefined` em profundidade — o RTDB recusa a gravação inteira se houver um. */
function semIndefinidos<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

type Patch = {
  suhaiCotacao?: SuhaiCotacaoResumo;
  suhaiPlano?: SuhaiOfertaResumo;
  suhaiProposta?: SuhaiPropostaResumo;
  email?: string;
  nome?: string;
  cpf?: string;
  cep?: string;
  placa?: string;
  veiculoMarca?: string;
  veiculoModelo?: string;
  veiculoAnoModelo?: string;
  veiculoAnoFabricacao?: string;
  veiculoMarcaModelo?: string;
  veiculoAno?: string;
};

/** Dados da etapa 4 (nome e CPF) e do veículo, que viajam no corpo da cotação. */
export function dadosDaCotacao(payload: CotacaoPayload): Patch {
  const anoModelo = String(payload.veiculo.anoModelo);
  return {
    nome: payload.proponente.nome,
    cpf: payload.proponente.cpf,
    cep: payload.uso.cepPernoite,
    placa: payload.veiculo.placa,
    veiculoMarca: payload.veiculo.marca,
    veiculoModelo: payload.veiculo.modelo,
    veiculoAnoModelo: anoModelo,
    veiculoAnoFabricacao: payload.veiculo.anoFabricacao ? String(payload.veiculo.anoFabricacao) : undefined,
    veiculoMarcaModelo: `${payload.veiculo.marca} ${payload.veiculo.modelo}`,
    veiculoAno: anoModelo,
  };
}

async function gravar(leadId: string | undefined, stage: SuhaiStage, montar: (dados: Record<string, unknown>) => Patch | null) {
  if (!leadId || !LEAD_ID.test(leadId)) return false;
  const database = getLeadBackupDatabase();
  if (!database) {
    console.info(`[suhai-etapas] Firebase não configurado — ${stage} do lead ${leadId} não foi gravado.`);
    return false;
  }

  try {
    const ref = database.ref(`leads_backup/${leadId}`);
    const snapshot = await ref.child("data").get();
    const dados = snapshot.val() as Record<string, unknown> | null;
    if (!dados || !dados.phoneE164) {
      console.warn(`[suhai-etapas] Lead ${leadId} não existe no Firebase — ${stage} ignorado.`);
      return false;
    }
    const patch = montar(dados);
    if (!patch) return false;

    const update: Record<string, unknown> = {
      "data/stage": stage,
      "data/captureChannel": "suhai_form",
      status: "pending",
      synced: false,
      autoSync: true,
    };
    for (const [campo, valor] of Object.entries(semIndefinidos(patch))) {
      update[`data/${campo}`] = valor;
    }
    await ref.update(update);
    return true;
  } catch (error) {
    console.warn(`[suhai-etapas] Falha ao gravar ${stage} do lead ${leadId} (não bloqueante):`, error);
    return false;
  }
}

/** Consultas de perfil (PH3A) por lead: cobre correções de CPF digitado errado. */
const MAX_CONSULTAS_PERFIL = 3;

/**
 * Reserva uma consulta de perfil por CPF para o lead. A consulta devolve
 * dados pessoais, então só vale para um lead de telefone que já existe e
 * tem limite por lead. Fica fora de `leads_backup/` para não disparar a
 * Cloud Function.
 */
export async function reservarConsultaPerfil(leadId: string | undefined): Promise<boolean> {
  if (!leadId || !LEAD_ID.test(leadId)) return false;
  const database = getLeadBackupDatabase();
  if (!database) return false;

  try {
    const telefone = await database.ref(`leads_backup/${leadId}/data/phoneE164`).get();
    if (!telefone.exists()) return false;
    const resultado = await database
      .ref(`suhai_perfil_consultas/${leadId}`)
      .transaction((atual: number | null) => ((atual ?? 0) >= MAX_CONSULTAS_PERFIL ? undefined : (atual ?? 0) + 1));
    return resultado.committed;
  } catch (error) {
    console.warn(`[suhai-etapas] Falha ao reservar consulta de perfil do lead ${leadId}:`, error);
    return false;
  }
}

export function registrarCotacaoSuhai(leadId: string | undefined, payload: CotacaoPayload, cotacao: SuhaiCotacaoResumo) {
  return gravar(leadId, "suhai_quote", () => ({ ...dadosDaCotacao(payload), suhaiCotacao: cotacao }));
}

/** Os valores do plano vêm da cotação já gravada, não do browser. */
export function registrarPlanoSuhai(leadId: string | undefined, cdCobertura: number) {
  return gravar(leadId, "suhai_plan_selected", (dados) => {
    const cotacao = dados.suhaiCotacao as SuhaiCotacaoResumo | undefined;
    const plano = cotacao?.ofertas?.find((oferta) => oferta.cdCobertura === cdCobertura);
    if (!plano) {
      console.warn(`[suhai-etapas] cdCobertura ${cdCobertura} fora da cotação do lead ${leadId} — plano ignorado.`);
      return null;
    }
    return { suhaiPlano: plano };
  });
}

export function registrarPropostaSuhai(leadId: string | undefined, proposta: SuhaiPropostaResumo, email?: string) {
  return gravar(leadId, "suhai_proposal", (dados) => {
    const cotacao = dados.suhaiCotacao as SuhaiCotacaoResumo | undefined;
    const plano = cotacao?.ofertas?.find((oferta) => oferta.cdCobertura === proposta.cdCobertura);
    return { suhaiProposta: proposta, ...(plano ? { suhaiPlano: plano } : {}), ...(email ? { email } : {}) };
  });
}
