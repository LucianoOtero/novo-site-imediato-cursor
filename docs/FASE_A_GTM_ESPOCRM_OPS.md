# Fase A — GTM + virada EspoCRM prod (ops)

## Finalidade
Checklist operacional da Fase A (2026-07-29): ligar GTM no site novo e entregar leads no EspoCRM **produção** (`flyingdonkeys.com.br`).

## Status

| Item | Status |
|---|---|
| Secrets Firebase `ESPOCRM_PROD_URL` / e-mail PROD | Confirmados |
| `ESPOCRM_API_CONFIG.prod` | **OK 2026-08-01** — `useDirect` + bloco prod (API key Cloud Run `add_travelangels`); `taskAssignedUserId` = Lucas Andrade; deploy `deliverLead` |
| Vercel: GTM/GA4/Ads + `NEXT_PUBLIC_APP_ENV=production` | **OK** — valor limpo `production` (sem `\r\n`); StagingBanner ausente em 2026-08-01 (só permanece FraudAlert vermelho, intencional) |
| Container GTM Live `GTM-PD6J398` | Carrega no site após correção do ID (sem `\r\n`) + redeploy |
| Live legado `segurosimediato.com.br` | **Intacto** — tags legadas não editadas; v39 só altera/adiciona `[NovoSite]*` form |
| Environment GTM `Staging-NovoSite` | Ainda **não** criado (só Live/Latest) |
| Acionadores/tags aditivos contrato novo (`[NovoSite]*`) | **v38** (2026-07-29) + **v39** split form (2026-08-02) |
| Split form RPA/consultor + experimento Ads | **OK 2026-08-02** — GTM v39 + experimento Ads `Exp site novo vs legado 50/50` **Agendado** (início 3/ago); OAuth Ads p/ auditoria = depois |
| Campos funil no EspoCRM **prod** (`cEtapaFunil` etc.) | **OK 2026-08-01** — 5 campos Lead+Opp, painel, list; Role API com Note create; onda 2 ativa (smoke PASS) |

---

## IDs

| Sistema | ID |
|---|---|
| GTM | `GTM-PD6J398` |
| GA4 | `G-694K3F1XQ1` |
| Google Ads | `AW-815139667` |
| Conversion labels no container Live | `iwx7CNffw4YBENOW2IQD`, `ND-wCL7t0LgbENOW2IQD`, `KL9bCO__i6QcENOW2IQD`, `9VjSCLSUx9ocENOW2IQD` (RPA) |
| Label RPA | `9VjSCLSUx9ocENOW2IQD` — action `[Compartilhada] Form - RPA aguardar cálculo` |
| Label gravado em `GOOGLE_ADS_CONVERSION_LABEL` (Vercel) | `KL9bCO__i6QcENOW2IQD` (consultor; tag com New Customer Reporting) |

O código Next **não** dispara `gtag('event','conversion')` — a conversão real é via tags do GTM. A env var documenta/valida boot de produção.

---

## Verificação GTM (browser 2026-07-29)

Conta **Imediato Seguros** · Contêiner `www.segurosimediato.com.br` · **`GTM-PD6J398`** · Workspace ativo · Live = versão **37** (“Inclusão dos dados personalizados”).

### Tags presentes (amostra)
- `Tag do Google G-694K3F1XQ1` (GA4)
- `Tag do Google AW-815139667` + `Vinculador de conversões`
- `Google Ads - Conversão Modal WhatsApp` ← acionador `Modal WhatsApp - Initial Contact`
- `Google Ads - Conversão no Modal do Telefone` ← acionador `CE - phone_modal_initial_contact`
- `Conversão Formulário Válido` ← `Form Submit Valid`
- `CookieYes CMP` (Inicialização de consentimento) — **conflito** com Consent Mode nativo do site novo
- Collect Chat / StepCounter — legado morto

### Eventos dos acionadores vs site novo

| Acionador GTM (legado) | Evento que dispara a tag | Site novo emite |
|---|---|---|
| Modal WhatsApp - Initial Contact | `whatsapp_modal_initial_contact` | **`whatsapp_modal_submit`** |
| CE - phone_modal_initial_contact | `phone_modal_initial_contact` | **`whatsapp_modal_submit`** (com `modal_channel`) |
| Form Submit Valid | (evento legado formulário) | **`generate_lead`** |

**Conclusão (antes da rodada aditiva):** com o container Live **publicado** (v37), conversões Ads do modal/form **não disparam** no site novo — mismatch de nomes. O workspace agora tem cópias aditivas (abaixo); **Live legado permanece intacto até Publish**.

