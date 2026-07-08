import { company } from "@/lib/company";
import { env } from "@/lib/env";

/**
 * lib/google-reviews.ts — avaliações reais do Google para o `Testimonials`
 * (Issue 15, extensão 2026-07-03/2026-07-08). Decisão do cliente: usar a
 * API oficial do Google Places como fonte primária.
 *
 * **Ativado em 2026-07-08**: `GOOGLE_PLACES_API_KEY` criada pelo cliente
 * (projeto `leads-imediato-seguros`, mesmo projeto do Firebase de backup
 * de leads — Places API (New) habilitada, chave restrita só a essa API).
 * `GOOGLE_PLACE_ID` (`ChIJAQAshElYzpQRJlHuOdPFrLE`) encontrado via
 * chamada real ao endpoint `places:searchText` buscando "Imediato
 * Seguros" + endereço confirmado — retornou nome, endereço e nota (4.8)
 * batendo exatamente com os dados já confirmados em `lib/company.ts`.
 * Distinto de `company.google.placeId` (formato CID, usado só em URLs do
 * Google Maps) — mantido como está lá, não é o mesmo valor.
 *
 * **Limitação real confirmada em produção (2026-07-08)**: testando a
 * chamada de verdade, o endpoint devolveu no máximo 5 avaliações,
 * escolhidas pelo algoritmo do Google como "mais relevantes" — sem
 * relação com qualidade para fins de marketing. Uma das 5 retornadas era
 * uma reclamação de 1 estrela. **Decisão do cliente**: filtrar por nota
 * mínima (`MIN_RATING_TO_SHOW`), descartando avaliações abaixo disso —
 * ainda sem controle sobre quais avaliações específicas aparecem entre
 * as "mais relevantes" do Google, só sobre a nota mínima aceitável.
 *
 * **Fallback (sem API key/Place ID configurados, ou API indisponível,
 * ou 0 avaliações após o filtro de nota)**: usa 12 avaliações **reais**,
 * extraídas diretamente do widget de avaliações (Elfsight) já publicado
 * no domínio de produção atual da Imediato (mesmas avaliações do Google
 * Meu Negócio, já públicas e exibidas com o mesmo propósito) — não são
 * dados fictícios, apenas uma fonte estática em vez de uma chamada de
 * API ao vivo. Ver `docs/BACKLOG.md` para o registro completo desta
 * decisão.
 */
export type GoogleReview = {
  author: string;
  rating: number;
  text: string;
};

/**
 * Avaliações reais extraídas em 2026-07-03 do widget de avaliações do
 * domínio de produção atual da Imediato, via inspeção do DOM renderizado
 * (CDP) — não fabricadas.
 */
const FALLBACK_REVIEWS: GoogleReview[] = [
  { author: "Marlene Ramos", rating: 5, text: "Muito bom, o atendimento do Ricardo foi nota 10." },
  { author: "jef dias", rating: 5, text: "Foi ótimo, vendedora super atenciosa" },
  { author: "Aline Fernandes", rating: 5, text: "Rápido bom atendimento . Preço acessível." },
  { author: "Deise Dias", rating: 5, text: "Completamente satisfatório, as meninas são todas maravilhosas" },
  {
    author: "Adriano",
    rating: 5,
    text: "Fui super bem atendido pelo Gabriel R., esclareceu todas minhas dúvidas, profissional competente. Obrigado Gabriel",
  },
  {
    author: "Jucelino Oliveira Santos",
    rating: 5,
    text: "Olá Camila? Só tenho que agradecer sua atenção junto ao trabalho da Imediato Seguros, eu indico sem medo de errar. Obrigado!!!",
  },
  { author: "Sandra Cristina Correia Loureiro", rating: 5, text: "Super atenciosos e resolutivos…" },
  { author: "Joyce Sampaio", rating: 5, text: "Melhor corretora, sou cliente a 3 anos melhor cotação de seguros que conheço." },
  { author: "Fafá Gomes", rating: 5, text: "Ótimo atendimento e clareza das informações. A Camila me atendeu super bem." },
  { author: "Jadir Jose da Silva", rating: 5, text: "Estou contratando agora não tenho uma noção da quantidade" },
  { author: "Vinichown O HipHopista", rating: 5, text: "Otimo Atendimento da Corretora Nicolly." },
  { author: "Amós Batista", rating: 5, text: "São eficientes e pacientes no serviço." },
];

