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

/**
 * Formato de placa (antigo `ABC1234` ou Mercosul `ABC1D23`) — replicado
 * de `validarPlacaFormato` no site legado (projeto 2026-07-14). Espera
 * a placa já normalizada (só `[A-Z0-9]`, maiúsculas — ver `formatPlaca`).
 */
export function isValidPlacaFormat(value: string): boolean {
  const antigo = /^[A-Z]{3}\d{4}$/;
  const mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;
  return antigo.test(value) || mercosul.test(value);
}

/**
 * Formato de e-mail — regex exata de `validarEmailLocal` no site legado
 * (idêntica em `FooterCodeSiteDefinitivoCompleto.js` e
 * `webflow_injection_limpo.js`). Trocado no lugar do `.email()` do Zod
 * (projeto 2026-07-14) para fidelidade total: o Zod usa uma regex bem
 * mais estrita/diferente da do legado, o que podia aceitar/rejeitar
 * e-mails de forma diferente do site original.
 */
export function isValidEmailFormat(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim());
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

/**
 * Campo opcional só com extração de dígitos, **sem** checagem de
 * formato/checksum — usado só quando o usuário escolhe "Prosseguir
 * assim mesmo" no diálogo do `LeadForm` (projeto 2026-07-14, CPF/CEP).
 * Sem isso, o servidor (que reaplica o mesmo `leadSchema` estrito)
 * rejeitaria de novo o valor que o usuário confirmou querer enviar como
 * está, fazendo o "Prosseguir" falhar silenciosamente.
 */
function lenientDigits() {
  return z
    .string()
    .optional()
    .transform((value) => (value ? onlyDigits(value) : undefined));
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
  // Placa opcional (vazia é válida), mas se preenchida precisa bater com
  // o formato antigo (ABC1234) ou Mercosul (ABC1D23) — projeto
  // 2026-07-14, mesma regra de `validarPlacaFormato` no site legado
  // (`FooterCodeSiteDefinitivoCompleto.js`/`webflow_injection_limpo.js`).
  placa: z
    .string()
    .optional()
    .transform((value) => (value ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : undefined))
    .refine((value) => value === undefined || isValidPlacaFormat(value), { message: "Placa inválida" }),
  /**
   * `email` — originalmente só preenchido via `ContactLeadModal` (Issue
   * de integrações 2026-07-08, réplica dos "8 campos" do modal legado,
   * ver `docs/LEGACY_JS_AUDIT.md`). Desde 2026-07-14 (decisão do
   * cliente), também coletado no passo 2 do `LeadForm` multi-step, com
   * validação em tempo real via SafetyMails (`/api/validate/email`).
   * `veiculoAno`/`veiculoMarcaModelo` abaixo continuam exclusivos do
   * `ContactLeadModal`.
   */
  email: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined))
    .refine((value) => value === undefined || isValidEmailFormat(value), { message: "E-mail inválido" }),
  /**
   * `veiculoAno`/`veiculoMarcaModelo` — combinados, mantidos só para
   * compatibilidade com a Cloud Function (`ANO`/`VEICULO` no proxy
   * EspoCRM/Octadesk, ver `firebase/functions/index.js`). Desde
   * 2026-07-16, a UI (`LeadForm`/`ContactLeadModal`) não os edita mais
   * diretamente — eles são derivados dos campos granulares abaixo no
   * momento do envio (ver `submitPayload` em `LeadForm.tsx`).
   */
  veiculoAno: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  veiculoMarcaModelo: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  /**
   * Campos granulares do veículo (projeto 2026-07-16, a pedido do
   * cliente) — preenchidos automaticamente a partir da consulta à Placa
   * Fipe (`/api/validate/placa`), nunca digitados pelo usuário. Guardados
   * para uso futuro no cálculo do RPA (`lib/rpa.ts`, ainda não conectado
   * nesta rodada).
   */
  veiculoMarca: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  veiculoModelo: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  veiculoAnoFabricacao: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  veiculoAnoModelo: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value.trim() : undefined)),
  utm: utmSchema.optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

/**
 * Versão "tolerante" de `cpf`/`cep` (só extrai dígitos, sem checksum/
 * formato) — usada por `apiLeadSchemaLenient` (`lib/leads/types.ts`)
 * quando o payload traz `skipStrictValidation: true`. Ver nota em
 * `lenientDigits()` acima.
 */
export const lenientCpf = lenientDigits();
export const lenientCep = lenientDigits();
/**
 * Placa tolerante (só normaliza maiúsculas/remove símbolos, sem exigir
 * o formato antigo/Mercosul) — projeto 2026-07-14, mesmo motivo de
 * `lenientCpf`/`lenientCep`: sem isso, "Prosseguir assim mesmo" com
 * placa fora do formato falharia de novo no servidor.
 */
export const lenientPlaca = z
  .string()
  .optional()
  .transform((value) => (value ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : undefined));

/**
 * Campos de cada passo do LeadForm (seção 6.3: passo 1 = mínimo p/ virar
 * lead). Reorganizado em 2026-07-14 (decisão do cliente): passo 2 passa
 * a coletar Nome + E-mail (antes só Nome — CEP saiu daqui); passo 3
 * passa a ser CPF, CEP, Placa (nessa ordem — CEP entrou aqui).
 */
/**
 * Campos validados ao avançar de cada passo do `LeadForm` — o passo 4
 * (`RpaChoiceStep`, projeto 2026-07-16) não tem campos próprios (só as
 * 2 escolhas de "aguardar o cálculo"/"falar com consultor"), por isso
 * nunca é indexado por `goNext()`, mas entra no tipo com array vazio
 * para `LEAD_FORM_STEPS[step]` continuar tipado para as 4 etapas.
 */
export const LEAD_FORM_STEPS: Record<1 | 2 | 3 | 4, (keyof LeadInput)[]> = {
  1: ["ddd", "celular"],
  2: ["nome", "email"],
  3: ["cpf", "cep", "placa"],
  4: [],
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
