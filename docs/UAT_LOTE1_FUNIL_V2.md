# UAT — Lote 1 do projeto funil v2

Telefone em campo único, deduplicação durável no site e reaproveitamento da Oportunidade aberta na Cloud Function.

- **Commits em teste:** `f4e1e57` (campo único), `35a1b6a` (dedupe no RTDB, `leadId` na sessão, idempotência), `fc9d453` (Opp reaproveitada em até `oppReuseDays`), mais as correções achadas no UAT: `60107d9` (fila do `LeadForm`) e `6dc9afd` (idempotência de 10 min).
- **Ambiente:** build de produção da branch `uat-funil-etapa3` servido localmente (`next start`) com o `.env.local` de staging. É a mesma configuração do preview da Vercel (`NEXT_PUBLIC_APP_ENV=staging`): o RTDB de staging recebe os leads, a `deliverLead` publicada (secret `ESPOCRM_API_CONFIG` v6, `oppReuseDays: 7` só no `dev`) entrega no **Espo DEV**, e o Octadesk manda mensagens reais para o telefone de teste.
- **Identidade:** a de `e2e/testes-espocrm.cases.json`. Um e-mail de teste por cenário (`lroteroUATL1A@…` a `lroteroUATL1G@…`).
- **Execução:** 25/10/2026, das 17:42 às 17:49 UTC (14:42 às 14:49 em Brasília). Bloco A antes, no mesmo dia.
- **Ferramentas:** Playwright (Chromium headless, viewport desktop) para as jornadas. `C:\Users\Luciano\wt\_shots-etapa3\uat-lote1-run.mjs` faz as jornadas e as conferências, e o resultado bruto fica em `uat-lote1-result.json`, na mesma pasta. `uat-check.mjs` e `prod-watch.mjs` cuidam da conferência e da vigilância.

## Resumo

| Bloco | Resultado |
|---|---|
| A — campo único | Automatizado: 78/78 em Chrome desktop, Safari iPhone 13 (WebKit) e Chrome Pixel 7. Falta a conferência em aparelho real. |
| B — jornada 1 | Aprovado |
| C — dedupe de 24 h | Aprovado (C1 a C6) |
| D — Opp reaproveitada | Aprovado |
| E — Opp fechada ou antiga | Aprovado (E1 e E2) |
| F — regressão | F2, F3 e F4 aprovados; F1 (RPA) não executado, porque é opcional |
| Produção | Sem leads desde o deploy (domingo), sem avisos ou erros na `deliverLead`, `opp_dedupe/production` vazio |

Duas falhas apareceram e foram corrigidas na branch. Depois da correção, todos os blocos B a E foram refeitos do zero, com o Espo DEV e o staging limpos.

## Defeitos encontrados e corrigidos

1. **Segundo lead quando os passos 2/3 saem antes da resposta do contato inicial** (`60107d9`).
   - **Sintoma:** com nome e e-mail preenchidos logo depois do telefone, o POST `progress` saiu sem `leadId`, 100 ms depois do `initial`. O servidor ainda não tinha o índice gravado, então criou um segundo registro, e a Cloud Function abriu uma segunda Oportunidade no mesmo Lead. No uso real, isso acontece com o preenchimento automático do navegador ou em rede lenta.
   - **Correção:** o `initial` entrou na fila de POSTs do formulário, e o `leadId` passou a ser resolvido na hora do envio. O envio final espera a fila por até 8 s.
   - **Teste de regressão:** `e2e/lead-sessao.spec.ts` ("passo 2 preenchido antes da resposta do contato inicial leva o leadId").
2. **Cache de idempotência respondendo jornadas posteriores** (`6dc9afd`).
   - **Sintoma:** a chave é o SHA-256 do corpo, e o corpo do `initial` é igual entre jornadas do mesmo telefone. Com o cache de 24 h, uma jornada nova recebia o `leadId` antigo sem gravar registro nem disparar a mensagem inicial.
   - **Correção:** cache de 10 min, suficiente para o clique duplo e o reenvio do navegador.

## Bloco A — Campo único de telefone

Spec `e2e/uat-lote1-campo.spec.ts` (`e2e/playwright.uat.config.ts`), commit `c6b7e92`. Cobre:

