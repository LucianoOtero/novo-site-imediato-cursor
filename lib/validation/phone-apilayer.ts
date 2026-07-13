import { env } from "@/lib/env";

/**
 * lib/validation/phone-apilayer.ts — validação de celular via APILayer
 * Number Verification (projeto 2026-07-13, réplica de
 * `validarCelularApi`/`validateCelular` em `webflow_injection_limpo.js`).
 *
 * Testado diretamente com a chave real do site legado (2026-07-13):
 * responde corretamente (`{"valid":true,...,"line_type":"mobile"}`).
 *
 * Diferente do legado (que chama a APILayer direto do navegador,
 * expondo a chave no JS público), esta função só roda server-side — ver
 * `app/api/validate/phone/route.ts`, o único ponto de entrada do client.
 */
export type PhoneApiResult = { ok: boolean };

/** @param nationalNumber DDD + celular, só dígitos (ex.: "11987654321"). */
export async function validatePhoneViaApiLayer(nationalNumber: string): Promise<PhoneApiResult> {
  if (!env.apilayerKey) {
    // Modo mock — sem chave configurada, não bloqueia (mesma semântica do legado: `USE_PHONE_API` desligado).
    return { ok: true };
  }

  try {
    const url = `${env.apilayerBaseUrl}/api/validate?access_key=${env.apilayerKey}&country_code=BR&number=${nationalNumber}`;
    const response = await fetch(url);
    const data = await response.json();
    return { ok: Boolean(data?.valid) };
  } catch (error) {
    console.warn("[lib/validation/phone-apilayer] Falha ao consultar a APILayer (não bloqueante, considerando válido):", error);
    // Falha externa não bloqueia — mesmo comportamento do legado (`validarCelularApi`, `catch` → `{ok: true}`).
    return { ok: true };
  }
}
