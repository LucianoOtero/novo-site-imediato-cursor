# Consultoria Claude — Hero + formulário (conversão e atrito)

**Data:** 2026-08-30 (atualizado: 3ª rodada — experimento contaminado + volume)  
**Contexto:** site novo (experimento Ads Exp vs legado), LeadForm multi-passo, captura `initial` no telefone, WhatsApp Octadesk, RPA opcional no passo 4.  
**Premissa do negócio (cliente):** começar pelo telefone é fundamental — contato inicial mesmo que no futuro se prometa não ligar; recuperação via WhatsApp/CRM.

Documento de referência: consultoria externa, confronto com código/produto, 2ª e 3ª rodadas, backlog por custo de reversão.

**Leitura rápida:** §1–3 = 1ª rodada; §4–5 = backlog **atual**; §6 = refs; §7 = 2ª rodada; §8 = conclusão; **§9 = 3ª rodada** (assimetria Ads vs veredito Espo).

---

## 1. Consultoria (Claude) — texto de referência

### Diagnóstico geral

A página está tecnicamente bem construída, mas a promessa está desalinhada com o tráfego. Quem clica num anúncio de Google Ads sobre preço já sabe que quer seguro auto. A hero atual gasta o ativo mais caro da página — o H1 — repetindo a categoria ("Seguro auto") em vez de entregar a promessa que vendeu o clique.

### 1.1 O maior problema: pedir telefone primeiro

Separação das etapas por quantidade de campos, não por custo psicológico. São só 2 campos, mas é o campo mais caro do Brasil: o prospect lê "DDD e celular" e traduz como "lista de corretor + ligação". O micro-compromisso, que deveria ser o degrau mais baixo, virou o mais alto.

Tensão de negócio (não só de copy):

- **Telefone primeiro** maximiza leads recuperáveis (captura quem abandona nas etapas 2 e 3).
- **Telefone por último** maximiza taxa de conclusão do formulário; quem abandona vira zero.

Se a operação depende de recuperação por WhatsApp, manter telefone na etapa 1 — mas a objeção precisa ser respondida explicitamente ali (hoje não é). Nenhuma linha diz o que vai acontecer com aquele número.

Se o volume já for suficiente, testar inversão: placa/carro na etapa 1 (menor risco percebido, sensação de cálculo iniciado, consistência antes do contato).

### 1.2 "A partir de R$ 79,90/mês" — faca de dois gumes

Atrai o clique e pode matar a conversão final: âncora em R$ 79,90 → RPA devolve valor bem maior → atrito violento depois do clique pago e dos dados coletados.

Opções: qualificar a âncora ("clientes com perfil de menor risco…") ou trocar por âncora de economia ("economizam em média X% comparando 21 seguradoras").

### 1.3 Banner vermelho de golpes no lugar errado

Primeira impressão do tráfego pago: vermelho, "golpes", "PIX", antes de confiança. Faz sentido para orgânico/direto; faz o oposto para lead frio de Ads. Sugestão: manter em páginas internas/rodapé; remover do primeiro fold da landing de Ads (ou exibir por origem de tráfego).

### 1.4 "21 seguradoras" subutilizado

Aparece várias vezes e quase nunca como promessa principal. Diferencial real vs seguradora direta e concorrentes — deveria pesar no H1.

### 1.5 Problemas menores (somados custam)

- **"Continuar"** — CTA sem valor; botão deveria carregar benefício.
- **"Cotação grátis"** — ninguém esperava pagar; "grátis" não remove objeção e pode insinuar cobrança.
- **"cerca de 15 a 30 segundos"** — ambíguo (etapa vs processo todo); se for o todo, pouco crível com 3 etapas + RPA.
- **Espera do RPA** — segunda maior fonte de abandono alegada; falta copy que prepare e justifique a espera.
- **"FIPE 100%"** — bom, mas compete com preço no mesmo espaço nobre.

### 1.6 Nova estrutura sugerida (Claude)

**Hero**

- Etiqueta: `SEGURO AUTO · COTAÇÃO ONLINE`
- H1: `O preço do seu seguro em 21 seguradoras`
- Subhead: `Você preenche em 3 etapas curtas. A gente compara e mostra o valor na tela.`
- Apoio: `Sem ligação de corretor para começar. Cobertura FIPE 100%.`

**Formulário — cabeçalho**

