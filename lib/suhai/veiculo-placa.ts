import { catalogoSemRegistro, grafiaDoCatalogo, type GrafiaSuhai } from "@/lib/suhai/catalogo-suhai";
import { consultarFipe, GatewayError, gatewayConfigurado } from "@/lib/suhai/gateway";
import { candidatosFipePublicos, FipeIndisponivel, type CandidatoFipe } from "@/lib/suhai/fipe-publica";
import { validatePlacaViaFipe } from "@/lib/validation/placa-fipe";

export type OpcaoVeiculo = {
  marca: string;
  modelo: string;
  codFipe: string;
};

export type VeiculoPreenchido = {
  ok: true;
  categoria: string;
  anoModelo: string;
  anoFabricacao: string;
  marca: string;
  modelo: string;
  codFipe?: string;
  /** Mais de uma versão no ano. A cotação espera a escolha, sem adivinhar. */
  opcoes?: OpcaoVeiculo[];
};

/**
 * A placa existe, mas a versão da FIPE não saiu. O nome da placa não serve à
 * Suhai ("Veículo não foi localizado"): volta só como ponto de partida para o
 * cliente confirmar o modelo.
 */
export type PlacaSemVersao = {
  ok: false;
  motivo: "sem_versao" | "fipe_indisponivel";
  categoria: string;
  anoModelo: string;
  anoFabricacao: string;
  marca: string;
  modelo: string;
};

export type VeiculoNaoIdentificado = { ok: false; motivo: "nao_encontrado" | "fipe_indisponivel" };

async function candidatosOuIndisponivel(
  parametros: Parameters<typeof candidatosFipePublicos>[0],
): Promise<CandidatoFipe[] | "indisponivel"> {
  try {
    return await candidatosFipePublicos(parametros);
  } catch (error) {
    if (error instanceof FipeIndisponivel) return "indisponivel";
    throw error;
  }
}

/** `null`: versão fora do catálogo Suhai, que recusaria o código na cotação. */
async function grafiaSuhai(candidato: CandidatoFipe, marcaPlaca: string): Promise<GrafiaSuhai | null> {
  if (!gatewayConfigurado()) return grafiaDoCatalogo(candidato, marcaPlaca, "indisponivel");
  try {
    return grafiaDoCatalogo(candidato, marcaPlaca, await consultarFipe({ codFipe: candidato.codFipe }));
  } catch (error) {
    if (error instanceof GatewayError && error.codigoSuhai && catalogoSemRegistro(error.message)) {
      return grafiaDoCatalogo(candidato, marcaPlaca, []);
    }
    console.warn("[suhai/veiculo] ConsultaVeiculos indisponível; mantendo a grafia da tabela pública.", error);
    return grafiaDoCatalogo(candidato, marcaPlaca, "indisponivel");
  }
}

/**
 * Placa Fipe para categoria e ano. A grafia enviada à Suhai sai do catálogo
 * dela quando a abreviação da placa e o ano apontam uma versão. Várias
 * versões voltam em `opcoes`, sem escolher uma.
 */
export async function veiculoPorPlaca(
  placa: string,
): Promise<VeiculoPreenchido | PlacaSemVersao | { ok: false; motivo: "nao_encontrada" }> {
  const consulta = await validatePlacaViaFipe(placa);
  if (!consulta.ok || !consulta.anoModelo) return { ok: false, motivo: "nao_encontrada" };

  const tipo: "carro" | "moto" = consulta.tipoVeiculo === "moto" ? "moto" : "carro";
  const veiculo = {
    tipo,
    marca: consulta.marca ?? "",
    modelo: consulta.modelo ?? "",
    anoModelo: consulta.anoModelo,
    anoFabricacao: consulta.anoFabricacao ?? consulta.anoModelo,
  };
  const candidatos = await candidatosOuIndisponivel({
    tipo,
    marca: veiculo.marca,
    modelo: veiculo.modelo,
    ano: veiculo.anoModelo,
  });

  const preenchido = candidatos === "indisponivel" ? null : await preencher(candidatos, veiculo);
  if (!preenchido) {
    return {
      ok: false,
      motivo: candidatos === "indisponivel" ? "fipe_indisponivel" : "sem_versao",
      categoria: tipo === "moto" ? "moto" : "auto",
      anoModelo: veiculo.anoModelo,
      anoFabricacao: veiculo.anoFabricacao,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
    };
  }
  return preenchido;
}

/**
 * Sem placa: a marca e o modelo digitados, no ano informado, nas tabelas de
 * carro e de moto. Sem nenhuma versão encontrada devolve `ok: false` — o
 * nome digitado não serve à Suhai, que só aceita a grafia do catálogo.
 */
export async function veiculoPorModelo(dados: {
  marca: string;
  modelo: string;
  anoModelo: string;
}): Promise<VeiculoPreenchido | VeiculoNaoIdentificado> {
  const busca = { marca: dados.marca, modelo: dados.modelo, ano: dados.anoModelo };
  const [carros, motos] = await Promise.all([
    candidatosOuIndisponivel({ ...busca, tipo: "carro" }),
    candidatosOuIndisponivel({ ...busca, tipo: "moto" }),
  ]);
  const lista = (resultado: CandidatoFipe[] | "indisponivel") => (resultado === "indisponivel" ? [] : resultado);
  const tipo = lista(carros).length > 0 ? "carro" : "moto";
  const candidatos = lista(carros).length > 0 ? lista(carros) : lista(motos);
  if (candidatos.length === 0) {
    const indisponivel = carros === "indisponivel" || motos === "indisponivel";
    return { ok: false, motivo: indisponivel ? "fipe_indisponivel" : "nao_encontrado" };
  }
  return (
    (await preencher(candidatos, { ...dados, tipo, anoFabricacao: dados.anoModelo })) ?? {
      ok: false,
      motivo: "nao_encontrado",
    }
  );
}

/** `null` quando nenhuma versão está no catálogo Suhai. */
async function preencher(
  candidatos: CandidatoFipe[],
  veiculo: { tipo: "carro" | "moto"; marca: string; modelo: string; anoModelo: string; anoFabricacao: string },
): Promise<VeiculoPreenchido | null> {
  let categoria = veiculo.tipo === "moto" ? "moto" : "auto";
  const grafias = await Promise.all(candidatos.map((candidato) => grafiaSuhai(candidato, veiculo.marca)));
  const opcoes = grafias.filter((grafia): grafia is GrafiaSuhai => grafia !== null);
  if (opcoes.length === 0) return null;
  const unica = opcoes.length === 1 ? opcoes[0] : undefined;
  if (unica?.categoria) categoria = unica.categoria;

  return {
    ok: true,
    categoria,
    anoModelo: veiculo.anoModelo,
    anoFabricacao: veiculo.anoFabricacao,
    marca: unica?.marca || veiculo.marca,
    modelo: unica?.modelo || (opcoes.length > 1 ? "" : veiculo.modelo),
    codFipe: unica?.codFipe,
    opcoes: opcoes.length > 1 ? opcoes.map(({ marca: marcaOpcao, modelo: modeloOpcao, codFipe }) => ({ marca: marcaOpcao, modelo: modeloOpcao, codFipe })) : undefined,
  };
}
