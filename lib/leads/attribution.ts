import { captureUtmFromLocation, type UtmData } from "@/lib/validators";

/**
 * lib/leads/attribution.ts — persistência 1st-party do pacote Ads/UTM
 * (Fase 1 do plano de atribuição).
 *
 * Problema: o usuário clica no anúncio (URL com gclid/UTMs), navega e
 * abre form/modal sem query → `captureUtmFromLocation` sozinho perde o
 * click ID e a venda não fecha o loop Ads → CRM.
 *
 * Regras (docs/ATRIBUICAO_ADS_SITE_NOVO_ESPO.md §5):
 * 1. No primeiro hit com query Ads/UTM, gravar em localStorage.
 * 2. Em submits posteriores, mesclar query atual ∪ storage (URL nova
 *    sobrescreve; não apagar click ID existente sem substituto).
 * 3. TTL 90 dias desde a última gravação com click ID.
 * 4. `landing_page` / `referrer` da primeira captura da sessão de atribuição.
 */

const STORAGE_KEY = "imediato_attribution";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

const CLICK_ID_KEYS = ["gclid", "gbraid", "wbraid"] as const;

type StoredAttribution = {
  savedAt: number;
  utm: UtmData;
};

function hasClickId(utm: UtmData | undefined): boolean {
  if (!utm) return false;
  return CLICK_ID_KEYS.some((key) => Boolean(utm[key]));
}

function hasAnyUtmValue(utm: UtmData | undefined): boolean {
  if (!utm) return false;
  return Object.values(utm).some((value) => value !== undefined && value !== "");
}

function readStored(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (!parsed?.utm || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(utm: UtmData): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredAttribution = { savedAt: Date.now(), utm };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

/**
 * Mescla storage ∪ query atual.
 * - Valores novos na URL sobrescrevem.
 * - Click IDs no storage permanecem se a URL não trouxer substituto.
 * - `landing_page` / `referrer` preservam a primeira captura.
 */
export function mergeAttribution(
  stored: UtmData | undefined,
  incoming: UtmData | undefined,
): UtmData | undefined {
  if (!stored && !incoming) return undefined;

  const merged: UtmData = { ...(stored || {}) };

  if (incoming) {
    for (const [key, value] of Object.entries(incoming) as [keyof UtmData, string | undefined][]) {
      if (key === "landing_page" || key === "referrer") continue;
      if (value !== undefined && value !== "") {
        merged[key] = value;
      }
    }
  }

  // Primeira captura de landing/referrer
  merged.landing_page = stored?.landing_page || incoming?.landing_page;
  merged.referrer = stored?.referrer || incoming?.referrer;

  return hasAnyUtmValue(merged) ? merged : undefined;
}

/**
 * Lê a URL, mescla com storage, persiste se houver pacote útil.
 * Chamar no page load (primeiro hit) e antes de cada submit.
 */
export function persistAttributionFromLocation(): UtmData | undefined {
  if (typeof window === "undefined") return undefined;

  const fromUrl = captureUtmFromLocation();
  const stored = readStored()?.utm;
  const merged = mergeAttribution(stored, fromUrl);

  if (!merged) return undefined;

  // Grava quando há query Ads/UTM nova, ou quando já há pacote com click ID
  // (renova TTL), ou primeiro hit útil sem storage.
  const shouldPersist =
    Boolean(fromUrl && hasAnyUtmValue(fromUrl)) ||
    hasClickId(merged) ||
    !stored;

  if (shouldPersist && (hasClickId(merged) || Boolean(fromUrl))) {
    writeStored(merged);
  }

  return merged;
}

/**
 * Pacote de atribuição para `POST /api/lead` e contexto WhatsApp.
 * Sempre mescla URL ∪ storage (e persiste quando aplicável).
 */
export function getAttributionUtm(): UtmData | undefined {
  return persistAttributionFromLocation();
}
