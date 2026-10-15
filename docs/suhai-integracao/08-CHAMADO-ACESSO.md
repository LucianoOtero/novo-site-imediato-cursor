# 08 — Chamado de liberação de acesso (Suhai)

Minuta para abertura em <https://chamados.suhaiseguradora.com> (canal indicado na própria documentação do portal de integrações).

Atualizado em 2026-09-21.

---

## 1. IPs a liberar

| Origem | IP | Situação | Uso |
|---|---|---|---|
| Servidor RPA (Hetzner Cloud, HEL1/Finlândia) | `37.27.92.160` | Confirmado em 2026-09-16 | Homologação — destrava os testes imediatamente |
| Google Cloud, `southamerica-east1` (Cloud Run + Cloud NAT) | `34.39.164.249` | Confirmado em 2026-09-16 | Ambiente definitivo (homologação e produção) |

Notas de apuração:

- `37.27.92.160` é o registro A de `rpaimediatoseguros.com.br` no Cloudflare (o DNS público só expõe os IPs de proxy `104.21.72.176` e `172.67.153.85`). Reverso `static.160.92.27.37.clients.your-server.de`, faixa RIPE `CLOUD-HEL1`. Confirmado em 2026-09-16 com `curl https://api.ipify.org` executado no próprio servidor (`ubuntu-2gb-hel1-1`), que devolveu esse mesmo endereço — entrada e saída coincidem, como esperado num VPS Hetzner. O host também tem IPv6 (`2a01:4f9:c013:3af5::1`); se algum endpoint da Suhai for dual-stack, pode ser necessário informar esse endereço também.
- `34.39.164.249` é endereço externo estático reservado no projeto `imediato-seguros-site-novo` como `suhai-egress-ip`. Já está em uso: Cloud Router `suhai-router` + Cloud NAT `suhai-nat` na rede `default`, com o serviço Cloud Run `suhai-gateway` publicado com `--vpc-egress=all-traffic`. O endpoint de diagnóstico `/diag/ip` do serviço retornou exatamente esse endereço em 2026-09-16, confirmando o egresso.

---

## 2. Dados da corretora

A solicitação é feita pela pessoa jurídica abaixo, **não** pela Imediato Corretora de Seguros Ltda. (45.998.165/0001-32) que consta em `lib/company.ts` e no rodapé do site.

| Campo | Valor |
|---|---|
| Nome fantasia (usar no chamado) | IMEDIATO SEGUROS |
| Razão social na SUSEP | IMEDIATO CORRETORA DE SEGUROS LTDA |
| Razão social no cadastro CNPJ | IMEDIATO SEGUROS LTDA - ME |
| CNPJ | 33.216.054/0001-48 |
| SUSEP | 252174522 (cadastro ativo) |
| Responsável técnico SUSEP | Luciano Rodrigues Otero — 251168701 |
| Fundação | 02/04/2019 |
| Sede | São Paulo/SP |
| Telefone | (11) 3230-1422 |
| E-mail de contato | lrotero@gmail.com (oficial: luciano.otero@imediatoseguros.com.br) |
| Site do projeto | novo.segurosimediato.com.br |

Fonte do registro: certidão de regularidade de corretores emitida pela SUSEP em 22/10/2025, código `CC252174522_22102025_171642_578`. A certidão vincula o SUSEP 252174522 a este CNPJ — ou seja, é o mesmo número exibido no rodapé do site.

---

## 3. Itens solicitados

1. **Whitelist** dos IPs da seção 1, em homologação e produção.
2. **Credenciais de Cotador** (`login` e `senha`) para os dois ambientes, vinculadas à corretora acima.
3. **Chaves AES-256** da API Pagamento: KEY Source e IV Source em Base64, por ambiente.
4. **`apikey`** para os pipelines Digibee (pagamento e, se aplicável, pós-vendas).
5. **Confirmação de conformidade**: o parceiro pode capturar os dados do cartão em formulário próprio e enviá-los cifrados em AES, ou existe página/link de pagamento hospedado pela Suhai que evite trânsito do PAN pelo nosso ambiente?
6. **Tabela de comissão** contratada (faixa `tab N`) e eventuais restrições por categoria e ano do veículo.
7. **Confirmação de endpoints** de homologação e produção dos WebServices `MultiCalculos.svc` e `veiculosfipe.svc`, incluindo porta e esquema, além dos hosts REST do Digibee.
8. **Cartões mock** de homologação e regras de teste da API Pagamento.

---

## 4. Descrição do projeto (texto para o chamado)

