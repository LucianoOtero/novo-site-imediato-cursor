import { consultarPh3a } from "@/lib/ph3a";
import { estadoCivilPorIdade, normalizarDataNascimentoBR } from "@/lib/perfil-rpa";
import { ESTADO_CIVIL, SEXO } from "@/lib/suhai/dominio";

export type PerfilSuhai = {
  dataNascimento: string;
  sexo: (typeof SEXO)[keyof typeof SEXO];
  estadoCivil: (typeof ESTADO_CIVIL)[keyof typeof ESTADO_CIVIL];
};

function sexoSuhai(valor?: string): PerfilSuhai["sexo"] | undefined {
  if (!valor) return undefined;
  if (valor === "1" || /fem/i.test(valor)) return SEXO.feminino;
  if (valor === "2" || /masc|^m$/i.test(valor)) return SEXO.masculino;
  return undefined;
}

function isoDeNascimento(valor?: string): string | undefined {
  const br = normalizarDataNascimentoBR(valor);
  if (!br) return undefined;
  const [dia, mes, ano] = br.split("/");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Mesma regra do RPA: nascimento e sexo vêm da PH3A; o estado civil é
 * derivado da idade (menor de 25 solteiro, 25 ou mais casado).
 */
export async function perfilPorCpf(cpf: string): Promise<PerfilSuhai | undefined> {
  const ph3a = await consultarPh3a(cpf);
  const dataNascimento = isoDeNascimento(ph3a.dataNascimento);
  const sexo = sexoSuhai(ph3a.sexo);
  const civilRpa = estadoCivilPorIdade(ph3a.dataNascimento);
  if (!dataNascimento || !sexo || !civilRpa) return undefined;
  return {
    dataNascimento,
    sexo,
    estadoCivil: civilRpa === "Solteiro" ? ESTADO_CIVIL.solteiro : ESTADO_CIVIL.casado,
  };
}
