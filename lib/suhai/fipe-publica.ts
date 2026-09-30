/**
 * Resolve o código FIPE público (tabela Parallelum) a partir da marca,
 * do modelo e do ano que a Placa Fipe devolve. A Placa Fipe deste site
 * não traz o código. Só devolvemos um código quando há um único modelo
 * compatível — um nome genérico como "GOLF" não escolhe versão.
 */

const BASE = "https://parallelum.com.br/fipe/api/v1";

type Item = { codigo: string; nome: string };
type Preco = { CodigoFipe?: string; codigoFipe?: string };

export type CandidatoFipe = { nome: string; codFipe: string };

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Conserva `1.6` como um token só (`1_6`), para não confundir com `16`. */
function preparar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, "$1_$2")
    .replace(/[^a-z0-9_]+/g, " ")
    .trim();
}

/**
 * `16SV` na placa é `1.6` + `SV`. `16V` fica inteiro: é válvula, não motorização.
 */
function tokensExigidos(modelo: string): string[] {
  const tokens: string[] = [];
  for (const token of preparar(modelo).split(" ").filter(Boolean)) {
    const colado = token.match(/^(\d)(\d)([a-z]{2,})$/);
    if (colado && colado[3] !== "v") {
      tokens.push(`${colado[1]}_${colado[2]}`, colado[3]);
      continue;
    }
    tokens.push(token);
  }
  return tokens;
}

function nomeContem(nome: string, token: string): boolean {
  return preparar(nome).split(" ").includes(token);
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

/**
 * Modelos da tabela pública cujo nome cobre a abreviação da placa e que
 * existem naquele ano. Mais de um resultado não escolhe versão.
 */
export async function candidatosFipePublicos(parametros: {
  tipo: "carro" | "moto";
  marca?: string;
  modelo?: string;
  ano?: string;
}): Promise<CandidatoFipe[]> {
  const { marca, modelo, ano } = parametros;
  if (!marca || !modelo || !ano) return [];

  const tabela = parametros.tipo === "moto" ? "motos" : "carros";
  const marcas = await obterJson<Item[]>(`${BASE}/${tabela}/marcas`);
  if (!marcas) return [];

  const marcaNorm = normalizar(marca);
  const marcaItem = marcas.find((item) => {
    const nome = normalizar(item.nome);
    return nome.includes(marcaNorm) || marcaNorm.includes(nome);
  });
  if (!marcaItem) return [];

  const modelos = await obterJson<{ modelos: Item[] }>(`${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos`);
  const exigidos = tokensExigidos(modelo);
  const compativeis = (modelos?.modelos ?? []).filter((item) => exigidos.every((token) => nomeContem(item.nome, token)));

  const candidatos: CandidatoFipe[] = [];
  for (const item of compativeis) {
    const anos = await obterJson<Item[]>(`${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos/${item.codigo}/anos`);
    const anoItem = anos?.find((entrada) => entrada.codigo.startsWith(ano) || entrada.nome.startsWith(ano));
    if (!anoItem) continue;
    const preco = await obterJson<Preco>(
      `${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos/${item.codigo}/anos/${anoItem.codigo}`,
    );
    const codFipe = preco?.CodigoFipe || preco?.codigoFipe;
    if (codFipe) candidatos.push({ nome: item.nome, codFipe });
  }
  return candidatos;
}

export async function codigoFipePublico(parametros: {
  tipo: "carro" | "moto";
  marca?: string;
  modelo?: string;
  ano?: string;
}): Promise<string | undefined> {
  const candidatos = await candidatosFipePublicos(parametros);
  return candidatos.length === 1 ? candidatos[0].codFipe : undefined;
}
