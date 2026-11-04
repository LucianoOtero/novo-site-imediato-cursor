import { consultarFipe, gatewayConfigurado, type VeiculoFipe } from "@/lib/suhai/gateway";
import { candidatosFipePublicos, type CandidatoFipe } from "@/lib/suhai/fipe-publica";
import { validatePlacaViaFipe } from "@/lib/validation/placa-fipe";

const CATEGORIA_POR_CODIGO: Record<number, string> = {
  1: "auto",
  2: "moto",
  3: "caminhao",
  4: "van",
};

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

async function grafiaSuhai(candidato: CandidatoFipe, marcaPlaca: string): Promise<OpcaoVeiculo & { categoria?: string }> {
  if (!gatewayConfigurado()) {
    return { marca: marcaPlaca, modelo: candidato.nome, codFipe: candidato.codFipe };
  }
  try {
    const veiculos = await consultarFipe({ codFipe: candidato.codFipe });
    const suhai: VeiculoFipe | undefined = veiculos[0];
    if (suhai?.marca && suhai.modelo) {
      return {
        marca: suhai.marca,
        modelo: suhai.modelo,
        codFipe: suhai.codFipe || candidato.codFipe,
        categoria: suhai.codCategoria ? CATEGORIA_POR_CODIGO[suhai.codCategoria] : undefined,
      };
    }
  } catch (error) {
    console.warn("[suhai/veiculo] ConsultaVeiculos indisponível; mantendo a grafia da tabela pública.", error);
  }
  return { marca: marcaPlaca, modelo: candidato.nome, codFipe: candidato.codFipe };
}

/**
 * Placa Fipe para categoria e ano. A grafia enviada à Suhai sai do catálogo
 * dela quando a abreviação da placa e o ano apontam uma versão. Várias
 * versões voltam em `opcoes`, sem escolher uma.
 */
export async function veiculoPorPlaca(placa: string): Promise<VeiculoPreenchido | { ok: false }> {
  const consulta = await validatePlacaViaFipe(placa);
  if (!consulta.ok || !consulta.anoModelo) return { ok: false };

  const tipo = consulta.tipoVeiculo === "moto" ? "moto" : "carro";
  const candidatos = await candidatosFipePublicos({
    tipo,
    marca: consulta.marca,
    modelo: consulta.modelo,
    ano: consulta.anoModelo,
  });

  return preencher(candidatos, {
    tipo,
    marca: consulta.marca ?? "",
    modelo: consulta.modelo ?? "",
    anoModelo: consulta.anoModelo,
    anoFabricacao: consulta.anoFabricacao ?? consulta.anoModelo,
  });
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
}): Promise<VeiculoPreenchido | { ok: false }> {
  const busca = { marca: dados.marca, modelo: dados.modelo, ano: dados.anoModelo };
  const [carros, motos] = await Promise.all([
    candidatosFipePublicos({ ...busca, tipo: "carro" }),
    candidatosFipePublicos({ ...busca, tipo: "moto" }),
  ]);
  const tipo = carros.length > 0 ? "carro" : "moto";
  const candidatos = carros.length > 0 ? carros : motos;
  if (candidatos.length === 0) return { ok: false };
  return preencher(candidatos, { ...dados, tipo, anoFabricacao: dados.anoModelo });
}

async function preencher(
  candidatos: CandidatoFipe[],
  veiculo: { tipo: "carro" | "moto"; marca: string; modelo: string; anoModelo: string; anoFabricacao: string },
): Promise<VeiculoPreenchido> {
  let categoria = veiculo.tipo === "moto" ? "moto" : "auto";
  const opcoes = await Promise.all(candidatos.map((candidato) => grafiaSuhai(candidato, veiculo.marca)));
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
