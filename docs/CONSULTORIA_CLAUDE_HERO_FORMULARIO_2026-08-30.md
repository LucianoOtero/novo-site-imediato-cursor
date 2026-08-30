# Consultoria Claude — Hero + formulário (conversão e atrito)

**Data:** 2026-08-30 (atualizado: 5ª rodada — QS / política encerrada)  
**Contexto:** site novo (experimento Ads Exp vs legado), LeadForm multi-passo, captura `initial` no telefone, WhatsApp Octadesk, RPA opcional no passo 4.  
**Premissa do negócio (cliente):** começar pelo telefone é fundamental — contato inicial mesmo que no futuro se prometa não ligar; recuperação via WhatsApp/CRM.

Documento de referência: consultoria, confronto com código, rodadas 2–5, backlog por custo de reversão.

**Leitura rápida:** §1–3 = 1ª; §4–5 = backlog **atual**; §6 = refs; §7 = 2ª; §8 = conclusão; §9 = 3ª; §10 = 4ª; **§11 = 5ª** (política/conta ok; QS como gargalo de volume; hero → ordem 2).

### Decisão registrada — remoção do banner top (2026-08-30)

| Campo | Valor |
|---|---|
| **Quando** | 2026-08-30; commit `e98b262`; deploy Vercel Production Ready ~19:09 BRT (`dpl_2Q7KxfZJ9ruEcprkQVSHLfhLowji`) |
| **Quem** | Cliente (Luciano) — banner circunstancial, não mais necessário |
| **Raciocínio** | Aviso **reposicionado** para o ponto de risco real (pós-lead / WhatsApp / resultado), não suprimido. Fold Ads deixa de abrir com “golpes/PIX”. |
| **Feito no site** | Banner top removido; Footer com texto oficial PIX/rastreador; `/alerta-de-fraude` mantida + links Legal/Footer |
| **Pendente (dívida de proteção)** | ~~Octadesk 1ª msg~~ **adiada** (todo futuro / análise — cliente 2026-08-30); linha RPA antifraude idem por agora. Footer + página **feitos**. |

### Decisão registrada — linha política / identidade Ads (2026-08-30, 5ª rodada)

| Campo | Valor |
|---|---|
| **Status** | **Encerrada sem pendências de risco** |
| **Fatos** | Verificação de conta ativa; domínio atual `novo.segurosimediato.com.br`; sem flags de política relevantes neste fio |
| **Distinção a guardar** | Conformidade de **serviços financeiros** é de **conta**, não de página. A barra CNPJ/SUSEP nunca foi o mecanismo de verificação — só sinal de identidade da landing |
| **“Qualificada (limitada)”** | Lê-se como problema de **Índice de Qualidade / relevância**, **não** de política de anúncio |
| **Barra CNPJ no Header** | **Removida** 2026-08-30 — identidade jurídica só no Footer (`0.2.43`) |

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

## 4. Recomendações priorizadas (atual — pós §11)

Telefone permanece na etapa 1. Ordem por **custo de reversão** + **métrica de veredito** + **gargalo de volume (QS)**. Auditoria Ads (0) **não bloqueia** copy (1). **Octadesk antifraude adiada** (cliente 2026-08-30 — todo futuro). Hero = **ordem 2** por **Índice de Qualidade**.

| Ordem | Ação | Notas |
|------:|---|---|
| **0** | **Auditar goals Ads (diagnóstico)** | Confirmar na UI: `iwx7` primária? Offline secundária? **Resultado provável:** manter `iwx7` primária; Offline observação; não rebaixar telefone neste volume. Não bloqueia copy. |
| **0.25** | **Proteção antifraude (adiada)** | **Octadesk 1ª msg:** **adiada** — todo futuro, pendente de análise (cliente: golpe circunstancial; não chamar atenção na 1ª WA; risco regulatório aceito). Footer + `/alerta-de-fraude` **já feitos**. Linha RPA antifraude: mesma lógica de adiamento por agora (opcional/junto ao polish ordem 4). |
| **0.5** | **Métrica de veredito do experimento** | Placar **comercial Espo**, não Ads form (assimetria instrumentação). |
| **1** | **Copy reversível (form)** | Microcopy telefone honesta; CTAs; subtítulos; teaser. **Medição:** bloco com remoção do banner (`e98b262`) — não atribuir lift a uma só mudança. |
| **2** | **Hero: H1 + título do card (+ fold)** | **Promovido** (§11): message match anúncio↔LP melhora QS. Keywords core **1/10–2/10**. Barra CNPJ/SUSEP do Header → Footer: **feita** (`0.2.43`). Restante: H1/card/âncora. |
| **2.5** | **Higiene de campanha + marca Porto Seguro** | **Novo (§11):** anúncios/keywords/negativas e marca de terceiros (Porto). Ops Ads. |
| **3** | **Telemetria (ordem de grandeza)** | **Rebaixada** (§11): Explore/Firebase; não agir sobre ±4 pp. |
| **4** | **RPA — polish de espera** | Justificar espera / WhatsApp; antifraude na tela de resultado só se reabrir o tema. |
| **5** | **Inversão de etapas** | **Inviável por A/B** neste volume — julgamento ou fora do backlog. |

