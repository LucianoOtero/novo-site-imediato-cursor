# 05 — Pós-vendas (REST Digibee)

**Índice:** [Integração para Gestão de Pós-Vendas](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437387464)  
Formato: REST + JSON. Auth: `apikey` (+ Basic condicional). Envelope: ver [`00-VISAO-GERAL.md`](./00-VISAO-GERAL.md).

Base:

| Env | Host |
|---|---|
| Homolog | `https://test.godigibee.io/pipeline/suhaiseguradora/v1` |
| Produção | `https://api.godigibee.io/pipeline/suhaiseguradora/v1` |

Escopo Imediato fase 1 (cotação/venda no site): **não obrigatório**. Útil para área logada / conciliação / dash futuro.

**Uso atual (2026-10-25):** como a Suhai descontinuou as APIs de boleto e só cobra depois da apólice, o boleto da 1ª parcela vem daqui. O `suhai-gateway` expõe pesquisa, consulta, parcelas, comissão e `/posvenda/apolice-da-proposta` (README do gateway). O acompanhamento chama esta última no status Emitida. Observado: fora do IP da whitelist volta 401 "restrição de segurança"; em 25/10 (domingo), pelo gateway, a homologação respondeu 500 "serviço indisponível" em todas as rotas.

---

## 1. API Apólice

### 1.1 Pesquisa de Apólice — `GET /apolice/pesquisa` (90s)

**Página:** [437322258](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437322258)

Query (principais):

| Param | Obrig. | Notas |
|---|---|---|
| `cnpj_cpf_corretor` | Sim | 11/14 dígitos |
| `cnpj_cpf_segurado` | Não | |
| `cnpj_cpf_assessoria` | Não | |
| `placa` | Não | |
| `data_fim_vigencia_desde` / `_ate` | Não | `yyyy-MM-dd` |
| `data_emissao_desde` / `_ate` | Não | |
| `cod_tipo_endosso` | Não | |

### 1.2 Consulta de Apólice — `GET /apolice/consulta` (90s)

**Página:** [437256401](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437256401)

| Param | Obrig. |
|---|---|
| `cod_apolice` | Sim |

`dados` inclui objetos: `Apolice`, `Corretor`, `Segurado`, `Veiculo`, `Coberturas` (+ links PDF apólice/boleto em exemplos homolog).

### 1.3 Consulta de Parcelas — `GET /apolice/parcela`

**Página:** [467699223](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/467699223)

### 1.4 Consulta de Parcelas Pagas — `GET /apolice/parcelapaga`

**Página:** [471171197](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/471171197)

---

## 2. API Comissão — `GET /comissao`

**Página:** [437322150](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437322150)  
Índice API: [437387629](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437387629)

Consulta comissões do corretor/parceiro (filtros e campos na página oficial).

---

## 3. API Sinistro

Índice: [474972258](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/474972258)

| Método | Path | Página |
|---|---|---|
| Consulta de Sinistro | `GET /sinistro/consulta` | [474612326](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/474612326) |
| Pesquisa de Sinistro | `GET /sinistro/pesquisa` | [538083404](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/538083404) |

---

## 4. Novidades relevantes (blog)

- **03/06/2025** — Novos campos na API Apólice  
- Atualizações contínuas em Consulta/Pesquisa Sinistro e Comissão (mai/2026 nas “últimas atualizações” do portal)

Sempre revalidar campos na página Confluence no momento do desenvolvimento — a API Apólice/Consulta é a mais mutável.
