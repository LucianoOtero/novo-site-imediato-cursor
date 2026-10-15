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
| `/fipe/consulta` | POST | `ConsultaVeiculos`; sem `codFipe` devolve a base inteira |

Não use `/healthz`: o Google Frontend intercepta esse caminho no Cloud Run e devolve 404 antes de chegar ao container.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `SUHAI_AMBIENTE` | `homologacao` (padrão) ou `producao` — define os endpoints |
| `SUHAI_LOGIN` / `SUHAI_SENHA` | Credenciais de Cotador; sem elas as rotas respondem `sem_credenciais` |
| `SUHAI_TABELA_COMISSAO` | Faixa de comissão contratada (padrão `tab 1`) |
| `SUHAI_URL_MULTICALCULOS` / `SUHAI_URL_FIPE` | Sobrescrevem os endpoints padrão |
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
