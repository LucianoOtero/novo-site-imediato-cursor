import { appEnvironment, firebaseBackupEnabled } from "@/lib/env";
import { getLeadBackupDatabase } from "@/lib/leads/firebase-admin";
import type { LeadRecord } from "@/lib/leads/types";

/**
 * lib/leads/firebase-backup.ts — grava todo lead no Firebase Realtime
 * Database (projeto 2026-07-12; reestruturado em 2026-07-13 para a
 * arquitetura "Firebase-only" — ver
 * `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md`).
 *
 * **Desde 2026-07-13, esta é a única gravação que `app/api/lead/route.ts`
 * faz** — não há mais entrega direta a EspoCRM/Octadesk antes disto. A
 * Cloud Function `deliverLead` (`firebase/functions/index.js`),
 * disparada por esta própria gravação, é quem chama os proxies Cloud
 * Run de verdade. Por isso `autoSync` é **sempre `true`** agora (antes,
 * só era `true` quando a entrega direta síncrona falhava) — réplica
 * fiel do modo "Firebase-Only" que já é a configuração ativa confirmada
 * no site legado (`window.MODAL_FIREBASE_ONLY = true`).
 *
 * `.update()` em vez de `.set()` (mudança 2026-07-13): um mesmo
 * `leadId` recebe 2 gravações ao longo da captura em 2 fases
 * (`stage: "initial"` depois `stage: "complete"`) — `.set()`
 * substituiria o registro inteiro, apagando os campos que a própria
 * Cloud Function grava de volta nele entre as 2 gravações do site
 * (`espocrmLeadId`, `espocrmOpportunityId`, `espocrm_sent`, etc.).
 * `.update()` só sobrescreve as chaves informadas, preservando o resto.
 *
 * Nunca lança erro — se o Firebase falhar ou não estiver configurado
 * (`firebaseBackupEnabled === false`), só loga um aviso. A resposta ao
 * usuário nunca depende disto.
 */
export async function saveLeadBackupToFirebase(lead: LeadRecord): Promise<void> {
  const database = getLeadBackupDatabase();
  if (!database) {
    if (!firebaseBackupEnabled) {
      console.info(
        `[lib/leads/firebase-backup] Modo mock — Firebase não configurado, lead ${lead.id} não foi gravado (só log).`
      );
    }
    return;
  }

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
      // Granulares (projeto 2026-07-16) — uso futuro no cálculo do RPA.
      veiculoMarca: lead.veiculoMarca ?? null,
      veiculoModelo: lead.veiculoModelo ?? null,
      veiculoAnoFabricacao: lead.veiculoAnoFabricacao ?? null,
      veiculoAnoModelo: lead.veiculoAnoModelo ?? null,
      utm: lead.utm ?? null,
      // A Cloud Function usa isso para decidir o comportamento por
      // estágio (Octadesk só no "initial"; EspoCRM sempre atualiza no
      // "complete") e para o fallback de NOME/Email "falsos".
      stage: lead.stage,
      // Projeto "leads EspoCRM/Octadesk por momento" (2026-07-20): a
      // escolha do passo 4 e o resumo do cálculo RPA viajam ao Firebase
      // para a Cloud Function enriquecer o EspoCRM (description + Note
      // no Stream) e disparar as mensagens Octadesk por momento.
      rpaChoice: lead.rpaChoice ?? null,
      rpaResultado: lead.rpaResultado ?? null,
    },
    timestamp: lead.createdAt,
    status: "pending",
    synced: false,
    source: "site_novo",
    environment: appEnvironment,
    autoSync: true,
  };

  try {
    await database.ref(`leads_backup/${lead.id}`).update(record);
  } catch (error) {
    console.warn(`[lib/leads/firebase-backup] Falha ao gravar backup do lead ${lead.id} no Firebase (não bloqueante):`, error);
  }
}