- os pontos de entrada: `/cotacao`, Home, modal do WhatsApp, modal de telefone do rodapé e `/cotacao-suhai`;
- os itens A1 (máscara), A2 (Backspace), A3 (colar com +55), A4 (autofill sem máscara), A5 (DDD 55), A6 (incompleto não avança) e A7 (`inputmode`/`type=tel`).

| Navegador | Resultado |
|---|---|
| Chrome desktop | 26/26 |
| Safari iPhone 13 (WebKit) | 26/26 |
| Chrome Android (Pixel 7) | 26/26 |

- **Observação A6 no WebKit:** a mensagem de erro aparece e o formulário não avança, mas o cursor não volta ao campo. O site em produção, com o campo DDD antigo, tem o mesmo comportamento, então não é regressão. Esse item é dispensado no WebKit.
- **Pendente (Luciano, aparelho real):**
  - teclado de telefone no iPhone e no Android;
  - colar e autofill de verdade;
  - formulário de proposta Suhai, o 6º ponto, que só aparece depois de "Contratar" numa cotação Suhai.

## Bloco B — Jornada 1

| Caso | Horário (UTC) | Resultado | Evidência |
|---|---|---|---|
| B1 — `/cotacao`, Auto, dados completos, "Prefiro receber depois" | 17:43 | OK | POSTs `initial` 201 → `progress` ×2 → `complete` 201 → `consultant_requested`, todos com o mesmo `leadId`. 1 registro no RTDB (`ld_122a971779d8`, `octadesk_sent=true`). Espo DEV: Lead `6ade3f9f42f78c524`, Opp `6ade3f9f7c23d570a` "Novo Sem Contato", placa preenchida, `cEtapaFunil` "Cálculo manual pendente", `cCanalCaptura` "formulario". `lead_dedupe` aponta para o `leadId` e `opp_dedupe` para a Opp. |

## Bloco C — Mesmo dia

| Caso | Horário (UTC) | Resultado | Evidência |
|---|---|---|---|
| C1 — recarregar, mesmo telefone, até o passo 2 | 17:43 | OK | O `initial` levou o `leadId` da sessão e recebeu o mesmo. Continua 1 registro. |
| C2 — completar com outra placa e outro e-mail | 17:43 | OK | Mesmo registro, mesma Opp `6ade3f9f7c23d570a`, placa trocada na Opp. |
| C3 — contexto novo (sem `sessionStorage`) | 17:43 | OK | O `initial` saiu sem `leadId` e o servidor devolveu o mesmo pelo índice. Continua 1 registro. |
| C4 — modal do WhatsApp em `/seguro-auto` com dados extras | 17:43 | OK | `initial` e `complete` no mesmo `leadId`. Uma única `cotacao_dados_recebidos` no registro. |
| C5 — outro ramo: Moto, botão "Ligar" de `/seguro-moto` | 17:44 | OK | Registro novo `ld_594c48a23764` (moto), Opp nova `6ade3fde85b5e2d14`, `octadesk_sent=true`. Mesmo Lead no Espo, porque a função localiza o Lead pelo telefone. |
| C6 — clique duplo em "Receber cotação" | 17:44 | OK | 1 POST `initial` e 1 evento `form_initial_contact`. |

## Bloco D — "Dia seguinte"

| Caso | Horário (UTC) | Resultado | Evidência |
|---|---|---|---|
| D1 — `lead_dedupe` apagado (e cache local zerado), jornada completa | 17:44 | OK | Registro novo `ld_67583b5db29b`, `octadesk_sent=true`. **Mesma** Opp `6ade3f9f7c23d570a`, etapa comercial mantida em "Novo Sem Contato", placa nova. Flags `espo_opp_reaproveitada` e `espo_note_nova_jornada_sent` gravadas. Nota "Nova jornada do site" no Stream da Opp. Log `[deliverLead/opp-dedupe] … reaproveitando a Opportunity 6ade3f9f7c23d570a` às 17:44:26. `opp_dedupe.at` atualizado. |

## Bloco E — Opp fechada ou antiga

| Caso | Horário (UTC) | Resultado | Evidência |
|---|---|---|---|
| E1 — Opp de B1 movida para "Perdido" pela API do Espo DEV, nova jornada | 17:45 | OK | Opp nova `6ade40172f4b4bf4d` "Novo Sem Contato". A antiga continua em "Perdido", sem reaproveitamento. |
| E2 — `opp_dedupe.at` 8 dias atrás, nova jornada | 17:45 | OK | Opp nova `6ade403323badd70a`, diferente da de E1, sem reaproveitamento. |

