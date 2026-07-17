import { publicEnv } from "@/lib/env";

/**
 * lib/rpa.ts — cotação automatizada via RPA (integrações 2026-07-03).
 * Fonte: `docs/WEBFLOW_CUSTOM_CODE_DEV.md` (item 9), confirmado lendo
 * `webflow_injection_limpo.js` (site legado, classes `MainPage`/
 * `ProgressModalRPA`).
 *
 * Fluxo confirmado:
 * 1. `POST {RPA_API_BASE_URL}/api/rpa/start` com os dados do lead → retorna `{ sessionId }`.
 * 2. Polling em `GET {RPA_API_BASE_URL}/api/rpa/progress/{sessionId}` → `{ progress: { etapa_atual, fase_atual, status, mensagem } }`.
 *
 * Chamada direta do navegador para `rpaimediatoseguros.com.br` (mesmo
 * padrão do site legado) — mesma URL em todos os ambientes (não há
 * variante de dev). Habilitado via `NEXT_PUBLIC_RPA_ENABLED`.
 *
 * Nota de fidelidade: o formato exato dos valores de `status` que
 * indicam conclusão/erro foi confirmado lendo `webflow_injection_limpo.js`
 * (site legado, só consultado como referência — nunca alterado) na
 * investigação de 2026-07-16 — ver `lib/rpa-calculation.ts`
 * (`isRpaErrorStatus`/`isRpaSuccessStatus`) e o hook
 * `lib/leads/use-rpa-calculation.ts`, que consomem este módulo e usam
 * um teto de tentativas (10min) para nunca ficar preso indefinidamente.
 */
export type RpaProgress = {
  etapa_atual?: string;
  fase_atual?: string;
  status?: string;
  mensagem?: string;
};

export class RpaError extends Error {}

export async function startRpaSession(dados: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${publicEnv.rpaApiBaseUrl}/api/rpa/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    throw new RpaError(`Falha ao iniciar sessão RPA: HTTP ${response.status}`);
  }

  // O backend rpa-v4 responde `{ success: true, session_id: "..." }`
  // (snake_case) — confirmado lendo `webflow_injection_limpo.js` do site
  // legado (`result.success && result.session_id`, classe `MainPage`, só
  // consultado como referência) e via captura de rede no teste de fidelidade
  // (2026-07-17). Aceitamos também `sessionId` por robustez.
  const result = (await response.json()) as {
    success?: boolean;
    session_id?: string;
    sessionId?: string;
  };
  const sessionId = result.session_id ?? result.sessionId;
  if (!sessionId) {
    throw new RpaError("Resposta do RPA não trouxe session_id.");
  }

  return sessionId;
}

export async function fetchRpaProgress(sessionId: string): Promise<RpaProgress> {
  const response = await fetch(`${publicEnv.rpaApiBaseUrl}/api/rpa/progress/${sessionId}`);

  if (!response.ok) {
    throw new RpaError(`Falha ao consultar progresso RPA: HTTP ${response.status}`);
  }

  const result = (await response.json()) as { progress?: RpaProgress };
  return result.progress ?? {};
}

/**
 * Monta o payload enviado ao RPA a partir dos dados já coletados pelo
 * `LeadForm` — mesma convenção de nomes de campo já usada em
 * `lib/leads/legacy-proxy-payload.ts` (mesmo ecossistema legado).
 */
