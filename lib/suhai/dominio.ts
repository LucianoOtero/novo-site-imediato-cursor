/**
 * lib/suhai/dominio.ts — domínios e enums da integração Suhai.
 *
 * Fonte: docs/suhai-integracao/06-DOMINIOS-E-FLUXOS.md, extraído do portal
 * SUHAPI. Tudo que é código numérico da seguradora vive aqui, para que o
 * resto do fluxo trabalhe com nomes legíveis.
 */

/** Categoria do veículo na FIPE Suhai (`cod_categoria_suhai`). */
export const CATEGORIA_SUHAI = {
  auto: 1,
  moto: 2,
  caminhao: 3,
  van: 4,
} as const;

export type CategoriaSuhai = keyof typeof CATEGORIA_SUHAI;

/** `sexo` do proponente — 3 é reservado a pessoa jurídica. */
export const SEXO = { feminino: 1, masculino: 2, pj: 3 } as const;

/** `estadoCivil` do proponente. */
export const ESTADO_CIVIL = { casado: 1, solteiro: 2, outros: 3 } as const;

/** `tipoContratacao`. */
export const TIPO_CONTRATACAO = {
  novo: 1,
  renovacaoSuhai: 2,
  renovacaoOutras: 3,
} as const;

/**
 * `planoAssistencia`: 0 sem assistência, 1 guincho 200 km, 2 guincho 500 km.
 * Omitir na cotação faz a Suhai devolver o equivalente ao plano 1.
 */
export const PLANO_ASSISTENCIA = { nenhuma: 0, km200: 1, km500: 2 } as const;

export type PlanoAssistencia = (typeof PLANO_ASSISTENCIA)[keyof typeof PLANO_ASSISTENCIA];

export const ROTULO_ASSISTENCIA: Record<PlanoAssistencia, string> = {
  0: "Sem assistência 24h",
  1: "Assistência 24h — guincho até 200 km",
  2: "Assistência 24h — guincho até 500 km",
};

/**
 * `tp_pagamento` aceito na transmissão da proposta. O código 1 existe na
 * documentação mas está descontinuado, então não é exposto aqui.
 */
export const TIPO_PAGAMENTO = {
  boleto: 2,
  cartaoPrimeiraMaisBoleto: 11,
  cartaoRecorrente: 14,
} as const;

/**
 * `utilizacaoDut` — uso declarado do veículo. A lista completa tem 23
 * entradas (ver 06-DOMINIOS-E-FLUXOS.md); aqui ficam as que o fluxo online
 * oferece, com as categorias em que cada uma é aceita.
 */
export const UTILIZACAO_DUT = {
  particular: { codigo: 1, rotulo: "Particular", categorias: ["auto", "moto", "van"] },
  locacaoAnual: { codigo: 2, rotulo: "Locação com contrato anual", categorias: ["auto", "moto", "van", "caminhao"] },
  taxi: { codigo: 7, rotulo: "Táxi", categorias: ["auto"] },
  escolar: { codigo: 8, rotulo: "Transporte escolar", categorias: ["auto", "van", "caminhao"] },
  alimentacao: { codigo: 10, rotulo: "Serviços de alimentação", categorias: ["auto", "moto", "van", "caminhao"] },
  motoTaxi: { codigo: 17, rotulo: "Moto táxi", categorias: ["moto"] },
  aplicativo: { codigo: 19, rotulo: "Transporte de passageiros por aplicativo", categorias: ["auto", "moto"] },
  entregador: { codigo: 21, rotulo: "Motofretista / entregador", categorias: ["moto"] },
  locacaoApp: { codigo: 22, rotulo: "Locação para app de passageiros", categorias: ["auto"] },
} as const satisfies Record<string, { codigo: number; rotulo: string; categorias: readonly CategoriaSuhai[] }>;

export type UsoVeiculo = keyof typeof UTILIZACAO_DUT;

/** `tipoUtilizacao` — só é enviado quando `utilizacaoDut` é Particular. */
export const TIPO_UTILIZACAO = {
  trabalhoELazer: 1,
  atividadeProfissional: 2,
  lazerExclusivo: 3,
} as const;

/**
 * Status da proposta (`ConsultarStatusProposta`). `emiteBoleto` marca o
 * único estado em que a 1ª parcela pode ser gerada; `final` indica que não
 * há mais avanço possível pelo caminho automático.
 */
export const STATUS_PROPOSTA: Record<
  number,
  { rotulo: string; emiteBoleto: boolean; final: boolean; cancelada: boolean }
> = {
  1: { rotulo: "Salva, não transmitida", emiteBoleto: false, final: false, cancelada: false },
  2: { rotulo: "Pendente de análise nível 1", emiteBoleto: false, final: false, cancelada: false },
  3: { rotulo: "Pendente de análise nível 2", emiteBoleto: false, final: false, cancelada: false },
  4: { rotulo: "Recusa operacional", emiteBoleto: false, final: true, cancelada: true },
  5: { rotulo: "Recusa reavaliável (automática)", emiteBoleto: false, final: true, cancelada: true },
  6: { rotulo: "Aguardando emissão", emiteBoleto: false, final: false, cancelada: false },
  7: { rotulo: "Cancelada a pedido", emiteBoleto: false, final: true, cancelada: true },
  9: { rotulo: "Aprovada", emiteBoleto: false, final: false, cancelada: false },
  10: { rotulo: "Em processo de emissão", emiteBoleto: false, final: false, cancelada: false },
  11: { rotulo: "Aguardando emissão automática", emiteBoleto: false, final: false, cancelada: false },
  12: { rotulo: "Pendências para emissão", emiteBoleto: true, final: false, cancelada: false },
  13: { rotulo: "Emitida", emiteBoleto: false, final: true, cancelada: false },
  14: { rotulo: "Recusa técnica", emiteBoleto: false, final: true, cancelada: true },
  15: { rotulo: "Emissão manual", emiteBoleto: false, final: true, cancelada: false },
  16: { rotulo: "Recusa reavaliável (manual)", emiteBoleto: false, final: true, cancelada: true },
  17: { rotulo: "Emissão manual de endosso", emiteBoleto: false, final: true, cancelada: false },
};

/** Cores aceitas na proposta (`cor`); 18 é "não informado". */
export const COR_VEICULO = {
  1: "Amarelo",
  2: "Azul",
  3: "Bege",
  4: "Branco",
  5: "Cinza",
  6: "Dourado",
  7: "Grafite",
  8: "Laranja",
  9: "Marrom",
  10: "Prata",
  11: "Preto",
  12: "Rosa",
  13: "Roxo",
  14: "Verde",
  15: "Vermelho",
  16: "Vinho",
  18: "Não informado",
} as const;

/** `combustivel` na proposta. */
export const COMBUSTIVEL = {
  1: "Álcool",
  2: "Diesel",
  3: "Híbrido",
  4: "Flex",
  5: "GNV",
  6: "Gasolina",
  8: "Não informado",
} as const;

/** Sucesso e erro genéricos devolvidos em `codMsgRet`. */
export const COD_MSG = { sucesso: "001", erro: "503" } as const;
