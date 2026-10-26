# Fase B — Cotação Suhai real junto com o RPA (Lote 4 do funil v2)

Plano de 25/10/2026. Substitui o Lote 4 do plano do funil v2, que previa a Suhai "só simulada, até a Suhai liberar produção".

## 1. O que mudou desde o plano original

- A Suhai liberou cotação e proposta em produção. O `suhai-gateway` em produção (tag `producao`) cota e transmite de verdade; a proposta 12350578 (16/10) foi a primeira.
- Na Vercel, `SUHAI_GATEWAY_URL` já está em Production (e nas previews `uat-suhai` e `uat-marca-suhai`). A página `/cotacao-suhai` já cota de verdade em produção. A branch do funil (`uat-funil-etapa3`) não tem a variável.
- A Suhai só cobra depois da apólice emitida, e o boleto vem da pós-venda. O acompanhamento automático da proposta está na branch `suhai-acompanhamento` ([`UAT_SUHAI_ACOMPANHAMENTO.md`](UAT_SUHAI_ACOMPANHAMENTO.md)).

O Lote 4 deixa de ser "Suhai simulada no UAT" e passa a ser **Suhai real no cálculo de carro do funil**, com a mesma trava de hoje.

## 2. Objetivo

No funil de leads, quando o cliente escolhe esperar o cálculo, o site cota na Suhai em paralelo ao RPA e mostra tudo numa lista só. A Suhai nunca atrasa nem derruba o RPA: se falhar, some.

Fora do escopo: cartão de crédito (aguarda o Fábio), proposta automática a partir do funil, moto e caminhão.

## 3. Onde encaixa no código

| Peça | Hoje | Mudança |
|---|---|---|
| Disparo | `handleChooseWaitForRpa` em `components/lead/LeadForm.tsx`: `POST /api/lead` (`stage: "complete"`), lê `perfilRpa` e chama `rpa.start(...)` | Logo depois de ler `perfilRpa`, disparar a cotação Suhai sem `await` no caminho do RPA |
| Rota | `POST /api/suhai/cotacao` (`app/api/suhai/cotacao/route.ts`), schema `cotacaoInputSchema` em `lib/suhai/types.ts` | Aceitar `origem: "funil"`; nesse caso não troca a etapa nem o canal do lead (ver 3.4) |
| Perfil | `perfilRpa` vem da PH3A em `DD/MM/AAAA` e texto ("Solteiro"); a conversão para a Suhai está em `lib/suhai/perfil.ts`, presa a `/api/suhai/perfil` | Expor a conversão como função pura e usá-la no servidor, a partir do `perfilRpa` já gravado no lead |
| Veículo | O funil tem marca/modelo/ano do Placa Fipe, sem `codFipe` e sem a grafia da FIPE Suhai | Resolver pela placa no servidor (mesma lógica de `/api/suhai/veiculo`) |
| Tela | `RpaCalculationScreen.tsx` mostra `OfertaCard` só no `success` do RPA | Receber as ofertas Suhai como prop e montar a lista única (ver 3.3) |
| Cartão | `lib/quote/oferta.ts` já converte RPA (`fromRpaPlano`) e Suhai (`fromSuhaiOferta`); `seguradora` existe no tipo mas ninguém preenche | Preencher `seguradora`; alinhar a forma do preço |

### 3.1 Dados da cotação

A Suhai exige dados que o funil não pergunta. Na primeira versão, **sem pergunta nova**:

| Dado | Fonte |
|---|---|
| Sexo, nascimento, estado civil | `perfilRpa` (PH3A). Sem perfil completo, a Suhai é pulada |
| Condutor principal | O próprio proponente |
| CEP de pernoite | CEP do funil |
| Veículo | Placa → FIPE Suhai. Mais de uma versão possível e nenhuma bate com o ano: pula |
| Uso, garagem, bônus | Premissas da `/cotacao-suhai`: uso particular, garagem em casa (trabalho e escola não), bônus 0, seguro novo |
| Assistência | Só o nível padrão (uma cotação; cada nível extra é outra cotação na Suhai) |

As premissas aparecem no cartão ("Preço para uso particular, com garagem em casa e sem bônus") e na Note do CRM. O consultor confirma com o cliente antes da proposta.

Cada pulo é registrado com o motivo (`sem_perfil`, `versao_ambigua`, `nao_carro`, `erro_suhai`, `timeout`). Se `sem_perfil` passar de ~30% no UAT, entra a mini-etapa opcional "Incluir a cotação Suhai" com 3 perguntas (sexo, nascimento, estado civil), num lote seguinte.

### 3.2 Tempo

- O RPA leva minutos (polling de 2 s, até 10 min). A Suhai tem timeout de 30 s no site e 45 s no gateway.
- A chamada Suhai corre no servidor, disparada pelo navegador sem bloquear o RPA. Resultado ou falha voltam para a tela; nada espera a Suhai.
- A latência real da cotação ainda não foi medida: medir no UAT (p50/p95) e registrar aqui.

### 3.3 Lista única de ofertas