export function buildRpaPayload(dados: {
  ddd: string;
  celular: string;
  ramo: string;
  cep?: string;
  nome?: string;
  cpf?: string;
  placa?: string;
  /**
   * Bloco demográfico derivado da PH3A (projeto 2026-07-17), vindo do
   * `perfilRpa` da resposta de `/api/lead`. Quando presente, é enviado ao
   * RPA em snake_case (`sexo`/`data_nascimento`/`estado_civil` — mesmas
   * chaves do legado/`parametros.json`), suprimindo a estimativa própria
   * do backend. `estado_civil` segue a regra de idade (ver
   * `lib/perfil-rpa.ts`); `data_nascimento` no formato `DD/MM/AAAA`.
   */
  sexo?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  /**
   * Ficha do veículo obtida pela Placa Fipe no passo 3 (`veiculoMarca`/
   * `veiculoModelo`/`veiculoAno*`). Enviada ao RPA como `marca`/`modelo`/
   * `ano`/`tipo_veiculo`/`combustivel` (projeto 2026-07-17). Sem esses
   * campos, o backend não deriva o veículo pela placa sozinho e devolve um
   * prêmio de veículo padrão (constante) — comprovado na bateria de 50
   * casos, em que todos retornavam o mesmo valor. `tipo_veiculo` e
   * `combustivel` são inferidos do ramo (mesma heurística da bateria local).
   */
  marca?: string;
  modelo?: string;
  ano?: string;
  email?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    "DDD-CELULAR": `${dados.ddd}-${dados.celular}`,
    CELULAR: dados.celular,
    NOME: dados.nome ?? "",
    CPF: dados.cpf ?? "",
    CEP: dados.cep ?? "",
    PLACA: dados.placa ?? "",
    produto: dados.ramo,
  };

  if (dados.sexo) payload.sexo = dados.sexo;
  if (dados.dataNascimento) payload.data_nascimento = dados.dataNascimento;
  if (dados.estadoCivil) payload.estado_civil = dados.estadoCivil;

  // Bloco de veículo + perfil — só quando a Placa Fipe preencheu marca +
  // modelo. Comprovado (experimento 2026-07-17, cenário "D"): enviar o
  // veículo junto de um bloco de perfil padrão faz o backend cotar POR
  // VEÍCULO (recomendado idêntico ao cálculo local), sem depender da PH3A
  // nem de dados de condutor. Sem esse bloco, o backend usa um veículo
  // padrão e devolve um prêmio constante para todos.
  if (dados.marca && dados.modelo) {
    const cepFmt = formatCepBr(dados.cep);
    const enderecoCep = cepFmt ? `CEP ${cepFmt}` : "";

    // Chaves minúsculas no padrão do `parametros.json` do motor. O caminho
    // de cotação POR PLACA do backend (fase "Selecionando veículo com a
    // placa informada") lê essas chaves — só com as maiúsculas
    // (PLACA/CPF/CEP/CELULAR) ele cai no veículo padrão. Comprovado no
    // experimento 2026-07-17 (cenário "D").
    if (dados.placa) payload.placa = dados.placa;
    if (dados.cpf) payload.cpf = dados.cpf;
    if (cepFmt) payload.cep = cepFmt;
    if (dados.nome) payload.nome = dados.nome;
    payload.celular = `${dados.ddd}${dados.celular}`;

    payload.tipo_veiculo = dados.ramo === "moto" ? "moto" : "carro";
    payload.marca = normalizarMarcaRpa(dados.marca) ?? dados.marca;
    payload.modelo = dados.modelo;
    if (dados.ano) payload.ano = dados.ano;
    payload.combustivel =
      dados.ramo === "moto" ? "Gasolina" : dados.ramo === "caminhao" ? "Diesel" : "Flex";

    // Perfil padrão (mesmos defaults do parametros.json de referência do
    // motor). Valores neutros/mais comuns; confirmados na formalização.
    payload.zero_km = false;
    payload.veiculo_segurado = "Não";
    payload.uso_veiculo = "Pessoal";
    payload.endereco_completo = enderecoCep;
    payload.endereco = enderecoCep;
    if (dados.email) payload.email = dados.email;
    payload.condutor_principal = true;
    payload.local_de_trabalho = false;
    payload.estacionamento_proprio_local_de_trabalho = false;
    payload.local_de_estudo = false;
    payload.estacionamento_proprio_local_de_estudo = false;
    payload.garagem_residencia = true;
    payload.portao_eletronico = "Eletronico";
    payload.reside_18_26 = "Não";
    payload.sexo_do_menor = "N/A";
    payload.faixa_etaria_menor_mais_novo = "N/A";
    payload.kit_gas = false;
    payload.blindado = false;
    payload.financiado = false;
    payload.continuar_com_corretor_anterior = true;
  }

  return payload;
}

/** Formata CEP (dígitos) em `12345-678`. Retorna vazio se não tiver 8 dígitos. */
function formatCepBr(cep?: string): string {
  const d = (cep ?? "").replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : "";
}

/**
 * Normaliza a marca para o catálogo do Tô Segurado (projeto 2026-07-17).
 * O padrão FIPE prefixado ("VW - VolksWagen", "GM - Chevrolet") NÃO existe no
 * dropdown de fabricante do Tô Segurado — no cenário MANUAL (placa não
 * localizada) a seleção falha na Tela 3. Confirmado empiricamente: enviar
 * "VOLKSWAGEN" faz a Tela 3 concluir. Regra: se houver prefixo "XX - ", usa
 * o nome após o prefixo em CAIXA ALTA; caso contrário, mantém como está
 * (marcas sem prefixo — Honda, Fiat, etc. — já são aceitas).
 */
export function normalizarMarcaRpa(marca?: string): string | undefined {
  if (!marca) return undefined;
  const m = marca.trim();
  if (!m) return undefined;
  if (m.includes(" - ")) {
    return m.split(" - ").slice(1).join(" - ").trim().toUpperCase();
  }
  return m;
}
