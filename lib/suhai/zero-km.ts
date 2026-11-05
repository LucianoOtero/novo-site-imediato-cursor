/**
 * lib/suhai/zero-km.ts — limite de ano para cotar veículo 0 km na Suhai.
 *
 * A Suhai recusa `zeroKM = S` com ano-modelo anterior ao ano passado
 * (código 503: "Não é possível definir Zero KM para veículos com anos
 * anteriores a 2025", em 2026). Sem imports: o formulário, o schema e o
 * teste em Node usam o mesmo arquivo.
 */

export function anoMinimoZeroKm(hoje: Date = new Date()): number {
  return hoje.getFullYear() - 1;
}

export function aceitaZeroKm(anoModelo: number, hoje: Date = new Date()): boolean {
  return Number.isInteger(anoModelo) && anoModelo >= anoMinimoZeroKm(hoje);
}

export function mensagemZeroKm(hoje: Date = new Date()): string {
  return (
    `Sem placa, cotamos só veículo 0 km (${anoMinimoZeroKm(hoje)} ou mais novo). ` +
    "Para veículo usado, informe a placa: ela está no documento (CRLV) ou na Carteira Digital de Trânsito."
  );
}