### Explicitamente fora (por enquanto)

- Usar Ads form como veredito Exp vs legado.  
- Rebaixar `iwx7` sem sinal alternativo.  
- Esperar Explore para shipar microcopy.  
- Tratar ausência de tela RPA.  
- A/B clássico de inversão “quando houver volume”.  
- Reintroduzir banner vermelho no fold.  
- Tratar barra CNPJ/SUSEP como requisito de verificação de serviços financeiros (não é).  
- Confundir “Qualificada (limitada)” com flag de política de conta.

---

## 5. Próximo checkpoint sugerido

1. Ordem 1 (form) e/ou ordem 2 restante (H1/card por QS — barra CNPJ→Footer **já feita**).  
2. Declarar veredito experimento = Espo comercial (0.5).  
3. Auditoria Ads 15–30 min (0) — documental.  
4. Ordem 2.5: higiene de campanha + checagem marca Porto (Ads).  
5. Telemetria só como sanity (ordem 3), não como gate.  
6. **Octadesk antifraude:** todo futuro, pendente de análise — **não** nesta semana.

---

## 6. Referências internas

- LeadForm / título / rótulos: `components/lead/LeadForm.tsx`  
- Tela RPA: `components/lead/RpaCalculationScreen.tsx` / `RpaResultCard.tsx`  
- Eventos: `lib/analytics.ts`  
- Octadesk templates: `firebase/functions/octadesk.js` / `docs/GUIA_OCTADESK_TEMPLATES.md`  
- Conversão Ads no telefone (GTM v44): `docs/FASE_A_GTM_ESPOCRM_OPS.md`  
- Funil CRM/WhatsApp: `docs/FLUXO_LEADFORM_CRM_WHATSAPP.md`  
- Captura Ads W1–W3: `docs/ANALISE_EXPERIMENTO_LEADS_W1_W2_W3_2026-08-30.md`  
- Placar comercial Espo: `docs/ANALISE_COMERCIAL_EXPERIMENTO_asof-2026-08-30.md` / `docs/EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`  
- Snapshot captura: `scripts/google-ops/experiment-comparison-w1-w2-w3-2026-08-30.json`  
- Remoção banner: CHANGELOG `0.2.40`, commit `e98b262`  
- Este doc: CHANGELOG `0.2.37`–`0.2.42` (5ª rodada = §11)

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

1. **Captura:** manter telefone na etapa 1.  
2. **Veredito do experimento:** placar comercial Espo (não Ads form).  
3. **Goals Ads:** auditar/documentar; não travar copy.  
4. **Política / identidade:** linha **encerrada** (§11) — verificação de conta; domínio de marca; CNPJ top não é mecanismo de compliance.  
5. **Volume / QS:** keywords core em 1/10–2/10 ⇒ hero (ordem **2**) por message match / QS, não só CRO.  
6. **Proteção antifraude:** Footer + página feitos; **Octadesk adiada** (todo futuro).  
7. **Copy ordem 1 + hero ordem 2:** shipar com consciência de medição em bloco (`e98b262`); CNPJ top→Footer ok para projeto.  
8. **Higiene de campanha + marca Porto** (2.5): ops Ads.  
9. **Inversão de etapas:** inviável por A/B neste volume.

