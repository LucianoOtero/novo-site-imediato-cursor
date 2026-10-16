# Fluxo da cotação Suhai — EspoCRM, WhatsApp (Octadesk) e e-mail admin

## Finalidade

Documentar como a cotação Suhai do site (`/cotacao-suhai` e as landings `/marca-suhai/*`, que usam o mesmo `CotacaoSuhaiExperiencia`) chega ao **EspoCRM**, ao **WhatsApp do cliente via Octadesk** e ao **e-mail administrativo**, no mesmo caminho dos modais e do formulário RPA ([`FLUXO_LEADS_MODAL_FORMULARIO_RPA.md`](./FLUXO_LEADS_MODAL_FORMULARIO_RPA.md)).

O objetivo comercial: o vendedor abre o Lead/Oportunidade no Espo e encontra o número da cotação, o plano escolhido, os valores apresentados ao cliente e, se houver, o número da proposta — para entrar no Portal do Cotador Suhai, emitir a apólice e cobrar o boleto.

---

## 1. Arquitetura

```text
UI (/cotacao-suhai) ── POST /api/lead ───────────────┐  initial · progress · suhai_plan_selected
                    └─ POST /api/suhai/cotacao ──┐    │
                    └─ POST /api/suhai/proposta ─┤    │
                                                 ▼    ▼
                                Firebase RTDB leads_backup/{leadId}  (autoSync: true)
                                                 │
                                   Cloud Function deliverLead
                                   ├─ EspoCRM (API direta)
                                   ├─ Octadesk (send-template, só marcos)
                                   └─ Cloud Run de e-mail admin (toda etapa)
```

- O **browser** grava `initial`, `progress` e `suhai_plan_selected` via `/api/lead`.
- O **servidor** grava `suhai_quote` e `suhai_proposal` dentro das rotas Suhai (`lib/leads/suhai-etapas.ts`), com o resultado real do gateway. Valores de plano e prêmio nunca vêm do browser: `registrarPlanoSuhai` busca a oferta pelo `cdCobertura` na cotação já gravada.
- Escritas no RTDB são **por caminho** (`data/<campo>`), então uma etapa não apaga os campos de outra.
- O `leadId` (`ld_` + 12 hex) nasce no `initial` e acompanha cotação, plano e proposta.

---

## 2. Etapas, mensagens e registros

| # | Momento | Quem grava | `stage` | EspoCRM | WhatsApp ao cliente | E-mail admin |
|---|---|---|---|---|---|---|
| 1 | Celular informado | browser | `initial` | Cria Lead + Oportunidade (`cEtapaFunil` "Telefone informado") | `primeira_etapa` | "Primeiro Contato - Apenas Telefone" |
| 2 | Placa / veículo | browser | `progress` (`suhaiEtapa: veiculo`) | Placa, marca/modelo, ano; `cEtapaFunil` "Dados do veículo" | — | "Cotação Suhai - Etapa concluída" |
| 3 | CEP de pernoite | browser | `progress` (`suhaiEtapa: cep`) | CEP | — | idem |
| 4a | Preço apresentado (cotação real) | servidor | `suhai_quote` sucesso | Nome/CPF; `cStatusCalculo` Concluído; `cValorRecomendado`/`cValorAlternativo`; `cEtapaFunil` "Cálculo concluído" → "Cotação Suhai apresentada"; `cNumeroCotacao`; Note com **todas** as ofertas | `suhai_cotacao_pronta` | "Preço apresentado" + protocolo e plano recomendado |
| 4b | Cotação falhou | servidor | `suhai_quote` falha | `cEtapaFunil` "Cálculo manual pendente"; `cStatusCalculo` Falhou; Note com o erro; **Task** "Efetuar cotação Suhai manual" (D+1) | `calculo_manual` | "Cotação Suhai - Erro" |
| 5 | Plano escolhido | browser → servidor resolve | `suhai_plan_selected` | `cEtapaFunil` "Plano escolhido"; `cPlanoEscolhido`, `cPremioTotal`, `cFranquia`; Note | — | "Plano escolhido" + plano e prêmio |
| 6a | Proposta transmitida | servidor | `suhai_proposal` sucesso | `cEtapaFunil` "Proposta transmitida"; `cNumeroProposta`, `cPagamento`; Note; **Task** "Emitir apólice Suhai e enviar boleto — proposta nº X" (D+0) | `suhai_proposta_enviada` | "Proposta transmitida" |
| 6b | Proposta com erro | servidor | `suhai_proposal` falha | `cEtapaFunil` "Proposta com erro"; Note com o erro; **Task** "Concluir proposta Suhai pendente" (D+0) | — | "Cotação Suhai - Erro" |

