"use client";

import { useState } from "react";

import { Field } from "@/components/lead/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics";
import { COMBUSTIVEL, COR_VEICULO } from "@/lib/suhai/dominio";
import type { Oferta, PropostaResultado } from "@/lib/suhai/types";
import { formatCep, onlyDigits } from "@/lib/validators";

const selectClasses =
  "flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30";

export type ContextoProposta = {
  placa: string;
  cep: string;
  nome: string;
  ddd: string;
  celular: string;
  /** Lead criado na etapa do celular; leva a proposta à mesma ficha do CRM. */
  leadId?: string;
};

function vigenciaPadrao(): string {
  const data = new Date();
  data.setDate(data.getDate() + 1);
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/**
 * Passo depois da escolha do plano. Só aparece em cotação real.
 * O pagamento é boleto; o site não gera o boleto nem cobra cartão.
 */
export function PropostaSuhaiForm({
  protocolo,
  oferta,
  contexto,
}: {
  protocolo: string;
  oferta: Oferta;
  contexto: ContextoProposta;
}) {
  const [email, setEmail] = useState("");
  const [ddd, setDdd] = useState(contexto.ddd || "11");
  const [celular, setCelular] = useState(contexto.celular);
  const [cep, setCep] = useState(formatCep(contexto.cep));
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [chassi, setChassi] = useState("");
  const [cor, setCor] = useState("11");
  const [combustivel, setCombustivel] = useState("4");
  const [vigencia, setVigencia] = useState(vigenciaPadrao);
  const [parcelas, setParcelas] = useState(String(Math.min(oferta.parcelamentoMaximo, 12) || 1));
  const [vencimento, setVencimento] = useState("10");
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<PropostaResultado | null>(null);

  async function buscarCep(valor: string) {
    const digitos = onlyDigits(valor);
    if (digitos.length !== 8) return;
    try {
      const resposta = await fetch("/api/validate/cep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cep: digitos }),
      });
      const corpo = (await resposta.json()) as {
        ok?: boolean;
        logradouro?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      };
      if (!corpo.ok) return;
      if (corpo.logradouro) setLogradouro(corpo.logradouro);
      if (corpo.bairro) setBairro(corpo.bairro);
      if (corpo.cidade) setCidade(corpo.cidade);
      if (corpo.estado) setUf(corpo.estado);
    } catch {
      // O CEP continua editável à mão.
    }
  }

  async function enviar() {
    setEnviando(true);
    setErroGeral(null);
    setErros({});
    try {
      const resposta = await fetch("/api/suhai/proposta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leadId: contexto.leadId,
          protocolo,
          cdCobertura: oferta.cdCobertura,
          email,
          dddCel: onlyDigits(ddd),
          numCel: onlyDigits(celular),
          endereco: {
            logradouro,
            numero,
            complemento: complemento || undefined,
            bairro,
            uf: uf.toUpperCase(),
            cidade,
            cep: onlyDigits(cep),
          },
          veiculo: {
            chassi: chassi.trim().toUpperCase(),
            placa: contexto.placa,
            cor: Number(cor),
            combustivel: Number(combustivel),
          },
          vigenciaInicio: vigencia,
          diaVencimento: Number(vencimento),
          parcelas: Number(parcelas),
          aceite,
        }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) {
        setErros(corpo.campos ?? {});
        setErroGeral(corpo.mensagem ?? "Não foi possível transmitir a proposta.");
        return;
      }
      setResultado(corpo as PropostaResultado);
      trackEvent("suhai_proposal_sent", { form_id: "cotacao_suhai" });
    } catch {
      setErroGeral("Falha de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div role="status" className="mt-6 rounded-xl border border-brand-200 bg-white p-5">
        <h3 className="font-display text-xl font-bold text-neutral-900">Proposta enviada</h3>
        <p className="mt-2 text-sm text-neutral-700">
          Número da proposta <strong>{resultado.numeroProposta}</strong>, protocolo {resultado.protocolo}. O pagamento é
          por boleto: nossa equipe acompanha a emissão da apólice e envia o boleto da 1ª parcela.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-6 grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void enviar();
      }}
    >
      <div className="sm:col-span-2">
        <h3 className="font-display text-xl font-bold text-neutral-900">Enviar proposta com boleto</h3>
        <p className="mt-1 text-sm text-neutral-600">
          {contexto.nome ? `${contexto.nome}, ` : ""}o plano escolhido segue com pagamento em boleto. Cartão não entra
          nesta etapa.
        </p>
      </div>

      <Field label="E-mail" htmlFor="proposta-email" error={erros.email}>
        <Input id="proposta-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(erros.email)} />
      </Field>
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <Field label="DDD" htmlFor="proposta-ddd" error={erros.dddCel}>
          <Input id="proposta-ddd" inputMode="numeric" value={ddd} onChange={(event) => setDdd(event.target.value)} aria-invalid={Boolean(erros.dddCel)} />
        </Field>
        <Field label="Celular" htmlFor="proposta-cel" error={erros.numCel}>
          <Input id="proposta-cel" inputMode="numeric" autoComplete="tel" value={celular} onChange={(event) => setCelular(event.target.value)} aria-invalid={Boolean(erros.numCel)} />
        </Field>
      </div>

      <Field label="CEP" htmlFor="proposta-cep" error={erros["endereco.cep"]}>
        <Input
          id="proposta-cep"
          inputMode="numeric"
          autoComplete="postal-code"
          value={cep}
          onChange={(event) => setCep(formatCep(event.target.value))}
          onBlur={() => void buscarCep(cep)}
          aria-invalid={Boolean(erros["endereco.cep"])}
        />
      </Field>
      <Field label="Número" htmlFor="proposta-numero" error={erros["endereco.numero"]}>
        <Input id="proposta-numero" value={numero} onChange={(event) => setNumero(event.target.value)} aria-invalid={Boolean(erros["endereco.numero"])} />
      </Field>
      <Field label="Logradouro" htmlFor="proposta-logradouro" error={erros["endereco.logradouro"]}>
        <Input id="proposta-logradouro" value={logradouro} onChange={(event) => setLogradouro(event.target.value)} aria-invalid={Boolean(erros["endereco.logradouro"])} />
      </Field>
      <Field label="Complemento" htmlFor="proposta-compl" error={erros["endereco.complemento"]}>
        <Input id="proposta-compl" value={complemento} onChange={(event) => setComplemento(event.target.value)} />
      </Field>
      <Field label="Bairro" htmlFor="proposta-bairro" error={erros["endereco.bairro"]}>
        <Input id="proposta-bairro" value={bairro} onChange={(event) => setBairro(event.target.value)} aria-invalid={Boolean(erros["endereco.bairro"])} />
      </Field>
      <Field label="Cidade" htmlFor="proposta-cidade" error={erros["endereco.cidade"]}>
        <Input id="proposta-cidade" value={cidade} onChange={(event) => setCidade(event.target.value)} aria-invalid={Boolean(erros["endereco.cidade"])} />
      </Field>
      <Field label="UF" htmlFor="proposta-uf" error={erros["endereco.uf"]}>
        <Input id="proposta-uf" maxLength={2} value={uf} onChange={(event) => setUf(event.target.value.toUpperCase())} aria-invalid={Boolean(erros["endereco.uf"])} />
      </Field>
      <Field label="Chassi" htmlFor="proposta-chassi" error={erros["veiculo.chassi"]}>
        <Input id="proposta-chassi" value={chassi} onChange={(event) => setChassi(event.target.value.toUpperCase())} aria-invalid={Boolean(erros["veiculo.chassi"])} />
      </Field>
      <Field label="Cor" htmlFor="proposta-cor" error={erros["veiculo.cor"]}>
        <select id="proposta-cor" className={selectClasses} value={cor} onChange={(event) => setCor(event.target.value)}>
          {Object.entries(COR_VEICULO).map(([codigo, rotulo]) => (
            <option key={codigo} value={codigo}>
              {rotulo}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Combustível" htmlFor="proposta-comb" error={erros["veiculo.combustivel"]}>
        <select id="proposta-comb" className={selectClasses} value={combustivel} onChange={(event) => setCombustivel(event.target.value)}>
          {Object.entries(COMBUSTIVEL).map(([codigo, rotulo]) => (
            <option key={codigo} value={codigo}>
              {rotulo}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Início da vigência" htmlFor="proposta-vig" error={erros.vigenciaInicio}>
        <Input id="proposta-vig" type="date" value={vigencia} onChange={(event) => setVigencia(event.target.value)} aria-invalid={Boolean(erros.vigenciaInicio)} />
      </Field>
      <Field label="Parcelas" htmlFor="proposta-parcelas" error={erros.parcelas}>
        <select id="proposta-parcelas" className={selectClasses} value={parcelas} onChange={(event) => setParcelas(event.target.value)}>
          {Array.from({ length: 12 }, (_, indice) => indice + 1).map((quantidade) => (
            <option key={quantidade} value={quantidade}>
              {quantidade}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Dia de vencimento" htmlFor="proposta-venc" error={erros.diaVencimento}>
        <Input id="proposta-venc" inputMode="numeric" value={vencimento} onChange={(event) => setVencimento(event.target.value)} aria-invalid={Boolean(erros.diaVencimento)} />
      </Field>

      <label className="flex items-start gap-2 text-sm text-neutral-700 sm:col-span-2">
        <input type="checkbox" className="mt-1 size-4" checked={aceite} onChange={(event) => setAceite(event.target.checked)} />
        Confirmo o envio desta proposta à Suhai, com pagamento por boleto. Nossa equipe acompanha a emissão da apólice e me envia o boleto.
      </label>
      {erros.aceite && <p className="text-sm text-alert sm:col-span-2">{erros.aceite}</p>}
      {erroGeral && (
        <p role="alert" className="text-sm text-alert sm:col-span-2">
          {erroGeral}
        </p>
      )}
      <Button className="sm:col-span-2 sm:w-fit" loading={enviando} type="submit">
        Transmitir proposta
      </Button>
    </form>
  );
}