### Itens aditivos `[NovoSite]` — **publicados na v38** (2026-07-29 15:50)

Protocolo seguido: só **adicionar**/ajustar itens `[NovoSite]*`; tags/acionadores legados intocados; CookieYes intocado; Publish só após validação dos disparos (aprovado pelo usuário). Versão 38 = 7 itens adicionados, zero modificações no legado.

| Item | Nome | Detalhe |
|---|---|---|
| Variável | `[NovoSite] DLV - modal_channel` | Data Layer Variable `modal_channel` |
| Acionador | `[NovoSite] CE - whatsapp_modal_submit - whatsapp` | CE `whatsapp_modal_submit` **e** `modal_channel` equals `whatsapp` |
| Acionador | `[NovoSite] CE - whatsapp_modal_submit - phone` | CE `whatsapp_modal_submit` **e** `modal_channel` equals `phone` |
| Acionador | `[NovoSite] CE - form_quote_choice` | Custom Event = `form_quote_choice` (passo 4 do LeadForm) |
| Tag Ads | `[NovoSite] Ads - whatsapp_modal_submit` | `AW-815139667` / `ND-wCL7t0LgbENOW2IQD` · valor 30 · BRL · → CE whatsapp |
| Tag Ads | `[NovoSite] Ads - phone_modal_submit` | `AW-815139667` / `iwx7CNffw4YBENOW2IQD` · valor 30 · BRL · → CE phone |
| Tag Ads | `[NovoSite] Ads - form_quote_choice` | `AW-815139667` / `KL9bCO__i6QcENOW2IQD` · valor 30 · BRL · → CE form_quote_choice |

**Momentos (site novo):**
- Modais WA/telefone: conversão no **submit final** do `ContactLeadModal` (`whatsapp_modal_submit` + `modal_channel`) — não no blur do telefone.
- Formulário: conversão Ads só no clique de **cálculo automático** (`choice: aguardar`) ou **assistido** (`choice: consultor`) via `form_quote_choice`. `generate_lead` continua no funil/GA4; **não** é a tag Ads NovoSite.
- “Prosseguir assim mesmo” (pula passo 4): **sem** tag Ads do form.

**Experimento Ads:** as 3 labels são as **mesmas actions** do legado; o relatório do experimento separa braços pelo clique (URL legado vs `comparaseguroonline.com.br`), não por action distinta.

**Preservação do legado:** v38 apenas **adiciona** os 7 itens `[NovoSite]` — nenhuma tag/acionador/variável legada modificada.

**Validação (2026-07-29, antes do Publish):** container do workspace testado em página isolada com consentimento concedido — WA modal → só `ND-wCL…`; telefone modal → só `iwx7…`; `form_quote_choice` → `KL9b…`; `generate_lead` → **nenhuma** conversão Ads. Bundle prod `/cotacao` contém push `form_quote_choice`. Após Publish, gtm.js Live confirmado com os 3 rótulos + `form_quote_choice`/`modal_channel`.

### Environments
Só **Live** e **Latest** (ambos v38). **Não existe** Environment Staging-NovoSite ainda.

### Próximo passo recomendado
Ver secção **Split form RPA/consultor + experimento Ads** abaixo (runbook com salvaguardas do legado). Environment Staging-NovoSite continua opcional.

---

## Baseline Live (2026-08-02, pré-split)

Lido do `gtm.js` público `GTM-PD6J398` (sem login):

| Checagem | Resultado |
|---|---|
| Evento `form_quote_choice` | Presente (acionador único, **sem** filtro `choice`) |
| DLV `choice` | **Ausente** no Live |
| DLV `modal_channel` | Presente |
| Filtro hostname `comparaseguroonline.com.br` | **Ausente** no container |
| Labels Ads ativos | `KL9bCO__i6QcENOW2IQD`, `ND-wCL7t0LgbENOW2IQD`, `iwx7CNffw4YBENOW2IQD` |
| Rollback GTM | Versão Live atual = **v38** (não publicar sem Preview + smoke legado) |

**Ads (manual, antes de mudar):** exportar/capturar 7 dias de conversões das 3 actions + CPA da(s) campanha(s) do experimento. **Não** editar settings dessas actions.

---

## Split form RPA/consultor + experimento Ads (runbook)

Status: runbook pronto; execução via UI **ou** OAuth local — ver [`docs/GTM_ADS_OAUTH_OPS.md`](GTM_ADS_OAUTH_OPS.md) (`scripts/google-ops`). Só Publish após gates.

### Salvaguardas do legado (obrigatório)