Em todas as etapas Suhai a Oportunidade recebe `cSeguradora = "Suhai"`. O Lead recebe `cCanalCaptura = "cotacao_suhai"`.

**Cotação simulada** (sem `SUHAI_GATEWAY_URL`) registra no CRM e no e-mail, mas **nunca** envia WhatsApp nem grava `cNumeroCotacao`.

**Homologação**: com `SUHAI_AMBIENTE=homologacao` (padrão), Notes, Tasks e e-mails saem com o prefixo `[HOMOLOGAÇÃO]`.

### Repetições (recalcular, trocar de plano, tentar a proposta de novo)

Cada ocorrência tem chave própria (`suhai.flagKey`): `progress_veiculo`, `progress_cep`, `suhai_quote_<protocolo>`, `suhai_plan_<cd>_<protocolo>`, `suhai_proposal_<número>`; falhas usam o horário. Assim, um recálculo atualiza o CRM e gera nova Note e novo e-mail. Exceções para não poluir:

- **Task de falha**: uma por lead (`suhai_quote_falha`, `suhai_proposal_falha`), mesmo que o cliente tente várias vezes.
- **WhatsApp**: um por template por lead (`octa_<template>_sent`).

---

## 3. EspoCRM — configuração (Admin)

**Status: concluída em DEV e em PRODUÇÃO em 2026-10-15** (inventário `fase0-suhai-fields.mjs` sem pendências nos dois ambientes; validação na seção 7).

O usuário de API **não** tem acesso ao Field Manager (HTTP 403) nem a DELETE. Por isso a configuração foi feita com a sessão de um administrador logado no navegador, chamando a API do Espo de dentro da página (`Espo.Ajax`):

- `POST Admin/fieldManager/{Entity}` para os campos;
- `PUT Admin/fieldManager/{Entity}/{campo}` para os enums, com a **definição completa** relida antes, porque um payload parcial apaga opções;
- `PUT {Entity}/layout/detail`;
- `POST Admin/rebuild` e `POST Admin/clearCache`.

Backups anteriores às escritas: [`scripts/espo-ops/backup-espo-suhai-dev-2026-10-15.json`](../scripts/espo-ops/backup-espo-suhai-dev-2026-10-15.json) e [`backup-espo-suhai-prod-2026-10-15.json`](../scripts/espo-ops/backup-espo-suhai-prod-2026-10-15.json).

Depois do rebuild, o navegador de quem já estava logado mostra o nome técnico (`cNumeroCotacao`) até recarregar a página, por causa do cache do front. Os rótulos no servidor estão corretos.

Se for preciso repetir em outro Espo, o roteiro manual pela UI é o das seções 3.1 e 3.2.

### 3.1 Campos novos — em **Lead** e em **Oportunidade**

Administração → Entity Manager → Lead (depois Opportunity) → Fields → Add Field. O Espo acrescenta o prefixo `c` sozinho: digite o nome **sem** o `c`.

| Nome digitado | Fica como | Tipo | Rótulo |
|---|---|---|---|
| `numeroCotacao` | `cNumeroCotacao` | Varchar (40) | Número da cotação |
| `numeroProposta` | `cNumeroProposta` | Varchar (40) | Número da proposta |
| `planoEscolhido` | `cPlanoEscolhido` | Varchar (120) | Plano escolhido |
| `premioTotal` | `cPremioTotal` | Currency | Prêmio total |
| `pagamento` | `cPagamento` | Varchar (80) | Pagamento |
| `franquia` | `cFranquia` | Varchar (30) | Franquia |

Layout de detalhe: os seis campos entram no painel "Cotação do Site", em três linhas (`cNumeroCotacao | cNumeroProposta`, `cPlanoEscolhido | cPremioTotal`, `cPagamento | cFranquia`), logo depois da linha dos valores do cálculo. Os layouts de DEV e PROD não são iguais, então a posição é relativa a essa linha.

