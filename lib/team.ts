/**
 * lib/team.ts — catálogo da equipe (Issue 15, extensão 2026-07-03).
 *
 * Fonte: `docs/IMAGE_ASSETS_INVENTORY.md` (auditoria real da Issue P-10)
 * e confirmação direta do cliente (2026-07-03): os 16 colaboradores
 * abaixo continuam na empresa e as fotos seguem atuais.
 *
 * Fotos baixadas diretamente do site de produção (`/equipe` e Home,
 * seção "Conheça nossa equipe de especialistas"), arquivos públicos,
 * sem necessidade de credenciais. Mesmo padrão do site legado: apenas
 * primeiro nome como legenda, sem cargo/função (não confirmado/não
 * coletado nesta rodada — se o cliente fornecer cargos no futuro,
 * adicionar um campo `role?: string` aqui).
 *
 * Nota sobre "39 especialistas" (seção 6.1 da especificação, texto de
 * exemplo do wireframe "TeamStrip '39 especialistas, gente de verdade'
 * + grade de fotos"): **39 é um número de exemplo do wireframe, não um
 * dado confirmado** — o valor real e confirmado é **16** (mesma
 * contagem do site de produção, "16 COLABORADORES PARA MELHOR
 * ATENDÊ-LO"). `team.length` é usado como fonte única, nunca "39".
 */
export type TeamMember = {
  slug: string;
  name: string;
  /** Caminho do arquivo em `/public/team/`. */
  photo: string;
};

export const team: TeamMember[] = [
  { slug: "alberto", name: "Alberto", photo: "/team/alberto.webp" },
  { slug: "alex", name: "Alex", photo: "/team/alex.webp" },
  { slug: "andressa", name: "Andressa", photo: "/team/andressa.webp" },
  { slug: "camila", name: "Camila", photo: "/team/camila.webp" },
  { slug: "debora", name: "Débora", photo: "/team/debora.webp" },
  { slug: "diogo", name: "Diogo", photo: "/team/diogo.webp" },
  { slug: "erica", name: "Erica", photo: "/team/erica.webp" },
  { slug: "fernando", name: "Fernando", photo: "/team/fernando.webp" },
  { slug: "heloisa", name: "Heloisa", photo: "/team/heloisa.webp" },
  { slug: "kayrine", name: "Kayrine", photo: "/team/kayrine.webp" },
  { slug: "luara", name: "Luara", photo: "/team/luara.webp" },
  { slug: "luciano", name: "Luciano", photo: "/team/luciano.webp" },
  { slug: "nay", name: "Nay", photo: "/team/nay.webp" },
  { slug: "pedro", name: "Pedro", photo: "/team/pedro.webp" },
  { slug: "sales", name: "Sales", photo: "/team/sales.webp" },
  { slug: "thiago", name: "Thiago", photo: "/team/thiago.webp" },
];
