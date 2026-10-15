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

  let categoria = tipo === "moto" ? "moto" : "auto";
  const marca = consulta.marca ?? "";
  const modelo = consulta.modelo ?? "";
  const opcoes = await Promise.all(candidatos.map((candidato) => grafiaSuhai(candidato, marca)));
  const unica = opcoes.length === 1 ? opcoes[0] : undefined;
  if (unica?.categoria) categoria = unica.categoria;

  return {
    ok: true,
    categoria,
    anoModelo: consulta.anoModelo,
    anoFabricacao: consulta.anoFabricacao ?? consulta.anoModelo,
    marca: unica?.marca || marca,
    modelo: unica?.modelo || (opcoes.length > 1 ? "" : modelo),
    codFipe: unica?.codFipe,
    opcoes: opcoes.length > 1 ? opcoes.map(({ marca: marcaOpcao, modelo: modeloOpcao, codFipe }) => ({ marca: marcaOpcao, modelo: modeloOpcao, codFipe })) : undefined,
  };
}