### 3.2 Opções novas em enums existentes (Lead e Oportunidade)

| Campo | Opções a acrescentar |
|---|---|
| `cEtapaFunil` | `Cotação Suhai apresentada`, `Plano escolhido`, `Proposta transmitida`, `Proposta com erro` |
| `cCanalCaptura` | `cotacao_suhai` |

`cSeguradora` já tem `Suhai` (inventário de 2026-10-15). A grafia precisa ser **exata**: valor de enum inexistente faz o Espo rejeitar o PUT inteiro (por isso essas opções vão em PUT separado).

O rótulo de `cotacao_suhai` é "Cotação Suhai". As traduções existentes de `cCanalCaptura` foram mantidas: em PROD são "Whatsapp"/"Telefone" e no DEV, "Modal Whatsapp"/"Modal Telefone".

### 3.2.1 Duplicidade de Lead no Espo

A checagem de duplicidade do Espo é diferente em cada ambiente: em **DEV** usa `emailAddress`, `cCpftext` e `cCelular`; em **PROD**, `emailAddress` e `cCelular`. O dedupe da Cloud Function (`findExistingLead`) procura apenas por e-mail real e por `cCelular`. Quando o `POST Lead` recebe **409** (por exemplo, mesmo CPF com outro celular), a CF adota o Lead que o Espo indicou e o atualiza (`espocrm.js`, `createLead`, desde 2026-10-15). Antes disso, a entrega falhava até esgotar as tentativas.

### 3.3 Conferir

```powershell
$env:ESPOCRM_API_CONFIG = gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo
node scripts/espo-ops/fase0-suhai-fields.mjs --prefer=dev    # e depois --prefer=prod
```

O relatório (`scripts/espo-ops/fase0-suhai-fields-{dev,prod}.json`) lista campos e opções que ainda faltam.

**Atenção**: o Espo **ignora em silêncio** atributos que não existem. Leads processados antes da criação dos campos ficam com o flag `espo_suhai_campos_*_sent` marcado e não são reenviados — os valores continuam na Note e na descrição do Lead.

---

## 4. WhatsApp (Octadesk)