> A IMEDIATO SEGUROS (IMEDIATO SEGUROS LTDA - ME, CNPJ 33.216.054/0001-48) está desenvolvendo uma jornada de cotação e contratação online do seguro Suhai em seu site (novo.segurosimediato.com.br). O fluxo consumirá os WebServices de Multicálculos e FIPE para cotação e transmissão de proposta, e as APIs REST de pagamento para cartão de crédito, com boleto como alternativa. Todas as chamadas partirão de servidores próprios com IP fixo (relacionados acima); nenhuma credencial trafegará pelo navegador do cliente. Solicitamos a liberação de acesso em homologação para iniciar os testes, com dados fictícios de proponente conforme orientação do portal de integrações, e posterior liberação em produção.

---

## 5. Escopo técnico inicial (opcional, se solicitarem detalhe)

- Métodos previstos na primeira fase: `ConsultaVeiculos`, `RealizarCotacao`, `TransmitirProposta`, `ConsultarStatusProposta`, `ConsultarPendencias`, geração e consulta de boleto da 1ª parcela, `gerartoken` e `POST /pagamento`.
- Categorias: automóvel, moto, caminhão e van/VUC.
- Volume estimado inicial: baixo em homologação (dezenas de cotações/dia), escalando conforme campanhas de mídia.

---

## 6. Chamado aberto

| Campo | Valor |
|---|---|
| Referência | **SUTI-4370** |
| Portal | Jira Service Management — IT - EXTERNAL SUPPORT, formulário "Approval of new Integration or Adaptation" |
| Aberto em | 16/09/2026 |
| Necessidade declarada | "Preciso/busco fazer uma integração com urgência e já fechei uma parceria comercial" |
| E-mail de acompanhamento | lrotero@gmail.com |
| Anexos | Resumo técnico (`anexos/Resumo-Tecnico-Integracao-Suhai-IMEDIATO.pdf`) e certidão SUSEP |
| Acompanhar em | <https://suhai.atlassian.net/servicedesk/customer/requests> |

## 7. Encerramento pela TI (21/09/2026)

Marcelo Juliani Ribamar Vieira marcou o SUTI-4370 como **Solucionado** às 11:30. O comentário não entrega whitelist, login, senha, AES, `apikey`, cartões de teste nem tabela de comissão. A orientação é pedir o acesso ao comercial:

- sophia.vieira@suhaiseguradora.com
- monica.lopes@suhaiseguradora.com

O chamado de TI não foi respondido: uma resposta reabriria o ticket, e o analista indicou que esse não é o canal. A janela para reabrir era de 3 dias úteis, até 24/09/2026.

No mesmo dia saiu um e-mail novo para as duas, com cópia para lrotero@gmail.com, repetindo os oito pedidos da seção 3 e anexando o resumo técnico e a certidão SUSEP. Luciano confirmou o envio em 21/09/2026. Nenhuma senha foi gravada no repositório.

Ainda falta avisar o Otávio no WhatsApp, citando o SUTI-4370 e esse encaminhamento.

## 8. Acompanhamento

| Marco | Data | Situação |
|---|---|---|
| E-mail ao comercial enviado e confirmado | 21/09/2026 | Feito |
| Cobrar Sophia e Monica se não houver resposta | 24/09/2026 | Pendente |
| Avisar o Otávio no WhatsApp | — | Pendente |

A página `/cotacao-suhai` permanece simulada até a primeira cotação real de homologação passar. O login do Cotador já está no gateway.

### Caso piloto do RPA (2026-09-30)

Placa `DBO7B72` na Placa Fipe: Volkswagen Golf, ano 2000, automóvel. A tabela FIPE pública correspondente ao texto esperado do manifesto (`Golf 1.6 Black & Silver`) é o código `005085-7`. `ConsultaVeiculos` em UAT devolveu marca `VW - VolksWagen`, modelo `Golf 1.6 Black & Silver`, categoria Automóvel.

A cotação não foi enviada. O proxy de CPF e o login direto da PH3A responderam HTTP 500, com a mensagem de usuário ou senha inválidos. Sem nascimento e sexo não há como montar o proponente. Não há código de recusa da Suhai. `SUHAI_GATEWAY_URL` não foi definido. A página segue `noindex` e fora do menu.

O formulário passou a preencher a placa por `/api/suhai/veiculo` e o CPF por `/api/suhai/perfil` (PH3A e estado civil por idade). A rota `/api/suhai/cotacao` continua sem credencial da seguradora.

### Smoke 2026-09-30

