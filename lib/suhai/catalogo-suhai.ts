/**
 * lib/suhai/catalogo-suhai.ts — a versão da FIPE pública confrontada com o
 * catálogo da Suhai (`ConsultaVeiculos`). Código ausente no catálogo é
 * recusado na cotação ("Código FIPE informado está incorreto"), então a
 * versão sai das opções. Sem imports: o teste em Node usa o mesmo arquivo.
 */

const CATEGORIA_POR_CODIGO: Record<number, string> = {
  1: "auto",
  2: "moto",
  3: "caminhao",
  4: "van",
};

export type ItemCatalogoSuhai = {
  codFipe: string | null;
  marca: string;
  modelo: string;
  codCategoria: number | null;
};

export type GrafiaSuhai = {
  marca: string;
  modelo: string;
  codFipe: string;
  categoria?: string;
};

/**
 * Crítica da Suhai de código sem registro ("Não foi encontrado nenhum
 * registro…"), que equivale ao catálogo vazio. Login inválido e outras
 * críticas não entram: são indisponibilidade.
 */
export function catalogoSemRegistro(mensagem: string | null | undefined): boolean {
  const texto = String(mensagem ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /nenhum registro|nao (foi )?encontrad|nao localizad/.test(texto);
}

/**
 * `null`: a Suhai respondeu e não tem o código. Catálogo fora do ar mantém a
 * grafia pública — a cotação decide.
 */
export function grafiaDoCatalogo(
  candidato: { nome: string; codFipe: string },
  marcaPlaca: string,
  catalogo: ItemCatalogoSuhai[] | "indisponivel",
): GrafiaSuhai | null {
  const publica = { marca: marcaPlaca, modelo: candidato.nome, codFipe: candidato.codFipe };
  if (catalogo === "indisponivel") return publica;
  if (catalogo.length === 0) return null;
  const suhai = catalogo.find((item) => item.marca && item.modelo);
  if (!suhai) return publica;
  return {
    marca: suhai.marca,
    modelo: suhai.modelo,
    codFipe: suhai.codFipe || candidato.codFipe,
    categoria: suhai.codCategoria ? CATEGORIA_POR_CODIGO[suhai.codCategoria] : undefined,
  };
}