- Título: `Comece sua cotação`
- Sub: `Etapa 1 de 3 · Telefone → Seus dados → Seu carro` (mostrar as três etapas nomeadas desde o início)

**Etapa 1 — telefone**

- Label: `Para onde enviamos o seu preço?`
- Microcopy: `Usamos o número só para te enviar o resultado por WhatsApp. Você decide se quer falar com um consultor.`
- Botão: `Continuar →`

**Etapa 2 — dados**

- Label: `Seus dados` / Sub: `As seguradoras usam para calcular seu perfil de risco.` / Botão: `Falta pouco →`

**Etapa 3 — veículo**

- Label: `Seu carro` / Sub: `Último passo. O CEP muda bastante o preço.` / Botão: `Ver meu preço`

**Tela de espera RPA (Claude descreve como inexistente)**

- Copy de progresso + justificativa (21 seguradoras) + liberar usuário (“pode fechar — mandamos no WhatsApp”).

**Resultado**

- Enquadrar comparação (“menor preço entre 21”), não número seco.

### 1.7 Prioridade de teste (Claude)

1. H1 + CTA final (barato, alto efeito na promessa do anúncio).  
2. Microcopy de objeção no telefone.  
3. Inversão da ordem das etapas por último (caro; depende do modelo operacional; só com volume estatístico).

Pergunta operacional: taxa de abandono **por etapa**. Queda maior 1→2 ⇒ telefone; queda na espera RPA ⇒ prioridade inverte.

---

## 2. Considerações (Imediato / código atual) — 1ª rodada

### 2.1 O que a consultoria acerta

| Ponto | Por quê |
|---|---|
| Tensão telefone-primeiro vs conclusão | Correto e central no modelo Imediato |
| Objeção do telefone sem resposta na UI | Microcopy no passo 1 é alto ROI sem inverter etapas |
| Âncora R$ 79,90 | Risco real vs prêmio RPA |
| Banner de golpes no fold Ads | Atrito de confiança em lead frio |
| CTA genérico / explicar o “porquê” dos dados | Alinhado a CRO |
| Priorizar H1/CTA e microcopy antes de inverter etapas | Custo × impacto × operação |

### 2.2 O que erra ou desconhece no produto

| Afirmação Claude | Realidade |
|---|---|
| Tela de espera RPA “inexistente” | Existe `RpaCalculationScreen` (fases, timer, resultado/erro + WhatsApp). Gap = copy/expectativa, não ausência. |
| Título “Comece sua cotação” | Em 2026-08-30 o card passou a **“Faça aqui a cotação online do seu seguro”** (assertivo + online). Reverter isoladamente para “Comece…” não é melhor; ver §7.3 sobre acoplamento H1+card. |
| Invertir etapas agora | Contradiz funil Espo/Octadesk e captura `initial` no passo 1 |
| “Nada acontece com o número na UI” | O sistema **já** usa (WhatsApp + CRM); falta **transparência** na UI |
| Só GA4 “genérico” para priorizar | Já existem eventos de funil no app (`form_start`, `form_step`, `form_initial_contact`, `form_quote_choice`, `generate_lead` em `lib/analytics.ts`) |

### 2.3 Premissa do cliente: telefone primeiro

**Aceita como restrição de produto (captura).**  

No código, ao validar DDD+celular e avançar:

- `sendInitialContact()` → `stage: "initial"` → Espo + Octadesk  
- `trackEvent("form_initial_contact")` → também dispara conversão Ads (GTM v44)

Telefone cedo = lead recuperável. Isso **não** implica que o Ads deva otimizar para “digitou telefone” como sucesso final — ver §7.1 (bidding ≠ captura).

### 2.4 Estado recente do formulário (já feito)

- Rótulos nomeados: `Telefone · 1/3` / `Contato · 2/3` / `Veículo · 3/3` (sem “Etapa X”).  
- Título do card: `Faça aqui a cotação online do seu seguro`.  
- Teaser: `Poucos dados por vez — cerca de 15 a 30 segundos.` (ainda passível de revisão pela ambiguidade apontada).

---

## 3. Abandono por etapa e GA4

### 3.1 A pergunta do Claude

“Qual a taxa de abandono por etapa?” decide se o gargalo é telefone (1→2) ou RPA.

### 3.2 Precisa “aprimorar o GA4”?

**Precisa de telemetria de funil; não necessariamente reescrever o produto GA4.**

Já no contrato client (`lib/analytics.ts`):