- **Quando mostrar:** junto com o resultado do RPA, numa lista só. Se o RPA falhar e a Suhai tiver respondido, a tela mostra a Suhai em vez de "Vamos calcular manualmente", com o aviso de que o consultor traz as outras seguradoras.
- **Preço:** o RPA é anual. Os cartões Suhai passam a mostrar o anual como valor principal e o parcelado na legenda ("ou até 12x de R$ X"), para comparar igual com igual.
- **Quantos cartões Suhai:** só o plano em destaque ("Completo"), com um link "ver outros planos da Suhai" para a `/cotacao-suhai` com o lead. Evita uma lista longa.
- **Selo:** um selo só por lista, no recomendado do RPA. O cartão Suhai sai sem selo.
- **Seguradora:** `seguradora` preenchido nos dois conversores.

### 3.4 CRM e WhatsApp

Hoje `registrarCotacaoSuhai` grava `stage: "suhai_quote"` e `captureChannel: "suhai_form"`. No funil, isso transformaria o lead RPA num lead Suhai: troca a etapa, sobrescreve `cValorRecomendado`/`cValorAlternativo` e dispara o WhatsApp `suhai_cotacao_pronta`. Com `origem: "funil"`:

- grava só `data/suhaiParalelo` (premissas, protocolo, ofertas, ambiente, `simulado`), sem mexer em `stage`, `captureChannel` nem nos campos de valor;
- a `deliverLead` posta **uma** Note "Cotação Suhai junto com o cálculo" (com o prefixo `[HOMOLOGAÇÃO]` quando for o caso), com flag própria para não repetir;
- não manda o WhatsApp `suhai_cotacao_pronta`: o cliente já está vendo o preço na tela;
- se o cliente clicar no cartão Suhai, o WhatsApp do consultor vai com o plano e o protocolo, e a proposta segue pela `/cotacao-suhai` ou pelo Portal do Cotador.

### 3.5 Analytics

- Evento `offer_list_view` com `offer_sources` (`rpa`, `suhai` ou os dois).
- Evento `offer_select` com `offer_source` e o id do cartão.
- Motivo do pulo da Suhai em `suhai_parallel_skip`.

### 3.6 Trava e desligamento

- A Suhai só aparece com `SUHAI_GATEWAY_URL` definido **e** resposta `simulado: false`. O mock nunca chega ao público.
- Uma variável própria, `SUHAI_PARALELO_ENABLED` (servidor), liga a Fase B. Desligar é mudar a variável e republicar, sem reverter código.

## 4. Volume e custo

Cada cálculo de carro no funil passa a gerar uma cotação na Suhai, com protocolo no Cotador, mais uma consulta de veículo. Antes de ligar em produção:

- medir no UAT e na primeira semana: cotações por dia, taxa de pulo e latência;
- **perguntar ao Fábio** se há limite de cotações por corretora, e se muitas cotações sem proposta pesam na avaliação comercial;
- conferir se o aviso de privacidade cobre o envio do CPF e do perfil à Suhai para cotação (o cliente pediu cálculo de seguro, mas a Suhai passa a receber os dados sem ele escolher a Suhai).

## 5. Etapas

| # | Etapa | Onde | Com "pode"? |
|---|---|---|---|
| B0 | Respostas do Fábio (volume) e conferência do aviso de privacidade | — | — |
| B1 | Servidor: `origem: "funil"` na rota, perfil e veículo resolvidos no servidor, `suhaiParalelo` no RTDB, Note na `deliverLead`; testes | branch nova a partir de `main` depois dos Lotes 1 e do acompanhamento | — |
| B2 | Tela: disparo no `LeadForm`, lista única no `RpaCalculationScreen`, cartão com anual, analytics | mesma branch | — |
| B3 | UAT em preview com `SUHAI_GATEWAY_URL` apontando para a tag `homologacao` (preços fictícios, fluxo real) e `SUHAI_PARALELO_ENABLED=1` | preview | Variável na preview: não é produção |
| B4 | Deploy da `deliverLead` com a Note paralela | Firebase | Sim |
| B5 | Merge e `SUHAI_PARALELO_ENABLED=1` em Production, primeiro em horário comercial, acompanhando as métricas | Vercel | Sim |

### Casos do UAT (B3)

1. Perfil completo e placa com uma versão: Suhai na lista junto com o RPA; Note única no Espo; nenhum WhatsApp `suhai_cotacao_pronta`.
2. Sem perfil (PH3A sem retorno): RPA normal, Suhai pulada com `sem_perfil`.
3. Suhai com erro ou timeout: RPA intacto, sem mensagem de erro para o cliente.
4. RPA com erro e Suhai ok: tela mostra a Suhai em vez de "calcular manualmente".
5. Mesmo telefone de novo em 24 h (`lead_dedupe`): reaproveita a cotação gravada, sem nova chamada à Suhai.
6. Clique no cartão Suhai: WhatsApp do consultor com plano e protocolo; `offer_select` com `offer_source: suhai`.
7. Lead continua com etapa e canal do RPA no Espo (`cSeguradora` e valores do RPA intactos).
8. Contagem de chamadas por cálculo: uma cotação e uma consulta de veículo.

## 6. Decisões em aberto

- Mostrar a Suhai enquanto o RPA ainda calcula? (Proposta acima: não; só na lista final ou no lugar do erro do RPA.)
- Um cartão Suhai ou os três planos?
- Mini-etapa de perfil já na primeira versão ou só se `sem_perfil` passar de ~30%?
