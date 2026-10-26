# Plano de UAT completo: funil v2 (Lote 1) e Suhai depois da resposta do Fábio

Documento de controle da semana de 26 a 28/10/2026, com continuação em 04/11. Cada caso tem a situação atual; os resultados detalhados ficam em [UAT_LOTE1_FUNIL_V2.md](UAT_LOTE1_FUNIL_V2.md) (na branch `uat-funil-etapa3`) e em [UAT_SUHAI_ACOMPANHAMENTO.md](UAT_SUHAI_ACOMPANHAMENTO.md).

Legenda: **ok** = executado e aprovado; **testes** = coberto só por teste automatizado; **a fazer**; **bloqueado** (com o motivo).

## 0. Preparação

| Item | Valor |
|---|---|
| Site em UAT | `uat.segurosimediato.com.br`, branch `uat-funil-etapa3` (commit `c8dd378` em 26/10) |
| Suhai em UAT | branch `suhai-acompanhamento`; preview Vercel própria |
| Gateway | tag `homologacao` (revisão `00028-rew`, sem tráfego). Produção fica 100% na `00022-has` |
| Dados | RTDB `staging`, Espo DEV, Cloud Run de e-mail DEV |
| Identidades | o telefone real de teste (só no aceite no celular) e o fictício `11900000077` nas rodadas automáticas |
| Ferramentas | `uat-check.mjs` (`purge-phone`, `clean-staging-test`), `uat-acomp-run.mjs` (setup, run, check, cleanup), `gw-homolog.ps1`, `fase0-suhai-fields.mjs` |

Regras:

- Nada em produção sem o "pode" do Luciano: merge, secrets, deploys, Espo PROD, tráfego do gateway e qualquer chamada à Suhai de produção.
- Cada bloco termina com limpeza.
- Evidência por caso: captura de tela, ID do registro no RTDB ou no Espo, e trecho de log.

## 1. Lote 1 do funil v2 (0.2.56)

### 1A. Campo único de telefone

Nos quatro formulários: `/cotacao`, modal do WhatsApp, modal do rodapé e proposta Suhai.

| # | Caso | Esperado | Situação |
|---|---|---|---|
| A1 | Digitar `11987654321` | Máscara `(11) 98765-4321`; teclado numérico no celular | ok automatizado; aparelho em 1E |
| A2 | Colar `+55 11 98765-4321` | Remove o +55 e aplica a máscara | ok automatizado; aparelho em 1E |
| A3 | Autofill do navegador (iOS e Android) | Aceita o número sem máscara | ok automatizado; aparelho em 1E |
| A4 | Fixo, DDD inválido ou número curto | Erro de validação, sem envio | ok automatizado |
| A5 | Número válido | Validação de WhatsApp ok; segue para a etapa 2 | ok automatizado |

Automatizado: `e2e/uat-lote1-campo.spec.ts`, 78/78 em Chrome desktop, Safari iPhone 13 (WebKit) e Chrome Pixel 7. O formulário de proposta Suhai só aparece depois de "Contratar" e fica para o aparelho real.

### 1B. Dedupe e jornada (RTDB staging e Espo DEV)

| # | Caso | Esperado | Situação |
|---|---|---|---|
| B1 | Jornada completa num ramo | 1 lead em `leads_backup`, 1 Lead e 1 Opp no Espo, entrada em `lead_dedupe/{env}/{hash}` | ok |
| B2 | Avançar etapas 2 e 3 antes da resposta do `initial` | Continua 1 lead só | ok |
| B3 | Recarregar a página no meio da jornada | Reaproveita o `leadId` da sessão | ok |
| B4 | Reenvio do mesmo POST em menos de 10 min | Idempotência (`X-Idempotency-Key`) | ok |
| B5 | Mesmo telefone e ramo, nova jornada no mesmo dia | Sem lead novo (dedupe de 24 h) | ok |
| B6 | Mesmo telefone, outro ramo | Lead novo | ok |
| B7 | Dedupe vencido com Opp aberta há até 7 dias | Lead novo, a mesma Opp e a Note "Nova jornada do site em DD/MM" | ok |
| B8 | Opp em Vendido/Perdido, ou com mais de 7 dias | Opp nova | ok |
| B9 | WhatsApp do Octadesk e e-mail admin | Uma mensagem por jornada | API ok; chegada no aparelho em 1E |

### 1C. Fluxos vizinhos