**Próximo passo imediato:** microcopy do passo 1 e/ou hero alinhado a QS (e/ou projeto barra jurídica → Footer) — **sem** Octadesk agora.

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
| Banner de golpes (top) | **Removido** 2026-08-30 (`e98b262`) — caixa “Decisão registrada” no topo |
| Footer antifraude | **Feito** — texto oficial + link |
| Octadesk 1ª msg / linha RPA | **Adiada** — todo futuro / análise (cliente 2026-08-30); Footer feito |
| `/alerta-de-fraude` | Existe, indexável, linkada Footer/Legal |
| Barra CNPJ/SUSEP no Header | **Removida** 2026-08-30 — só Footer (`0.2.43`) |
| Snapshot before copy | Coberto: W1–W3 JSON |
| Prosa §8 vs tabela | Auditoria não bloqueia copy |

### 9.5 Conclusão da 3ª rodada

O achado dominante: **não julgar o experimento pelas conversões form do Ads**. Copy barata e honestidade no telefone seguem; placar comercial Espo decide promoção.

---

## 10. Quarta rodada — pós-remoção do banner (Claude + conclusões)

### 10.1 Dívida de proteção (Footer já feito)

Claude: metade do reposicionamento faltou. **Fato no código:**

| Canal | Status |
|---|---|
| Banner top | Removido |
| **Footer** | **Feito** — texto oficial PIX/rastreador + link |
| Octadesk 1ª mensagem | **Pendente** — maior prioridade (canal que o golpista imita) |
| Resultado RPA | **Pendente** — lead qualificado |

Conclusão: no site o visitante ainda vê aviso (Footer). A **janela aberta** é pós-lead (WhatsApp automático + tela de preço). Fechar **esta semana** (ordem 0.25).

### 10.2 Página “Saiba mais” / SEO

Não órfã: `/alerta-de-fraude` indexável, linkada Footer/Legal. Banner era path extra. Reforçar SEO defensivo se Search Console cair em queries de golpe.

### 10.3 Registro da decisão

Caixa no topo deste doc + CHANGELOG `0.2.40` / `e98b262`. Raciocínio: **reposicionar**, não suprimir; pendências Octadesk/RPA explícitas.

### 10.4 Contaminação da medição ordem 1

Banner saiu do fold antes da microcopy barata. Volume baixo ⇒ tratar banner + ordem 1 como **intervenção única** (before/after do conjunto), janela desde `e98b262` ~19:09 BRT 2026-08-30 — ou espaçar a ordem 1.

### 10.5 Primeiro pixel e a barra CNPJ/SUSEP (contexto Ads)

Com o banner de golpes fora, a barra jurídica do `Header` (razão social · CNPJ · SUSEP) fica mais visível no fold.

**Origem (cliente / CHANGELOG domínio):** essa barra **não nasceu como CRO**. Foi implementada para **desviar de bloqueio / “Veiculação limitada”** no experimento Ads quando o domínio ainda era **`comparaseguroonline.com.br`** (domínio genérico sem marca → problema de identidade do anunciante). Reforçava o vínculo visual domínio ↔ Imediato Corretora (CNPJ/SUSEP). Depois veio a migração para `novo.segurosimediato.com.br` (mesmo motivo de identidade).

**Status atual (2026-08-30, cliente + 5ª rodada):** com o site em **`novo.segurosimediato.com.br`**, o contorno Ads **não é mais necessário**. Além disso (§11.1): compliance de serviços financeiros é **de conta**, não de página — a barra **nunca foi** o mecanismo de verificação. Ordem 2 (hero/fold) trata CredBar vs CNPJ como CRO livre — inclusive **projeto para mover razão social/CNPJ/SUSEP ao Footer**. Sanity de veiculação = opcional, não gate.

ConsentBanner: único banner de atrito restante para quem ainda não consentiu — olhar após remoção do FraudAlert.

### 10.6 Verificação produção (checklist)

- [ ] Sem flash do banner (remoção no servidor).
- [ ] CLS do topo ok (mobile).
- [ ] ConsentBanner sem regressão.
- [ ] Footer + `/alerta-de-fraude` ok em prod.
- [x] Linha política / identity Ads — **encerrada** na 5ª rodada (§11); não depende da barra CNPJ.

### 10.7 Conclusão da 4ª rodada

1. Prioridade imediata (na época): Octadesk + linha RPA.
2. Medição: bloco banner+copy (`e98b262`).
3. Hero/fold: CNPJ top era mitigação Ads em domínio genérico; **com domínio de marca, não é mais pré-requisito** — redesenhar é CRO.
4. Documento alinhado: banner fora; identidade jurídica contextualizada e dispensável como contorno.

---

## 11. Quinta rodada — política encerrada, QS como gargalo (Claude + considerações)

