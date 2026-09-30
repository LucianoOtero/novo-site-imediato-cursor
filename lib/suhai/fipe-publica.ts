/**
 * Resolve o código FIPE público (tabela Parallelum) a partir da marca,
 * do modelo e do ano que a Placa Fipe devolve. A Placa Fipe deste site
 * não traz o código. Só devolvemos um código quando há um único modelo
 * compatível — um nome genérico como "GOLF" não escolhe versão.
 */

const BASE = "https://parallelum.com.br/fipe/api/v1";

type Item = { codigo: string; nome: string };
type Preco = { CodigoFipe?: string; codigoFipe?: string };

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function obterJson<T>(url: string): Promise<T | undefined> {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resposta.ok) return undefined;
    return (await resposta.json()) as T;
  } catch {
    return undefined;
  }
}

export async function codigoFipePublico(parametros: {
  tipo: "carro" | "moto";
  marca?: string;
  modelo?: string;
  ano?: string;
}): Promise<string | undefined> {
  const { marca, modelo, ano } = parametros;
  if (!marca || !modelo || !ano) return undefined;

  const tabela = parametros.tipo === "moto" ? "motos" : "carros";
  const marcas = await obterJson<Item[]>(`${BASE}/${tabela}/marcas`);
  if (!marcas) return undefined;

  const marcaNorm = normalizar(marca);
  const marcaItem = marcas.find((item) => {
    const nome = normalizar(item.nome);
    return nome.includes(marcaNorm) || marcaNorm.includes(nome);
  });
  if (!marcaItem) return undefined;

  const modelos = await obterJson<{ modelos: Item[] }>(`${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos`);
  const modeloNorm = normalizar(modelo);
  const compativeis = (modelos?.modelos ?? []).filter((item) => normalizar(item.nome).includes(modeloNorm));
  if (compativeis.length !== 1) return undefined;

  const anos = await obterJson<Item[]>(`${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos/${compativeis[0].codigo}/anos`);
  const anoItem = anos?.find((item) => item.codigo.startsWith(ano) || item.nome.startsWith(ano));
  if (!anoItem) return undefined;

  const preco = await obterJson<Preco>(
    `${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos/${compativeis[0].codigo}/anos/${anoItem.codigo}`,
  );
  return preco?.CodigoFipe || preco?.codigoFipe || undefined;
}