| Evento | Uso no funil |
|---|---|
| `form_start` | Início |
| `form_initial_contact` | Etapa 1 concluída com sucesso (quase “passou do telefone”) |
| `form_step` (`step` 2\|3\|4) | Avanço de passo (**saída** do passo anterior / Continuar) |
| `form_quote_choice` | Passo 4 (aguardar vs consultor) |
| `generate_lead` | Conclusão |

**Suficiente (se GTM → GA4 estiver mapeado):** Explore/funil GA4 com esses eventos — mede drop **entre** etapas, não abandono **dentro** de uma etapa (falta evento de *entrada*; ver §7).

**Não responde abandono por etapa:** só Ads (agregado), só engajamento de sessão, só placar form/clique sem stages.

**Quando aprimorar faz sentido:**

1. **Ops GA4/GTM:** DebugView confirma `form_step` + parâmetro `step`; Explore publicado; eventos-chave marcados.  
2. **Produto (se faltar sinal):** `form_step_view` (entrada na tela), tempo na tela RPA, `rpa_start` / `rpa_complete` / `rpa_fail` tipados se ainda não existirem no dataLayer.  
3. **Alternativa forte:** funil por stages Firebase (`initial` → `progress` → `complete` / `rpa_*`) — alinhado ao placar operacional já usado.

**Conclusão §3:** para priorizar telefone vs RPA, use GA4 Explore (ou Firebase) — **uso/config** dos eventos existentes, distinto do “aprimorar GA4” descartado como causa da queda Ads form/clique da W3. Isso **não** bloqueia copy barata (§4 ordem 1).

---

## 4. Recomendações priorizadas (atual — pós §9)

Telefone permanece na etapa 1. Ordem por **custo de reversão** + **métrica de veredito**. A auditoria Ads (0) **não bloqueia** a copy (1).

| Ordem | Ação | Notas |
|------:|---|---|
| **0** | **Auditar goals Ads (diagnóstico)** | Confirmar na UI: `iwx7` primária? Offline secundária/observação? **Resultado provável:** manter `iwx7` primária (único sinal com volume); Offline como secundária para observação; **não** rebaixar telefone agora (deixaria o leilão sem sinal). Auditoria = barata, rápida, documental — **não** é gatilho de mudança de bidding neste volume. |
| **0.5** | **Métrica de veredito do experimento** | Decisão Exp vs legado = **placar comercial Espo** (venda/ROAS/gclid→Opp), **não** conversões de formulário Ads. Motivo: assimetria de instrumentação (Exp = telefone; legado = submit final) — comparar “conversões form” Ads entre braços mistura produto com artefato de medição. Já há atribuição gclid/UTM nas Fases 0–5 e `ANALISE_COMERCIAL_EXPERIMENTO_asof-*`. Explicitar isso em qualquer leitura W1–W3. |
| **1** | **Copy reversível agora** | Microcopy telefone **honesta** (só o que a operação cumpre). CTAs com valor. Subtítulos “porquê”. Revisar teaser 15–30s. **Não espera** Explore nem fechamento da auditoria 0. Baseline W1–W3 já registrada em JSON. |
| **2** | **Telemetria (sanity / ordem de grandeza)** | Explore ou Firebase: ver drops grosseiros (ex. 60% vs 15%), **não** agir sobre ±4 pp de ruído. Depois: `form_step_view` na entrada. |
| **3** | **Hero: H1 + título do card juntos** | Message match. Âncora R$ 79,90 com cuidado. **Banner de golpes:** removido do topo (2026-08-30, decisão do cliente); proteção = Footer + `/alerta-de-fraude`. |
| **4** | **RPA — polish de copy** | Tela existe; justificar espera / WhatsApp. |
| **5** | **Inversão de etapas** | **Inviável por A/B** neste volume (dezenas–~100 gclids/semana). Ou (a) decidir por julgamento + before/after sem prova estatística, ou (b) **tirar do backlog**. Gate “só com volume” que nunca abre é pior que “não vamos fazer”. |

### Explicitamente fora (por enquanto)

- Usar conversões de formulário Ads como veredito Exp vs legado.  
- Rebaixar `iwx7` / elevar Offline como primária **sem** volume alternativo (piora o leilão).  
- Esperar Explore para shipar microcopy/CTA.  
- Tratar ausência de tela RPA.  
- A/B clássico de inversão de etapas “quando houver volume”.

---

