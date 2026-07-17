/**
 * lib/perfil-rpa.ts — regra de perfil derivado para a cotação RPA
 * (projeto 2026-07-17).
 *
 * A data de nascimento vem da PH3A (`lib/ph3a.ts`, via o proxy de CPF). A
 * partir dela derivamos o `estado_civil` enviado ao RPA por uma regra de
 * idade (pedido do cliente): menor de 25 anos → "Solteiro"; 25 anos ou mais
 * → "Casado ou União Estável". Esses valores constam do enum aceito pelo
 * motor (`utils/validacao_parametros.py` no projeto RPA).
 */

export type EstadoCivilRpa = "Solteiro" | "Casado ou União Estável";

const IDADE_LIMITE_SOLTEIRO = 25;

/**
 * Normaliza a data de nascimento para `DD/MM/AAAA` (formato esperado pelo
 * motor). Aceita `DD/MM/AAAA` e `AAAA-MM-DD` (com hora opcional). Retorna
 * `undefined` se não conseguir interpretar.
 */
export function normalizarDataNascimentoBR(valor?: string | null): string | undefined {
  if (!valor) return undefined;
  const texto = String(valor).trim();
  if (!texto) return undefined;

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, dia, mes, ano] = br;
    return `${dia}/${mes}/${ano}`;
  }

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, ano, mes, dia] = iso;
    return `${dia}/${mes}/${ano}`;
  }

  return undefined;
}

/** Converte a data (DD/MM/AAAA ou AAAA-MM-DD) em `Date` (meia-noite local). */
function parseDataNascimento(valor?: string | null): Date | undefined {
  const normalizada = normalizarDataNascimentoBR(valor);
  if (!normalizada) return undefined;
  const [dia, mes, ano] = normalizada.split("/").map(Number);
  const data = new Date(ano, mes - 1, dia);
  // Rejeita datas impossíveis (ex.: 31/02) que o Date "corrige" silenciosamente.
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    return undefined;
  }
  return data;
}

/** Idade em anos completos a partir da data de nascimento. `undefined` se inválida. */
export function calcularIdade(dataNascimento?: string | null, hoje: Date = new Date()): number | undefined {
  const nascimento = parseDataNascimento(dataNascimento);
  if (!nascimento) return undefined;

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesDiff = hoje.getMonth() - nascimento.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }
  if (idade < 0 || idade > 120) return undefined;
  return idade;
}

/**
 * Estado civil derivado da idade (regra do cliente): menor de 25 →
 * "Solteiro"; 25 ou mais → "Casado ou União Estável". Retorna `undefined`
 * quando não há data de nascimento válida (nesse caso o payload não leva
 * `estado_civil` e o backend faz sua própria estimativa).
 */
export function estadoCivilPorIdade(dataNascimento?: string | null, hoje?: Date): EstadoCivilRpa | undefined {
  const idade = calcularIdade(dataNascimento, hoje);
  if (idade === undefined) return undefined;
  return idade < IDADE_LIMITE_SOLTEIRO ? "Solteiro" : "Casado ou União Estável";
}
