/**
 * Helpers de funil / abandono (LeadForm + ContactLeadModal).
 * Flags em sessionStorage — sem PII.
 */
import { trackEvent } from "@/lib/analytics";

const FORM_COMPLETE_KEY = "imediato_funnel_form_complete";
const FORM_ABANDON_KEY = "imediato_funnel_form_abandon_sent";
const FORM_MAX_STEP_KEY = "imediato_funnel_form_max_step";
const FORM_HAD_INITIAL_KEY = "imediato_funnel_form_had_initial";
const MODAL_ABANDON_KEY = "imediato_funnel_modal_abandon_sent";
const MODAL_COMPLETE_KEY = "imediato_funnel_modal_complete";

function ssGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function ssSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

export function markLeadFormFunnelComplete(): void {
  ssSet(FORM_COMPLETE_KEY, "1");
}

export function markLeadFormHadInitialContact(): void {
  ssSet(FORM_HAD_INITIAL_KEY, "1");
}

export function markLeadFormMaxStep(step: 1 | 2 | 3 | 4): void {
  const prev = Number(ssGet(FORM_MAX_STEP_KEY) || "0");
  if (step > prev) ssSet(FORM_MAX_STEP_KEY, String(step));
}

export function getLeadFormMaxStep(fallback: 1 | 2 | 3 | 4 = 1): 1 | 2 | 3 | 4 {
  const n = Number(ssGet(FORM_MAX_STEP_KEY) || "0");
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return fallback;
}

export function markModalFunnelComplete(): void {
  ssSet(MODAL_COMPLETE_KEY, "1");
}

/**
 * Emite `form_abandon` no máximo 1× por sessão, se o funil não completou.
 */
export function trackLeadFormAbandon(opts: {
  formId?: string;
  lastStep: 1 | 2 | 3 | 4;
  reason: "pagehide" | "hidden" | "unmount";
  ramo?: string;
  hasStarted: boolean;
}): boolean {
  if (!opts.hasStarted) return false;
  if (ssGet(FORM_COMPLETE_KEY) === "1") return false;
  if (ssGet(FORM_ABANDON_KEY) === "1") return false;

  const maxStored = getLeadFormMaxStep(opts.lastStep);
  const lastStep = opts.lastStep;
  const maxStep = (lastStep > maxStored ? lastStep : maxStored) as 1 | 2 | 3 | 4;

  ssSet(FORM_ABANDON_KEY, "1");
  trackEvent("form_abandon", {
    form_id: opts.formId ?? "lead_form",
    last_step: lastStep,
    max_step: maxStep,
    reason: opts.reason,
    ramo: opts.ramo,
    had_initial_contact: ssGet(FORM_HAD_INITIAL_KEY) === "1",
  });
  return true;
}

/**
 * Emite `whatsapp_modal_dismiss` no máximo 1× por abertura (session flag),
 * se o modal não enviou submit.
 */
export function trackModalAbandon(opts: {
  modal_channel: "whatsapp" | "phone";
  location: string;
  ramo?: string;
  modal_step: 1 | 2;
  reason: "dismiss_ui" | "pagehide";
}): boolean {
  if (ssGet(MODAL_COMPLETE_KEY) === "1") return false;
  if (ssGet(MODAL_ABANDON_KEY) === "1") return false;

  ssSet(MODAL_ABANDON_KEY, "1");
  trackEvent("whatsapp_modal_dismiss", {
    form_type: "whatsapp_modal",
    modal_channel: opts.modal_channel,
    location: opts.location,
    ramo: opts.ramo,
    modal_step: opts.modal_step,
    reason: opts.reason,
  });
  return true;
}

/** Reset flags do modal ao abrir de novo na mesma sessão. */
export function resetModalAbandonFlags(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(MODAL_ABANDON_KEY);
    sessionStorage.removeItem(MODAL_COMPLETE_KEY);
  } catch {
    /* ignore */
  }
}