## 5. Próximo checkpoint sugerido

1. **Declarar por escrito** (este doc / placar): veredito do experimento = Espo comercial, não Ads form.  
2. **Auditoria Ads 15–30 min** (ordem 0) — confirmar primária/secundária; documentar; sem mudança obrigatória.  
3. **Ship copy barata** (ordem 1) em paralelo ou em seguida.  
4. Funil sanity (ordem 2) — só ordem de grandeza.  
5. Hero bloco quando for a vez (banner golpes já removido do topo).

---

## 6. Referências internas

- LeadForm / título / rótulos: `components/lead/LeadForm.tsx`  
- Tela RPA: `components/lead/RpaCalculationScreen.tsx`  
- Eventos: `lib/analytics.ts`  
- Conversão Ads no telefone (GTM v44): `docs/FASE_A_GTM_ESPOCRM_OPS.md`  
- Funil CRM/WhatsApp: `docs/FLUXO_LEADFORM_CRM_WHATSAPP.md`  
- Captura Ads W1–W3: `docs/ANALISE_EXPERIMENTO_LEADS_W1_W2_W3_2026-08-30.md`  
- Placar comercial Espo: `docs/ANALISE_COMERCIAL_EXPERIMENTO_asof-2026-08-30.md` / `docs/EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`  
- Snapshot captura: `scripts/google-ops/experiment-comparison-w1-w2-w3-2026-08-30.json`  
- Rótulos / título online / este doc: CHANGELOG `0.2.35`–`0.2.39`

---

## 7. Segunda rodada — crítica à resposta do desenvolvedor (Claude)

Avaliação geral da 1ª resposta do time: sólida (screenshot → código → backlog). Três ajustes importantes:

### 7.1 Problema grande: evento de conversão do Ads

A 1ª rodada tratou `form_initial_contact` → Ads como alinhamento positivo (CRM + conversão no mesmo instante). Claude: se isso alimenta **Smart Bidding como primária**, o algoritmo otimiza “digitou telefone”, não “completou cotação” nem “fechou apólice”. CPA da conversão declarada pode melhorar enquanto CPA/apólice piora — invisível no placar de form.

**Fato no repo (2026-08-04, GTM v44):**

- Conversão Ads do form NovoSite antecipada para `form_initial_contact` (passo 1).  
- Label/`action` **primária** de formulário `iwx7…` (“Envio de Formulário de Lead na Página”).  
- Tags Ads de `form_quote_choice` **pausadas**.  
- Assimetria com legado (converte no submit final) **documentada e aceita na época** — Exp tende a mais conversões de form por construção (`docs/FASE_A_GTM_ESPOCRM_OPS.md`).  
- Action `SegurosImediatoOffline` existe; nos snapshots W3 o volume útil em `conversions` primárias é fraco vs formulário.

**Conclusão operacional (2ª rodada, depois calibrada na §9):** telefone na etapa 1 continua certo para **captura**. O risco de bidding por conversão rasa existe, mas **neste volume** a distorção sofisticada do Smart Bidding é de 2ª ordem; rebaixar `iwx7` sem sinal alternativo piora o leilão. O achado maior da assimetria GTM é **contaminação do experimento** se o veredito for “conversões form” Ads — ver §9.1. Auditoria goals = diagnóstico documental (§4 ordem 0), não bloqueio de copy.

### 7.2 Gating de P0 apertado demais

A 1ª rodada: Explore → identificar gargalo → implementar só um item. Claude: instrumentar antes de agir é certo, mas microcopy/CTA/subtítulo são **horas, reversíveis**, e não precisam de funil para serem justificados (“Ver meu preço” vs “Continuar”).

O que **precisa** esperar dado/cuidado: inversão de etapas, troca agressiva de âncora de preço, redesign pesado da tela RPA.

**Volume:** Exp ~centenas de cliques / ~dezenas–centena de gclids por semana útil — Explore/A/B com ruído alto; telemetria como sanity, não como única licença para agir em copy barata.

**Princípio:** backlog por **custo de reversão**, não só por “prioridade percebida”.

### 7.3 Título do card vs H1

Congelar “não reverter o título” como P0 absoluto preempta teste de H1. Se o H1 for para “preço em 21 seguradoras”, o card “Faça aqui a cotação online…” pode **repetir** a mesma ideia no fold. Melhor: **H1 + título do card = um bloco** testado junto. “Não voltar para Comece…” isoladamente permanece razoável; blindar o título atual contra redesign conjunto, não.