1. Só criar/ajustar itens cujo nome começa com `[NovoSite]`.
2. Diff do Publish = **zero** mudanças em tags/acionadores/variáveis legadas (CookieYes, Formulário Válido, modais legado, Tag Google, Conversion linker).
3. Tags form NovoSite exigem **Page Hostname contém `comparaseguroonline.com.br`**.
4. Não renomear nem alterar valor/contagem/goal/status das actions `KL9b…`, `ND-wCL…`, `iwx7…`.
5. Action RPA é **só aditiva**.
6. Experimento via **Campaign experiment** (controle = URLs legado); não reescrever URLs da campanha base.
7. Pausar o CE `[NovoSite] CE - form_quote_choice` sem filtro (evitar double-count).
8. Rollback: republicar v38; encerrar experimento Ads sem apagar actions.

### Fase 1 — Google Ads (`AW-815139667`)

1. Criar conversion action **`[Compartilhada] Form - RPA aguardar cálculo`**:
   - Categoria/goal iguais à action da KL9b
   - Valor **30 BRL**; contagem alinhada à KL9b
   - Incluir no mesmo conversion goal das campanhas Maximize conversions do experimento
2. Anotar label: `AW-815139667/<LABEL_RPA>` → preencher abaixo e na tabela de IDs.
3. Não tocar nas 3 actions existentes.

**Label RPA:** `AW-815139667/9VjSCLSUx9ocENOW2IQD` (criada 2026-08-02; primária; 30 BRL; categoria Enviar formulário de lead)

### Fase 2 — GTM workspace (`GTM-PD6J398`)

| Ação | Item |
|---|---|
| Criar | Variável `[NovoSite] DLV - choice` — Data Layer Variable `choice` |
| Criar | Acionador `[NovoSite] CE - form_quote_choice - consultor` — CE `form_quote_choice` **e** `choice` equals `consultor` **e** Page Hostname contains `comparaseguroonline.com.br` |
| Criar | Acionador `[NovoSite] CE - form_quote_choice - aguardar` — CE `form_quote_choice` **e** `choice` equals `aguardar` **e** Page Hostname contains `comparaseguroonline.com.br` |
| Ajustar | Tag `[NovoSite] Ads - form_quote_choice` → renomear `[NovoSite] Ads - form_quote_choice - consultor`; manter `KL9bCO__i6QcENOW2IQD` / 30 BRL; acionador **consultor** |
| Criar | Tag `[NovoSite] Ads - form_quote_choice - aguardar` → label RPA nova / 30 BRL; acionador **aguardar** |
| Pausar | Acionador `[NovoSite] CE - form_quote_choice` (sem filtro) — nenhuma tag deve usá-lo |
| Não tocar | Tags `[NovoSite]` WA/telefone; todos os itens legados |

Antes do Publish: **Compare to Live** → só mudanças `[NovoSite]*`.

### Fase 3 — Preview + smoke (gate)

**Novo (`comparaseguroonline.com.br/cotacao`, consentimento ok):**

| Ação | Esperado |
|---|---|
| Passo 4 consultor | 1× tag consultor (KL9b); 0× RPA |
| Passo 4 aguardar | 1× tag aguardar (label RPA); 0× KL9b |
| Modal WA / telefone | só tags modal |
| `generate_lead` | nenhuma Ads NovoSite form |

**Legado (`segurosimediato.com.br`):**

| Ação | Esperado |
|---|---|
| Formulário / modal legado | tags **legadas** como antes |
| Tags `[NovoSite] Ads - form_quote_choice - *` | **não** disparam |

Só então Publish (nota: “NovoSite split form consultor/RPA + hostname; legado intocado”). Manter v38 para rollback.

### Fase 4 — Experimento Ads

1. Campaign experiment 50/50 (ou % menor no teste se quiser reduzir impacto no volume do legado).
2. Controle: URLs `segurosimediato.com.br`.
3. Teste: URLs equivalentes `comparaseguroonline.com.br`.
4. Métricas: goal compartilhado (WA + telefone + KL9b + RPA nova).
5. Não migrar 100% do tráfego até o experimento concluir.

**Como ler**

- **Website:** só Controle vs Experimento.
- **Botão RPA vs consultor:** só braço teste / domínio novo (KL9b vs action RPA).
- **Especialista maçãs-com-maçãs:** KL9b no controle (legado) vs KL9b no teste com `choice=consultor`.

### Estado Live **v39** (2026-08-02) — publicado

Publicado via API: versão **39** — “NovoSite split form consultor/RPA + hostname”. Rollback = republicar v38.

