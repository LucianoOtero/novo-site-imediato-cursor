"use client";

import { useEffect, useRef, useState } from "react";

import { Field } from "@/components/lead/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TelefoneInput } from "@/components/ui/telefone-input";
import { trackEvent } from "@/lib/analytics";
import { COMBUSTIVEL, COR_VEICULO } from "@/lib/suhai/dominio";
import { propostaInputSchema, type Oferta, type PropostaInput, type PropostaResultado } from "@/lib/suhai/types";
import { formatCep, formatTelefone, isValidEmailFormat, onlyDigits } from "@/lib/validators";

const selectClasses =
  "flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3.5 text-base text-neutral-900 outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30 aria-invalid:border-alert";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** Até o dia 28: o vencimento cai no mesmo dia em todos os meses. */
const DIAS_VENCIMENTO = Array.from({ length: 28 }, (_, indice) => indice + 1);

/** Ordem dos campos na tela: o envio com erro rola até o primeiro da lista. */
const CAMPOS: ReadonlyArray<readonly [chave: string, id: string]> = [
  ["email", "proposta-email"],
  ["dddCel", "proposta-telefone"],
  ["numCel", "proposta-telefone"],
  ["endereco.cep", "proposta-cep"],
  ["endereco.numero", "proposta-numero"],
  ["endereco.logradouro", "proposta-logradouro"],
  ["endereco.complemento", "proposta-compl"],
  ["endereco.bairro", "proposta-bairro"],
  ["endereco.cidade", "proposta-cidade"],
  ["endereco.uf", "proposta-uf"],
  ["veiculo.chassi", "proposta-chassi"],
  ["veiculo.cor", "proposta-cor"],
  ["veiculo.combustivel", "proposta-comb"],
  ["vigenciaInicio", "proposta-vig"],
  ["parcelas", "proposta-parcelas"],
  ["diaVencimento", "proposta-venc"],
  ["aceite", "proposta-aceite"],
];

const AVISO_EMAIL = "Não conseguimos confirmar esse e-mail — revise ou prossiga assim mesmo";
const AVISO_CELULAR = "Não conseguimos confirmar esse celular — revise ou prossiga assim mesmo";
const AVISO_CEP = "CEP não encontrado; preencha o endereço.";