### 7.4 Acertos da 1ª resposta que Claude reforçou

- Microcopy **honesta** > promessa falsa (“você decide se fala com consultor” só se a operação cumprir).  
- Distinção tela RPA inexistente vs copy insuficiente — custo de horas, não dias.  
- `form_step` marca **saída**, não entrada — lacuna real para abandono *dentro* do passo.

---

## 8. Conclusão e recomendação final

1. **Captura:** manter telefone na etapa 1 (WhatsApp/CRM/`initial`).  
2. **Veredito do experimento:** placar **comercial Espo** (não conversões de formulário Ads) — assimetria Exp telefone vs legado submit (§9.1).  
3. **Goals Ads:** auditar e documentar (ordem 0); resultado provável = manter `iwx7` primária + Offline observação; **não** travar copy à espera disso.  
4. **Copy:** shipar agora o que é reversível e honesto (ordem 1) — em paralelo à auditoria.  
5. **Telemetria:** ordem de grandeza de drop, não ruído fino (§9.3).  
6. **Hero:** H1 + título do card juntos; banner top de golpes removido (Footer + `/alerta-de-fraude`).  
7. **Inversão de etapas:** inviável por A/B neste volume — julgamento explícito ou fora do backlog (§9.3).

**Próximo passo imediato:** (a) declarar métrica de veredito = Espo comercial; (b) rascunho microcopy honesta do passo 1; (c) auditoria Ads 15–30 min sem mudança obrigatória.

---

## 9. Terceira rodada — experimento, volume e recalibração (Claude + conclusão)

Com §7–8 fechadas, Claude revisou o peso do bidding e elevou o problema de **comparabilidade do experimento**.

### 9.1 O problema maior: experimento contaminado na métrica Ads form

Três fatos juntos (§7.1):

1. Exp converte Ads no **telefone** (`form_initial_contact`).  
2. Tags de conclusão (`form_quote_choice`) **pausadas**.  
3. Legado converte no **submit final** — assimetria documentada.

Comparar “conversões de formulário” Ads entre Exp e legado (W1–W3) mistura **diferença de instrumentação** com diferença de produto. “Documentado e aceito” registra o viés; **não o remove**. Se a promoção do site novo depender desse placar Ads, há risco de aprovar artefato de medição.

**Solução já parcialmente construída:** Fases 0–5 de atribuição (gclid/UTM/`cCanalCaptura` em Lead e Opportunity) + placar comercial Espo (`ANALISE_COMERCIAL_EXPERIMENTO_asof-*`).  

**Recomendação (ordem 0.5):** veredito do experimento = **Espo comercial**, não Ads form. Ads form continua útil para operação/leilão do braço Exp, não para maçãs-com-maçãs vs legado.

### 9.2 Bidding: ponto rebaixado (volume)

Com dezenas–~100 gclids/semana útil, Smart Bidding mal sai do aprendizado; a distorção “otimiza tipadores de telefone” é **segunda ordem** neste volume.  

Rebaixar `form_initial_contact` e elevar Offline (volume fraco) **remove sinal** — pior que o status quo.  

**Ordem 0 recalibrada:** diagnóstico + documentação; resultado esperado = manter primária `iwx7`, Offline secundária/observação, **não deixar o Ads decidir o experimento**. Não bloqueia ordem 1.

### 9.3 Ordem 5 e Explore: gates realistas

- **Inversão A/B:** volume atual não abre o gate em meses. Explicitar **inviável por A/B** — julgamento/before-after ou remover do backlog.  
- **Explore:** serve para ordem de grandeza de drop (60% vs 15%), **não** para agir sobre ±4 pp.

### 9.4 Pontos em aberto / cobertos

| Tema | Status |
|---|---|
| Banner de golpes | **Fechado (2026-08-30):** banner top removido; aviso oficial no Footer + `/alerta-de-fraude` |
| Snapshot before copy | Coberto: W1–W3 JSON já existe |
| Prosa §8 vs tabela | Corrigido nesta versão: auditoria **não** bloqueia copy |

### 9.5 Conclusão da 3ª rodada

O achado dominante deixou de ser “consertar o bidding” e passou a ser **não julgar o experimento pelas conversões form do Ads**. Copy barata e honestidade no telefone seguem; placar comercial Espo decide promoção; Ads goals = higiene documental neste volume.