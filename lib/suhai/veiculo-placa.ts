import { consultarFipe, gatewayConfigurado } from "@/lib/suhai/gateway";
import { codigoFipePublico } from "@/lib/suhai/fipe-publica";
import { validatePlacaViaFipe } from "@/lib/validation/placa-fipe";

const CATEGORIA_POR_CODIGO: Record<number, string> = {
  1: "auto",
  2: "moto",
  3: "caminhao",
  4: "van",
};

export type VeiculoPreenchido = {
  ok: true;
  categoria: string;
  anoModelo: string;
  anoFabricacao: string;
  marca: string;
  modelo: string;
  codFipe?: string;
};

/**
 * Placa Fipe para categoria e ano, e, quando o código público é único e o
 * gateway está configurado, a grafia de marca e modelo da Suhai.
 */
export async function veiculoPorPlaca(placa: string): Promise<VeiculoPreenchido | { ok: false }> {
  const consulta = await validatePlacaViaFipe(placa);
  if (!consulta.ok || !consulta.anoModelo) return { ok: false };

  const tipo = consulta.tipoVeiculo === "moto" ? "moto" : "carro";
  const codFipe = await codigoFipePublico({
    tipo,
    marca: consulta.marca,
    modelo: consulta.modelo,
    ano: consulta.anoModelo,
  });

  let categoria = tipo === "moto" ? "moto" : "auto";
  let marca = consulta.marca ?? "";
  let modelo = consulta.modelo ?? "";

  if (codFipe && gatewayConfigurado()) {
    try {
      const veiculos = await consultarFipe({ codFipe });
      const suhai = veiculos[0];
      if (suhai?.marca && suhai.modelo) {
        marca = suhai.marca;
        modelo = suhai.modelo;
        if (suhai.codCategoria && CATEGORIA_POR_CODIGO[suhai.codCategoria]) {
          categoria = CATEGORIA_POR_CODIGO[suhai.codCategoria];
        }
      }
    } catch (error) {
      console.warn("[suhai/veiculo] ConsultaVeiculos indisponível; mantendo a grafia da Placa Fipe.", error);
    }
  }

  return {
    ok: true,
    categoria,
    anoModelo: consulta.anoModelo,
    anoFabricacao: consulta.anoFabricacao ?? consulta.anoModelo,
    marca,
    modelo,
    codFipe,
  };
}