type PlacesApiReview = {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string };
};

type PlacesApiResponse = {
  reviews?: PlacesApiReview[];
  /** Nota média agregada do local (ex.: 4.8) — todo o histórico, não só as avaliações retornadas. */
  rating?: number;
  /** Contagem total de avaliações do local no Google — todo o histórico, não só as retornadas. */
  userRatingCount?: number;
};

export type GoogleReviewsSummary = {
  reviews: GoogleReview[];
  /** Nota média agregada real (ao vivo, quando a API está configurada) — cai para `company.business.googleRating` no fallback. */
  rating: number;
  /** Contagem total de avaliações real (ao vivo) — cai para `company.business.googleReviewsCount` no fallback. */
  reviewCount: number;
};

/**
 * Nota mínima para uma avaliação da API aparecer no site — decisão do
 * cliente (2026-07-08) após constatar que o Google pode retornar
 * avaliações negativas entre as "mais relevantes" (não há como excluir
 * uma avaliação específica, só filtrar por nota).
 */
const MIN_RATING_TO_SHOW = 4;

function parsePlacesApiReviews(reviews: PlacesApiReview[]): GoogleReview[] {
  return reviews
    .map((review) => ({
      author: review.authorAttribution?.displayName ?? "Cliente Google",
      rating: review.rating ?? 5,
      text: review.text?.text ?? review.originalText?.text ?? "",
    }))
    .filter((review) => review.text.length > 0 && review.rating >= MIN_RATING_TO_SHOW);
}

/**
 * Busca avaliações + nota/contagem agregada real via Google Places API
 * (New), numa única chamada. Retorna o fallback (avaliações estáticas +
 * `company.business.googleRating`/`googleReviewsCount`, já confirmados
 * pelo cliente) se a API key/place ID não estiverem configurados, ou se
 * a chamada falhar — nunca lança erro para quem chama (a Home não deve
 * quebrar por causa de uma avaliação).
 *
 * `rating`/`reviewCount` são a nota e a contagem **agregadas de todo o
 * histórico** do local no Google — não dependem do filtro
 * `MIN_RATING_TO_SHOW` (que só se aplica à lista de `reviews`
 * individuais exibidas no carrossel).
 */
export async function fetchGoogleReviewsSummary(): Promise<GoogleReviewsSummary> {
  const fallbackSummary: GoogleReviewsSummary = {
    reviews: FALLBACK_REVIEWS,
    rating: company.business.googleRating,
    reviewCount: company.business.googleReviewsCount,
  };

  if (!env.googlePlacesApiKey || !env.googlePlaceId) {
    console.info(
      "[lib/google-reviews] GOOGLE_PLACES_API_KEY/GOOGLE_PLACE_ID não configurados — usando fallback com avaliações reais extraídas do site atual."
    );
    return fallbackSummary;
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${env.googlePlaceId}`, {
      headers: {
        "X-Goog-Api-Key": env.googlePlacesApiKey,
        "X-Goog-FieldMask": "reviews,rating,userRatingCount",
      },
      // Avaliações/nota não mudam com frequência — revalida 1x/dia em vez de a cada request.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      throw new Error(`Places API retornou HTTP ${response.status}`);
    }

    const data = (await response.json()) as PlacesApiResponse;
    const reviews = parsePlacesApiReviews(data.reviews ?? []);

    return {
      reviews: reviews.length > 0 ? reviews : FALLBACK_REVIEWS,
      rating: data.rating ?? fallbackSummary.rating,
      reviewCount: data.userRatingCount ?? fallbackSummary.reviewCount,
    };
  } catch (error) {
    console.error("[lib/google-reviews] Falha ao buscar avaliações via Places API — usando fallback.", error);
    return fallbackSummary;
  }
}