/** Mesmas regras do servidor (`propostaInputSchema`), mais as do formulário padrão para e-mail, celular e chassi. */
function validarProposta(dados: PropostaInput): Record<string, string> {
  const erros: Record<string, string> = {};
  const parsed = propostaInputSchema.safeParse(dados);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const chave = issue.path.join(".");
      if (chave && !erros[chave]) erros[chave] = issue.message;
    }
  }
  const email = dados.email.trim();
  if (!email) erros.email = "Informe o e-mail.";
  else if (!isValidEmailFormat(email)) erros.email = "E-mail inválido.";
  if (!/^\d{2}$/.test(onlyDigits(dados.dddCel))) erros.dddCel = "DDD inválido";
  else delete erros.dddCel;
  if (!/^9\d{8}$/.test(onlyDigits(dados.numCel))) {
    erros.numCel = "Celular inválido — deve ter 9 dígitos e começar com 9";
  } else delete erros.numCel;
  if (onlyDigits(dados.endereco.cep).length !== 8) erros["endereco.cep"] = "Informe o CEP com 8 dígitos.";
  const chassi = dados.veiculo.chassi.trim();
  if (!chassi) erros["veiculo.chassi"] = "Informe o chassi.";
  else if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(chassi)) {
    erros["veiculo.chassi"] = "O chassi tem 17 caracteres: letras e números, sem I, O e Q.";
  }
  return erros;
}

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
 *
 * Valida como o LeadForm: cada campo ao sair dele (com SafetyMails no
 * e-mail, APILayer no celular e ViaCEP no CEP) e todos antes de enviar.
 * Os avisos das consultas externas não bloqueiam o envio.
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
  const [avisos, setAvisos] = useState<Record<string, string>>({});
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<PropostaResultado | null>(null);
  const valoresRef = useRef({ email, telefone: "", cep });
  valoresRef.current = { email: email.trim(), telefone: onlyDigits(ddd) + onlyDigits(celular), cep: onlyDigits(cep) };

  function montarDados(): PropostaInput {
    return {
      protocolo,
      cdCobertura: oferta.cdCobertura,
      email: email.trim(),
      dddCel: onlyDigits(ddd),
      numCel: onlyDigits(celular),
      endereco: {
        logradouro: logradouro.trim(),
        numero: numero.trim(),
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim(),
        uf: uf.toUpperCase(),
        cidade: cidade.trim(),
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
    };
  }

  function limpar(...chaves: string[]) {
    const semChaves = (anterior: Record<string, string>) => {
      if (!chaves.some((chave) => anterior[chave])) return anterior;
      const proximo = { ...anterior };
      for (const chave of chaves) delete proximo[chave];
      return proximo;
    };
    setErros(semChaves);
    setAvisos(semChaves);
  }

  /** Valida os campos que o usuário acabou de deixar. Devolve se passaram. */
  function validarAoSair(...chaves: string[]): boolean {
    setTocados((anterior) => ({ ...anterior, ...Object.fromEntries(chaves.map((chave) => [chave, true])) }));
    const falhas = validarProposta(montarDados());
    setErros((anterior) => {
      const proximo = { ...anterior };
      for (const chave of chaves) {
        if (falhas[chave]) proximo[chave] = falhas[chave];
        else delete proximo[chave];
      }
      return proximo;
    });
    return chaves.every((chave) => !falhas[chave]);
  }

  async function confirmarEmail() {
    if (!validarAoSair("email")) return;
    const valor = email.trim();
    try {
      const resposta = await fetch("/api/validate/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: valor }),
      });
      const corpo = (await resposta.json()) as { ok?: boolean };
      if (corpo.ok === false && valoresRef.current.email === valor) {
        setAvisos((anterior) => ({ ...anterior, email: AVISO_EMAIL }));
      }
    } catch {
      // Best-effort — nunca bloqueia.
    }
  }

  async function confirmarCelular() {
    if (!validarAoSair("dddCel", "numCel")) return;
    const dddAtual = onlyDigits(ddd);
    const celularAtual = onlyDigits(celular);
    try {
      const resposta = await fetch("/api/validate/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ddd: dddAtual, celular: celularAtual }),
      });
      const corpo = (await resposta.json()) as { ok?: boolean };
      if (corpo.ok === false && valoresRef.current.telefone === dddAtual + celularAtual) {
        setAvisos((anterior) => ({ ...anterior, numCel: AVISO_CELULAR }));
      }
    } catch {
      // Best-effort — nunca bloqueia.
    }
  }

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
        reason?: string;
        logradouro?: string;
        bairro?: string;
        cidade?: string;
        estado?: string;
      };
      if (valoresRef.current.cep !== digitos) return;
      if (!corpo.ok) {
        if (corpo.reason === "nao_encontrado") setAvisos((anterior) => ({ ...anterior, "endereco.cep": AVISO_CEP }));
        return;
      }
      if (corpo.logradouro) setLogradouro(corpo.logradouro);
      if (corpo.bairro) setBairro(corpo.bairro);
      if (corpo.cidade) setCidade(corpo.cidade);
      if (corpo.estado) setUf(corpo.estado);
      limpar("endereco.logradouro", "endereco.bairro", "endereco.cidade", "endereco.uf");
    } catch {
      // O CEP continua editável à mão.
    }
  }

  async function confirmarCep() {
    if (!validarAoSair("endereco.cep")) return;
    await buscarCep(cep);
  }

  // O CEP de pernoite já veio da cotação: o endereço chega preenchido.
  const cepInicialRef = useRef(contexto.cep);
  useEffect(() => {
    void buscarCep(cepInicialRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enviar() {
    const dados = montarDados();
    const falhas = validarProposta(dados);
    setTocados(Object.fromEntries(CAMPOS.map(([chave]) => [chave, true])));
    setErros(falhas);
    setErroGeral(null);
    if (Object.keys(falhas).length > 0) {
      const primeiro = CAMPOS.find(([chave]) => falhas[chave]);
      if (primeiro) {
        const campo = document.getElementById(primeiro[1]);
        campo?.scrollIntoView({ behavior: "smooth", block: "center" });
        campo?.focus({ preventScroll: true });
        setErroGeral("Revise os campos destacados.");
      } else {
        setErroGeral(Object.values(falhas)[0] ?? "Não foi possível transmitir a proposta.");
      }
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch("/api/suhai/proposta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: contexto.leadId, ...dados }),
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

  /** Erro bloqueia; aviso das consultas externas só alerta. */
  function mensagem(...chaves: string[]): string | undefined {
    for (const chave of chaves) if (erros[chave]) return erros[chave];
    for (const chave of chaves) if (avisos[chave]) return avisos[chave];
    return undefined;
  }

  /** Sinal de ok do LeadForm: campo tocado, preenchido e sem erro nem aviso. */
  function valido(valor: string, ...chaves: string[]): boolean {
    return Boolean(valor.trim()) && chaves.every((chave) => tocados[chave]) && !mensagem(...chaves);
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
      noValidate
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

      <Field label="E-mail" htmlFor="proposta-email" error={mensagem("email")} valid={valido(email, "email")}>
        <Input
          id="proposta-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            limpar("email");
          }}
          onBlur={() => void confirmarEmail()}
          aria-invalid={Boolean(mensagem("email"))}
        />
      </Field>
      <Field
        label="Celular com DDD"
        htmlFor="proposta-telefone"
        error={mensagem("dddCel", "numCel")}
        valid={valido(celular, "dddCel", "numCel")}
      >
        <TelefoneInput
          id="proposta-telefone"
          value={formatTelefone(onlyDigits(ddd) + onlyDigits(celular))}
          onTelefoneChange={(next) => {
            setDdd(next.ddd);
            setCelular(next.celular);
            limpar("dddCel", "numCel");
          }}
          onBlur={() => void confirmarCelular()}
          aria-invalid={Boolean(mensagem("dddCel", "numCel"))}
        />
      </Field>

      <Field label="CEP" htmlFor="proposta-cep" error={mensagem("endereco.cep")} valid={valido(cep, "endereco.cep")}>
        <Input
          id="proposta-cep"
          inputMode="numeric"
          autoComplete="postal-code"
          value={cep}
          onChange={(event) => {
            setCep(formatCep(event.target.value));
            limpar("endereco.cep");
          }}
          onBlur={() => void confirmarCep()}
          aria-invalid={Boolean(mensagem("endereco.cep"))}
        />
      </Field>
      <Field
        label="Número"
        htmlFor="proposta-numero"
        error={mensagem("endereco.numero")}
        valid={valido(numero, "endereco.numero")}
      >
        <Input
          id="proposta-numero"
          value={numero}
          onChange={(event) => {
            setNumero(event.target.value);
            limpar("endereco.numero");
          }}
          onBlur={() => validarAoSair("endereco.numero")}
          aria-invalid={Boolean(mensagem("endereco.numero"))}
        />
      </Field>
      <Field
        label="Logradouro"
        htmlFor="proposta-logradouro"
        error={mensagem("endereco.logradouro")}
        valid={valido(logradouro, "endereco.logradouro")}
      >
        <Input
          id="proposta-logradouro"
          value={logradouro}
          onChange={(event) => {
            setLogradouro(event.target.value);
            limpar("endereco.logradouro");
          }}
          onBlur={() => validarAoSair("endereco.logradouro")}
          aria-invalid={Boolean(mensagem("endereco.logradouro"))}
        />
      </Field>
      <Field
        label="Complemento"
        htmlFor="proposta-compl"
        error={mensagem("endereco.complemento")}
        valid={valido(complemento, "endereco.complemento")}
      >
        <Input
          id="proposta-compl"
          value={complemento}
          onChange={(event) => {
            setComplemento(event.target.value);
            limpar("endereco.complemento");
          }}
          onBlur={() => validarAoSair("endereco.complemento")}
        />
      </Field>
      <Field
        label="Bairro"
        htmlFor="proposta-bairro"
        error={mensagem("endereco.bairro")}
        valid={valido(bairro, "endereco.bairro")}
      >
        <Input
          id="proposta-bairro"
          value={bairro}
          onChange={(event) => {
            setBairro(event.target.value);
            limpar("endereco.bairro");
          }}
          onBlur={() => validarAoSair("endereco.bairro")}
          aria-invalid={Boolean(mensagem("endereco.bairro"))}
        />
      </Field>
      <Field
        label="Cidade"
        htmlFor="proposta-cidade"
        error={mensagem("endereco.cidade")}
        valid={valido(cidade, "endereco.cidade")}
      >
        <Input
          id="proposta-cidade"
          value={cidade}
          onChange={(event) => {
            setCidade(event.target.value);
            limpar("endereco.cidade");
          }}
          onBlur={() => validarAoSair("endereco.cidade")}
          aria-invalid={Boolean(mensagem("endereco.cidade"))}
        />
      </Field>
      <Field label="UF" htmlFor="proposta-uf" error={mensagem("endereco.uf")}>
        <select
          id="proposta-uf"
          className={selectClasses}
          value={uf}
          onChange={(event) => {
            setUf(event.target.value);
            limpar("endereco.uf");
          }}
          aria-invalid={Boolean(mensagem("endereco.uf"))}
        >
          <option value="">Escolha a UF</option>
          {UFS.map((sigla) => (
            <option key={sigla} value={sigla}>
              {sigla}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Chassi"
        htmlFor="proposta-chassi"
        error={mensagem("veiculo.chassi")}
        valid={valido(chassi, "veiculo.chassi")}
        hint="17 caracteres, como no documento do veículo (CRLV)."
      >
        <Input
          id="proposta-chassi"
          value={chassi}
          maxLength={17}
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(event) => {
            setChassi(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            limpar("veiculo.chassi");
          }}
          onBlur={() => validarAoSair("veiculo.chassi")}
          aria-invalid={Boolean(mensagem("veiculo.chassi"))}
        />
      </Field>
      <Field label="Cor" htmlFor="proposta-cor" error={mensagem("veiculo.cor")}>
        <select id="proposta-cor" className={selectClasses} value={cor} onChange={(event) => setCor(event.target.value)}>
          {Object.entries(COR_VEICULO).map(([codigo, rotulo]) => (
            <option key={codigo} value={codigo}>
              {rotulo}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Combustível" htmlFor="proposta-comb" error={mensagem("veiculo.combustivel")}>
        <select id="proposta-comb" className={selectClasses} value={combustivel} onChange={(event) => setCombustivel(event.target.value)}>
          {Object.entries(COMBUSTIVEL).map(([codigo, rotulo]) => (
            <option key={codigo} value={codigo}>
              {rotulo}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Início da vigência" htmlFor="proposta-vig" error={mensagem("vigenciaInicio")}>
        <Input
          id="proposta-vig"
          type="date"
          value={vigencia}
          onChange={(event) => {
            setVigencia(event.target.value);
            limpar("vigenciaInicio");
          }}
          onBlur={() => validarAoSair("vigenciaInicio")}
          aria-invalid={Boolean(mensagem("vigenciaInicio"))}
        />
      </Field>
      <Field label="Parcelas" htmlFor="proposta-parcelas" error={mensagem("parcelas")}>
        <select id="proposta-parcelas" className={selectClasses} value={parcelas} onChange={(event) => setParcelas(event.target.value)}>
          {Array.from({ length: 12 }, (_, indice) => indice + 1).map((quantidade) => (
            <option key={quantidade} value={quantidade}>
              {quantidade}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Dia de vencimento" htmlFor="proposta-venc" error={mensagem("diaVencimento")}>
        <select
          id="proposta-venc"
          className={selectClasses}
          value={vencimento}
          onChange={(event) => {
            setVencimento(event.target.value);
            limpar("diaVencimento");
          }}
        >
          {DIAS_VENCIMENTO.map((dia) => (
            <option key={dia} value={dia}>
              {dia}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="proposta-aceite" className="flex items-start gap-2 text-sm text-neutral-700">
          <input
            id="proposta-aceite"
            type="checkbox"
            className="mt-1 size-4"
            checked={aceite}
            onChange={(event) => {
              setAceite(event.target.checked);
              limpar("aceite");
            }}
            aria-invalid={Boolean(erros.aceite)}
          />
          Confirmo o envio desta proposta à Suhai, com pagamento por boleto. Nossa equipe acompanha a emissão da apólice e me envia o boleto.
        </label>
        {erros.aceite && (
          <p role="alert" className="text-xs font-medium text-alert">
            {erros.aceite}
          </p>
        )}
      </div>
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
