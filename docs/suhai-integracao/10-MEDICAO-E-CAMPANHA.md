# Medição da Suhai e campanha no Google Ads

**Status:** em produção desde 03/11/2026 (site com [PR #18](https://github.com/LucianoOtero/novo-site-imediato-cursor/pull/18), GTM v54, GA4 e meta da campanha).

A jornada Suhai roda em dois braços do experimento: `subdominio` (`suhai.segurosimediato.com.br`) e `site` (`www.segurosimediato.com.br/cotacao-suhai`). Todo evento `suhai_*` leva `form_id: "cotacao_suhai"` e `arm` (`lib/suhai/analytics.ts`, `bracoSuhai()`).

---

## 1. Site

- `trackSuhai` manda cada evento com todas as chaves de parâmetro Suhai, as que não se aplicam como `undefined`. O GTM guarda o último valor de cada chave, então sem isso um `result` ou `user_data` de um evento anterior vazaria para o seguinte.
- `suhai_proposal_sent` leva `transaction_id` (número da proposta, ou protocolo) e `user_data` com celular (E.164) e e-mail com hash SHA-256. O hash espera no máximo 300 ms (`userDataComPrazo`); sem consentimento de marketing, o evento sai sem `user_data`.
- O contato inicial da Suhai é o `form_initial_contact` com `method: "suhai"`.

Eventos: `suhai_quote_start`, `suhai_quote_step`, `suhai_field_error`, `suhai_vehicle_lookup`, `suhai_no_plate`, `suhai_profile_lookup`, `suhai_quote_result`, `suhai_quote_price`, `suhai_quote_abandon`, `suhai_assist_change`, `suhai_plan_select`, `suhai_proposal_start`, `suhai_proposal_result`, `suhai_offer_abandon`, `suhai_proposal_sent` (tipos em `lib/analytics.ts`).

## 2. GTM (GTM-PD6J398, versão 54 "Suhai - medição completa (GA4 + Ads)")

| Item | O que faz |
|---|---|
| `[NovoSite] GA4 - suhai_* (todos)` | Uma tag GA4 para todo evento `^suhai_`, nome `{{Event}}` e os parâmetros da tabela da seção 3. Substituiu as três tags por evento da v53. |
| `[NovoSite] Ads - Suhai - Contato inicial` | `form_initial_contact` com `method = suhai`. |
| `[NovoSite] Ads - Suhai - Preço exibido` | `suhai_quote_price`. |
| `[NovoSite] Ads - Suhai - Proposta enviada` | `suhai_proposal_sent`, R$ 120, `orderId` = `transaction_id`. |
| `JS - user_data conversoes otimizadas` | Devolve `sha256_phone_number` e, quando houver, `sha256_email_address`. |

As três tags do Ads usam a variável "Dados fornecidos pelo usuário" (conversões otimizadas). Os acionadores filtram o hostname do site novo e do subdomínio Suhai. A tag compartilhada `[NovoSite] Ads - form initial contact` continua disparando no contato da Suhai.

Rollback: republicar a v53.

## 3. GA4 (propriedade 281067607)

- Dimensões de evento: `arm`, `field`, `result`, `plan`, `assist`, `premium_band`, `stage`, `level`, `http_status`, `slow`, `recalc`, `simulated` (além de `form_id`, `step`, `reason` e `last_step`, que já existiam).
- Métrica: `duration_ms` (milissegundos).
- Eventos-chave: `suhai_quote_price` e `suhai_proposal_sent`.

Os dados dessas dimensões começam em 03/11/2026. Relatório por braço: `node scripts/google-ops/ga4-suhai-funil.mjs --days 7`.

Rollback: arquivar as dimensões e desmarcar os eventos-chave.

## 4. Google Ads (conta 9947918772)

Ações de conversão, todas secundárias (`primaryForGoal: false`), uma por clique, janela de 30 dias, atribuição baseada em dados:

| Ação | ID | Categoria | Valor |
|---|---|---|---|
| Suhai - Contato inicial | 7888572902 | Envio de formulário de lead | R$ 10 |
| Suhai - Preço exibido | 7888572905 | Solicitação de cotação | sem valor |
| Suhai - Proposta enviada | 7888572908 | Início de checkout | R$ 120 |

Secundárias para não entrarem nas metas da conta nem mexerem nas campanhas da Porto.

Campanha `ATIVA - Suhai Cotacao - Site Novo` (24433459330): lance pela meta personalizada **Suhai - Lance** (6459768828), com Suhai - Contato inicial, Suhai - Proposta enviada e `SegurosImediatoOffline` (venda importada). O "Preço exibido" fica só para observação. As metas por categoria da campanha ficam fora do lance (desde 04/11): sem isso, "Envio de Formulário de Lead na Página" contava junto com o "Suhai - Contato inicial" e cada contato valia duas conversões.

Negativas de atendimento ao segurado ficam em `campaignNegatives` na spec da campanha. As de 04/11 vieram dos termos de pesquisa do 1º dia.

Rollback:

- Meta: `node ads-suhai-custom-goal.mjs --remove` (a campanha volta às metas por categoria, envio de lead e compra, com lance).
- Negativas: `node ads-campaign-negatives.mjs --campaign-id=24433459330 --add="<frases>" --remove --apply`.
- Ações: `node ads-suhai-conversion-actions.mjs --remove`.

Conferência: `node ads-verify-campaign.mjs --campaign-id=24433459330` mostra a meta em uso e as ações dela.

## 5. Scripts (`scripts/google-ops`)

| Script | Uso |
|---|---|
| `ads-suhai-conversion-actions.mjs` | Cria ou remove as três ações; sem `--apply` só relata. |
| `ads-suhai-custom-goal.mjs` | Cria a meta, liga na campanha e tira do lance as metas por categoria; `--remove` desfaz. |
| `ads-campaign-negatives.mjs` | Frases negativas numa campanha existente, sem bloquear palavra-chave positiva; `--remove` desfaz. |
| `ads-campaign-dia.mjs` | Dia a dia da campanha: custo, parcela de impressões, grupos, termos e conversões por ação. |
| `ga4-ensure-suhai-dimensions.mjs` | Dimensões, métrica e eventos-chave. |
| `gtm-suhai-medicao-completa.mjs` | Workspace com as tags; `--publish` cria a versão e publica. |
| `gtm-suhai-preview.mjs` | Compila o workspace e grava em `logs/` a URL do `gtm.js` de preview. |
| `gtm-dump-ads-tags.mjs` | Lista as tags do Ads da versão Live. |
| `ga4-suhai-funil.mjs` | Funil por braço, resultados, erros de campo, abandono e planos. |
| `ga4-conversoes-por-host.mjs` | Eventos de conversão por domínio; `--todos` lista todos os eventos. |

## 6. Conversões otimizadas (Diagnóstico do Ads)

As três ações Suhai têm conversões otimizadas ligadas pelo GTM, mas o Diagnóstico só lista ações principais; como são secundárias, a cobertura delas não aparece. Em 05/11 o painel mostrava 1% em "Envio de Formulário de Lead na Página" e 3% no modal do WhatsApp, com o gráfico parado em 03/11 (dia da 0.2.58). O site antigo não tem mais tráfego (`ga4-conversoes-por-host.mjs`), então essas conversões vêm do site novo, que manda o celular com hash desde 03/11, salvo recusa de marketing no banner. O alerta urgente das importações é tratado em [`ADS_OFFLINE_VENDIDO_FIREBASE.md`](../ADS_OFFLINE_VENDIDO_FIREBASE.md) §10.

Teste de 05/11, com a rede da aba bloqueada para nada chegar ao Google: `form_initial_contact`, `whatsapp_modal_initial_contact` e o contato Suhai geram hits com `em=tv.1~pn.<hash>` nos rótulos do formulário, do modal e da Suhai. O contato Suhai também dispara o rótulo genérico do formulário, como previsto; a campanha Suhai só lança pela meta "Suhai - Lance".
