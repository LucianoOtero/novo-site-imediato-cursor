/**
 * lib/suhai/planos.ts — tradução dos `cdCobertura` da Suhai nos três planos
 * apresentados ao cliente.
 *
 * A Suhai devolve na cotação um bloco com várias coberturas; cruzando o
 * combo (roubo/furto, perda total, RCF) com o `planoAssistencia` chega-se a
 * até 15 combinações. Mostrar as 15 é ruído, então a UI expõe três planos
 * nomeados e trata a assistência como um ajuste dentro do plano escolhido.
 *
 * Os códigos vêm de docs/suhai-integracao/06-DOMINIOS-E-FLUXOS.md. A doc
 * registra divergência entre as páginas de cotação e de proposta nos
 * códigos de RCF puro (`10010` e `10110`), por isso ambos são aceitos na
 * leitura e a escolha do que transmitir só se fecha com retorno real de
 * homologação.
 */

import { PLANO_ASSISTENCIA, type PlanoAssistencia } from "./dominio";

export type PlanoId = "essencial" | "completo" | "completo_terceiros";

export type DefinicaoPlano = {
  id: PlanoId;
  nome: string;
  resumo: string;
  coberturas: string[];
  /** `cdCobertura` por nível de assistência. */
  codigos: Record<PlanoAssistencia, number[]>;
  /** Plano sugerido por padrão na tela de ofertas. */
  destaque?: boolean;
};

export const PLANOS: DefinicaoPlano[] = [
  {
    id: "essencial",
    nome: "Essencial",
    resumo: "Proteção contra roubo e furto, o risco que mais tira o carro do dono.",
    coberturas: ["Roubo e furto do veículo"],
    codigos: {
      [PLANO_ASSISTENCIA.nenhuma]: [1013],
      [PLANO_ASSISTENCIA.km200]: [1003],
      [PLANO_ASSISTENCIA.km500]: [1023],
    },
  },
  {
    id: "completo",
    nome: "Completo",
    resumo: "Roubo e furto mais perda total por colisão, incêndio e desastres.",
    coberturas: ["Roubo e furto do veículo", "Perda total por colisão"],
    codigos: {
      [PLANO_ASSISTENCIA.nenhuma]: [1019],
      [PLANO_ASSISTENCIA.km200]: [1009],
      [PLANO_ASSISTENCIA.km500]: [1029],
    },
    destaque: true,
  },
  {
    id: "completo_terceiros",
    nome: "Completo + Terceiros",
    resumo: "Tudo do Completo e ainda os danos que você causar a outras pessoas.",
    coberturas: [
      "Roubo e furto do veículo",
      "Perda total por colisão",
      "Danos a terceiros (RCF)",
    ],
    codigos: {
      [PLANO_ASSISTENCIA.nenhuma]: [10191],
      [PLANO_ASSISTENCIA.km200]: [10091],
      [PLANO_ASSISTENCIA.km500]: [10291],
    },
  },
];

const INDICE_POR_CODIGO = new Map<number, { plano: DefinicaoPlano; assistencia: PlanoAssistencia }>();
for (const plano of PLANOS) {
  for (const [assistencia, codigos] of Object.entries(plano.codigos)) {
    for (const codigo of codigos) {
      INDICE_POR_CODIGO.set(codigo, { plano, assistencia: Number(assistencia) as PlanoAssistencia });
    }
  }
}

/** Identifica a que plano e nível de assistência pertence um `cdCobertura`. */
export function classificarCobertura(cdCobertura: number) {
  return INDICE_POR_CODIGO.get(cdCobertura) ?? null;
}

/** `cdCobertura` a transmitir para um plano com determinada assistência. */
export function codigoPara(planoId: PlanoId, assistencia: PlanoAssistencia): number | null {
  const plano = PLANOS.find((item) => item.id === planoId);
  return plano?.codigos[assistencia]?.[0] ?? null;
}

export function encontrarPlano(planoId: PlanoId): DefinicaoPlano | null {
  return PLANOS.find((item) => item.id === planoId) ?? null;
}
