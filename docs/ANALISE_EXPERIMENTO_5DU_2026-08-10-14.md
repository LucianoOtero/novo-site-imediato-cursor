# Análise do experimento — 10 a 14/08/2026 (5 dias úteis)

**Status:** FINAL para a janela analisada  
**Gerado em:** 2026-08-16  
**Conta Ads:** `994-791-8772`  
**Controle:** campanha `21287198336` (site legado)  
**Exp:** campanha `24095000558` (`novo.segurosimediato.com.br`)  
**Operação:** somente leitura. Nenhuma campanha, anúncio, GTM, GA4 ou ambiente foi alterado.

---

## 1. Resumo executivo

**Veredito:** os dados favorecem o site novo, com sinais fortes de maior qualidade de visita e maior geração de leads reais por clique. Ainda não é prudente encerrar o experimento, porque o braço Exp recebeu somente 24% do custo observado, a janela tem cinco dias e as definições de conversão Ads não são idênticas entre os braços.

Principais evidências:

- **Google Ads agregado:** Exp com CVR de **25,12%**, contra **19,95%** no Controle (**+25,9%**), e CPA de **R$ 16,00**, contra **R$ 20,90** (**−23,5%**). A diferença agregada ainda não alcança significância estatística convencional (`p≈0,109`).
- **Ground truth Firebase por clique identificado:** Exp com **40 leads / 215 cliques = 18,60%**, contra **46 gclids únicos / 649 cliques = 7,09%** no Controle. O ganho estimado é de **+162,5%** e o custo por lead identificado cai de **R$ 58,85 para R$ 21,60 (−63,3%)**. O teste de duas proporções dá `p≈0,000001`, mas as arquiteturas Firebase são diferentes; o resultado deve ser tratado como evidência forte, não como certificação contábil.
- **GA4, tráfego das campanhas nos domínios canônicos:** taxa de engajamento de **44,72%** no site novo contra **11,58%** no legado; duração média de **62,5 s** contra **26,1 s**.
- **Conversão offline secundária:** Exp registrou **5** contra **4** no Controle, apesar de ter só 215 contra 649 cliques. A amostra é pequena, mas é um sinal de qualidade comercial relevante.
- **Tendência diária:** depois de um primeiro dia pior, o Exp teve CPA melhor nos quatro dias seguintes; em 12–14/08 a vantagem diária de CPA ficou entre **−30% e −44%**.
- **Saúde operacional:** 21/21 RSAs do Exp aprovados, zero reprovados; Auto elegível; Firebase do site novo entregou **40/40 ao EspoCRM** e **39/40 ao Octadesk**.

**Recomendação:** manter o teste ativo e sem alterações por mais cinco dias úteis (ou até o Exp alcançar ao menos ~400 cliques), corrigir apenas a observabilidade GA4 em uma etapa controlada e decidir com base em leads únicos + conversões offline, não na soma bruta das ações Ads.

---

## 2. Pré-flight e integridade do experimento

### Serving e aprovação

- Controle e Exp: `ENABLED`.
- Grupo Auto em ambos: `ELIGIBLE`.
- Campanhas aparecem como `LIMITED` somente por `MISSING_LEAD_FORM_EXTENSION`. Isso não é reprovação dos anúncios nem o antigo aviso de identidade/veiculação limitada.
- Exp: **21 APPROVED**, **0 DISAPPROVED**, 14 anúncios habilitados; os demais pertencem a anúncios ou grupos pausados.
- Experimento `10061298880`: `ENABLED`, de 03/08 a 27/09/2026.
- Split nominal confirmado via `experiment_arm`: **50% Controle / 50% Exp**.

### Split efetivamente observado

| Base | Controle | Exp | Share Exp |
|---|---:|---:|---:|
| Impressões | 10.437 | 3.809 | 26,7% |
| Cliques | 649 | 215 | 24,9% |
| Custo | R$ 2.707,15 | R$ 864,07 | 24,2% |

O split de tráfego do Ads não garante igualdade de impressões, cliques ou gasto. Ainda assim, a distância entre o split nominal (50%) e o volume observado (24–27%) é material. O Exp ficou entre **22,1% e 28,2% do custo diário**, sem convergir a 50% nessa janela. A leitura de resultado deve, portanto, usar taxas e CPA, nunca volume absoluto.

---

## 3. Google Ads — desempenho agregado

| Indicador | Controle | Exp | Variação Exp |
|---|---:|---:|---:|
| Impressões | 10.437 | 3.809 | −63,5% |
| Cliques | 649 | 215 | −66,9% |
| CTR | 6,22% | 5,64% | −9,2% |
| Custo | R$ 2.707,15 | R$ 864,07 | −68,1% |
| CPC médio | R$ 4,17 | R$ 4,02 | −3,7% |
| Conversões primárias | 129,5 | 54,0 | −58,3% |
| CVR por clique | 19,95% | 25,12% | **+25,9%** |
| CPA | R$ 20,90 | R$ 16,00 | **−23,5%** |