## Bloco F — Fluxos vizinhos

| Caso | Horário (UTC) | Resultado | Evidência |
|---|---|---|---|
| F1 — cálculo RPA | — | Não executado | Opcional. Gera cotação de teste na Tô Segurado. |
| F2 — `/cotacao-suhai` simulado até "Contratar" | 17:48 | OK | Aviso de cotação simulada na tela. `/api/suhai/veiculo`, `/perfil` e `/cotacao` responderam 200. Registro `ld_d48558f33740` (`suhai_quote`) com etapas e e-mails Suhai. Nota "COTAÇÃO SUHAI APRESENTADA AO CLIENTE — nº SIM-J7EY7F (SIMULADA…)" no Lead. A Opp aberta de E2 foi reaproveitada, com a nota. A escolha do plano não é enviada com cotação simulada, como previsto em `CotacaoSuhaiExperiencia`. |
| F3 — canal telefone | 17:44 | OK | `cCanalCaptura = telefone` no Lead e na Opp de C5. |
| F4 — eventos | 17:48 | OK | `form_start` 1×, `form_step` 1 e 2, `form_initial_contact` 1×. O `form_field_focus` citado no plano não existe no site, então não foi conferido. |

## Mensagens esperadas no telefone de teste (14:42 às 14:49)

Só o Luciano pode conferir:

- mensagem inicial: 6 (B1, C5, D1, E1, E2 e F2); nenhuma em C1, C2, C3, C4 e C6;
- `cotacao_dados_recebidos`: 2 (C4 e C5);
- `calculo_completo_depois`: 4 (B1, D1, E1 e E2).

## Observações (não bloqueiam o lote)

- **Modal de telefone do rodapé:** o `FooterPhoneLink` abre o modal sem `ramo`, então numa página de Moto o lead entra como Auto. Isso já existia antes do Lote 1. Em C5 usou-se o botão "Ligar" da página, que repassa o ramo.
- **Suhai e formulário Auto compartilham a chave:** a chave telefone + `auto` é a mesma nos dois. Uma cotação Suhai em até 7 dias reaproveita a Opp aberta do formulário, e vice-versa.
- **Ambiente local:** o SafetyMails não resolve DNS na máquina local, e a validação de e-mail segue sem bloquear. No preview e em produção isso não acontece.

## Vigilância de produção

| Horário (UTC) | Leads de produção desde 16:20 | Avisos/erros `deliverLead` | `opp_dedupe/production` | Logs "reaproveitando" em produção |
|---|---|---|---|---|
| 17:21 | 0 | 0 | 0 | 0 |
| 17:49 | 0 | 0 | 0 | 0 |

Domingo, sem tráfego de leads. A vigilância continua nas próximas 24 h. O primeiro lead real de produção deve ter `espocrm_sent` e `octadesk_sent` e gravar `opp_dedupe/production`, sem reaproveitamento.

## Revisão do Espo DEV (agente, a pedido do Luciano, 17:55 UTC)

Feita pela API (`espo-review.mjs`):

- **Criados desde 17:40 UTC:** exatamente **1 Lead** (`6ade3f9f42f78c524`) e **4 Oportunidades**. É o esperado:
  - jornada 1 + C1 a C4 + D1 → `6ade3f9f7c23d570a`;
  - C5 Moto → `6ade3fde85b5e2d14`;
  - E1 → `6ade40172f4b4bf4d`;
  - E2 + F2 → `6ade403323badd70a`.
- **Stream do Lead:**
  - criação;
  - 4 notas "Prospect prefere receber o cálculo completo depois" (B1, D1, E1 e E2);
  - 4 Oportunidades relacionadas;
  - nota da cotação Suhai simulada.
- **Opp `6ade3f9f7c23d570a`:** nota "🔁 Nova jornada do site em 25/10" (D1), placa da jornada D1, etapa "Perdido" vinda do E1.
- **Opp `6ade403323badd70a`:** nota "🔁 Nova jornada do site em 25/10" (F2 reaproveitou a Opp aberta de E2), `cEtapaFunil` "Cotação Suhai apresentada".
- **Octadesk:** os 6 registros têm a mensagem inicial confirmada pela API do Octadesk (`octadesk_sent=true`) e os modelos da lista acima. A chegada no aparelho não foi conferida.

