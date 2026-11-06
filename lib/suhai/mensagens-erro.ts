/**
 * lib/suhai/mensagens-erro.ts — recusas conhecidas da Suhai em texto para o
 * cliente. O texto original continua no RTDB e no e-mail da equipe; aqui só
 * se decide o que aparece no formulário. Sem imports: o teste em Node usa o
 * mesmo arquivo.
 */

export type MotivoRecusaSuhai =
  | "ano_fabricacao"
  | "fipe_incorreto"
  | "veiculo_nao_localizado"
  | "modelo_incorreto"
  | "zero_km"
  | "proposta_em_emissao"
  | "pergunta_invalida";

export type RecusaSuhai = {
  motivo: MotivoRecusaSuhai;
  mensagem: string;
  /** `veiculo`: o cliente corrige na etapa do veículo. */
  campo?: "veiculo";
};

const VERSAO_INDISPONIVEL =
  "Não encontramos essa versão do veículo na tabela da seguradora. Confira marca, modelo e ano ou escolha outra versão.";

export const MENSAGEM_PROPOSTA_EXISTENTE =
  "Já existe uma proposta em andamento para este veículo. Nossa equipe vai concluir com você pelo WhatsApp.";

export const MENSAGEM_CALCULO_PELA_EQUIPE =
  "Não conseguimos calcular automaticamente para este veículo. Nossa equipe vai concluir a sua cotação pelo WhatsApp.";

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function classificarRecusaSuhai(texto: string | null | undefined, hoje: Date = new Date()): RecusaSuhai | null {
  if (!texto) return null;
  const t = normalizar(texto);
  if (t.includes("outra proposta em emissao")) {
    return { motivo: "proposta_em_emissao", mensagem: MENSAGEM_PROPOSTA_EXISTENTE };
  }
  // Resposta fora do domínio de uma pergunta de garagem: o cliente não tem o que corrigir.
  if (/resposta da pergunta \d+ (e|esta) invalida/.test(t)) {
    return { motivo: "pergunta_invalida", mensagem: MENSAGEM_CALCULO_PELA_EQUIPE };
  }
  if (t.includes("ano de fabricacao")) {
    return {
      motivo: "ano_fabricacao",
      mensagem: `Confira o ano do veículo: o ano de fabricação não pode ser posterior a ${hoje.getFullYear()}.`,
      campo: "veiculo",
    };
  }
  if (t.includes("zero km")) {
    const minimo = t.match(/anteriores a (\d{4})/)?.[1] ?? String(hoje.getFullYear() - 1);
    return {
      motivo: "zero_km",
      mensagem: `Sem placa, cotamos só veículo 0 km (${minimo} ou mais novo). Para veículo usado, informe a placa.`,
      campo: "veiculo",
    };
  }
  if (t.includes("codigo fipe")) return { motivo: "fipe_incorreto", mensagem: VERSAO_INDISPONIVEL, campo: "veiculo" };
  if (t.includes("veiculo nao foi localizado")) {
    return { motivo: "veiculo_nao_localizado", mensagem: VERSAO_INDISPONIVEL, campo: "veiculo" };
  }
  if (t.includes("modelo informado")) return { motivo: "modelo_incorreto", mensagem: VERSAO_INDISPONIVEL, campo: "veiculo" };
  return null;
}