| # | Caso | Esperado | Situação |
|---|---|---|---|
| C1 | Cálculo RPA | Cartões de oferta e botão de WhatsApp normais | opcional (gera cotação de teste na Tô Segurado) |
| C2 | "Prefiro receber depois" | Note e mensagem no fluxo atual | ok |
| C3 | `/cotacao-suhai` | Cotação e proposta com o telefone mascarado | cotação simulada ok; proposta em 1E |
| C4 | Modais de WhatsApp e de ligar nas páginas de ramo | Ramo e canal corretos, eventos no `dataLayer` | ok |

### 1D. Telefone do rodapé com o ramo da página (`3ea2fe9`)

| # | Caso | Esperado | Situação |
|---|---|---|---|
| D1 | `/seguro-pet`, telefone do rodapé | Modal abre; `call_click` com `ramo: "pet"` | ok (25/10) |
| D2 | `/seguro-moto`, `/fianca`, `/assistencia-24-horas` | `ramo` igual ao caminho | ok (26/10) |
| D3 | `/`, `/contato`, `/a-imediato` | Sem ramo; o modal usa o padrão | ok (26/10) |
| D4 | Enviar o lead pelo modal de D1 | 1 registro com ramo Pet; 1 Lead e 1 Opp no Espo DEV | ok depois da correção `c8dd378` (26/10) |

D4 achou um defeito: o envio final do modal saía antes da resposta do `initial` e criava um segundo lead com Opp própria. Corrigido em `c8dd378` (branch `uat-funil-etapa3`), com teste de regressão. O ramo não aparece no Espo (vai como `produto` e não é guardado); era assim antes do Lote 1.

### 1E. Aceite em aparelho real (Luciano)

| # | Caso | Situação |
|---|---|---|
| E1 | iPhone (Safari): A1 a A5, B1, C3 e D1 | a fazer (F2) |
| E2 | Android (Chrome): A1 a A5, B1, C3 e D1 | a fazer (F2) |
| E3 | Mensagens do Octadesk recebidas no telefone de teste | a fazer (F2) |

Critério de aceite: todos os casos ok, nenhum lead duplicado e a vigilância de produção sem efeito colateral na `deliverLead`.

Limpeza: `uat-check.mjs purge-phone <tel>` e `clean-staging-test`. No fim, religar o `ssoProtection` da Vercel com `{"deploymentType":"all_except_custom_domains"}`.

## 2. Proposta Suhai: textos ajustados à regra da Suhai

Regra: cobrança só depois da apólice emitida; as APIs de boleto foram descontinuadas.

| # | Caso | Esperado | Situação |
|---|---|---|---|
| P1 | Proposta transmitida em homologação | Task "Acompanhar proposta Suhai nº X até a emissão da apólice", sem pedir boleto | testes; real em F4 |
| P2 | Note e e-mail da proposta | "Próximo passo" fala em acompanhar até a apólice | testes; real em F4 |
| P3 | `deliverLead` no `suhai_proposal` | Cria `suhai_acompanhamento/{leadId}` uma vez | testes; real em F4 |
| P4 | Reenvio do mesmo estágio | Não duplica o registro | testes; real em F4 |

## 3. Gateway: rotas de acompanhamento (tag `homologacao`)

| # | Caso | Esperado | Situação |
|---|---|---|---|
| G1 | `GET /status` | `ambiente: homologacao`, `credenciais: true`, `posVenda: true` | ok |
| G2 | `/proposta/status` 9061210 | status 12, data 2026-10-15 10:48:43 | ok |
| G3 | `/proposta/pendencias` por proposta e por placa | Pendências de vistoria com `linkPrestador` | ok |
| G4 | `/proposta/pendencias` sem registro | `{ propostas: [], semRegistro: true }` | testes |
| G5 | `/proposta/pdf` | `pdfBase64` e `envia_email=N` | a fazer (F4) |
| G6 | Entrada inválida (letras, placa errada, JSON quebrado) | 400 `entrada_invalida` | a fazer (F4) |
| G7 | Chamada sem token OIDC | 403 do Cloud Run | a fazer (F4) |

## 4. Rotina de acompanhamento (`acompanharPropostasSuhai`)

### 4A. Rodada local

| # | Caso | Situação |
|---|---|---|
| R1 | 1ª rodada: Note, Task de vistoria, e-mail, `suhai_status_proposta` e campos no Lead e na Opp | ok (9061210); repetir com a proposta nova em F4 |
| R2 | Rodada imediata | `pulado` ok |
| R3 | Rodada 1 h depois sem mudança | `sem_mudanca` ok |

### 4B. Cenários sem proposta real