## UAT em aparelho real

- **Endereço sem login (25/10, 14:56):** `https://uat.segurosimediato.com.br` serve a branch `uat-funil-etapa3`, deployment com o commit `c96899f` ou posterior.
- **Proteção desligada:** para abrir sem login, a proteção de previews do projeto Vercel `imediato-seguros` foi desligada: `ssoProtection` era `{"deploymentType":"all_except_custom_domains"}` e agora é `null`. Todos os previews do projeto ficam públicos. **Depois do UAT, religar com esse mesmo valor.**

## Rodapé com o ramo da página e regressão (26/10)

Contra `https://uat.segurosimediato.com.br` (Vercel, staging), roteiro `C:\Users\Luciano\wt\_shots-etapa3\uat-rodape-run.mjs`. D2 e D3 interceptam o `POST /api/lead`; D4 entrega de verdade (RTDB staging, `deliverLead`, Espo DEV e Octadesk).

| Caso | Resultado | Evidência |
|---|---|---|
| D2 — `/seguro-moto`, `/fianca`, `/assistencia-24-horas` | OK | `call_click` com `ramo` igual ao caminho e `location: "footer"`; o `initial` do modal leva o mesmo ramo, `modalChannel: "phone"` |
| D3 — `/`, `/contato`, `/a-imediato` | OK | `call_click` sem ramo; o `initial` leva `ramo: "auto"` |
| D4 — lead pelo modal do rodapé em `/seguro-pet` (1ª rodada, 11:14 UTC) | **Falhou** | O `complete` saiu 163 ms depois do `initial`, sem `leadId`: 2 registros no RTDB e 2 Opps no mesmo Lead do Espo DEV |
| D4 — depois da correção `c8dd378` (11:27 UTC) | OK | `initial` e `complete` com o mesmo `leadId` (`ld_d716c30cff9b`), `ramo: "pet"`; 1 Lead (`6adf39376f1b1fe53`) e 1 Opp (`6adf3937b4dbc3b68`), `cCanalCaptura` "telefone" |

- **Defeito 3, corrigido em `c8dd378`:** a mesma corrida do defeito 1, agora no `ContactLeadModal`. Com nome preenchido logo depois do telefone (autofill ou rede lenta), o envio final saía antes da resposta do `initial`. O envio final passou a esperar o `initial` por até 8 s. Teste de regressão em `e2e/lead-sessao.spec.ts` ("modal do rodapé: envio antes da resposta do contato inicial leva o leadId").
- **Observação, não bloqueia:** o ramo não aparece no Espo (nem campo nem Note). O site manda o ramo como `produto` e o Espo não guarda. Era assim antes do Lote 1; o ramo fica no RTDB.
- **Observação:** logo depois da criação, o Lead mostra `cCanalCaptura` "formulario" por alguns segundos, até o PUT do canal (separado e best-effort) gravar "telefone".
- **Regressão local com a correção** (build de produção em `127.0.0.1:3100`): `etapa3-consultor`, `lead-sessao` e `telefone` 26/26; `uat-lote1-campo` 78/78 (Chrome desktop, iPhone 13 WebKit, Pixel 7). `typecheck` sem erros.
- **Não rodados:** `rpa-fidelidade` (50 casos no RPA) e `testes-espocrm` (23 casos com cálculo no RPA) geram cotações de teste na Tô Segurado e levam horas; ficam para decisão.
- **Limpeza:** Espo DEV e staging do telefone de teste limpos depois de cada rodada do D4.

## Aceite

- [ ] Luciano: Bloco A em aparelho real (iPhone e Android) e no formulário de proposta Suhai.
- [x] Mensagens do Octadesk aceitas pela API (flags da `deliverLead`).
- [x] Espo DEV revisado pelo agente (acima).
- [x] Rodapé D2 a D4 e regressão local depois de `c8dd378` (26/10).
- [x] Limpeza do Espo DEV e do staging (`purge-phone test`, `clean-staging-test`) em 26/10. Repetir depois do aceite no aparelho.
