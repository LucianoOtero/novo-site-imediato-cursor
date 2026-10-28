# suhai-gateway

Serviço que fala com a Suhai em nome do site. Existe por um motivo específico: a Suhai libera acesso por whitelist de IP fixo, e funções serverless da Vercel não têm IP estável.

Rodando no Cloud Run com `--vpc-egress=all-traffic`, todo tráfego de saída passa pelo Cloud NAT e chega à Suhai com o IP reservado. Credenciais de Cotador e, na fase de pagamento, as chaves AES ficam aqui — nunca no navegador nem nas rotas da Vercel.

## Infraestrutura

| Recurso | Valor |
|---|---|
| Projeto | `imediato-seguros-site-novo` |
| Região | `southamerica-east1` |
| IP de saída | `34.39.164.249` (`suhai-egress-ip`) |
| NAT | `suhai-nat` no router `suhai-router`, rede `default` |
| Serviço | `suhai-gateway`, privado (`--no-allow-unauthenticated`) |
| Quem invoca | `leadbackup-admin@imediato-seguros-site-novo.iam.gserviceaccount.com` (mesma conta do Firebase Admin no site) |

## Rotas

| Rota | Método | Descrição |
|---|---|---|
| `/status` | GET | Ambiente e se há credenciais configuradas |
| `/diag/ip` | GET | IP de saída visto pela internet — confirma a whitelist |
| `/cotacao` | POST | `IncluirCotacaoSuhai`; devolve protocolo, veículo e coberturas com parcelamento |
| `/proposta` | POST | `TransmitirProposta` com boleto (`tp_pagamento` 2); devolve o número da proposta |
| `/proposta/status` | POST | `ConsultarStatusProposta` com `{ proposta }` e/ou `{ protocolo }`; devolve `status` (1–19), `statusTexto`, `dataAtualizacao` e o parecer das recusas reavaliáveis |
| `/proposta/pendencias` | POST | `ConsultarPendencias`; aceita também `placa` ou `chassi`. Devolve as pendências (vistoria, rastreador) com `linkPrestador`. "Nenhum registro" vira `{ propostas: [], semRegistro: true }` |
| `/proposta/pdf` | POST | `GerarPDF`; devolve `pdfBase64`. Só manda e-mail ao proponente com `enviaEmail: true` |
| `/fipe/consulta` | POST | `ConsultaVeiculos`; sem `codFipe` devolve a base inteira |
| `/posvenda/apolice/pesquisa` | POST | Pesquisa de apólices da corretora por `placa`, `chassi` ou `emissaoDesde`/`emissaoAte`; devolve `codApolices` |
| `/posvenda/apolice` | POST | Consulta de apólice por `codApolice`: status, proposta, vigência, prêmio, `linkApolice`, `linkBoleto`, comissão. Sem dados pessoais do segurado |
| `/posvenda/parcelas` | POST | Parcelas por `codApolice`, com `linkBoleto` das pendentes e a `proximaPendente` |
| `/posvenda/apolice-da-proposta` | POST | Acha a apólice de uma `proposta` (pesquisa por `placa` e período, consulta e compara o número); devolve `{ encontrada, apolice, parcelas }` |
| `/posvenda/comissao` | POST | Comissões por data de pagamento (`desde`/`ate`, até 31 dias) |

As rotas de acompanhamento e de pós-venda só leem: nenhuma altera a proposta na Suhai. Entrada sem protocolo/proposta, ou com algo além de dígitos, responde 400 `entrada_invalida`.

A pós-venda é REST (Digibee) com header `apikey` e também exige o IP da whitelist: chamada de fora do gateway volta 401 "restrição de segurança". O CNPJ da corretora vai sempre do gateway, nunca do chamador.

Não use `/healthz`: o Google Frontend intercepta esse caminho no Cloud Run e devolve 404 antes de chegar ao container.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `SUHAI_AMBIENTE` | `homologacao` (padrão) ou `producao` — define os endpoints |
| `SUHAI_LOGIN` / `SUHAI_SENHA` | Credenciais de Cotador; sem elas as rotas respondem `sem_credenciais` |
| `SUHAI_TABELA_COMISSAO` | Faixa de comissão contratada (padrão `tab 1`) |
| `SUHAI_API_KEY` | `apikey` da Digibee do ambiente (secret `SUHAI_API_KEY` em homologação; em produção, mapear a chave de produção para o mesmo nome). Sem ela, `/posvenda/*` responde 503 `sem_api_key` |
| `SUHAI_CNPJ_CORRETOR` | CNPJ da corretora na pesquisa e na comissão (padrão: Imediato) |
| `SUHAI_URL_MULTICALCULOS` / `SUHAI_URL_FIPE` / `SUHAI_URL_POSVENDA` | Sobrescrevem os endpoints padrão |
| `SUHAI_TIMEOUT_MS` | Timeout das chamadas SOAP (padrão 45000) |

Quando as credenciais chegarem, guardá-las no Secret Manager e referenciá-las no deploy com `--set-secrets`, nunca com `--set-env-vars`.

## Testes

```bash
npm install
npm test
```

Os testes rodam contra fixtures montados a partir dos exemplos oficiais do portal SUHAPI, que hoje são a única fonte de verdade sobre o formato real de requisição e resposta.

## Deploy

```bash
gcloud run deploy suhai-gateway --source . \
  --region southamerica-east1 --project imediato-seguros-site-novo \
  --no-allow-unauthenticated \
  --network=default --subnet=default --vpc-egress=all-traffic
```