| # | Caso | Esperado | Situação |
|---|---|---|---|
| R4 | Emitida | Note e Task da apólice; `final: true` | testes |
| R5 | Recusa reavaliável | Note com parecer e fator FIPE; Task de recusa | testes |
| R6 | Cancelada | Só a Note | testes |
| R7 | Pendência frustrada | Task "com problema" | testes |
| R8 | Note falhando | Status não é gravado; a próxima rodada tenta de novo | testes |
| R9 | Gateway fora 6 vezes seguidas | E-mail "Acompanhamento sem resposta" | testes |
| R10 | Lead apagado | `lead_apagado`, entrada final | testes |
| R11 | Mais de 45 dias | Task "Conferir no Portal"; `expirado` | testes |
| R12 | Ambiente sem bloco no config | Não consulta | testes |

### 4C. Função publicada (com "pode", F7)

| # | Caso | Situação |
|---|---|---|
| R13 | Disparo manual no Cloud Scheduler: processa a entrada de teste e o log mostra o resumo | a fazer (F7) |
| R14 | Execução de hora em hora sem erro por 24 h | observação de 28/10 a 03/11 |
| R15 | `enabled:false` faz a rodada sair sem consultar nada | a fazer (F7) |

## 5. Campos no Espo

| # | Caso | Situação |
|---|---|---|
| E1 | DEV: `cStatusProposta` e `cDataStatusProposta` no Lead e na Opp, painel "Cotação do Site" | ok (backup e inventário) |
| E2 | DEV: data gravada em UTC aparece no fuso do usuário | a fazer (F4) |
| E3 | PROD: mesma criação, com backup, "pode" e sessão de admin | a fazer (F6) |
| E4 | Rotina com o campo inexistente | testes |

## 6. Pós-venda (apólice, boleto e comissão)

| # | Caso | Situação |
|---|---|---|
| V1 | Chamada fora do IP da whitelist: 401 "restrição de segurança" | ok |
| V2 | `/posvenda/apolice/pesquisa` por placa e por período | ok (26/10): 200, sem apólices da corretora em homologação |
| V3 | `/posvenda/apolice` e `/posvenda/parcelas` de uma apólice de homologação | bloqueado: não há apólice da corretora em homologação |
| V4 | `/posvenda/apolice-da-proposta` acha a apólice da proposta | parcial (26/10): 9061210 responde `encontrada: false` (ainda não emitida) |
| V5 | `/posvenda/comissao` (até 31 dias; mais que isso, 400) | ok (26/10): 30 dias responde 200 vazio; 45 dias responde 400 |

Rodada de 26/10, pela tag `homologacao`: a Digibee voltou (o 500 de domingo sumiu). A pesquisa por placa (DBO7B72) e por emissão de 2025-01-01 a 2026-10-25 voltou vazia. A apólice de exemplo do portal (1003106306367) respondeu "restrição de segurança": é de outro corretor, então o filtro de acesso da Suhai funciona. Para fechar V3, V4 e V6 é preciso uma apólice nossa em homologação: pedir ao Fábio que emita a 9061210 ou a proposta nova da F4.
| V6 | Emitida com pós-venda ok: Note com PDF e boleto; Task com o link | testes; real depende de V2 a V4 |
| V7 | Emitida no cartão: Task "Enviar apólice" | testes |
| V8 | Pós-venda fora: Task volta ao texto do Portal do Cotador | testes |
| V9 | Resposta sem CPF ou nome do segurado | testes; conferir no real |

## 7. Regressão automatizada (antes de cada merge)

- `npm run test:functions` (61/61 em 25/10).
- `cd suhai-gateway && npm test` (35/35 em 25/10).
- `npm run test:ramo-caminho`, `test:suhai-host`, `typecheck` e `lint`.
- Playwright: `lead-sessao`, `etapa3-consultor` e `telefone` (26/26 em 26/10) e `uat-lote1-campo` (78/78 em 26/10), todos com as chamadas interceptadas.
- `rpa-fidelidade` (50 casos) e `testes-espocrm` (23 casos) fazem cálculo real no RPA e geram cotações de teste na Tô Segurado; só com decisão do Luciano.

## 8. Ordem de merge e deploy

Princípio: uma mudança de produção por vez, com smoke logo depois; cada deploy da `deliverLead` leva uma mudança só. Ordem aprovada pelo Luciano em 26/10; cada passo continua precisando do "pode" na hora.