Claude (5ª) fecha a linha política/banner e desloca o diagnóstico: o problema dominante pode ser **volume não comprado por QS baixo**, não só atrito de conversão na página.

### 11.1 Consultoria (Claude) — registro

1. **Linha política encerrada sem pendências de risco**
   Conta com verificação ativa; domínio atual de marca; sem flags neste fio. Distinção a guardar: conformidade de **serviços financeiros = conta**, não página. A barra CNPJ/SUSEP **nunca foi** o mecanismo de verificação — só sinal de identidade da landing (alinha e aprofunda §10.5).

2. **“Qualificada (limitada)” ≠ política**
   Interpretação correta: sinal ligado a **Índice de Qualidade / relevância** (anúncio–keyword–LP), não a restrição de política de anúncio. Misturar os dois gera “consertar compliance” quando o que falta é message match e QS.

3. **O gargalo mudou de lugar**
   Keywords core em **1/10** e **2/10** (ex.: `cotação de seguro online` em **1/10**). É plausível que o problema principal não esteja só na conversão de quem chega, e sim no **volume que o leilão quase não compra** (CPC alto / impressões perdidas / posição).

4. **Recalibração do backlog**
   - Bloco **hero** sobe de ordem **3 → 2**, justificado por **QS** (CTR esperado + experiência na LP via message match), não só por CRO de fold.
   - **Telemetria desce** (deixar de gatear decisões baratas).
   - Itens novos: **higiene de campanha** e cuidado com **marca Porto Seguro** (terceiros).

5. **Proteção Octadesk (1ª msg):** na 5ª rodada ainda constava como pendência imediata; **decisão do cliente (mesmo dia):** **não alterar Octadesk agora** — golpe foi circunstancial/temporário; evitar chamar atenção na 1ª mensagem; risco regulatório aceito pelo proprietário. Vira **todo futuro, pendente de análise** (não é caminho crítico). Footer + `/alerta-de-fraude` permanecem.

### 11.2 Considerações (Imediato / código / ops)

| Ponto Claude | Concordância | Notas |
|---|---|---|
| Compliance SF = conta | **Concordo** | Não tratar Header jurídico como checklist de verificação Ads. |
| CNPJ bar = identidade LP, não verificação | **Concordo** | Livre para projeto: tirar barra do topo e deixar razão social/CNPJ/SUSEP no Footer. |
| “Qualificada (limitada)” = QS | **Concordo com ressalva** | Vale cruzar na UI Ads o rótulo exato (política vs qualidade). Hipótese de trabalho: QS. |
| QS 1/10–2/10 como gargalo de volume | **Plausível e prioritário** | Explica CPC↑ / share sem exigir LP “quebrada”. Em paralelo: drop form Ads W3 (copy/form). |
| Hero → ordem 2 por QS | **Concordo** | H1 + card + anúncio alinhados; acoplar H1+card (§7.3). QS demora semanas. |
| Telemetria rebaixada | **Concordo** | Mesma lógica §7.2 / §9.3. |
| Higiene de campanha + Porto | **Concordo e critico** | Porto como parceira no site é legítimo; risco é keyword/anúncio de marca de terceiros (ops Ads 2.5). |
| Octadesk imediato | **Cliente adia** | Concordância: não mexer agora; todo futuro pendente de análise. |

**O que não mudar nesta rodada:** telefone na etapa 1; veredito = Espo comercial; não rebaixar `iwx7` só por QS; não reabrir banner vermelho no fold; **não** alterar 1ª msg Octadesk.

### 11.3 Implicação prática (síntese)

```
Política / conta     → fechado
Proteção Octadesk    → adiada (todo futuro / análise)
Volume / leilão      → QS baixo em core → hero ordem 2 + higiene 2.5
Conversão on-page    → copy ordem 1 (ainda vale)
Fold / CNPJ top      → projeto CRO: mover ao Footer (ok para elaborar)
Veredito experimento → Espo comercial (0.5)
```

### 11.4 Conclusão da 5ª rodada

1. Política e “contorno CNPJ” saem do caminho crítico.
2. Hipótese dominante nova: **QS / volume**, não só CRO da página.
3. Backlog: hero **ordem 2**; telemetria **ordem 3**; higiene+Porto **2.5**.
4. Octadesk antifraude: **fora do crítico** — todo futuro.
5. Próximo produto: copy/hero/QS e/ou projeto Header→Footer (CNPJ).
