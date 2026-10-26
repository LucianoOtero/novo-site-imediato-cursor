# UAT — Acompanhamento das propostas Suhai

Status, pendências, emissão e recusa da proposta transmitida chegando sozinhos ao EspoCRM. Contexto: a Suhai só cobra depois da apólice emitida e descontinuou as APIs de boleto (Fábio Edo, 24/10/2026). Desenho em [`FLUXO_SUHAI_CRM_WHATSAPP.md`](FLUXO_SUHAI_CRM_WHATSAPP.md), seção 2.1.

- **Branch:** `suhai-acompanhamento` (criada a partir de `uat-funil-etapa3`).
- **Commits:** `44e098b` (gateway: status, pendências e PDF), `30c8a83` (rotina agendada na CF), `67bc0ee` e `0ea926d` (pendências por placa/chassi; campos no inventário do Espo), mais o ajuste de texto da Note feito no UAT.
- **Execução:** 25/10/2026, ~21h40 (Brasília).

## Ambiente

| Peça | Onde rodou |
|---|---|
| Gateway | Revisão `suhai-gateway-00026-kip` na tag `homologacao`, sem tráfego, `SUHAI_AMBIENTE=homologacao` e secrets `SUHAI_LOGIN`/`SUHAI_SENHA`. Produção seguiu com 100% na `00022` (conferido depois do deploy, IAM inalterado). |
| Rodada da CF | Local (`C:\Users\Luciano\wt\_shots-etapa3\uat-acomp-run.mjs`), chamando `acompanharPropostas` do código da branch, com token OIDC do `gcloud` |
| RTDB | `leads_backup/ld_uatacomp0001` (staging, `autoSync:false`, para a `deliverLead` ignorar) e `suhai_acompanhamento/ld_uatacomp0001` |
| Espo | DEV, Lead e Oportunidade de teste criados pela API (celular fictício) |
| E-mail | Cloud Run de e-mail DEV |

## Resultados

| # | Caso | Resultado |
|---|---|---|
| 1 | Gateway `/status` na tag | `ambiente: homologacao`, credenciais presentes |
| 2 | `/proposta/pendencias` por placa (DBO7B72) | 4 propostas de homologação: 9061210 "Pendências para Emissão" (2 pendências) e 9061228, 9061231, 9061236 "Salva" |
| 3 | `/proposta/status` da 9061210 | `status` 12, `dataAtualizacao` 2026-10-15 10:48:43; 9061228 → `status` 1 "Salva" |
| 4 | `/proposta/pendencias` da 9061210 | Duas "Vistoria Prévia" (Autovist): "Autovistoria pendente de realização" e "Solicitação — Cadastrado" com `linkPrestador` da Autovist de homologação |
| 5 | 1ª rodada | `mudou: 1`. Note no Lead com as duas pendências e o link para o cliente; Task "[HOMOLOGAÇÃO] Enviar ao cliente o link de Vistoria Prévia — proposta Suhai nº 9061210" (D+0); e-mail "Proposta Suhai - Pendência para emissão" aceito pelo Cloud Run; `suhai_status_proposta` gravado no registro; efeitos `nota_12_…`, `task_pend_vistoria_previa`, `email_12_…` |
| 6 | Rodada logo em seguida | `pulado: 1` (intervalo mínimo de 50 min) |
| 7 | Rodada 1 h depois, sem mudança | `sem_mudanca: 1`; nenhuma Note, Task ou e-mail novo |
| 8 | Campos `cStatusProposta`/`cDataStatusProposta` | Não gravados: ainda não existem no Espo DEV. A rodada seguiu, como previsto (best-effort) |

Ajuste feito no UAT: a Note repetia "Texto da Suhai: Pendências para Emissão" quando o texto da Suhai só difere do nosso rótulo nas maiúsculas; agora a linha só aparece se o texto for outro.

Casos sem proposta real em homologação (emitida, recusa, cancelada, pendência frustrada, Note falhando, gateway fora, lead apagado, expiração) estão cobertos pelos testes de `firebase/functions/test/suhai-acompanhamento.test.js`.

## Limpeza

Lead, Oportunidade e Note de teste excluídos do Espo DEV; entradas do RTDB removidas. As Tasks de teste (o usuário de API recebe 403 ao excluir) foram canceladas e depois excluídas pela sessão de administrador.

## Campos no Espo DEV (25/10/2026, ~22h10)

