/**
 * lib/ramos.ts — fonte única de dados de produto por ramo (Issue 05).
 *
 * Fonte: ESPECIFICACAO v3.md, seção 56.1 (contrato `InsuranceBranch`) e
 * seção 31.2 (fichas por produto, 10 ramos).
 *
 * TRANSPARÊNCIA SOBRE O QUE VEM LITERALMENTE DA ESPECIFICAÇÃO E O QUE É
 * PREENCHIMENTO DE IMPLEMENTAÇÃO (nenhum dado comercial/regulatório foi
 * inventado; ver detalhes por campo abaixo):
 *
 * - slug, priceFrom/priceLabel, headline, seo.title, seo.keywordFocus,
 *   benefits/arguments (3 argumentos por ramo): vêm literalmente da
 *   tabela da seção 31.2.
 * - whatsappMessage: a seção 34.4 dá o texto EXATO apenas para 4 ramos
 *   (auto, moto, uber, frota). Para os outros 6, escrevi um rascunho
 *   seguindo o mesmo padrão de frase — marcado `// RASCUNHO` em cada
 *   item, para revisão do time de Conteúdo (docs/CONTENT_STRATEGY.md).
 * - objections/faq: a seção 31.2 só lista os TÓPICOS (ex.: "franquia/
 *   bônus/documentos/vistoria"), não o texto final de resposta. Cada
 *   `objection`/`question` usa o tópico da especificação reformulado
 *   como pergunta; `response`/`answer` era um placeholder `A_CONFIRMAR`
 *   até 2026-07-08, quando o cliente pediu um rascunho genérico (mesmo
 *   tratamento dado a `/politica-de-privacidade`/`/termos`) — ver nota
 *   completa logo abaixo, antes do array `ramos`.
 * - seo.description: a especificação não dá uma meta description
 *   literal por ramo — escrevi um rascunho curto (<155c) a partir do
 *   headline/benefícios já dados, marcado como rascunho para revisão.
 * - coverages: a lista de 16 coberturas (seção 1.1) parece se referir
 *   ao ramo Auto; a especificação não define o subconjunto específico
 *   para os demais ramos — preenchida para "auto" desde o início; os
 *   demais ramos ganharam uma lista rascunho (2026-07-08, mesmo pedido
 *   acima), com nomes genéricos de mercado para o tipo de veículo/
 *   segmento, não a lista real de coberturas efetivamente oferecida.
 * - category, icon (nome Lucide), analytics.productId: não têm valor
 *   literal na especificação para cada ramo — são escolhas razoáveis de
 *   implementação (ex.: ícones já sugeridos em docs/SVG_ASSETS_AUDIT.md),
 *   revisáveis pelo Design sem impacto em dados comerciais/regulatórios.
 */

export type InsuranceBranch = {
  slug: string;
  name: string;
  shortName: string;
  category: "auto" | "moto" | "pj" | "residencial" | "vida" | "pet" | "aluguel" | "assistencia" | "outros";
  icon: string; // nome do ícone Lucide
  priceFrom?: number;
  priceLabel: string;
  priceDisclaimer?: string;
  headline: string;
  subheadline: string;
  eyebrow?: string;
  seo: { title: string; description: string; keywordFocus: string; canonicalPath: string };
  ads: {
    messageMatchHeadline: string;
    campaignIntent: "transacional" | "nicho" | "pj" | "informacional";
    conversionValue?: number;
  };
  benefits: string[];
  arguments: string[];
  objections: { objection: string; response: string }[];
  coverages: string[];
  faq: { question: string; answer: string }[];
  trustSignals?: string[];
  whatsappMessage: string;
  analytics: { ramo: string; productId: string };
};

