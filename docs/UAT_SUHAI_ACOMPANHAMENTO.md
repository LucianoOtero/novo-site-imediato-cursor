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

Lead, Oportunidade e Note de teste excluídos do Espo DEV; entradas do RTDB removidas. A Task `6adea181710d0ca0f` não pôde ser excluída pelo usuário de API (403) e ficou como "Canceled"; excluir pela sessão de administrador.

## Pendências antes do rollout

- [ ] Campos `cStatusProposta` (Varchar 60, "Status da proposta") e `cDataStatusProposta` (Data/hora, "Data do status da proposta") no Lead e na Oportunidade, painel "Cotação do Site". O usuário de API recebe 403 no Field Manager: precisa da sessão de administrador (DEV e PROD). Conferir com `node scripts/espo-ops/fase0-suhai-fields.mjs --prefer=dev` (e `prod`).
- [ ] Rodada local de novo com os campos no DEV, conferindo os dois campos no Lead e na Oportunidade.

## Rollout (cada passo com "pode")

1. **Merge** da branch em `main` (depois do Lote 1).
2. **Gateway em produção:** nova revisão com o código da branch, `SUHAI_AMBIENTE=producao` e os secrets `*_PRODUCAO`, recebendo 100% e com a tag `producao`. Só acrescenta rotas de leitura. Rollback: `gcloud run services update-traffic suhai-gateway --to-revisions=suhai-gateway-00022-has=100`.
3. **Validação de leitura em produção:** `POST /proposta/status` da proposta 12350578 (é o item `suhai-status-leitura`).
4. **IAM:** `roles/run.invoker` no `suhai-gateway` para `64754519959-compute@developer.gserviceaccount.com` (conta das funções). Rollback: remover o binding.
5. **Secret `SUHAI_ACOMP_CONFIG`**, primeiro só com homologação:
   `{"enabled":true,"maxDias":45,"ambientes":{"homologacao":{"url":"https://homologacao---suhai-gateway-naz47uxetq-rj.a.run.app","audience":"https://suhai-gateway-naz47uxetq-rj.a.run.app"}}}`
   Depois de um dia sem erro, uma versão nova com o bloco `producao` (`url` da tag `producao`, mesma `audience`). Rollback: `enabled:false` (nova versão do secret e novo deploy da função).
6. **Deploy** de `deliverLead` (registro das propostas novas) e `acompanharPropostasSuhai` a partir do `main`. Rollback: deploy da versão anterior da `deliverLead` e `firebase functions:delete acompanharPropostasSuhai`.
7. **Propostas antigas:** a 12350578 (teste de 16/10, cancelada à mão no Portal) não entra no acompanhamento. Só propostas transmitidas depois do deploy são registradas.
