import { env } from "@/lib/env";

/**
 * lib/validation/placa-fipe.ts — validação de placa + dados do veículo
 * via proxy Cloud Run "Placa Fipe" (projeto 2026-07-14, réplica de
 * `validarPlacaApi`/`validatePlaca` do site legado — mesma lógica
 * duplicada em `FooterCodeSiteDefinitivoCompleto.js` e
 * `webflow_injection_limpo.js`).
 *
 * Testado diretamente com a URL real de DEV (2026-07-14): responde
 * corretamente, com marca/modelo/ano reais do veículo consultado.
 */
export type PlacaApiResult = {
  ok: boolean;
  marcaModelo?: string;
  ano?: string;
  tipoVeiculo?: string;
};

/**
 * Extrai marca/modelo/ano/tipo do JSON da API Placa Fipe — réplica de
 * `extractVehicleFromPlacaFipe` do legado (mesma lógica de fallback por
 * marca/modelo conhecidos quando `segmento` não vem preenchido).
 */
function extractVehicle(json: unknown): { marcaModelo?: string; ano?: string; tipoVeiculo?: string } {
  if (!json || typeof json !== "object") return {};
  const root = json as Record<string, unknown>;
  const info = (root.informacoes_veiculo && typeof root.informacoes_veiculo === "object" ? root.informacoes_veiculo : root) as Record<
    string,
    unknown
  >;

  const marca = typeof info.marca === "string" ? info.marca : "";
  const modelo = typeof info.modelo === "string" ? info.modelo : "";
  const anoRaw = info.ano_modelo ?? info.ano;
  const ano = typeof anoRaw === "string" || typeof anoRaw === "number" ? String(anoRaw).replace(/\D/g, "").slice(0, 4) : undefined;

  const segmento = typeof info.segmento === "string" ? info.segmento.toLowerCase() : "";
  const marcaLower = marca.toLowerCase();
  const modeloLower = modelo.toLowerCase();
  const pareceMoto =
    marcaLower.includes("honda") ||
    marcaLower.includes("yamaha") ||
    marcaLower.includes("suzuki") ||
    marcaLower.includes("kawasaki") ||
    modeloLower.includes("cg") ||
    modeloLower.includes("cb") ||
    modeloLower.includes("fazer") ||
    modeloLower.includes("ninja");
  const tipoVeiculo = segmento ? (segmento.includes("moto") ? "moto" : "carro") : pareceMoto ? "moto" : "carro";

  const marcaModelo = [marca, modelo].filter(Boolean).join(" / ") || undefined;
  return { marcaModelo, ano, tipoVeiculo };
}

/** @param placaNormalizada placa já em formato normalizado (só `[A-Z0-9]`, maiúscula). */
export async function validatePlacaViaFipe(placaNormalizada: string): Promise<PlacaApiResult> {
  if (!env.placaValidateUrl) {
    // Modo mock — sem URL configurada, não bloqueia.
    return { ok: true };
  }

  try {
    const response = await fetch(env.placaValidateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placa: placaNormalizada }),
    });
    const data = await response.json();
    const ok = Boolean(data) && (data.codigo === 1 || data.success === true);
    if (!ok) return { ok: false };
    return { ok: true, ...extractVehicle(data) };
  } catch (error) {
    console.warn("[lib/validation/placa-fipe] Falha ao consultar a Placa Fipe (não bloqueante, considerando válida):", error);
    return { ok: true };
  }
}
