# Integração Suhai Seguradora — documentação de referência (Imediato)

**Status:** EM DESENVOLVIMENTO. Em 01/10/2026 a jornada ganhou dois previews públicos na Vercel, sem entrar em produção: a landing no visual da Suhai (`uat-marca-suhai`) e a cotação no visual da Imediato (`uat-suhai`). Detalhe em [`09-ARQUITETURA.md`](./09-ARQUITETURA.md) §8. O estado do Cotador e do modo simulado continua na seção 6 desse mesmo documento.  
**Fonte canônica externa:** [Portal de Integrações Suhai (Confluence SUHAPI)](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437452915/Integra+o+de+Vendas+e+Multic+lculos)  
**Portal:** [integracao.suhaiseguradora.com](https://integracao.suhaiseguradora.com) / wiki space `SUHAPI`  
**Objetivo do projeto Imediato (futuro):** página/app em `novo.segurosimediato.com.br` que, a partir do formulário de cotação (ou variação), calcule prêmios via APIs Suhai e, se o cliente aceitar um plano, formalize a proposta conforme o fluxo regulamentar da companhia.

Este pacote documenta **todas as opções de integração publicadas** no espaço SUHAPI (vendas/multicálculos + pagamento + pós-vendas), para uso como referência de desenvolvimento. O que já está construído no site e no gateway está em [`09-ARQUITETURA.md`](./09-ARQUITETURA.md).

---

## Índice

| Doc | Conteúdo |
|---|---|
| [`00-VISAO-GERAL.md`](./00-VISAO-GERAL.md) | Dois eixos (SOAP vendas × REST pós-vendas), segurança, pré-requisitos, fora de escopo via API |
| [`01-CATALOGO.md`](./01-CATALOGO.md) | Catálogo completo de serviços, métodos, verbos e endpoints |
| [`02-WS-COTACAO-PROPOSTA.md`](./02-WS-COTACAO-PROPOSTA.md) | SOAP Multicálculos — 10 métodos (cotação → proposta → boleto/PDF/pendências) |
| [`03-WS-FIPE.md`](./03-WS-FIPE.md) | SOAP FIPE Suhai — marcas/modelos aceitos |
| [`04-API-PAGAMENTO.md`](./04-API-PAGAMENTO.md) | REST pagamento cartão (AES + tokenização PCI) |
| [`05-POS-VENDAS-REST.md`](./05-POS-VENDAS-REST.md) | REST apólice / parcelas / comissão / sinistro |
| [`06-DOMINIOS-E-FLUXOS.md`](./06-DOMINIOS-E-FLUXOS.md) | Códigos de cobertura, assistência, utilização DUT, status de proposta, fluxos |
| [`07-MAPA-SITE-IMEDIATO.md`](./07-MAPA-SITE-IMEDIATO.md) | Encaixe no site novo + gaps vs LeadForm atual |
| [`08-CHAMADO-ACESSO.md`](./08-CHAMADO-ACESSO.md) | SUTI-4370 encerrado pela TI; pedido no comercial e acompanhamento |
| [`09-ARQUITETURA.md`](./09-ARQUITETURA.md) | **O que já foi construído**: gateway, IP fixo, código do site, modo simulado |
| [`FONTES.md`](./FONTES.md) | Links Confluence por página (IDs) e datas de coleta |

---

## Decisão de produto (contexto Imediato)

| Item | Direção |
|---|---|
| Canal | Site novo (`novo.segurosimediato.com.br`) |
| Entrada | Dados do formulário de cotação / variação com campos exigidos pela Suhai |
| Núcleo | Cálculo via **WebService Cotação/Proposta** (+ FIPE para marca/modelo canônicos) |
| Aceite | Cliente escolhe plano → **Transmitir Proposta** + pagamento (boleto e/ou cartão via API Pagamento) |
| Pós | Opcional depois: APIs REST de apólice/parcelas (acompanhamento) |

Pendências com o comercial da Suhai (bloqueiam go-live, não bloqueiam documentação): login/senha do Cotador vinculados à corretora Imediato; whitelist de IPs (homolog/prod); `apikey` Digibee; chaves AES KEY/IV para cartão. O chamado de TI está encerrado.
