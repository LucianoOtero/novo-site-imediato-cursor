import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getDatabase, type Database } from "firebase-admin/database";

import { env, firebaseBackupEnabled } from "@/lib/env";

/**
 * lib/leads/firebase-admin.ts — inicialização do Firebase Admin SDK
 * (projeto 2026-07-12, paridade com o backup em Firebase Realtime
 * Database do site legado — ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md`).
 *
 * Diferença deliberada em relação ao legado: lá, `firebase_backup_leads.js`
 * usa o SDK client-side (carregado via CDN no navegador, com a `apiKey`
 * pública do projeto). Aqui, como a gravação acontece em `/api/lead`
 * (server-side), usamos o **Admin SDK** com credenciais de service account
 * — mais correto e seguro para um Route Handler Next.js (não expõe nada ao
 * client, e tem permissão de escrita mesmo com regras de segurança
 * restritivas no banco).
 *
 * Projeto Firebase dedicado ao site novo (`imediato-seguros-site-novo`),
 * distinto do `leads-imediato-seguros` do legado — evita misturar dados
 * dos dois sites (decisão do cliente, 2026-07-12).
 */
let cachedApp: App | null = null;

function getFirebaseApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId: env.firebaseProjectId,
      clientEmail: env.firebaseClientEmail,
      privateKey: env.firebasePrivateKey,
    }),
    databaseURL: env.firebaseDatabaseUrl,
  });
  return cachedApp;
}

/** `null` quando as credenciais não estão configuradas — chamadores devem cair para modo mock (ver `lib/leads/firebase-backup.ts`). */
export function getLeadBackupDatabase(): Database | null {
  if (!firebaseBackupEnabled) return null;
  return getDatabase(getFirebaseApp());
}
