import { z } from "zod";

import { ramos } from "@/lib/ramos";

/**
 * lib/validators.ts — schemas de validação do LeadForm (Issue 11).
 * Fonte: ESPECIFICACAO v3.md, seção 21.1 (contrato `leadSchema`) e seção
 * 44.1 (regras de validação server-side, referência para o que o
 * front-end já pode normalizar).
 *
 * Nota de fidelidade — enum `ramo`: a seção 21.1 lista o enum com 9
 * valores literais (sem "assistencia-24-horas" — mesma omissão já
 * observada no menu do Header e na RamoGrid, Issues 06/10). Por
 * consistência com as decisões anteriores (`lib/ramos.ts` como fonte
 * única, seção 22), o enum abaixo é **derivado de `lib/ramos.ts`** (10
 * valores) em vez de copiado literalmente — do contrário, um LeadForm
 * na futura página `/assistencia-24-horas` (Issue 16) rejeitaria seu
 * próprio ramo.
 *
 * Nota — máscaras: os campos com formatação visual (celular, CEP, CPF)
 * aceitam a string mascarada (ex.: "98765-4321") e a normalizam via
 * `.transform()` para dígitos puros antes de validar — o tipo de saída
 * (`LeadInput`) permanece fiel ao contrato da especificação (strings de
 * dígitos), independente de como o usuário digitou.
 */

const ramoSlugs = ramos.map((ramo) => ramo.slug) as [string, ...string[]];

export const utmSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  gclid: z.string().optional(),
  wbraid: z.string().optional(),
  gbraid: z.string().optional(),
  landing_page: z.string().optional(),
  referrer: z.string().optional(),
});

export type UtmData = z.infer<typeof utmSchema>;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Checksum de CPF (dígitos verificadores) — replicado de
 * `validarCPFAlgoritmo` no formulário principal do site legado
 * (`webflow_injection_limpo.js`), que faz essa validação 100% local (sem
 * API externa) antes do envio. Projeto de 2026-07-13 ("validar telefone,
 * CPF e e-mail no momento do input").
 *
 * Rejeita também sequências de dígitos repetidos (ex.: "111.111.111-11")
 * — mesma regra do legado, evita falsos positivos de CPFs "de teste"
 * que passariam no checksum por coincidência matemática.
 */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 1; i <= 9; i += 1) sum += parseInt(cpf[i - 1], 10) * (11 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf[9], 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i += 1) sum += parseInt(cpf[i - 1], 10) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf[10], 10);
}

/** Campo obrigatório com padrão de dígitos (ex.: DDD, celular). */
function requiredDigits(pattern: RegExp, message: string) {
  return z
    .string()
    .min(1, "Campo obrigatório")
    .transform(onlyDigits)
    .refine((value) => pattern.test(value), { message });
}

/** Campo opcional com padrão de dígitos (ex.: CEP) — string vazia conta como "não preenchido". */
function optionalDigits(pattern: RegExp, message: string) {
  return z
    .string()
    .optional()
    .transform((value) => (value ? onlyDigits(value) : undefined))
    .refine((value) => value === undefined || pattern.test(value), { message });
}

export const leadSchema = z.object({
  ramo: z.enum(ramoSlugs),
  ddd: requiredDigits(/^\d{2}$/, "DDD inválido"),
  // Celular (não fixo): sempre 9 dígitos começando em "9" — mesma regra
  // de `validarCelularLocal` no site legado (projeto 2026-07-13).
  celular: requiredDigits(/^9\d{8}$/, "Celular inválido — deve ter 9 dígitos e começar com 9"),
  cep: optionalDigits(/^\d{8}$/, "CEP inválido"),
  nome: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .refine((value) => value === undefined || value.length >= 2, { message: "Nome muito curto" }),
  // CPF opcional (vazio é válido), mas se preenchido precisa passar o
  // checksum dos dígitos verificadores (projeto 2026-07-13) — mesma regra
  // do formulário principal do site legado.
  cpf: z
    .string()
    .optional()
    .transform((value) => (value ? onlyDigits(value) : undefined))
    .refine((value) => value === undefined || isValidCpf(value), { message: "CPF inválido" }),
  placa: z
    .string()
    .optional()
    .transform((value) => (value ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : undefined)),
  /**
   * Campos abaixo (email, ano/modelo do veículo) — Issue de integrações
   * 2026-07-08, réplica dos campos do modal de captura de lead do site
   * legado antes de abrir WhatsApp/telefone (`ContactLeadModal`, ver
   * `docs/LEGACY_JS_AUDIT.md`, "8 campos: DDD, Celular, Email, CEP, CPF,
   * Placa, Ano do modelo, Marca/modelo"). Opcionais e não usados pelo
   * `LeadForm` multi-step (Issue 11, "colete o mínimo") — só preenchidos
   * por quem vem do `ContactLeadModal`.
   */
  email: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .refine((value) => value === undefined || z.string().email().safeParse(value).success, { message: "E-mail inválido" }),
  veiculoAno: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  veiculoMarcaModelo: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  utm: utmSchema.optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/** Campos de cada passo do LeadForm (seção 6.3: passo 1 = mínimo p/ virar lead). */
export const LEAD_FORM_STEPS: Record<1 | 2 | 3, (keyof LeadInput)[]> = {
  1: ["ddd", "celular"],
  2: ["cep", "nome"],
  3: ["cpf", "placa"],
};

/** Máscaras visuais (aplicadas no onChange; o schema normaliza no submit/trigger). */
export function formatCelular(value: string): string {
  const digits = onlyDigits(value).slice(0, 9);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, digits.length - 4)}-${digits.slice(-4)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)].filter(Boolean);
  const base = parts.join(".");
  return digits.length > 9 ? `${base}-${digits.slice(9, 11)}` : base;
}

export function formatPlaca(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

export function formatDdd(value: string): string {
  return onlyDigits(value).slice(0, 2);
}

/**
 * Captura UTM/gclid da URL atual (seção 21.1: "utm: utmSchema.optional(),
 * // capturado da URL"). Sem persistência em cookie/localStorage nesta
 * issue — isso pertence à infraestrutura de tracking mais ampla (Issues
 * 12/18), fora do escopo do LeadForm em si.
 */
export function captureUtmFromLocation(): UtmData | undefined {
  if (typeof window === "undefined") return undefined;

  const params = new URLSearchParams(window.location.search);
  const utm: UtmData = {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
    utm_content: params.get("utm_content") ?? undefined,
    utm_term: params.get("utm_term") ?? undefined,
    gclid: params.get("gclid") ?? undefined,
    wbraid: params.get("wbraid") ?? undefined,
    gbraid: params.get("gbraid") ?? undefined,
    landing_page: window.location.pathname,
    referrer: document.referrer || undefined,
  };

  const hasAnyValue = Object.values(utm).some((value) => value !== undefined);
  return hasAnyValue ? utm : undefined;
}