| Ordem | Fase | Passo | Smoke | Rollback |
|---|---|---|---|---|
| 1 | F2 | Religar `ssoProtection` (depois do aceite no celular) | Preview pede login; domínio próprio não | PATCH de volta para `null` só se outro UAT precisar |
| 2 | F3 | Merge do PR #10 (`uat-funil-etapa3`) em `main`, release 0.2.56. A `deliverLead` do Lote 1 já está publicada (secret v6) | Jornada em `/cotacao` com o telefone de teste; dedupe; rodapé numa página de ramo; `prod-watch` 24 h | Reverter o merge e republicar na Vercel |
| 3 | F5 | Secret `ESPOCRM_API_CONFIG` v7 (`oppReuseDays: 7` em produção) e redeploy da `deliverLead` sem mudar o código | B7 e B8 em produção com o telefone de teste | Secret v6 e novo deploy |
| 4 | F4 | `main` trazido para `suhai-acompanhamento`, CHANGELOG 0.2.57, PR aberto; preview da branch com `SUHAI_GATEWAY_URL` da tag `homologacao` | UAT das seções 2, 3, 5 e 6 | Remover a variável da preview |
| 5 | F6 | Gateway em produção: revisão nova com o código da branch, `SUHAI_AMBIENTE=producao`, 100% e tag `producao` | `/status`; `/proposta/status` da 12350578 (só leitura) | `gcloud run services update-traffic suhai-gateway --to-revisions=suhai-gateway-00022-has=100` |
| 6 | F6 | Campos no Espo PROD (backup antes) | `fase0-suhai-fields.mjs --prefer=prod` | Excluir os campos e restaurar o layout do backup |
| 7 | F7 | Merge do PR da Suhai em `main`; IAM `roles/run.invoker` para a conta das funções; `SUHAI_ACOMP_CONFIG` só com `homologacao` | `gcloud` mostra o binding e a versão do secret | Remover o binding; `enabled:false` |
| 8 | F7 | Deploy da `acompanharPropostasSuhai` e da `deliverLead` (registro das propostas) | R13 e R15 | `enabled:false`; deploy da versão anterior da `deliverLead`; `firebase functions:delete acompanharPropostasSuhai` |
| 9 | F8 | Versão nova do `SUHAI_ACOMP_CONFIG` com o bloco `producao`, se a rotina rodou sem erro até 03/11 | Primeiras propostas reais acompanhadas | Versão anterior do secret |
| 10 | F8 | Pós-venda em produção, quando chegar a `apikey` de produção | `/status` com `posVenda: true`; V2 a V4 em produção | Sem a chave, `/posvenda/*` responde 503 e a Task volta ao texto do Portal |

Durante a viagem (29/10 a 02/11), nenhum deploy: só observação de R14 e do alerta da rotina.

## 9. Fora deste UAT

- Fase B (Suhai junto com o RPA): plano em [FASE_B_SUHAI_PARALELO.md](FASE_B_SUHAI_PARALELO.md), ainda sem código.
- Cartão de crédito: o Fábio confirmou em 26/10 o modelo de tela própria. O cliente digita o cartão no site, o servidor cifra número e CVV em AES-256 e envia direto à API Pagamento, sem gravar. A Suhai não tem página de pagamento. Projeto a abrir.
- Boleto: a Suhai envia o "Kit Boas-Vindas" (apólice e boletos) ao e-mail informado na proposta; a segunda via sai pelo Atendimento Suhai ou pela API Apólice. Seguimos com `tp_pagamento 2`.
- Status e pendências da proposta usam o mesmo usuário de serviço de produção (confirmado pelo Fábio em 26/10).
- Templates de WhatsApp da pendência e da proposta: criados no Octadesk como `pendencia_suhai_util_v1_octa` (`6adf4cb24582fe09dcd79943`) e `proposta_suhai_util_v3_octa` (`6adf4c4204118aa70b52a4dc`), em análise na Meta. Os criados direto na Meta não aparecem no Octadesk e serão apagados. O disparo no código entra depois da aprovação, com "pode".

## Registro de execução

| Data | Fase | Resultado |
|---|---|---|
| 26/10 | F1 | Plano gravado. Rodapé D2 a D4 ok, com o defeito do modal corrigido em `c8dd378`. Regressão local 26/26 e 78/78. Pós-venda V2 e V5 ok; V3 e V4 dependem de uma apólice nossa em homologação. Ordem de deploy aprovada. Fábio respondeu (cartão, boleto, login) e a réplica foi enviada pedindo a confirmação do escopo do ITSM-102658, a apólice de teste e o limite de volume. Templates recriados no Octadesk, em análise (seção 9). Baterias com RPA real: as 6 motos da `rpa-fidelidade` falharam na Tela 3 porque o teste ainda procurava o chip de ramo, removido do funil, e mandava moto como `tipo_veiculo: "carro"` (corrigido no teste em `689b4f2`, sem rodar; leads reais de moto entram por `/seguro-moto` e não são afetados). A `testes-espocrm` passou a limpar o dedupe do Lote 1 entre casos (`adc93e1`); casos 3 a 23 em execução |