Leitura estatística:

- CTR: diferença não significativa (`p≈0,204`).
- CVR agregado: favorável ao Exp, mas ainda inconclusivo (`p≈0,109`).
- O CPC praticamente igual indica que a melhora de CPA vem principalmente da conversão pós-clique, não de tráfego mais barato.

### Evolução diária

| Data | CTR Ctrl | CTR Exp | CVR Ctrl | CVR Exp | CPA Ctrl | CPA Exp | Δ CPA Exp |
|---|---:|---:|---:|---:|---:|---:|---:|
| 10/08 | 5,25% | 5,23% | 21,90% | 18,18% | R$ 19,20 | R$ 21,71 | +13,1% |
| 11/08 | 6,59% | 4,52% | 20,41% | 22,50% | R$ 18,62 | R$ 17,64 | −5,3% |
| 12/08 | 6,49% | 6,44% | 15,63% | 22,50% | R$ 26,89 | R$ 18,79 | −30,1% |
| 13/08 | 7,09% | 6,22% | 20,86% | 33,33% | R$ 21,32 | R$ 11,96 | −43,9% |
| 14/08 | 5,71% | 6,23% | 21,15% | 28,26% | R$ 20,03 | R$ 14,08 | −29,7% |

O ganho aparece de forma consistente nos últimos quatro dias, e não apenas em um pico isolado. A forte melhora em 13–14/08 pode sofrer pequeno ajuste por atraso de atribuição.

---

## 4. Conversões Ads por ação

| Ação primária | Controle | Exp | Taxa Ctrl | Taxa Exp | CPA Ctrl | CPA Exp |
|---|---:|---:|---:|---:|---:|---:|
| Formulário | 59,17 | 42,50 | 9,12% | 19,77% | R$ 45,75 | R$ 20,33 |
| Telefone no modal WhatsApp | 70,33 | 11,50 | 10,84% | 5,35% | R$ 38,49 | R$ 75,14 |

Interpretação:

1. **Formulário não é comparação simétrica.** No Exp a conversão Ads ocorre em `form_initial_contact` (passo inicial); no legado a ação histórica representa um estágio diferente. O aparente ganho de +116,8% não pode ser atribuído apenas ao design.
2. **Modal WhatsApp é mais comparável** e ficou pior no Exp: −50,6% na taxa (`p≈0,017`). Isso sugere mudança de preferência para o formulário, menor necessidade do modal ou uma fricção específica do WhatsApp. Não invalida o resultado total, mas precisa ser monitorado.
3. A ação secundária de telefone teve **1 all-conversion no Controle e 0 no Exp**; volume insuficiente.
4. `SegurosImediatoOffline` teve **4 all-conversions no Controle e 5 no Exp**. Em taxa por clique, 0,62% versus 2,33%; amostra muito pequena, porém comercialmente promissora.

Somar formulário + WhatsApp como se fossem leads únicos superestima o funil. O usuário pode disparar mais de uma ação, há atribuição fracionada e as etapas diferem. Por isso, o Firebase e as conversões offline devem ser o critério principal.

---

## 5. GA4 e GTM — triangulação

### GA4 filtrado por `sessionCampaignId` e hostname canônico

| Indicador | Controle no legado | Exp no site novo | Variação Exp |
|---|---:|---:|---:|
| Sessões | 501 | 123 | — |
| Usuários | 488 | 114 | — |
| Sessões engajadas | 58 | 55 | — |
| Taxa de engajamento | 11,58% | 44,72% | **+286,2%** |
| Duração média | 26,1 s | 62,5 s | **+139,0%** |

O Exp quase igualou o Controle em sessões engajadas (55 vs 58) usando apenas cerca de um quarto do volume.

### Contaminação entre domínios

- 34 sessões atribuídas à campanha Exp apareceram em `www.segurosimediato.com.br` (21,7% das 157 sessões GA4 atribuídas ao Exp).
- 4 sessões do Controle apareceram no domínio novo.
- Não há sitelinks vinculados à campanha ou aos grupos do Exp; os 21 anúncios usam apenas `novo.segurosimediato.com.br`.

As sessões cruzadas podem vir de navegação entre propriedades, retorno do usuário ou persistência de atribuição. Para preservar o contraste do teste, acompanhar essa parcela; não há evidência de URL final errada nos RSAs.

### GTM Live v47

A versão publicada foi confirmada via Tag Manager API:

