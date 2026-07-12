import { appEnvironment, firebaseBackupEnabled } from "@/lib/env";
import { getLeadBackupDatabase } from "@/lib/leads/firebase-admin";
import type { WebhookResult } from "@/lib/leads/webhook";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/firebase-backup.ts — backup de todo lead no Firebase Realtime
 * Database (projeto 2026-07-12, paridade com `firebase_backup_leads.js`
 * do site legado — ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md`
 * e `docs/ANALISE_ESPOCRM_OCTADESK_FIREBASE_CLOUDRUN.md`).
 *
 * Mesma estrutura de registro do legado (`leads_backup/{leadId}`, campos
 * `*_sent`/`*_attempts`/`*_last_error`, flag `autoSync`), com duas
 * diferenças deliberadas:
 * - Grava **depois** de tentar a entrega direta (nunca só "Firebase-Only")
 *   — a entrega direta com retry já aconteceu em `lib/leads/webhook.ts`;
 *   este backup é auditoria + gatilho de reentrega, nunca o único caminho.
 * - `environment` usa o `appEnvironment` do próprio site novo
 *   (development/staging/production), para a Cloud Function (Fase C)
 *   saber qual URL de EspoCRM usar ao reenviar.
 *
 * Nunca lança erro — se o Firebase falhar ou não estiver configurado
 * (`firebaseBackupEnabled === false`), só loga um aviso. O envio do lead
 * a EspoCRM/Octadesk (e a resposta ao usuário) nunca depende disto.
 */
export async function saveLeadBackupToFirebase(lead: LeadRecord, result: WebhookResult): Promise<void> {
  const database = getLeadBackupDatabase();
  if (!database) {
    if (!firebaseBackupEnabled) {
      console.info(
        `[lib/leads/firebase-backup] Modo mock — Firebase não configurado, lead ${lead.id} não foi gravado (só log).`
      );
    }
    return;
  }

  const autoSync = !result.espocrm.delivered || !result.octadesk.delivered;

  const record = {
    data: {
      ramo: lead.ramo,
      phoneE164: lead.phoneE164,
      nome: lead.nome ?? null,
      cpf: lead.cpf ?? null,
      cep: lead.cep ?? null,
      placa: lead.placa ?? null,
      email: lead.email ?? null,
      veiculoAno: lead.veiculoAno ?? null,
      veiculoMarcaModelo: lead.veiculoMarcaModelo ?? null,
      utm: lead.utm ?? null,
    },
    timestamp: lead.createdAt,
    status: result.delivered ? "synced" : "pending",
    synced: result.delivered,
    source: "site_novo",
    environment: appEnvironment,
    autoSync,
    espocrm_sent: result.espocrm.delivered,
    espocrm_attempts: result.espocrm.attempts,
    espocrm_last_error: result.espocrm.delivered ? null : `Falha após ${result.espocrm.attempts} tentativa(s)`,
    octadesk_sent: result.octadesk.delivered,
    octadesk_attempts: result.octadesk.attempts,
    octadesk_last_error: result.octadesk.delivered ? null : `Falha após ${result.octadesk.attempts} tentativa(s)`,
  };

  try {
    await database.ref(`leads_backup/${lead.id}`).set(record);
  } catch (error) {
    console.warn(`[lib/leads/firebase-backup] Falha ao gravar backup do lead ${lead.id} no Firebase (não bloqueante):`, error);
  }
}
