/**
 * lib/seguradoras.ts — catálogo de seguradoras parceiras.
 *
 * Histórico: lista original de 18 (Issue 15/16, extensão 2026-07-03) veio da
 * auditoria dos logos do site legado (`docs/BRAND_ASSETS.md`, Tabela 2).
 * Atualizada em 2026-07-31 para **21 parceiras** por confirmação do cliente
 * (ver `docs/DADOS_OFICIAIS.md`): saem Darwin, Liberty e Usebens; entram
 * Aliro (grafia oficial — o pedido citava "Alliro"), BP Seguradora, Ituran,
 * Mitsui Sumitomo, Suhai e Yelum (nova marca da antiga Liberty no Brasil).
 *
 * Ordem do array = ordem de exibição no `InsurersGrid`, definida com o
 * cliente por reputação de mercado (2026-07-31): grandes tradicionais
 * primeiro, depois múltis internacionais, depois especializadas/insurtechs.
 *
 * Contatos de assistência 24h e área do cliente (2026-08-01): pesquisados
 * em sites/canais oficiais de cada marca. Números mudam; a apólice, o
 * cartão do segurado e o app da companhia prevalecem sempre. Campos
 * opcionais ficam ausentes quando a marca só divulga acionamento via app
 * ou não publica telefone único de assistência.
 *
 * `company.business.insurersCount` (lib/company.ts) é o dado confirmado
 * oficialmente pelo cliente (21) — este array é a lista *nomeada* dessas
 * mesmas parceiras. Os dois devem ficar em sincronia.
 */

export type Seguradora = {
  slug: string;
  nome: string;
  /** Caminho do arquivo em `/public/logos/seguradoras/`. */
  logo: string;
  /**
   * Texto de exibição da assistência 24h (pode incluir capitais/demais).
   * Ausente = orientar a consultar apólice/app.
   */
  assistancePhoneDisplay?: string;
  /** Número principal para `tel:` (só dígitos, com DDI 55 quando celular). */
  assistancePhoneTel?: string;
  /** Portal / área do cliente (URL absoluta), se houver página pública. */
  clientAreaUrl?: string;
  /** Observação curta (ex.: “preferencialmente pelo app”). */
  assistanceNote?: string;
};