- hostnames aceitos: `comparaseguroonline.com.br|novo.segurosimediato.com.br`;
- Ads `form_initial_contact`: ativo;
- GA4 `form_quote_choice`: ativo;
- GA4 `whatsapp_modal_submit`: ativo;
- GA4 `whatsapp_modal_dismiss`: ativo;
- tags Ads antigas de `form_quote_choice`/WhatsApp/telefone: pausadas, conforme migração para o evento inicial.

**Lacuna de observabilidade:** não existe tag GA4 para `form_initial_contact`. Assim, o GA4 não consegue confrontar diretamente as 42,5 conversões de formulário registradas no Ads. Isso explica a ausência do evento na extração; não é falha do formulário nem do Ads.

---

## 6. Firebase — leads reais e entrega

### Exp — `imediato-seguros-site-novo`

- **40 leads Ads**, todos com gclid.
- Por dia: **5 → 6 → 6 → 12 → 11**.
- Canais: 32 `lead_form` e 8 `contact_modal`.
- Ramos: 25 auto, 12 moto, 2 uber, 1 utilitário.
- Estágios: 12 complete, 14 progress, 8 rpa_result, 5 initial, 1 consultant_requested.
- Entrega: **40/40 EspoCRM** e **39/40 Octadesk**.

### Controle — `leads-imediato-seguros`

O legado grava mais de um registro/estágio por contato. Na janela foram encontrados:

- 109 registros atribuídos à campanha Controle;
- **46 gclids únicos**, usados como aproximação read-only de leads/visitas Ads únicas;
- fontes: 45 initial, 35 complete e 29 modal.

### Comparação normalizada

| Ground truth | Controle | Exp | Variação Exp |
|---|---:|---:|---:|
| Cliques Ads | 649 | 215 | — |
| Identificadores únicos/leads com gclid | 46 | 40 | — |
| Taxa por clique | 7,09% | 18,60% | **+162,5%** |
| Custo por identificador/lead | R$ 58,85 | R$ 21,60 | **−63,3%** |

Intervalos Wilson de 95% para a taxa: Controle **5,36%–9,33%**; Exp **13,97%–24,34%**. A separação é grande e consistente com o GA4, mas existe uma ressalva metodológica: no legado usa-se gclid único entre registros multiestágio; no site novo usa-se um registro de lead por chave.

---

## 7. Vieses e limitações

1. Janela curta: cinco dias úteis e 215 cliques no Exp.
2. Split nominal 50/50, mas share efetivo de custo de apenas 24,2% para o Exp.
3. Definições de conversão de formulário diferentes entre os braços.
4. Atribuição fracionada e atraso de conversão no Ads.
5. Firebase legado e novo têm schemas e granularidades diferentes.
6. Conversão offline tem só nove ocorrências no total e pode amadurecer após a janela.
7. 21,7% das sessões GA4 atribuídas à campanha Exp ocorreram no hostname legado.
8. GA4 não registra `form_initial_contact`, impedindo validação independente desse evento.

---

## 8. Recomendação operacional

1. **Manter o experimento ativo e sem mudanças por mais cinco dias úteis**, evitando reiniciar aprendizagem ou misturar alterações de página com a medição.
2. Reavaliar quando o Exp atingir pelo menos **~400 cliques** e as conversões offline da janela estiverem maduras.
3. Usar como placar principal: **leads únicos com gclid, CPA por lead único e conversão offline**. Usar `metrics.conversions` agregado apenas como apoio.
4. Criar, em publicação separada e validada, uma tag GA4 `form_initial_contact` para observabilidade — sem alterar a ação Ads nem o legado.
5. Investigar a origem das sessões da campanha Exp no hostname legado, embora não existam URLs finais ou sitelinks errados no braço Exp.
6. Acompanhar o canal WhatsApp: a queda é estatisticamente detectável nesta janela e pode representar migração de preferência para o formulário ou fricção real.

**Decisão atual:** evidência suficiente para **continuar** o experimento; evidência ainda insuficiente para promovê-lo definitivamente. Se a vantagem de leads únicos, engajamento e offline persistir na próxima janela, o site novo passa a ser o candidato claro a vencedor.

---

## 9. Artefatos reproduzíveis

- `scripts/google-ops/ads-analyze-5bd-2026-08-10-14.mjs`
- `scripts/google-ops/ads-analysis-5bd-2026-08-10-14.json`
- `scripts/google-ops/ga4-analyze-5bd-2026-08-10-14.mjs`
- `scripts/google-ops/ga4-analysis-5bd-2026-08-10-14.json`
- `scripts/google-ops/gtm-audit-live-readonly.mjs`
- `scripts/google-ops/leads-analysis-5bd-2026-08-10-14.json`
- `scripts/google-ops/legacy-leads-analysis-5bd-2026-08-10-14.json`

Todos os JSONs são agregados e não contêm PII.