Login e senha de homologação recebidos no e-mail da Sophia de 30/09. Gravados nos segredos `SUHAI_LOGIN` e `SUHAI_SENHA` do projeto `imediato-seguros-site-novo` e montados na revisão `suhai-gateway-00006-225`. `SUHAI_AMBIENTE` segue `homologacao`. `GET /status` devolveu `credenciais: true`. `GET /diag/ip` devolveu `34.39.164.249`.

`POST /fipe/consulta` com o código de exemplo da documentação (`886002-5`) devolveu uma linha: marca BAJAJ, modelo BEE 125cv Monaco, categoria Moto. A primeira tentativa tinha voltado HTTP 500 porque o SOAPAction usava `IMultiCalculos`. O WSDL de UAT pede `VeiculosFipe/ConsultaVeiculos` e `MultiCalculos/IncluirCotacaoSuhai`. Corrigido em `suhai-gateway/src/soap.js` e no endpoint `VeiculosFipe.svc`. A chamada chegou ao host de UAT, então o IP de saída não foi recusado.

A cotação do caso piloto não foi enviada: a FIPE Suhai reconheceu o Golf, e a PH3A recusou o login (HTTP 500). Detalhe na seção acima. `SUHAI_GATEWAY_URL` não foi definido.

Busca no Gmail (chamado e resposta do comercial):

```text
SUTI-4370 OR from:sophia.vieira@suhaiseguradora.com OR from:monica.lopes@suhaiseguradora.com OR from:suhaiseguradora.com
```

### Monitoramento por e-mail

Rótulo `Suhai/SUTI-4370` e filtro (mesma query acima, aplicando o rótulo, marcando como importante e evitando spam) criados em duas caixas: `lrotero@gmail.com`, que é o endereço registrado no chamado, e `luciano.otero@segurosimediato.com.br`, que é a caixa usada pelo agente.

A ponte entre as duas é um filtro no Gmail pessoal que **encaminha** as mensagens do chamado para o endereço do Workspace. O encaminhamento geral da conta ficou desativado de propósito: a caixa pessoal tem volume alto e copiaria tudo. Atenção a uma limitação: os filtros de encaminhamento criados casam por `subject:(SUTI-4370)`, então mensagens da Suhai sobre outro assunto não chegam à caixa do Workspace — elas ainda são rotuladas na caixa pessoal pelo filtro amplo.

O acesso programático ao Gmail usa o projeto **`imediato-gmail-mcp`**, criado dentro da organização Workspace de `segurosimediato.com.br` com o consentimento OAuth marcado como **Interno**. Essa escolha resolve um problema recorrente: no projeto pessoal anterior (`site-pessoal-luciano-otero`, tipo Externo em modo de teste) o refresh token expirava a cada 7 dias e derrubava o monitoramento sem aviso. App interno não expira e dispensa verificação do Google.

### Checklist

- [x] Definir e confirmar os IPs de saída
- [x] Abrir o chamado no portal (SUTI-4370)
- [x] Confirmar IP de saída do servidor RPA via `curl` na máquina
- [x] TI encerrou o SUTI-4370 em 21/09/2026 e encaminhou ao comercial
- [x] E-mail ao comercial enviado e confirmado em 21/09/2026 (Sophia Vieira e Monica Lopes, cópia lrotero@gmail.com)
- [ ] Avisar o Otávio no WhatsApp
- [x] Receber credenciais de homologação do comercial (login do Cotador, 30/09/2026)
- [x] Registrar credenciais no Secret Manager e redeployar o gateway com `--set-secrets` (revisão `suhai-gateway-00006-225`)
- [ ] Definir `SUHAI_GATEWAY_URL` na Vercel (só depois da cotação real)
- [x] Smoke de `ConsultaVeiculos` a partir do IP liberado (30/09/2026, código de exemplo da documentação)
- [ ] Primeira cotação real em homologação, comparando o retorno com os fixtures dos testes
- [ ] Confirmar a resposta sobre captura de cartão (define o escopo PCI da fase de pagamento)
- [ ] Solicitar liberação de produção quando a homologação for validada

### O que fazer quando a resposta chegar

| Resposta da Suhai | Ação |
|---|---|
| Credenciais de homologação | Guardar no Secret Manager, redeployar o gateway, rodar o smoke de FIPE |
| Pedido de documento adicional | Emitir nova certidão SUSEP se a validade de 30 dias for exigida |
| Recusa de captura de cartão própria | Reavaliar a fase F4: usar link/checkout hospedado e reduzir o escopo PCI |
| Tabela de comissão informada | Configurar `SUHAI_TABELA_COMISSAO` no gateway |