const AUTO_COVERAGES = [
  "Colisão",
  "Roubo e furto",
  "Incêndio",
  "Danos pessoais",
  "Danos materiais",
  "Assistência 24h",
  "Chaveiro",
  "Vidros",
  "Pane seca",
  "Pane elétrica",
  "Pane mecânica",
  "Faróis",
  "Retrovisores",
  "Pneus",
  "Carro reserva",
]; // seção 1.1 — lista observada de 16 itens no site atual (16 nomeados; 1 duplicado com Táxi na fonte)

/**
 * Rascunhos de FAQ/objeções por ramo (2026-07-08, a pedido do cliente:
 * "pode redigir um rascunho genérico para eu revisar depois", mesmo
 * tratamento já dado a `/politica-de-privacidade`/`/termos`). Textos
 * propositalmente **genéricos e sem números/condições comerciais
 * específicas não confirmadas** (franquia exata, prazo de carência em
 * dias, percentual de desconto, etc.) — quando a resposta dependeria de
 * um dado comercial/regulatório real, o texto direciona para "fale com
 * um especialista" em vez de inventar o valor. Continuam marcados como
 * RASCUNHO no comentário de cada ramo; substituir por texto validado
 * pelo time de Conteúdo/Jurídico antes de tratar como definitivo.
 */

