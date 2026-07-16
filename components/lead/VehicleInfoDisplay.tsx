import { Car } from "lucide-react";

/**
 * VehicleInfoDisplay — ficha somente-leitura do veículo identificado
 * pela Placa Fipe (projeto 2026-07-16, a pedido do cliente).
 *
 * Aparece logo abaixo do campo Placa, no `LeadForm` (passo 3) e no
 * `ContactLeadModal` (etapa 2), sempre que a consulta à Placa Fipe
 * encontra o veículo (`handlePlacaBlur` em cada um desses componentes
 * chama `setValue` nos campos `veiculoMarca`/`veiculoModelo`/
 * `veiculoAnoFabricacao`/`veiculoAnoModelo`). Deliberadamente **não**
 * editável — só uma visualização discreta (cinza-claro, fonte pequena,
 * mesmo padrão do texto auxiliar já usado em `Field` — `text-xs
 * text-neutral-500`) do que a API devolveu; o usuário nunca digita
 * esses 4 campos diretamente.
 *
 * Esses dados ficam guardados no lead (ver `lib/leads/types.ts`) para
 * uso futuro no cálculo do RPA — ainda não conectado a `lib/rpa.ts`
 * nesta rodada.
 */
export function VehicleInfoDisplay({
  marca,
  modelo,
  anoFabricacao,
  anoModelo,
}: {
  marca?: string;
  modelo?: string;
  anoFabricacao?: string;
  anoModelo?: string;
}) {
  if (!marca && !modelo && !anoFabricacao && !anoModelo) return null;

  const items: { label: string; value?: string }[] = [
    { label: "Marca", value: marca },
    { label: "Modelo", value: modelo },
    { label: "Ano de fabricação", value: anoFabricacao },
    { label: "Ano do modelo", value: anoModelo },
  ].filter((item) => item.value);

  return (
    <div
      role="status"
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 flex items-start gap-2.5 rounded-lg bg-neutral-50 px-3.5 py-3"
    >
      <Car className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">Veículo identificado</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {items.map((item) => (
            <div key={item.label} className="text-xs text-neutral-500">
              <dt className="inline">{item.label}: </dt>
              <dd className="inline font-medium text-neutral-700">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
