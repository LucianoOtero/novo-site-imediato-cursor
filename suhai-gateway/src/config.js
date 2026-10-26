/**
 * Configuração do gateway. Nada de credencial em código: em produção os
 * valores vêm do Secret Manager, montados como variáveis de ambiente no
 * deploy do Cloud Run.
 */

const AMBIENTES = {
  homologacao: {
    multicalculos: "https://uat.integracao.suhaiseguradoracotacao.com.br/MultiCalculos.svc",
    fipe: "https://uat.integracao.suhaiseguradoracotacao.com.br/VeiculosFipe.svc",
    posVenda: "https://test.godigibee.io/pipeline/suhaiseguradora/v1",
  },
  producao: {
    multicalculos: "https://suhaiseguradoracotacao.com.br:5156/MultiCalculos.svc",
    fipe: "https://suhaiseguradoracotacao.com.br:5156/veiculosfipe.svc",
    posVenda: "https://api.godigibee.io/pipeline/suhaiseguradora/v1",
  },
};

const ambiente = process.env.SUHAI_AMBIENTE === "producao" ? "producao" : "homologacao";

export const config = {
  ambiente,
  endpoints: {
    multicalculos: process.env.SUHAI_URL_MULTICALCULOS || AMBIENTES[ambiente].multicalculos,
    fipe: process.env.SUHAI_URL_FIPE || AMBIENTES[ambiente].fipe,
    posVenda: process.env.SUHAI_URL_POSVENDA || AMBIENTES[ambiente].posVenda,
  },
  credenciais: {
    login: process.env.SUHAI_LOGIN || "",
    senha: process.env.SUHAI_SENHA || "",
  },
  /** API Key da Digibee (pós-venda e pagamento) do ambiente ativo; homologação ≠ produção. Não logar. */
  apiKey: process.env.SUHAI_API_KEY || "",
  /** CNPJ da corretora (só dígitos): filtro obrigatório da pesquisa de apólices e da comissão. */
  cnpjCorretor: (process.env.SUHAI_CNPJ_CORRETOR || "33216054000148").replace(/\D/g, ""),
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

export function posVendaConfigurada() {
  return Boolean(config.apiKey && config.cnpjCorretor);
}

export function aesConfigurado() {
  return Boolean(config.aes.keySource && config.aes.iv);
}
