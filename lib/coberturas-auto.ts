/**
 * lib/coberturas-auto.ts — hub `/coberturas`: as 16 coberturas de Seguro
 * Auto confirmadas pelo cliente (2026-07-09, mesmas de `AUTO_COVERAGES`
 * em `lib/ramos.ts`) + descrições genéricas do que costuma estar
 * abrangido no mercado brasileiro.
 *
 * As descrições são ilustrativas (boas práticas de mercado / linguagem
 * institucional). Limites, franquias, exclusões e a inclusão efetiva de
 * cada item variam por seguradora e plano — a apólice e as Condições
 * Gerais prevalecem. Não inventar valores, prazos ou percentuais.
 */

export type CoberturaAuto = {
  name: string;
  /** Breve descrição do que tipicamente está coberto. */
  description: string;
  /** Ícone 3D já usado em `CoverageCards` (`/public/icons-3d/`). */
  iconSrc: string;
};

export const coberturasAuto: CoberturaAuto[] = [
  {
    name: "Colisão",
    description:
      "Protege o veículo segurado contra danos decorrentes de batidas e colisões com outros veículos, objetos ou obstáculos, conforme o plano contratado.",
    iconSrc: "/icons-3d/cov-colisao.webp",
  },
  {
    name: "Roubo e furto",
    description:
      "Indeniza a perda do veículo em caso de roubo ou furto, nos termos da apólice e da tabela de referência prevista no contrato (em geral, percentual da FIPE).",
    iconSrc: "/icons-3d/cov-roubo.webp",
  },
  {
    name: "Incêndio",
    description:
      "Cobre danos ao veículo causados por incêndio, raio ou explosão, de acordo com as coberturas e limites definidos na apólice.",
    iconSrc: "/icons-3d/cov-incendio.webp",
  },
  {
    name: "Danos pessoais",
    description:
      "Abrange despesas médicas e indenizações por lesões ou morte dos ocupantes do veículo segurado (cobertura do tipo APP — Acidentes Pessoais de Passageiros), quando contratada.",
    iconSrc: "/icons-3d/cov-danos-pessoais.webp",
  },
  {
    name: "Danos materiais",
    description:
      "Responsabilidade civil por danos materiais causados a terceiros em acidente de trânsito envolvendo o veículo segurado (parte típica do RCF — Responsabilidade Civil Facultativa).",
    iconSrc: "/icons-3d/cov-danos-materiais.webp",
  },
  {
    name: "Assistência 24h",
    description:
      "Pacote de socorro disponível a qualquer hora — guincho, orientação e outros serviços de emergência previstos no plano — acionado diretamente na central da seguradora.",
    iconSrc: "/icons-3d/cov-assistencia.webp",
  },
  {
    name: "Chaveiro",
    description:
      "Serviço de chaveiro em situações como perda, quebra ou esquecimento da chave no interior do veículo, dentro dos limites da assistência contratada.",
    iconSrc: "/icons-3d/cov-chaveiro.webp",
  },
  {
    name: "Vidros",
    description:
      "Reparação ou substituição de para-brisas, vigias e demais vidros do veículo, conforme a cláusula de vidros do plano (não se confunde com sinistro de casco).",
    iconSrc: "/icons-3d/cov-vidros.webp",
  },
  {
    name: "Pane seca",
    description:
      "Auxílio quando o veículo para por falta de combustível — em geral com deslocamento limitado e reabastecimento emergencial, conforme a apólice.",
    iconSrc: "/icons-3d/cov-pane-seca.webp",
  },
  {
    name: "Pane elétrica",
    description:
      "Socorro em falhas elétricas que impeçam o veículo de funcionar (por exemplo, bateria), com tentativa de restabelecimento no local ou remoção.",
    iconSrc: "/icons-3d/cov-pane-eletrica.webp",
  },
  {
    name: "Pane mecânica",
    description:
      "Atendimento em falhas mecânicas que imobilizem o veículo, com reparo emergencial no local quando possível ou reboque até oficina/local indicado.",
    iconSrc: "/icons-3d/cov-pane-mecanica.webp",
  },
  {
    name: "Faróis",
    description:
      "Cobertura para reparo ou troca de faróis danificados, segundo a cláusula específica do plano (limites e peças variam por seguradora).",
    iconSrc: "/icons-3d/cov-farois.webp",
  },
  {
    name: "Táxi",
    description:
      "Meio de transporte alternativo (táxi ou similar) após sinistro ou assistência, para que o segurado e ocupantes possam seguir viagem ou retornar, nos limites do plano.",
    iconSrc: "/icons-3d/cov-taxi.webp",
  },
  {
    name: "Retrovisores",
    description:
      "Reparação ou substituição de retrovisores danificados, quando a cláusula correspondente estiver incluída na apólice.",
    iconSrc: "/icons-3d/cov-retrovisores.webp",
  },
  {
    name: "Pneus",
    description:
      "Auxílio em caso de pneu furado ou danificado — troca pelo estepe ou remoção até o borracheiro, conforme a assistência contratada.",
    iconSrc: "/icons-3d/cov-pneus.webp",
  },
  {
    name: "Carro reserva",
    description:
      "Disponibilização de veículo substituto por período determinado enquanto o segurado está sem o carro por sinistro ou reparo coberto, nos termos do plano.",
    iconSrc: "/icons-3d/cov-carro-reserva.webp",
  },
];