| Item | Nome | Detalhe |
|---|---|---|
| Variável | `[NovoSite] DLV - choice` | DLV `choice` |
| Acionador | `[NovoSite] CE - form_quote_choice - consultor` | CE + `choice=consultor` + hostname `comparaseguroonline.com.br` |
| Acionador | `[NovoSite] CE - form_quote_choice - aguardar` | CE + `choice=aguardar` + hostname `comparaseguroonline.com.br` |
| Acionador | `[NovoSite] CE - form_quote_choice` | **Removido** do workspace |
| Tag Ads | `[NovoSite] Ads - form_quote_choice - consultor` | `KL9bCO__i6QcENOW2IQD` · 30 BRL |
| Tag Ads | `[NovoSite] Ads - form_quote_choice - aguardar` | `9VjSCLSUx9ocENOW2IQD` · 30 BRL |
| Action Ads | `[Compartilhada] Form - RPA aguardar cálculo` | `AW-815139667/9VjSCLSUx9ocENOW2IQD` |

**Experimento Ads — programado (2026-08-02, confirmado pelo usuário):**
- Nome: `Exp site novo vs legado 50/50`
- Original: `ATIVA - Dias de Semana - 2026 - 04 - 22 - Diurna` (URLs legado)
- Tratamento: mesma campanha + sufixo Exp (URLs `comparaseguroonline.com.br` — `/cotacao` e `/seguro-auto`)
- Split 50/50; métricas Conversões + CPA; **sem** aplicação automática na original
- Status Ads: **Agendado**; início 3/ago/2026; término **27/set/2026**; sync ativado
- Anúncios do braço Exp podem ficar “em análise” após troca de domínio

**Como ler:** website = Controle vs Tratamento no relatório do experimento; botão RPA vs consultor = actions `9VjS…` vs `KL9b…` só no domínio novo.

**Depois:** OAuth Google Ads (`npm run auth -- --with-ads` + Developer Token) para auditar resultados via API — [`GTM_ADS_OAUTH_OPS.md`](GTM_ADS_OAUTH_OPS.md).

---

## A4 — GA4 / Ads (manual)

1. GA4: stream ou filtro `hostname` para `comparaseguroonline.com.br`.
2. DebugView: `generate_lead`, `whatsapp_modal_submit`.
3. Key events: os dois acima.
4. Ads: confirmar que as actions `Submit lead form` / `Other` das campanhas ativas recebem hits do domínio novo (mesmas actions do Maximize conversions).

---

## EspoCRM prod — campos funil (antes da onda 2 API direta)

**Concluído 2026-08-01** em `flyingdonkeys.com.br` + Firebase `imediato-seguros-site-novo`:

- Campos em **Lead** e **Opportunity**: `cEtapaFunil`, `cEscolhaCalculo`, `cStatusCalculo`, `cValorRecomendado`, `cValorAlternativo` + painel **“Cotação do Site”** + colunas list Lead
- Role **API** (userada por `add_travelangels` / chave Cloud Run prod): já tinha Task+User; **Note** create/read/edit ampliado
- Secret `ESPOCRM_API_CONFIG`: bloco `prod` com `baseUrl=https://flyingdonkeys.com.br`, API key do Cloud Run `add-flyingdonkeys-prod` (user `add_travelangels`), `taskAssignedUserId=668c4847e4cb545ee` (Lucas Andrade); `useDirect:true`; deploy `deliverLead`
- **Smoke onda 2:** `initial` → `cWebpage=comparaseguroonline.com.br`, `cEtapaFunil=Telefone informado`; `progress` → nome real + `Dados pessoais` no Lead e na Opportunity. RTDB/Lead de teste removidos.

---

## Virada CRM (já aplicada via env)

Interruptor: `NEXT_PUBLIC_APP_ENV=production` → backup Firebase `environment: "production"` → CF usa `ESPOCRM_PROD_URL` (proxy → `flyingdonkeys.com.br`) + e-mail PROD. Octadesk inalterado.

### Smoke 2026-07-29
- Lead RTDB `ld_fase_a_prod_*` com `environment=production`, `octadesk_sent=true` (sem WA).
- Resultado: `espocrmLeadId=6a6a00312d24538d3`, `espocrmOpportunityId=6a6a00317e6f598bc`, `SMOKE_ESPO_PROD PASS`.
- RTDB limpo; **apagar Lead/Opp de teste na UI de `flyingdonkeys.com.br`**.
- **Comercial:** novos leads do site novo passam a cair no CRM de **produção**.