export const seguradoras: Seguradora[] = [
  {
    slug: "porto",
    nome: "Porto Seguro",
    logo: "/logos/seguradoras/porto.svg",
    assistancePhoneDisplay: "4004 7678 (capitais) · 0300 337 6786 (demais) · GSP 333 76786",
    assistancePhoneTel: "40047678",
    clientAreaUrl: "https://www.portoseguro.com.br/cliente",
  },
  {
    slug: "azul",
    nome: "Azul Seguros",
    logo: "/logos/seguradoras/azul.svg",
    assistancePhoneDisplay: "4004 3700 (capitais) · 0800 703 0203 / 0300 123 2985 (demais)",
    assistancePhoneTel: "40043700",
    clientAreaUrl: "https://www.azulseguros.com.br/area-restrita/segurado/cadastro/",
  },
  {
    slug: "itau",
    nome: "Itaú Seguros",
    logo: "/logos/seguradoras/itau.svg",
    assistancePhoneDisplay: "3003 1010 (capitais) · 0800 720 1010 (demais)",
    assistancePhoneTel: "30031010",
    clientAreaUrl: "https://www.itau.com.br/portal-segurado",
  },
  {
    slug: "bradesco",
    nome: "Bradesco Seguros",
    logo: "/logos/seguradoras/bradesco.svg",
    assistancePhoneDisplay: "4004 2757 (capitais) · 0800 701 2757 (demais)",
    assistancePhoneTel: "40042757",
    clientAreaUrl: "https://www.bradescoseguros.com.br/clientes/minhas-protecoes",
    assistanceNote: "Também disponível no app Bradesco Seguros (Minhas Proteções).",
  },
  {
    slug: "allianz",
    nome: "Allianz",
    logo: "/logos/seguradoras/allianz.svg",
    assistancePhoneDisplay: "0800 013 0700",
    assistancePhoneTel: "08000130700",
    clientAreaUrl: "https://www.allianzcliente.com.br",
  },
  {
    slug: "tokio-marine",
    nome: "Tokio Marine",
    logo: "/logos/seguradoras/tokio-marine.svg",
    assistancePhoneDisplay: "0800 318 6546 (Brasil)",
    assistancePhoneTel: "08003186546",
    clientAreaUrl: "https://www.tokiomarine.com.br/lp/mobile/cliente/",
    assistanceNote: "WhatsApp assistência: (11) 99578-6546. Preferencialmente pelo Super App Tokio Marine.",
  },
  {
    slug: "mapfre",
    nome: "Mapfre",
    logo: "/logos/seguradoras/mapfre.svg",
    assistancePhoneDisplay: "4004 0101 (capitais) · 0800 705 0101 (demais)",
    assistancePhoneTel: "40040101",
    clientAreaUrl: "https://www.mapfre.com.br",
  },
  {
    slug: "hdi",
    nome: "HDI Seguros",
    logo: "/logos/seguradoras/hdi.svg",
    assistancePhoneDisplay: "WhatsApp (11) 99524-8188",
    assistancePhoneTel: "5511995248188",
    clientAreaUrl: "https://www.hdiseguros.com.br",
    assistanceNote: "Canal oficial de assistência 24h prioriza WhatsApp e o app do segurado.",
  },
  {
    slug: "sompo",
    nome: "Sompo Seguros",
    logo: "/logos/seguradoras/sompo.svg",
    assistancePhoneDisplay: "0800 771 9119 · GSP (11) 3156-2990",
    assistancePhoneTel: "08007719119",
    clientAreaUrl: "https://www.sompo.com.br",
  },
  {
    slug: "yelum",
    nome: "Yelum Seguros",
    logo: "/logos/seguradoras/yelum.svg",
    assistancePhoneDisplay: "0800 701 4120 (Auto)",
    assistancePhoneTel: "08007014120",
    clientAreaUrl: "https://meuespaco.yelumseguros.com.br/",
    assistanceNote: "WhatsApp: (11) 3206-1414.",
  },
  {
    slug: "mitsui",
    nome: "Mitsui Sumitomo Seguros",
    logo: "/logos/seguradoras/mitsui.svg",
    assistancePhoneDisplay: "0800 707 7883",
    assistancePhoneTel: "08007077883",
    clientAreaUrl: "https://msig.com.br/portal-de-assistencia-24h/",
  },
  {
    slug: "suhai",
    nome: "Suhai Seguradora",
    logo: "/logos/seguradoras/suhai.svg",
    assistancePhoneDisplay: "0800 327 8424",
    assistancePhoneTel: "08003278424",
    clientAreaUrl: "https://www.suhaiseguradora.com",
  },
  {
    slug: "youse",
    nome: "Youse",
    logo: "/logos/seguradoras/youse.svg",
    assistancePhoneDisplay: "3003 5770 (capitais) · 0800 730 9901 (demais)",
    assistancePhoneTel: "30035770",
    clientAreaUrl: "https://www.youse.com.br",
    assistanceNote: "Acionamento também pelo aplicativo Youse (recomendado).",
  },
  {
    slug: "justos",
    nome: "Justos",
    logo: "/logos/seguradoras/justos.svg",
    assistancePhoneDisplay: "(11) 5039-2195 (24h)",
    assistancePhoneTel: "551150392195",
    clientAreaUrl: "https://www.justos.com.br",
  },
  {
    slug: "pier",
    nome: "Pier Seguradora",
    logo: "/logos/seguradoras/pier.svg",
    clientAreaUrl: "https://pier.digital",
    assistanceNote: "Assistência 24h pelo aplicativo Pier — os telefones da central aparecem no app após a contratação.",
  },
  {
    slug: "aliro",
    nome: "Aliro Seguro",
    logo: "/logos/seguradoras/aliro.svg",
    assistancePhoneDisplay: "0800 770 1318",
    assistancePhoneTel: "08007701318",
    clientAreaUrl: "https://meuespaco.aliroseguro.com.br/",
  },
  {
    slug: "ezze",
    nome: "Ezze Seguros",
    logo: "/logos/seguradoras/ezze.svg",
    assistancePhoneDisplay: "0800 983 3993",
    assistancePhoneTel: "08009833993",
    clientAreaUrl: "https://ezzeseguros.com.br/fale-conosco/",
  },
  {
    slug: "bp-seguradora",
    nome: "BP Seguradora",
    logo: "/logos/seguradoras/bp-seguradora.svg",
    clientAreaUrl: "https://www.bpseguradora.com.br",
    assistanceNote: "Consulte o número de assistência 24h impresso na apólice ou no site/app da BP Seguradora.",
  },
  {
    slug: "ituran",
    nome: "Ituran com Seguro",
    logo: "/logos/seguradoras/ituran.svg",
    assistancePhoneDisplay: "0800 750 0014 · SP (11) 4504-0444",
    assistancePhoneTel: "08007500014",
    clientAreaUrl: "https://ituran.com.br/atendimento/fale-conosco/",
    assistanceNote: "O seguro é emitido por companhias parceiras; confirme na apólice o 0800 da seguradora emissora para assistência.",
  },
  {
    slug: "loovi",
    nome: "Loovi",
    logo: "/logos/seguradoras/loovi.svg",
    clientAreaUrl: "https://loovi.com.br",
    assistanceNote: "Assistência 24h pelo aplicativo Loovi e canais indicados na apólice (acionamento preferencial via app).",
  },
  {
    slug: "novo-seguros",
    nome: "Novo Seguros",
    logo: "/logos/seguradoras/novo-seguros.svg",
    clientAreaUrl: "https://novoseguros.com.br",
    assistanceNote: "Consulte o número de assistência 24h na apólice ou nos canais oficiais da Novo Seguros.",
  },
];
