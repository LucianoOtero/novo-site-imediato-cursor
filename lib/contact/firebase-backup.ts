import { firebaseBackupEnabled } from "@/lib/env";
import { getLeadBackupDatabase } from "@/lib/leads/firebase-admin";
import type { ContactMessageRecord } from "@/lib/contact/types";

/**
 * Backup das mensagens de `/contato` no Firebase RTDB
 * (`contact_messages/{id}`). Mesmo projeto dos leads; nunca lança.
 */
export async function saveContactMessageToFirebase(
  message: ContactMessageRecord
): Promise<boolean> {
  const database = getLeadBackupDatabase();
  if (!database) {
    if (!firebaseBackupEnabled) {
      console.info(
        `[lib/contact/firebase-backup] Modo mock — mensagem ${message.id} não gravada (só log).`
      );
    }
    return false;
  }

  try {
    await database.ref(`contact_messages/${message.id}`).set({
      ...message,
      source: "site-contato",
    });
    return true;
  } catch (error) {
    console.error("[lib/contact/firebase-backup] Falha ao gravar:", error);
    return false;
  }
}