export const ramos: InsuranceBranch[] = [
  {
    slug: "auto",
    name: "Seguro Auto",
    shortName: "Auto",
    category: "auto",
    icon: "car-front",
    priceFrom: 79.9, // CONFIRMADO (2026-07-03) — ver docs/DADOS_OFICIAIS.md
    priceLabel: "a partir de R$ 79,90/mês",
    headline: "Seguro auto a partir de R$ 79,90/mês, com cobertura FIPE 100%",
    subheadline: "Cotação grátis, sem compromisso, comparando 18 seguradoras.",
    eyebrow: "Seguro Auto",
    seo: {
      title: "Seguro Auto Online | Cotação Grátis em 18 Seguradoras — Imediato",
      description:
        "Cote seu seguro auto com cobertura FIPE 100%, assistência 24h e carro reserva. Cotação grátis, sem compromisso.", // rascunho — revisar com Conteúdo
      keywordFocus: "seguro auto cotação online",
      canonicalPath: "/seguro-auto",
    },
    ads: { messageMatchHeadline: "Seguro auto a partir de R$ 79,90/mês, com cobertura FIPE 100%", campaignIntent: "transacional" },
    benefits: ["Cobertura FIPE 100%", "Assistência 24h + carro reserva", "Bônus integral"],
    arguments: ["Cobertura FIPE 100%", "Assistência 24h + carro reserva", "Bônus integral"],
    objections: [
      {
        objection: "Isso não vai ficar caro?",
        response:
          // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
          "Comparamos sua cotação entre 18 seguradoras parceiras para encontrar o melhor custo-benefício para o seu perfil — sem compromisso de contratação.",
      },
      {
        objection: "Vai dar muito trabalho contratar?",
        response:
          "Não. Você preenche o formulário em menos de 1 minuto e um especialista cuida do resto, incluindo a comparação entre seguradoras.",
      },
      {
        objection: "Como funciona em caso de sinistro?",
        response:
          "Você aciona diretamente a seguradora escolhida (cada uma tem seu próprio canal 24h) e nosso time de atendimento também acompanha o processo com você.",
      },
    ],
    coverages: AUTO_COVERAGES,
    faq: [
      {
        question: "Como funciona a franquia do seguro?",
        answer:
          "A franquia varia conforme a seguradora e o plano escolhido — um dos pontos que comparamos na sua cotação. Um especialista explica as opções disponíveis para o seu perfil antes de você decidir.",
      },
      {
        question: "Como funciona o bônus?",
        answer:
          "Ao migrar seu seguro para a Imediato, sua classe de bônus atual é preservada — você não perde o desconto acumulado por não ter registrado sinistros.",
      },
      {
        question: "Quais documentos são necessários?",
        answer:
          "Para iniciar a cotação, basta DDD e celular. Documentos como CNH, CRLV e dados do condutor principal são solicitados apenas na etapa de contratação, com o especialista.",
      },
      {
        question: "É preciso fazer vistoria do veículo?",
        answer:
          "A exigência de vistoria depende da seguradora e do perfil do veículo. O especialista informa se ela é necessária no seu caso e como agendar.",
      },
    ],
    whatsappMessage: "Olá! Vim pelo site e quero uma cotação de Seguro Auto.",
    analytics: { ramo: "auto", productId: "auto" },
  },
  {
    slug: "moto",
    name: "Seguro de Moto",
    shortName: "Moto",
    category: "moto",
    icon: "bike",
    priceFrom: 49.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 49,90/mês",
    headline: "Seguro de moto a partir de R$ 49,90/mês",
    subheadline: "Cotação grátis, sem compromisso, comparando 18 seguradoras.",
    eyebrow: "Seguro de Moto",
    seo: {
      title: "Seguro de Moto Barato | Cotação Online",
      description: "Cote seu seguro de moto com cobertura contra roubo/furto, RCF e assistência 24h. Cotação grátis.", // rascunho
      keywordFocus: "seguro de moto barato",
      canonicalPath: "/seguro-moto",
    },
    ads: { messageMatchHeadline: "Seguro de moto a partir de R$ 49,90/mês", campaignIntent: "transacional" },
    benefits: ["Roubo/furto + RCF", "Assistência 24h", "Preço acessível"],
    arguments: ["Roubo/furto + RCF", "Assistência 24h", "Preço acessível"],
    objections: [
      {
        objection: "O seguro cobre danos a terceiros?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "Sim, a cobertura de RCF (Responsabilidade Civil Facultativa) protege contra danos materiais e corporais causados a terceiros.",
      },
      {
        objection: "É obrigatório instalar rastreador?",
        response: "Depende da seguradora e do plano escolhido — um especialista informa se há essa exigência para o seu perfil e modelo de moto.",
      },
      {
        objection: "Cobre motos usadas para delivery/aplicativo?",
        response: "O uso por aplicativo/delivery costuma exigir um plano específico. Conte isso ao especialista para ele buscar a cobertura adequada.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para seguro de moto; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Colisão",
      "Roubo e furto",
      "Incêndio",
      "RCF (danos a terceiros)",
      "Assistência 24h",
      "Reposição de acessórios",
    ],
    faq: [
      {
        question: "O seguro cobre danos a terceiros?",
        answer: "Sim, através da cobertura de RCF, que cobre danos materiais e corporais causados a outras pessoas em caso de acidente.",
      },
      {
        question: "É obrigatório instalar rastreador?",
        answer: "Nem sempre — a exigência varia por seguradora e modelo de moto. O especialista confirma isso durante a cotação.",
      },
      {
        question: "Cobre motos usadas para delivery/aplicativo?",
        answer: "Existem planos específicos para uso por aplicativo. Informe esse uso na cotação para o especialista indicar a opção correta.",
      },
    ],
    whatsappMessage: "Olá! Quero cotar um Seguro de Moto.",
    analytics: { ramo: "moto", productId: "moto" },
  },
  {
    slug: "caminhao",
    name: "Seguro de Caminhão",
    shortName: "Caminhão",
    category: "outros",
    icon: "truck",
    priceFrom: 99.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 99,90/mês",
    headline: "Seguro de caminhão sob medida para o seu negócio",
    subheadline: "Cotação grátis, sem compromisso, comparando 18 seguradoras.",
    eyebrow: "Seguro de Caminhão",
    seo: {
      title: "Seguro de Caminhão | Casco, RCF e Assistência 24h",
      description: "Seguro de caminhão com casco, RCF-V, assistência pesada e carga opcional. Cotação grátis.", // rascunho
      keywordFocus: "seguro de caminhão",
      canonicalPath: "/seguro-caminhao",
    },
    ads: { messageMatchHeadline: "Seguro de caminhão sob medida para o seu negócio", campaignIntent: "nicho" },
    benefits: ["Casco + RCF-V", "Assistência pesada", "Carga opcional"],
    arguments: ["Casco + RCF-V", "Assistência pesada", "Carga opcional"],
    objections: [
      {
        objection: "O seguro cobre a carga transportada?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "A cobertura de carga é opcional e pode ser incluída na cotação — o especialista explica os limites e valores disponíveis para o seu tipo de carga.",
      },
      {
        objection: "Cobre caminhão agregado?",
        response: "Sim, também cotamos seguro para caminhões agregados — informe esse detalhe ao especialista para a cotação correta.",
      },
      {
        objection: "É preciso instalar rastreamento?",
        response: "Para veículos pesados, é comum que a seguradora exija rastreamento. O especialista confirma essa exigência conforme o plano escolhido.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para seguro de caminhão; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Casco (colisão, roubo e incêndio)",
      "RCF-V (danos a terceiros)",
      "Carga transportada (opcional)",
      "Assistência 24h para veículos pesados",
      "Carro reserva",
    ],
    faq: [
      {
        question: "O seguro cobre a carga transportada?",
        answer: "A cobertura de carga é opcional. O especialista te ajuda a incluir o limite adequado ao tipo de carga que você transporta.",
      },
      {
        question: "Cobre caminhão agregado?",
        answer: "Sim, cotamos seguro tanto para frota própria quanto para caminhões agregados.",
      },
      {
        question: "É preciso instalar rastreamento?",
        answer: "Depende da seguradora e do plano. Para veículos pesados, é comum haver essa exigência — o especialista confirma durante a cotação.",
      },
    ],
    whatsappMessage: "Olá! Quero cotar um Seguro de Caminhão.", // RASCUNHO — seguir padrão da seção 34.4; revisar com Marketing
    analytics: { ramo: "caminhao", productId: "caminhao" },
  },
  {
    slug: "uber",
    name: "Seguro para Uber e 99",
    shortName: "Uber",
    category: "outros",
    icon: "car",
    priceFrom: 84.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 84,90/mês",
    headline: "Seguro para Uber e 99 que cobre o uso por aplicativo",
    subheadline: "Cotação grátis, sem compromisso, comparando 18 seguradoras.",
    eyebrow: "Seguro para Aplicativo",
    seo: {
      title: "Seguro para Uber e 99 | Cobertura para App",
      description: "Seguro para motorista de app com cobertura para uso por aplicativo, proteção da renda e carro reserva.", // rascunho
      keywordFocus: "seguro para motorista de aplicativo",
      canonicalPath: "/seguro-uber",
    },
    ads: { messageMatchHeadline: "Seguro para Uber e 99 que cobre o uso por aplicativo", campaignIntent: "nicho" },
    benefits: ["Cobertura para uso por app", "Proteção da renda", "Carro reserva"],
    arguments: ["Cobertura para uso por app", "Proteção da renda", "Carro reserva"],
    objections: [
      {
        objection: "Minha seguradora atual cancelou por eu usar app — e agora?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "Buscamos entre seguradoras parceiras as que aceitam cobertura para uso por aplicativo — conte o que aconteceu ao especialista para ele indicar a melhor opção.",
      },
      {
        objection: "Preciso avisar o aplicativo sobre o seguro?",
        response: "A contratação do seguro é feita diretamente com a seguradora; não é necessário informar o aplicativo (Uber/99) sobre essa contratação.",
      },
      {
        objection: "Cobre danos a passageiros?",
        response: "Sim, planos com cobertura para uso por aplicativo geralmente incluem proteção para passageiros — o especialista confirma os detalhes do seu plano.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para seguro de motorista de app; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Colisão",
      "Roubo e furto",
      "Cobertura para uso por aplicativo",
      "Danos a passageiros",
      "Assistência 24h",
      "Carro reserva",
    ],
    faq: [
      {
        question: "Preciso avisar o aplicativo (Uber/99) sobre o seguro?",
        answer: "Não. A contratação do seguro é feita direto com a seguradora, sem necessidade de aviso prévio ao aplicativo.",
      },
      {
        question: "O seguro cobre danos a passageiros?",
        answer: "Planos voltados para motoristas de aplicativo costumam incluir essa cobertura — o especialista confirma no seu caso.",
      },
      {
        question: "O que fazer se a seguradora anterior cancelou por uso de app?",
        answer: "Conte essa situação ao especialista durante a cotação — buscamos seguradoras parceiras que aceitam esse perfil de uso.",
      },
    ],
    whatsappMessage: "Olá! Sou motorista de app e quero um seguro que cubra Uber/99.",
    analytics: { ramo: "uber", productId: "uber" },
  },
  {
    slug: "taxi",
    name: "Seguro de Táxi",
    shortName: "Táxi",
    category: "outros",
    icon: "car-taxi-front",
    priceFrom: 99.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 99,90/mês",
    headline: "Seguro de táxi para o profissional que vive do carro",
    subheadline: "Cotação grátis, sem compromisso, comparando 18 seguradoras.",
    eyebrow: "Seguro de Táxi",
    seo: {
      title: "Seguro de Táxi | Cobertura Profissional 24h",
      description: "Seguro de táxi com uso profissional, assistência 24h e carro reserva. Cotação grátis.", // rascunho
      keywordFocus: "seguro de táxi", // não citado literalmente na especificação — derivado do título/H1
      canonicalPath: "/seguro-taxi",
    },
    ads: { messageMatchHeadline: "Seguro de táxi para o profissional que vive do carro", campaignIntent: "nicho" },
    benefits: ["Uso profissional coberto", "Assistência 24h", "Carro reserva"],
    arguments: ["Uso profissional coberto", "Assistência 24h", "Carro reserva"],
    objections: [
      {
        objection: "É preciso ter alvará de táxi para contratar?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "Sim, o alvará/licença de táxi costuma ser exigido para a modalidade profissional — o especialista confirma a documentação necessária.",
      },
      {
        objection: "O seguro cobre danos a passageiros?",
        response: "Sim, os planos para uso profissional geralmente incluem cobertura para passageiros — o especialista detalha as condições do seu plano.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para seguro de táxi; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Colisão",
      "Roubo e furto",
      "Uso profissional coberto",
      "Danos a passageiros",
      "Assistência 24h",
      "Carro reserva",
    ],
    faq: [
      {
        question: "É preciso ter alvará de táxi para contratar?",
        answer: "Normalmente sim, para a modalidade de uso profissional. O especialista informa a documentação exata durante a cotação.",
      },
      {
        question: "O seguro cobre danos a passageiros?",
        answer: "Sim, os planos voltados para táxi costumam incluir essa cobertura — o especialista confirma os detalhes do seu plano.",
      },
    ],
    whatsappMessage: "Olá! Sou taxista e quero cotar um Seguro de Táxi.", // RASCUNHO — seguir padrão da seção 34.4; revisar com Marketing
    analytics: { ramo: "taxi", productId: "taxi" },
  },
  {
    slug: "utilitario",
    name: "Seguro de Utilitário",
    shortName: "Utilitário",
    category: "outros",
    icon: "package",
    priceFrom: 94.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 94,90/mês",
    headline: "Seguro de utilitário para carga e transporte",
    subheadline: "Cotação grátis, sem compromisso, comparando 18 seguradoras.",
    eyebrow: "Seguro de Utilitário",
    seo: {
      title: "Seguro de Utilitário e Van | Cotação Online",
      description: "Seguro de utilitário e van com casco, RCF, carga e assistência 24h. Cotação grátis.", // rascunho
      keywordFocus: "seguro de utilitário", // não citado literalmente — derivado do título/H1
      canonicalPath: "/seguro-utilitario",
    },
    ads: { messageMatchHeadline: "Seguro de utilitário para carga e transporte", campaignIntent: "nicho" },
    benefits: ["Casco + RCF", "Carga coberta", "Assistência 24h"],
    arguments: ["Casco + RCF", "Carga coberta", "Assistência 24h"],
    objections: [
      {
        objection: "O seguro cobre a carga transportada?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "A cobertura de carga é opcional e pode ser incluída na cotação — o especialista explica os limites disponíveis para o seu uso.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para seguro de utilitário/van; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Casco (colisão, roubo e incêndio)",
      "RCF (danos a terceiros)",
      "Carga transportada (opcional)",
      "Assistência 24h",
      "Carro reserva",
    ],
    faq: [
      {
        question: "O seguro cobre a carga transportada?",
        answer: "A cobertura de carga é opcional. O especialista te ajuda a incluir o limite adequado ao tipo de carga que você transporta.",
      },
    ],
    whatsappMessage: "Olá! Quero cotar um Seguro de Utilitário.", // RASCUNHO — seguir padrão da seção 34.4; revisar com Marketing
    analytics: { ramo: "utilitario", productId: "utilitario" },
  },
  {
    slug: "frota",
    name: "Seguro de Frota",
    shortName: "Frota",
    category: "pj",
    icon: "building-2",
    priceLabel: "sob consulta",
    headline: "Seguro de frota com gestão única e condições de PJ",
    subheadline: "Fale com um especialista PJ e receba uma proposta sob medida.",
    eyebrow: "Seguro de Frota (PJ)",
    seo: {
      title: "Seguro de Frota Empresarial | Gestão Única",
      description: "Seguro de frota com gestão única, condições de PJ e especialista dedicado. Fale com um especialista.", // rascunho
      keywordFocus: "seguro de frota empresarial", // não citado literalmente — derivado do título/H1
      canonicalPath: "/seguro-frota",
    },
    ads: { messageMatchHeadline: "Seguro de frota com gestão única e condições de PJ", campaignIntent: "pj" },
    benefits: ["Volume", "Gestão central", "Especialista PJ dedicado"],
    arguments: ["Volume", "Gestão central", "Especialista PJ dedicado"],
    objections: [
      {
        objection: "Quantos veículos preciso ter para contratar uma frota?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "O número mínimo de veículos varia conforme a seguradora — fale com um especialista PJ para entender a opção mais adequada ao tamanho da sua frota.",
      },
      {
        objection: "Posso misturar tipos de veículo na mesma apólice?",
        response: "Sim, é possível incluir diferentes tipos de veículo numa gestão de frota única — o especialista monta a proposta conforme a composição da sua frota.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para seguro de frota; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Casco (colisão, roubo e incêndio)",
      "RCF (danos a terceiros)",
      "Assistência 24h para toda a frota",
      "Gestão centralizada de apólices",
      "Carro reserva",
    ],
    faq: [
      {
        question: "Quantos veículos preciso ter para contratar uma frota?",
        answer: "O número mínimo varia por seguradora. Fale com um especialista PJ para saber a melhor opção para o tamanho da sua frota.",
      },
      {
        question: "Como funciona a gestão da apólice de frota?",
        answer: "Você tem um especialista dedicado e uma gestão centralizada, facilitando renovações, inclusões e exclusões de veículos ao longo do contrato.",
      },
    ],
    whatsappMessage: "Olá! Quero falar com um especialista sobre Seguro de Frota (PJ).",
    analytics: { ramo: "frota", productId: "frota" },
  },
  {
    slug: "pet",
    name: "Assistência Pet",
    shortName: "Pet",
    category: "pet",
    icon: "paw-print",
    priceFrom: 99.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 99,90/mês",
    headline: "Assistência pet para cuidar de quem é da família",
    subheadline: "Cotação grátis, sem compromisso.",
    eyebrow: "Assistência Pet",
    seo: {
      title: "Assistência Pet | Cuidado para seu Animal",
      description: "Assistência pet com rede credenciada, emergência 24h e sem burocracia. Cotação grátis.", // rascunho
      keywordFocus: "assistência pet", // não citado literalmente — derivado do título/H1
      canonicalPath: "/seguro-pet",
    },
    ads: { messageMatchHeadline: "Assistência pet para cuidar de quem é da família", campaignIntent: "nicho" },
    benefits: ["Rede credenciada", "Emergência 24h", "Sem burocracia"],
    arguments: ["Rede credenciada", "Emergência 24h", "Sem burocracia"],
    objections: [
      {
        objection: "Existe carência para usar a assistência?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "Pode haver um prazo de carência conforme o plano contratado — o especialista informa o prazo exato durante a cotação.",
      },
      {
        objection: "Quais espécies são cobertas?",
        response: "A assistência é voltada principalmente para cães e gatos — o especialista confirma a cobertura para o seu pet especificamente.",
      },
      {
        objection: "Como funciona o reembolso?",
        response: "As condições de reembolso variam conforme o plano e a rede credenciada — o especialista explica como funciona no plano escolhido.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para assistência pet; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Consultas em rede credenciada",
      "Emergência veterinária 24h",
      "Exames básicos",
      "Orientação veterinária por telefone",
    ],
    faq: [
      {
        question: "Existe carência para usar a assistência?",
        answer: "Pode haver um prazo de carência dependendo do plano. O especialista informa o prazo exato antes da contratação.",
      },
      {
        question: "Quais espécies são cobertas?",
        answer: "A assistência é voltada principalmente para cães e gatos. Consulte o especialista para confirmar a cobertura do seu pet.",
      },
      {
        question: "Como funciona o reembolso?",
        answer: "As condições variam por plano — o especialista explica como funciona o reembolso ou o uso da rede credenciada no seu caso.",
      },
    ],
    whatsappMessage: "Olá! Quero cotar uma Assistência Pet.", // RASCUNHO — seguir padrão da seção 34.4; revisar com Marketing
    analytics: { ramo: "pet", productId: "pet" },
  },
  {
    slug: "fianca",
    name: "Seguro Fiança",
    shortName: "Fiança",
    category: "aluguel",
    icon: "key-round",
    priceFrom: 99.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 99,90/mês",
    headline: "Seguro fiança: alugue sem fiador e sem depósito caução",
    subheadline: "Cotação grátis, sem compromisso.",
    eyebrow: "Seguro Fiança",
    seo: {
      title: "Seguro Fiança para Aluguel | Sem Fiador",
      description: "Seguro fiança para alugar sem fiador e sem depósito caução, com aprovação ágil. Cotação grátis.", // rascunho
      keywordFocus: "seguro fiança aluguel",
      canonicalPath: "/fianca",
    },
    ads: { messageMatchHeadline: "Seguro fiança: alugue sem fiador e sem depósito caução", campaignIntent: "transacional" },
    benefits: ["Sem fiador", "Sem caução", "Aprovação ágil"],
    arguments: ["Sem fiador", "Sem caução", "Aprovação ágil"],
    objections: [
      {
        objection: "Achei caro — dá para parcelar?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "Existem diferentes formas de pagamento conforme a seguradora — o especialista apresenta as opções disponíveis para o seu caso.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para seguro fiança; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "Aluguéis em atraso",
      "Multas contratuais",
      "Danos ao imóvel",
      "Encargos condominiais e de consumo (conforme plano)",
    ],
    faq: [
      {
        question: "O que o seguro fiança cobre?",
        answer: "Costuma cobrir aluguéis em atraso e outras obrigações do contrato de locação — o especialista detalha a cobertura exata do plano escolhido.",
      },
      {
        question: "Como funciona a análise de crédito?",
        answer: "A seguradora faz uma análise de crédito do locatário como parte da aprovação — o especialista explica o processo e o prazo esperado.",
      },
      {
        question: "Quais documentos são necessários?",
        answer: "Geralmente documentos pessoais e comprovação de renda. O especialista informa a lista completa conforme a seguradora escolhida.",
      },
    ],
    whatsappMessage: "Olá! Quero cotar um Seguro Fiança para aluguel.", // RASCUNHO — seguir padrão da seção 34.4; revisar com Marketing
    analytics: { ramo: "fianca", productId: "fianca" },
  },
  {
    slug: "assistencia-24-horas",
    name: "Assistência 24h e RCF",
    shortName: "RCF/24h",
    category: "assistencia",
    icon: "life-buoy",
    priceFrom: 39.9, // CONFIRMADO (2026-07-03)
    priceLabel: "a partir de R$ 39,90/mês",
    headline: "Assistência 24h e RCF a partir de R$ 39,90/mês",
    subheadline: "Cotação grátis, sem compromisso.",
    eyebrow: "Assistência 24h / RCF",
    seo: {
      title: "Assistência 24h e RCF | A partir de R$ 39,90",
      description: "Assistência 24h e RCF com entrada acessível, cobertura a terceiros e socorro 24h. Cotação grátis.", // rascunho
      keywordFocus: "assistência 24h e rcf", // não citado literalmente — derivado do título/H1
      canonicalPath: "/assistencia-24-horas",
    },
    ads: { messageMatchHeadline: "Assistência 24h e RCF a partir de R$ 39,90/mês", campaignIntent: "transacional" },
    benefits: ["Entrada acessível", "Cobre terceiros (RCF)", "Socorro 24h"],
    arguments: ["Entrada acessível", "Cobre terceiros (RCF)", "Socorro 24h"],
    objections: [
      {
        objection: "Qual a diferença entre isso e um seguro completo?",
        // RASCUNHO (2026-07-08) — revisar com Comercial/Conteúdo antes de publicar como definitivo.
        response: "É uma opção de entrada mais acessível, com socorro 24h e cobertura a terceiros (RCF) — sem a cobertura completa do veículo próprio.",
      },
    ],
    coverages: [
      // RASCUNHO (2026-07-08) — lista genérica de mercado para assistência 24h/RCF; confirmar com Comercial/Conteúdo o subconjunto exato oferecido.
      "RCF (danos a terceiros)",
      "Assistência 24h",
      "Guincho",
      "Chaveiro",
    ],
    faq: [
      {
        question: "Qual a diferença entre isso e um seguro completo?",
        answer: "É uma opção de entrada, com socorro 24h e cobertura a terceiros — não inclui cobertura para danos ao seu próprio veículo. O especialista explica as diferenças em detalhe.",
      },
    ],
    whatsappMessage: "Olá! Quero cotar uma Assistência 24h/RCF.", // RASCUNHO — seguir padrão da seção 34.4; revisar com Marketing
    analytics: { ramo: "assistencia-24-horas", productId: "assistencia-24-horas" },
  },
];

/** Retorna o ramo pelo slug, ou `undefined` se não encontrado. */
export function getRamo(slug: string): InsuranceBranch | undefined {
  return ramos.find((ramo) => ramo.slug === slug);
}

/**
 * Slugs dos ramos cuja `canonicalPath` segue o padrão `/seguro-{slug}`
 * (Issue 16, rota dinâmica `app/(marketing)/seguro-[ramo]/page.tsx`).
 * `fianca` (`/fianca`) e `assistencia-24-horas` (`/assistencia-24-horas`)
 * ficam de fora de propósito — têm URL própria, sem o prefixo
 * `seguro-`, e por isso viram rotas estáticas dedicadas em vez de
 * caírem neste segmento dinâmico.
 */
export function getSeguroRamoSlugs(): string[] {
  return ramos.filter((ramo) => ramo.seo.canonicalPath === `/seguro-${ramo.slug}`).map((ramo) => ramo.slug);
}