- Backup dos campos e do layout de detalhe do Lead e da Oportunidade antes da mudança: `C:\Users\Luciano\wt\_shots-etapa3\espo-dev-bkp-campos-20261025.json`.
- Criados pela sessão de administrador: `cStatusProposta` (Varchar 60, "Status da proposta") e `cDataStatusProposta` (Data/hora, "Data do status da proposta"), no Lead e na Oportunidade, numa linha do painel "Cotação do Site" logo depois de `cNumeroProposta`; rebuild e limpeza de cache. O inventário (`fase0-suhai-fields.mjs --prefer=dev`) dá OK nos dois.
- Rodada de novo com a 9061210: `mudou: 1`, e o Lead e a Oportunidade ficaram com "Pendências para emissão" e `2026-10-15 13:48:43` (UTC; 10:48:43 em Brasília). Limpeza feita como acima.
- Rollback: excluir os dois campos no Field Manager e restaurar o layout do backup.

## Pós-venda (apólice e boleto na emissão)

Quando o status vira Emitida, a rotina chama `/posvenda/apolice-da-proposta` (placa do lead e emissão a partir da véspera da transmissão). Achando a apólice, a Note traz número, vigência, prêmio, PDF da apólice e o boleto da próxima parcela pendente, e a Task "Enviar boleto da 1ª parcela" já leva o link. No cartão, a Task vira "Enviar apólice". Sem resposta da pós-venda, a Task volta ao texto do Portal do Cotador.

| Peça | Situação em 25/10/2026 |
|---|---|
| Secret | `SUHAI_API_KEY` (versão 1, chave de homologação), acesso só para `64754519959-compute@developer.gserviceaccount.com` |
| Gateway | Revisão `suhai-gateway-00028-rew` na tag `homologacao`, sem tráfego, com `SUHAI_API_KEY`; `/status` mostra `posVenda: true`. Produção seguiu com 100% na `00022` |
| Chamada da máquina local | 401 "restrição de segurança" (IP fora da whitelist), como esperado |
| Chamada pela tag | Passa da restrição de IP, mas a Suhai responde 500 "serviço indisponível, tente mais tarde" em pesquisa, consulta e comissão. A homologação SOAP respondeu normalmente no mesmo horário (9061210, status 12) |
| Testes | Gateway 35/35 (`posvenda.test.js` com os exemplos do portal); funções 61/61 (emissão com boleto, no cartão, sem apólice, e rodada com a pós-venda fora) |

Falta repetir a pesquisa pela placa DBO7B72 quando a Digibee de homologação voltar. Se o 500 persistir num dia útil, abrir chamado com a Suhai (a chave pode não estar ativa no pipeline de pós-venda).

## Pendências antes do rollout

- [x] Campos `cStatusProposta` e `cDataStatusProposta` no Espo DEV (seção acima).
- [x] Rodada local de novo com os campos no DEV, conferindo os dois campos no Lead e na Oportunidade.
- [ ] Os mesmos campos no Espo PROD, com "pode" e a sessão de administrador. Conferir com `node scripts/espo-ops/fase0-suhai-fields.mjs --prefer=prod`.

## Rollout (cada passo com "pode")

1. **Merge** da branch em `main` (depois do Lote 1).
2. **Gateway em produção:** nova revisão com o código da branch, `SUHAI_AMBIENTE=producao` e os secrets `*_PRODUCAO`, recebendo 100% e com a tag `producao`. Só acrescenta rotas de leitura. A pós-venda em produção depende da `apikey` de produção (ainda não recebida): até lá, sem `SUHAI_API_KEY` na revisão, `/posvenda/*` responde 503 e a Task da emissão usa o texto do Portal do Cotador. Rollback: `gcloud run services update-traffic suhai-gateway --to-revisions=suhai-gateway-00022-has=100`.
3. **Validação de leitura em produção:** `POST /proposta/status` da proposta 12350578 (é o item `suhai-status-leitura`).
4. **IAM:** `roles/run.invoker` no `suhai-gateway` para `64754519959-compute@developer.gserviceaccount.com` (conta das funções). Rollback: remover o binding.
5. **Secret `SUHAI_ACOMP_CONFIG`**, primeiro só com homologação:
   `{"enabled":true,"maxDias":45,"ambientes":{"homologacao":{"url":"https://homologacao---suhai-gateway-naz47uxetq-rj.a.run.app","audience":"https://suhai-gateway-naz47uxetq-rj.a.run.app"}}}`
   Depois de um dia sem erro, uma versão nova com o bloco `producao` (`url` da tag `producao`, mesma `audience`). Rollback: `enabled:false` (nova versão do secret e novo deploy da função).
6. **Deploy** de `deliverLead` (registro das propostas novas) e `acompanharPropostasSuhai` a partir do `main`. Rollback: deploy da versão anterior da `deliverLead` e `firebase functions:delete acompanharPropostasSuhai`.
7. **Propostas antigas:** a 12350578 (teste de 16/10, cancelada à mão no Portal) não entra no acompanhamento. Só propostas transmitidas depois do deploy são registradas.
