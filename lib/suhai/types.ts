/**
 * lib/suhai/types.ts — contrato entre o formulário `/cotacao-suhai`, a rota
 * `/api/suhai/cotacao` e o gateway com IP fixo.
 *
 * O schema cobre o mínimo exigido por `RealizarCotacao`
 * (docs/suhai-integracao/02-WS-COTACAO-PROPOSTA.md). Campos da proposta —
 * endereço, cor, combustível, vigência, parcelamento — só entram na fase
 * seguinte e não pertencem a este contrato.
 */

import { z } from "zod";

import { isValidCpf, isValidPlacaFormat, onlyDigits } from "@/lib/validators";
import { CATEGORIA_SUHAI, ESTADO_CIVIL, SEXO, TIPO_CONTRATACAO, TIPO_UTILIZACAO, UTILIZACAO_DUT } from "./dominio";
import type { PlanoId } from "./planos";

const digitos = (tamanho: number) =>
  z
    .string()
    .transform(onlyDigits)
    .refine((valor) => valor.length === tamanho, { message: `Informe ${tamanho} dígitos.` });

const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCpf, { message: "CPF inválido." });

const placaSchema = z
  .string()
  .transform((valor) => valor.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .refine(isValidPlacaFormat, { message: "Placa inválida." });

/** Condutor principal — pode ser o próprio proponente. */
export const condutorSchema = z.object({
  cpf: cpfSchema,
  nome: z.string().min(3, "Informe o nome completo."),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  sexo: z.nativeEnum(SEXO),
  estadoCivil: z.nativeEnum(ESTADO_CIVIL),
});

/**
 * Respostas das perguntas de garagem. A Suhai pede as três primeiras para
 * auto e moto; caminhão e van respondem apenas a quarta.
 */
export const garagemSchema = z.object({
  residencia: z.boolean(),
  trabalho: z.boolean(),
  escola: z.boolean(),
  /** Exclusiva de caminhão e van/VUC. */
  patio: z.boolean().optional(),
});

export const cotacaoInputSchema = z.object({
  proponente: z.object({
    cpf: cpfSchema,
    nome: z.string().min(3, "Informe o nome completo."),
    dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
    sexo: z.nativeEnum(SEXO),
    estadoCivil: z.nativeEnum(ESTADO_CIVIL),
    email: z.string().email("E-mail inválido.").optional(),
  }),
  condutorPrincipal: condutorSchema,
  veiculo: z.object({
    categoria: z.enum(Object.keys(CATEGORIA_SUHAI) as [keyof typeof CATEGORIA_SUHAI]),
    /** Grafia exata da FIPE Suhai, obtida em `ConsultaVeiculos`. */
    marca: z.string().min(1),
    modelo: z.string().min(1),
    codFipe: z.string().optional(),
    anoModelo: z.number().int().min(1950).max(new Date().getFullYear() + 1),
    anoFabricacao: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
    zeroKm: z.boolean().default(false),
    placa: placaSchema.optional(),
    chassi: z.string().optional(),
  }),
  uso: z.object({
    utilizacao: z.enum(Object.keys(UTILIZACAO_DUT) as [keyof typeof UTILIZACAO_DUT]),
    tipoUtilizacao: z.nativeEnum(TIPO_UTILIZACAO).optional(),
    cepPernoite: digitos(8),
    garagem: garagemSchema,
  }),
  contrato: z.object({
    tipoContratacao: z.nativeEnum(TIPO_CONTRATACAO).default(TIPO_CONTRATACAO.novo),
    classeBonus: z.number().int().min(0).max(10).default(0),
    /** Apólice anterior, obrigatória em renovação Suhai. */
    apoliceAnterior: z.string().optional(),
  }),
});

export type CotacaoInput = z.input<typeof cotacaoInputSchema>;
export type CotacaoPayload = z.output<typeof cotacaoInputSchema>;

/** Uma oferta devolvida pela Suhai, já classificada em plano e assistência. */
export type Oferta = {
  cdCobertura: number;
  planoId: PlanoId;
  assistencia: 0 | 1 | 2;
  premioTotal: number;
  premioMensalEstimado: number;
  importanciaSegurada: number | null;
  franquia: number | null;
  parcelamentoMaximo: number;
};

export type CotacaoResultado = {
  protocolo: string;
  ofertas: Oferta[];
  veiculo: {
    marca: string;
    modelo: string;
    anoModelo: number;
    valorFipe: number | null;
  };
  /** Marca resposta vinda do mock, para não confundir teste com produção. */
  simulado: boolean;
  geradoEm: string;
};

export type CotacaoErro = {
  erro: "validacao" | "suhai" | "indisponivel";
  mensagem: string;
  campos?: Record<string, string>;
  codigoSuhai?: string;
};
