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
export type EnderecoCep = {
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

export type CepApiResult = { ok: boolean } & EnderecoCep;

function texto(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpo = valor.trim();
  return limpo || undefined;
}

/**
 * Frase do endereço para mostrar abaixo do CEP.
 * Com rua: "Av. Paulista — Bela Vista, São Paulo/SP".
 * Sem rua: "Bela Vista, São Paulo/SP". Vazio quando não há o que mostrar.
 */
export function linhaEnderecoCep(endereco: EnderecoCep): string {
  const logradouro = texto(endereco.logradouro);
  const bairro = texto(endereco.bairro);
  const cidade = texto(endereco.cidade);
  const estado = texto(endereco.estado);
  const cidadeUf = cidade && estado ? `${cidade}/${estado}` : cidade || estado;
  const local = [bairro, cidadeUf].filter(Boolean).join(", ");
  if (logradouro && local) return `${logradouro} — ${local}`;
  return logradouro || local || "";
}

/** @param cepDigits CEP, só dígitos (8 caracteres). */
export async function validateCepViaViaCep(cepDigits: string): Promise<CepApiResult> {
  try {
    const response = await fetch(`${env.viacepBaseUrl}/ws/${cepDigits}/json/`);
    const data = await response.json();
    if (data?.erro) return { ok: false };
    return {
      ok: true,
      logradouro: texto(data?.logradouro),
      bairro: texto(data?.bairro),
      cidade: texto(data?.localidade),
      estado: texto(data?.uf),
    };
  } catch (error) {
    console.warn("[lib/validation/cep-viacep] Falha ao consultar o ViaCEP (não bloqueante, considerando válido):", error);
    // Falha externa não bloqueia — mesmo padrão dos outros proxies deste projeto.
    return { ok: true };
  }
}
