import { env } from "@/lib/env";

/**
 * lib/validation/cep-viacep.ts — validação de CEP via ViaCEP (projeto
 * 2026-07-14, réplica de `validarCepViaCep`/`validateCEP` do site
 * legado — mesma lógica duplicada em `FooterCodeSiteDefinitivoCompleto.js`
 * e `webflow_injection_limpo.js`).
 *
 * ViaCEP é uma API pública (sem chave/autenticação) — testada
 * diretamente e confirmada funcionando. Roda server-side aqui só por
 * consistência com o restante do projeto (todas as validações em
 * tempo real passam por `/api/validate/*`), não por exigência de
 * segurança da própria API.
 */
export type CepApiResult = { ok: boolean; cidade?: string; estado?: string };

/** @param cepDigits CEP, só dígitos (8 caracteres). */
export async function validateCepViaViaCep(cepDigits: string): Promise<CepApiResult> {
  try {
    const response = await fetch(`${env.viacepBaseUrl}/ws/${cepDigits}/json/`);
    const data = await response.json();
    if (data?.erro) return { ok: false };
    return { ok: true, cidade: data?.localidade, estado: data?.uf };
  } catch (error) {
    console.warn("[lib/validation/cep-viacep] Falha ao consultar o ViaCEP (não bloqueante, considerando válido):", error);
    // Falha externa não bloqueia — mesmo padrão dos outros proxies deste projeto.
    return { ok: true };
  }
}
