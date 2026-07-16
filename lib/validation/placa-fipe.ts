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
 *
 * **Campos granulares (projeto 2026-07-16)**: o legado só usa um único
 * campo `MARCA` combinado (`"Marca / Modelo"`, ex. `"NISSAN / MARCH
 * 16SV"`) e um único `ANO` (= ano do modelo) — nunca separou Marca de
 * Modelo. A pedido do cliente, esta versão devolve os campos granulares
 * (`marca`, `modelo`, `anoFabricacao`, `anoModelo`) além dos campos
 * combinados (`marcaModelo`/`ano`), que continuam existindo só para
 * compatibilidade com a Cloud Function (`ANO`/`VEICULO` no proxy
 * EspoCRM/Octadesk — ver `firebase/functions/index.js`). `anoFabricacao`
 * vem do campo `ano` da API; `anoModelo` vem do campo `ano_modelo` —
 * confirmado com teste real: `{"ano":"2016","ano_modelo":"2016",...}`.
 */
export type PlacaApiResult = {
  ok: boolean;
  marca?: string;
  modelo?: string;
  anoFabricacao?: string;
  anoModelo?: string;
  /** Combinado `"Marca / Modelo"` — mantido só para compatibilidade com a Cloud Function (`VEICULO`). */
  marcaModelo?: string;
  /** Alias de `anoModelo` — mantido só para compatibilidade com a Cloud Function (`ANO`). */
  ano?: string;
  tipoVeiculo?: string;
};

/**
 * Extrai marca/modelo/anos/tipo do JSON da API Placa Fipe — réplica de
 * `extractVehicleFromPlacaFipe` do legado (mesma lógica de fallback por
 * marca/modelo conhecidos quando `segmento` não vem preenchido), com os
 * campos granulares adicionados nesta rodada.
 */
function extractVehicle(json: unknown): Omit<PlacaApiResult, "ok"> {
  if (!json || typeof json !== "object") return {};
  const root = json as Record<string, unknown>;
  const info = (root.informacoes_veiculo && typeof root.informacoes_veiculo === "object" ? root.informacoes_veiculo : root) as Record<
    string,
    unknown
  >;

  const marca = typeof info.marca === "string" ? info.marca : "";
  const modelo = typeof info.modelo === "string" ? info.modelo : "";

  function digitsOnlyYear(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" ? String(value).replace(/\D/g, "").slice(0, 4) || undefined : undefined;
  }
  const anoFabricacao = digitsOnlyYear(info.ano);
  const anoModelo = digitsOnlyYear(info.ano_modelo) ?? anoFabricacao;

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
  return {
    marca: marca || undefined,
    modelo: modelo || undefined,
    anoFabricacao,
    anoModelo,
    marcaModelo,
    ano: anoModelo,
    tipoVeiculo,
  };
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