- Só nos marcos: `primeira_etapa` (celular), `suhai_cotacao_pronta` (preço real), `calculo_manual` (cotação falhou) e `suhai_proposta_enviada` (proposta transmitida).
- Os quatro estão aprovados e ativos. `suhai_cotacao_pronta` e `suhai_proposta_enviada` foram ativados em 2026-10-15 (`cotacao_suhai_util_v2` e `proposta_suhai_util_v2`); textos, IDs e variáveis estão em [`GUIA_OCTADESK_TEMPLATES.md`](./GUIA_OCTADESK_TEMPLATES.md#templates-da-cotação-suhai-cotacao-suhai-2026-10-15).
- Se o ID de um template sair de `OCTADESK_API_CONFIG.templates`, o envio é **pulado** (log, sem e-mail de erro).

---

## 5. E-mail administrativo

Um e-mail por etapa cumprida, só para `captureChannel: "suhai_form"`, pelo mesmo Cloud Run do legado. Como ele só conhece os momentos `initial`/`update`/`*_error`, o tipo da etapa Suhai vai na descrição (`momento_descricao`), com protocolo, plano, prêmio e número da proposta. Flags `email_suhai_<chave>_sent`.

Limitação conhecida: o template do Cloud Run legado escreve "Modal WhatsApp" / "Formulário do Whatsapp" no corpo e no assunto de todos os alertas do site novo. O assunto já traz "Cotação Suhai - …", que identifica a origem.

---

## 6. Ambientes

| | Local / preview (UAT) | Produção |
|---|---|---|
| `environment` no RTDB | `staging` / `development` | `production` |
| EspoCRM | **DEV** (bloco `dev` do `ESPOCRM_API_CONFIG`) | PROD |
| Octadesk | **sempre produção** — usar o celular de teste | produção |
| Gateway Suhai | tag `homologacao` do Cloud Run | tráfego principal, Suhai em produção desde 2026-10-16 |

Rodar local com cotação real: `$env:SUHAI_GATEWAY_URL="https://suhai-gateway-64754519959.southamerica-east1.run.app"; npm run dev` (o `.env.local` tem `NEXT_PUBLIC_APP_ENV=staging`, então o CRM é o DEV). Para uma URL com tag (`https://<tag>---suhai-gateway-…`), o token gerado pela conta de serviço do Firebase recebe 401; use `SUHAI_GATEWAY_TOKEN` com `gcloud auth print-identity-token` (vale 1 h).

---

## 7. Validação ponta a ponta (2026-10-15, homologação + Espo DEV)

Celular de teste `11 91653-5000`, placa `DBO7B72`, lead `ld_d9ee7ffa4c38`:

| Etapa | Resultado |
|---|---|
| Celular | Lead + Oportunidade criados no Espo DEV; `primeira_etapa` enviado; e-mail "Primeiro Contato" |
| Placa e CEP | Dois `progress` com flags próprios (`progress_veiculo`, `progress_cep`) e e-mails |
| Cotação com erro Suhai (FIPE incorreto; CPF fora da base de homologação) | Note + Task de cálculo manual + `calculo_manual` + e-mail de erro |
| Cotação real (protocolo 532114, 3 ofertas) | Valores recomendado/alternativo, `cSeguradora` Suhai, Note com as ofertas, e-mail "Preço apresentado"; WhatsApp pulado (template ainda sem ID) |
| Plano Completo (cd 1009, R$ 1.261,12) | Resolvido no servidor a partir da cotação gravada; Note + e-mail |
| Proposta | Suhai recusou ("Há outra proposta em emissão" — a placa já tinha proposta de um smoke anterior): Note + Task de pendência + e-mail de erro, sem WhatsApp |
| Proposta com sucesso (gravação sintética no RTDB, nº E2E0001) | Note + Task "Emitir apólice…" + e-mail "Proposta transmitida" |

Ajustes feitos a partir do teste: uma Task de falha por lead e `cEtapaFunil` "Cálculo concluído" na cotação com sucesso (antes ficava "Cálculo manual pendente" após uma falha anterior). Registros de teste: RTDB apagado; Lead, Oportunidade e Tasks excluídos depois no Espo DEV pela sessão de administrador.

### 7.1 Com os campos novos no Espo DEV (2026-10-15, noite)

Mesmo celular e placa, com o CPF de homologação da Suhai:

| Etapa | Resultado no Espo DEV (Lead e Oportunidade) |
|---|---|
| Cotação real (protocolo 532132) | `cCanalCaptura` "Cotação Suhai", `cEtapaFunil` "Cotação Suhai apresentada", `cNumeroCotacao` 532132, Note |
| Plano Completo | `cPlanoEscolhido` "Completo — assistência 200 km (cd 1009)", `cPremioTotal` R$ 1.261,12, `cFranquia` R$ 10.100,00 |
| Proposta real | Recusada pela Suhai (placa travada): `cEtapaFunil` "Proposta com erro" + Task de pendência |
| Proposta sintética (nº E2E0002) | `cEtapaFunil` "Proposta transmitida", `cNumeroProposta` E2E0002, `cPagamento` "Boleto em 12x (≈ R$ 105,09), vencimento dia 10" + Task "Emitir apólice…" |

No primeiro envio, o Espo DEV respondeu 409 porque o CPF de homologação já estava num Lead antigo. Isso levou ao ajuste da seção 3.2.1. O Lead adotado foi restaurado depois do teste a partir de [`backup-espo-lead-6a69e0fe5d51f10e2-dev-2026-10-15.json`](../scripts/espo-ops/backup-espo-lead-6a69e0fe5d51f10e2-dev-2026-10-15.json), e a Oportunidade, as Tasks e as Notes do teste foram excluídas.

### 7.2 Produção (2026-10-15, noite)

Teste com um lead sintético no RTDB (`environment: "production"`, celular fictício `11 90000-0001`, sem CPF e sem e-mail, para não cair em Lead real por duplicidade), percorrendo cotação, plano e proposta. O Espo PROD recebeu Lead e Oportunidade com os seis campos, "Cotação Suhai" e "Proposta transmitida", além de 3 Notes e da Task de emissão (atribuída ao responsável de tarefas de produção). Nenhum WhatsApp foi enviado: não houve `initial`, e os templates Suhai ainda não têm ID. Os e-mails da equipe saíram com `[HOMOLOGAÇÃO]`. Todos os registros foram excluídos em seguida (RTDB e Espo).

### 7.3 Produção pelo site (2026-10-15, noite, Fase 1)

Teste em `www.segurosimediato.com.br/cotacao-suhai` com o celular da Imediato e o CPF de homologação, placa DBO7B72. A CF entregou as 9 etapas sem falha (Espo e Octadesk), com `environment: "production"`:

| Etapa | Resultado |
|---|---|
| Versão "Golf 2.0" | Suhai 503 "Código FIPE informado está incorreto": Note, Task de cotação manual, WhatsApp `calculo_manual` e e-mail de erro |
| Versão "Golf 1.6 Black & Silver" | Cotação 532147; WhatsApp de cotação pronta; Lead e Oportunidade (Suhai) com os campos novos |
| Plano Completo | `cPlanoEscolhido`, `cPremioTotal` R$ 1.261,12, `cFranquia` R$ 10.100,00 |
| Proposta | Recusada pela Suhai (placa travada): "Proposta com erro" + Task de pendência |

Achados: a consulta de placa levou de 45 a 78 s (tabela FIPE pública consultada modelo a modelo, em sequência; corrigido em `lib/suhai/fipe-publica.ts` com a lista de modelos por ano da v2, chamadas em paralelo e cache de 7 dias); o perfil por CPF não preenche em produção: `/api/suhai/perfil` só precisa de `CPF_VALIDATE_PROXY_URL` (ausente no Vercel), mas os proxies de CPF respondem 500 enquanto a credencial da PH3A estiver inválida (ver `suhai-integracao/08-CHAMADO-ACESSO.md`); o usuário `api` do Espo PROD não exclui registros nem grava os campos restaurados, então a limpeza foi feita pela sessão de administrador. Apagar o registro do RTDB no meio de um teste faz o próximo envio do mesmo celular (mesmo `leadId`, por deduplicação) cair no Lead encontrado pelo e-mail.

### 7.4 Produção com a Suhai em produção (2026-10-16, Fase 2)

Gateway virado para o ambiente de produção da Suhai (revisão `00019`, tabela 1, tag `producao`). Cotação real pelo site com a mesma placa, CEP e CPF, sem proposta: RTDB com `environment: "production"`, Espo PROD sem o prefixo `[HOMOLOGAÇÃO]`, e-mails e Octadesk (`primeira_etapa` e `suhai_cotacao_pronta`). Registros do teste excluídos e Lead adotado restaurado do backup.

Achados, corrigidos na seção 7.5:

- **Oportunidades duplicadas e funil voltando para trás.** Cada gravação em `leads_backup/{id}` dispara o `deliverLead`. O `initial` leva ~25 s e só gravava os IDs do Espo no fim; as etapas gravadas nesse intervalo criavam uma Oportunidade cada, e o `initial` atrasado devolvia `cEtapaFunil` para "Telefone informado".
- **"500 km" e "Sem assistência" sem preço.** Sem `planoAssistencia`, a Suhai devolve só as coberturas de 200 km. Reenviar o protocolo com `planoAssistencia` é recusado (422 "Nullable object must have a value"); uma cotação nova por nível funciona (~1 s) e tem protocolo próprio.

### 7.5 Correções (2026-10-16)

- **Reserva da criação no Espo** (`firebase/functions/espo-reserva.js`): a execução que vai criar Lead/Oportunidade grava `espo_criacao_em` por transação e grava os IDs assim que o Espo responde; as outras esperam os IDs (até 30 s). Reserva com mais de 60 s é de execução que caiu e pode ser tomada.
- **Etapa superada**: antes de gravar `cEtapaFunil`, a CF relê `data`; se o site já gravou outra etapa, Note, campos e e-mails seguem, mas a etapa não. A comparação ignora a ordem das chaves (o snapshot do evento vem na ordem gravada pelo site; a releitura, em ordem alfabética).
- **Níveis de assistência sob demanda**: a primeira cotação continua só com 200 km. Ao clicar em "500 km" ou "Sem assistência", o site cota aquele nível (`contrato.planoAssistencia` 2 ou 0), mostra os planos e junta as ofertas em `suhaiCotacao.ofertas`, cada uma com o seu `protocolo`. Voltar a um nível já cotado não gera nova consulta. Falha num nível extra mostra "Tentar de novo" e não vira "cálculo manual" no CRM. O plano escolhido leva o protocolo do seu nível para `cNumeroCotacao`, para a Note e para a proposta.

Validação local (2026-10-16, gateway em homologação, Espo DEV, celular `11 97668-7668`): cotações 532162 (200 km), 532163 (500 km) e 532164 (sem assistência) no mesmo lead; uma só Oportunidade, funil em "Cotação Suhai apresentada" e depois "Plano escolhido" com `cNumeroCotacao` 532163 e "Essencial — assistência 500 km (cd 1023)". Cada nível consultado gera uma Note e um e-mail próprios; o WhatsApp de cotação pronta sai uma vez.

### 7.6 Produção com proposta real (2026-10-16, Fase 3)

Antes do teste, os Leads e Oportunidades do celular e do e-mail de teste foram excluídos do Espo PROD pela sessão de administrador, com backup local (não versionado). Ficaram de fora as Oportunidades de clientes que têm o celular da corretora em `cCelular`: a busca por celular no Espo PROD devolve clientes reais e não pode ser usada como critério de exclusão.

Teste em `www.segurosimediato.com.br/cotacao-suhai` com veículo próprio (Nissan March SV 1.6 2016) e os dados reais do proponente. Lead `ld_cb889ecb2f88`:

| Etapa | Resultado |
|---|---|
| Celular, placa e CEP | Lead e Oportunidade criados uma vez. O `initial` terminou depois dos dois `progress` (corrida real) e não duplicou a Oportunidade nem voltou o funil |
| Cotação | 200 km nº 225513936; "Sem assistência" nº 225513983 e "500 km" nº 225514006 cotados ao clicar. 9 ofertas no RTDB, uma Note por nível |
| Plano | Completo — assistência 500 km (cd 1029), R$ 2.386,35 no ano, franquia R$ 6.140,00; `cNumeroCotacao` 225514006 |
| Proposta | Transmitida, nº 12350578, boleto em 12x, vencimento dia 10. `cEtapaFunil` "Proposta transmitida", `cNumeroProposta`, `cPagamento` e Task "Emitir apólice Suhai e enviar boleto" atribuída ao responsável de tarefas |
| WhatsApp | `primeira_etapa`, `suhai_cotacao_pronta` e `suhai_proposta_enviada` |
| E-mail da equipe | Um por etapa (8), sem o prefixo `[HOMOLOGAÇÃO]` |

`deliverLead` entregou as 8 etapas sem falha. Achado: a caixa de aceite da proposta dizia "Confirmo o envio desta proposta em homologação" (`components/suhai/PropostaSuhaiForm.tsx`); o texto foi corrigido em seguida. A proposta de teste é cancelada à mão no Portal do Cotador: o gateway não tem operação de cancelamento.

Testes unitários das regras da CF: `npm run test:functions` (`firebase/functions/test/`).

---

## 8. Arquivos-chave

| Papel | Caminho |
|---|---|
| Formulário (4 etapas, celular primeiro) | `components/suhai/CotacaoSuhaiForm.tsx` |
| Ofertas e escolha do plano | `components/suhai/CotacaoSuhaiExperiencia.tsx` |
| Proposta | `components/suhai/PropostaSuhaiForm.tsx` |
| Rotas | `app/api/lead/route.ts`, `app/api/suhai/cotacao/route.ts`, `app/api/suhai/proposta/route.ts` |
| Gravação server-side das etapas | `lib/leads/suhai-etapas.ts` |
| Contrato | `lib/leads/types.ts`, `lib/leads/firebase-backup.ts` |
| Regras Suhai da CF (funções puras) | `firebase/functions/suhai.js` |
| Entrega | `firebase/functions/index.js`, `espocrm.js`, `email-notification.js` |
| Inventário Espo | `scripts/espo-ops/fase0-suhai-fields.mjs` |
