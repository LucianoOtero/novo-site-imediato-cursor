/**
 * Resolve o código FIPE público (tabela Parallelum) a partir da marca,
 * do modelo e do ano que a Placa Fipe devolve. A Placa Fipe deste site
 * não traz o código. Só devolvemos um código quando há um único modelo
 * compatível — um nome genérico como "GOLF" não escolhe versão.
 */

const BASE = "https://parallelum.com.br/fipe/api/v1";
const BASE_V2 = "https://fipe.parallelum.com.br/api/v2";
/** A tabela muda no máximo uma vez por mês; o cache também poupa o limite da API gratuita. */
const CACHE_SEGUNDOS = 60 * 60 * 24 * 7;
/** Um nome como "GOLF" casa com dezenas de modelos; em série, a consulta passava de um minuto. */
const SIMULTANEAS = 10;

type Item = { codigo: string; nome: string };
type ItemV2 = { code: string; name: string };
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
export function tokensExigidos(modelo: string): string[] {
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

/** `XTZ250` na placa é `XTZ 250` na tabela; `CRETA1TA` vira `CRETA 1 TA`. */
function partes(token: string): string[] {
  return token.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/).filter(Boolean);
}

function tokenCasa(palavras: string[], token: string): boolean {
  if (palavras.includes(token)) return true;
  const pedacos = partes(token);
  return pedacos.length > 1 && pedacos.every((pedaco) => palavras.includes(pedaco));
}

/**
 * Modelos da marca agrupados por quantos tokens da placa o nome cobre, do
 * mais completo ao menos. A família (primeiro token, como "FIT" ou "XTZ")
 * é obrigatória; o resto pode faltar, porque a placa traz abreviações que a
 * tabela não usa ("CVT", "MCV", "TA"). Só aceita família por prefixo
 * ("320" em "320iA") quando nenhum nome a tem inteira.
 */
export function niveisPorCobertura(modelos: Item[], exigidos: string[]): Item[][] {
  if (exigidos.length === 0) return [];
  const familia = partes(exigidos[0])[0];
  const comPalavras = modelos.map((item) => ({ item, palavras: preparar(item.nome).split(" ") }));
  let daFamilia = comPalavras.filter(({ palavras }) => tokenCasa(palavras, exigidos[0]) || palavras.includes(familia));
  if (daFamilia.length === 0 && familia.length >= 3) {
    daFamilia = comPalavras.filter(({ palavras }) => palavras.some((palavra) => palavra.startsWith(familia)));
  }
  const porCobertura = new Map<number, Item[]>();
  for (const { item, palavras } of daFamilia) {
    const cobertura = exigidos.filter((token) => tokenCasa(palavras, token)).length;
    porCobertura.set(cobertura, [...(porCobertura.get(cobertura) ?? []), item]);
  }
  return [...porCobertura.entries()].sort(([a], [b]) => b - a).map(([, itens]) => itens);
}

async function obterJson<T>(url: string): Promise<T | undefined> {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: CACHE_SEGUNDOS } });
    if (!resposta.ok) return undefined;
    return (await resposta.json()) as T;
  } catch {
    return undefined;
  }
}

async function mapearComLimite<E, R>(itens: E[], limite: number, mapear: (item: E) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(itens.length);
  let proximo = 0;
  async function trabalhar() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await mapear(itens[indice]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhar));
  return resultados;
}

/**
 * Código do ano (um por combustível) de cada modelo da marca que existe no
 * ano informado, pela v2, que lista os modelos por ano numa chamada só. A v2
 * tem limite diário por IP: qualquer falha devolve `undefined` e a busca
 * volta a consultar os anos modelo a modelo na v1 (mesmos códigos e nomes).
 */
async function anosDosModelos(tipo: "carro" | "moto", marcaCodigo: string, ano: string): Promise<Map<string, string> | undefined> {
  const veiculos = tipo === "moto" ? "motorcycles" : "cars";
  const anos = await obterJson<ItemV2[]>(`${BASE_V2}/${veiculos}/brands/${marcaCodigo}/years`);
  const doAno = (anos ?? []).filter((entrada) => entrada.code.startsWith(`${ano}-`));
  if (doAno.length === 0) return undefined;
  const listas = await Promise.all(
    doAno.map((entrada) => obterJson<ItemV2[]>(`${BASE_V2}/${veiculos}/brands/${marcaCodigo}/years/${entrada.code}/models`)),
  );
  if (listas.some((lista) => !lista)) return undefined;
  const anoPorModelo = new Map<string, string>();
  listas.forEach((lista, indice) => {
    for (const modelo of lista ?? []) if (!anoPorModelo.has(modelo.code)) anoPorModelo.set(modelo.code, doAno[indice].code);
  });
  return anoPorModelo;
}

/**
 * Modelos da tabela pública que existem naquele ano e cujo nome cobre o
 * máximo de tokens da abreviação da placa. Mais de um resultado não
 * escolhe versão.
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

  const [modelos, anoPorModelo] = await Promise.all([
    obterJson<{ modelos: Item[] }>(`${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos`),
    anosDosModelos(parametros.tipo, marcaItem.codigo, ano),
  ]);
  const niveis = niveisPorCobertura(modelos?.modelos ?? [], tokensExigidos(modelo));

  for (const compativeis of niveis) {
    const candidatos = await mapearComLimite(compativeis, SIMULTANEAS, async (item): Promise<CandidatoFipe | undefined> => {
      let anoCodigo = anoPorModelo?.get(String(item.codigo));
      if (!anoPorModelo) {
        const anos = await obterJson<Item[]>(`${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos/${item.codigo}/anos`);
        anoCodigo = anos?.find((entrada) => entrada.codigo.startsWith(ano) || entrada.nome.startsWith(ano))?.codigo;
      }
      if (!anoCodigo) return undefined;
      const preco = await obterJson<Preco>(`${BASE}/${tabela}/marcas/${marcaItem.codigo}/modelos/${item.codigo}/anos/${anoCodigo}`);
      const codFipe = preco?.CodigoFipe || preco?.codigoFipe;
      return codFipe ? { nome: item.nome, codFipe } : undefined;
    });
    const encontrados = candidatos.filter((candidato): candidato is CandidatoFipe => candidato !== undefined);
    if (encontrados.length > 0) return encontrados;
  }
  return [];
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
