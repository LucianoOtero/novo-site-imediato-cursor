/**
 * lib/suhai/types.ts — contrato entre o formulário `/cotacao-suhai`, a rota
 * `/api/suhai/cotacao` e o gateway com IP fixo.
 *
 * O schema de cotação cobre o mínimo de `IncluirCotacaoSuhai`. O de proposta
 * cobre `TransmitirProposta` com boleto. Cartão não entra neste contrato.
 */

import { z } from "zod";

import { isValidCpf, isValidPlacaFormat, onlyDigits } from "@/lib/validators";
import {
  CATEGORIA_SUHAI,
  COMBUSTIVEL,
  COR_VEICULO,
  ESTADO_CIVIL,
  SEXO,
  TIPO_CONTRATACAO,
  TIPO_UTILIZACAO,
  UTILIZACAO_DUT,
} from "./dominio";
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

const cores = Object.keys(COR_VEICULO).map(Number) as [number, ...number[]];
const combustiveis = Object.keys(COMBUSTIVEL).map(Number) as [number, ...number[]];

function vigenciaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(data.getTime())) return false;
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() + 1);
  return data >= hoje && data <= limite;
}

/** Transmissão da proposta. O pagamento é boleto no servidor; o cliente não escolhe. */
export const propostaInputSchema = z.object({
  protocolo: z.string().min(1, "Cotação sem protocolo."),
  cdCobertura: z.number().int().positive(),
  email: z.string().email("E-mail inválido."),
  dddCel: digitos(2),
  numCel: z
    .string()
    .transform(onlyDigits)
    .refine((valor) => valor.length === 8 || valor.length === 9, { message: "Celular inválido." }),
  endereco: z.object({
    logradouro: z.string().min(1, "Informe o logradouro."),
    numero: z.string().min(1, "Informe o número."),
    complemento: z.string().optional(),
    bairro: z.string().min(1, "Informe o bairro."),
    uf: z.string().length(2, "Informe a UF."),
    cidade: z.string().min(1, "Informe a cidade."),
    cep: digitos(8),
  }),
  veiculo: z.object({
    chassi: z.string().trim().min(5, "Informe o chassi."),
    placa: placaSchema,
    cor: z.number().int().refine((valor) => cores.includes(valor), { message: "Cor inválida." }),
    combustivel: z.number().int().refine((valor) => combustiveis.includes(valor), { message: "Combustível inválido." }),
  }),
  vigenciaInicio: z.string().refine(vigenciaValida, { message: "A vigência deve ser hoje ou até um mês à frente." }),
  diaVencimento: z.number().int().min(1).max(31),
  parcelas: z.number().int().min(1).max(12),
  aceite: z.boolean().refine((valor) => valor === true, { message: "Confirme o envio da proposta." }),
});

export type PropostaInput = z.input<typeof propostaInputSchema>;
export type PropostaPayload = z.output<typeof propostaInputSchema>;

export type PropostaResultado = {
  protocolo: string;
  numeroProposta: string;
  codMsgRet: string;
  textoMsgRet: string;
};

export type CotacaoErro = {
  erro: "validacao" | "suhai" | "indisponivel";
  mensagem: string;
  campos?: Record<string, string>;
  codigoSuhai?: string;
};
