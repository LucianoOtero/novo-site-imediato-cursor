/**
 * Configuração do gateway. Nada de credencial em código: em produção os
 * valores vêm do Secret Manager, montados como variáveis de ambiente no
 * deploy do Cloud Run.
 */

const AMBIENTES = {
  homologacao: {
    multicalculos: "https://uat.integracao.suhaiseguradoracotacao.com.br/MultiCalculos.svc",
    fipe: "https://uat.integracao.suhaiseguradoracotacao.com.br/VeiculosFipe.svc",
  },
  producao: {
    multicalculos: "https://suhaiseguradoracotacao.com.br:5156/MultiCalculos.svc",
    fipe: "https://suhaiseguradoracotacao.com.br:5156/veiculosfipe.svc",
  },
};

const ambiente = process.env.SUHAI_AMBIENTE === "producao" ? "producao" : "homologacao";

export const config = {
  ambiente,
  endpoints: {
    multicalculos: process.env.SUHAI_URL_MULTICALCULOS || AMBIENTES[ambiente].multicalculos,
    fipe: process.env.SUHAI_URL_FIPE || AMBIENTES[ambiente].fipe,
  },
  credenciais: {
    login: process.env.SUHAI_LOGIN || "",
    senha: process.env.SUHAI_SENHA || "",
  },
  /** API Key de homologação (pós-venda e pagamento). Não logar. */
  apiKey: process.env.SUHAI_API_KEY || "",
  /** AES do pagamento. A chave ativa segue SUHAI_AMBIENTE. Não logar. */
  aes: {
    keySource:
      ambiente === "producao"
        ? process.env.SUHAI_AES_KEY_PRODUCAO || ""
        : process.env.SUHAI_AES_KEY_HOMOLOGACAO || "",
    iv:
      ambiente === "producao"
        ? process.env.SUHAI_AES_IV_PRODUCAO || ""
        : process.env.SUHAI_AES_IV_HOMOLOGACAO || "",
  },
  /** Faixa de comissão contratada com a Suhai; define o preço final. */
  tabelaComissao: process.env.SUHAI_TABELA_COMISSAO || "tab 1",
  timeoutMs: Number(process.env.SUHAI_TIMEOUT_MS || 45000),
};

export function credenciaisPresentes() {
  return Boolean(config.credenciais.login && config.credenciais.senha);
}

export function aesConfigurado() {
  return Boolean(config.aes.keySource && config.aes.iv);
}
