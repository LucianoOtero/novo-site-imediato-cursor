/**
 * lib/suhai/ano-fabricacao.ts — ano de fabricação aceito pela Suhai.
 *
 * A Suhai recusa fabricação posterior ao ano corrente ("O ano de fabricação
 * do veículo é obrigatório e tem que ser inferior ou igual ao ano atual").
 * O ano-modelo pode ser o seguinte: um 0 km 2026/2027 vendido em 2026 tem
 * fabricação 2026. Sem imports: o formulário, o schema e o teste em Node
 * usam o mesmo arquivo.
 */

/** Fabricação é o ano-modelo ou o anterior, e nunca passa do ano corrente. */
export function anoFabricacaoValido(anoModelo: number, anoFabricacao: number, hoje: Date = new Date()): boolean {
  return (
    Number.isInteger(anoFabricacao) &&
    anoFabricacao >= anoModelo - 1 &&
    anoFabricacao <= anoModelo &&
    anoFabricacao <= hoje.getFullYear()
  );
}

/** O ano informado, se for válido; senão o ano-modelo limitado ao ano corrente. */
export function anoFabricacaoPara(
  anoModelo: number,
  anoFabricacao?: number | string | null,
  hoje: Date = new Date(),
): number {
  const informado = typeof anoFabricacao === "string" ? Number(anoFabricacao) : anoFabricacao;
  if (typeof informado === "number" && anoFabricacaoValido(anoModelo, informado, hoje)) return informado;
  return Math.min(anoModelo, hoje.getFullYear());
}
