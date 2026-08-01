import type { GoogleReview } from "@/lib/google-reviews";

/**
 * Análise temática das avaliações Google reais (só texto que já temos).
 * Não inventa distribuição de estrelas nem volume — só conta menções
 * em palavras-chave nos depoimentos disponíveis no site.
 */

export type ReputationTheme = {
  id: string;
  label: string;
  description: string;
  /** Quantos depoimentos da amostra batem com as palavras-chave. */
  mentionCount: number;
  /** Exemplos curtos (autores) que citam o tema. */
  sampleAuthors: string[];
};

const THEME_DEFS: Array<{
  id: string;
  label: string;
  description: string;
  keywords: string[];
}> = [
  {
    id: "atendimento",
    label: "Atendimento humano",
    description: "Clientes destacam atenção, paciência e trato próximo com a equipe.",
    keywords: ["atend", "atencios", "paciente", "maravilhos", "eficiente", "resolutiv"],
  },
  {
    id: "especialista",
    label: "Especialistas citados",
    description: "Muitos depoimentos nomeiam o corretor que conduziu a cotação.",
    keywords: [
      "ricardo",
      "gabriel",
      "camila",
      "nicolly",
      "vendedora",
      "profissional",
    ],
  },
  {
    id: "clareza",
    label: "Clareza e orientação",
    description: "Valorizam explicações objetivas e dúvidas esclarecidas sem pressão.",
    keywords: ["clareza", "dúvida", "duvida", "esclarec", "informa"],
  },
  {
    id: "preco",
    label: "Preço e cotação",
    description: "Mencionam preço acessível, boa cotação ou comparação favorável.",
    keywords: ["preço", "preco", "cotação", "cotacao", "acessível", "acessivel", "barato"],
  },
  {
    id: "indicacao",
    label: "Indicação e fidelidade",
    description: "Clientes que indicam a corretora ou permanecem por anos.",
    keywords: ["indico", "recomendo", "melhor", "anos", "cliente a"],
  },
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function buildReputationThemes(reviews: GoogleReview[]): ReputationTheme[] {
  return THEME_DEFS.map((theme) => {
    const matched = reviews.filter((review) => {
      const hay = normalize(review.text);
      return theme.keywords.some((kw) => hay.includes(normalize(kw)));
    });

    return {
      id: theme.id,
      label: theme.label,
      description: theme.description,
      mentionCount: matched.length,
      sampleAuthors: matched.slice(0, 3).map((r) => r.author),
    };
  })
    .filter((t) => t.mentionCount > 0)
    .sort((a, b) => b.mentionCount - a.mentionCount);
}

/** Extrai nomes próprios citados após padrões comuns (“atendimento do X”, “A Camila”). */
export function extractPraisedNames(reviews: GoogleReview[]): string[] {
  const names = new Set<string>();
  const patterns = [
    /(?:atendimento d[oa]|atendeu|atendeu pelo?|com a|com o|obrigad[oa])\s+([A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõ]+(?:\s+[A-Z]\.?)?)/gi,
    /\b(Ricardo|Gabriel|Camila|Nicolly|Nicoly)\b/gi,
  ];

  for (const review of reviews) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(review.text)) !== null) {
        const name = match[1]?.trim();
        if (name && name.length > 2) names.add(name.replace(/\.$/, ""));
      }
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
