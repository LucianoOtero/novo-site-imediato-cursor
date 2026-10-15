export const PRODUTOS_SUHAI = [
  {
    slug: "moto",
    href: "/marca-suhai/moto",
    titulo: "Seguro Moto",
    texto: "Ideal pra quem vive sobre duas rodas.",
    imagem: "/marca-suhai/servico-moto.webp",
    paraQuem: "Para quem usa a moto todo dia, no deslocamento ou na estrada, do 0km à usada.",
    protege:
      "A cotação mostra as coberturas que fazem sentido para a sua moto e o preço na hora. A placa identifica marca, modelo e ano.",
  },
  {
    slug: "carro",
    href: "/marca-suhai/carro",
    titulo: "Seguro Carro",
    texto: "Essencial para quem quer dirigir tranquilo.",
    imagem: "/marca-suhai/servico-carro.webp",
    paraQuem: "Para quem quer proteção no uso de todos os dias, sem pagar por cobertura que não usa.",
    protege:
      "Você informa a placa e vê o preço do seguro do seu carro. A placa adianta marca, modelo e ano antes dos seus dados.",
  },
  {
    slug: "caminhao",
    href: "/marca-suhai/caminhao",
    titulo: "Seguro para Caminhões, Vans e VUCs",
    texto: "Para quem vive do transporte, em qualquer rota.",
    imagem: "/marca-suhai/servico-caminhao.webp",
    paraQuem: "Caminhões, vans e VUCs de quem trabalha com o veículo na cidade ou na estrada.",
    protege:
      "A placa identifica o veículo e a cotação mostra o preço para essa categoria, com as coberturas que cabem na sua rota.",
  },
] as const;

export type ProdutoSuhaiSlug = (typeof PRODUTOS_SUHAI)[number]["slug"];

export function produtoSuhai(slug: ProdutoSuhaiSlug) {
  const produto = PRODUTOS_SUHAI.find((item) => item.slug === slug);
  if (!produto) throw new Error(`Produto Suhai desconhecido: ${slug}`);
  return produto;
}
