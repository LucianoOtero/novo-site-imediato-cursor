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
| Live legado `segurosimediato.com.br` | **Intacto** — v38 publicada 2026-07-29 15:50 só **adiciona** itens `[NovoSite]*` (7 itens, zero alterações no legado) |
| Environment GTM `Staging-NovoSite` | Ainda **não** criado (só Live/Latest) |
| Acionadores/tags aditivos contrato novo (`[NovoSite]*`) | **Publicados na v38** (2026-07-29) após validação — ver secção abaixo |
| Campos funil no EspoCRM **prod** (`cEtapaFunil` etc.) | **OK 2026-08-01** — 5 campos Lead+Opp, painel, list; Role API com Note create; onda 2 ativa (smoke PASS) |

---

## IDs

| Sistema | ID |
|---|---|
| GTM | `GTM-PD6J398` |
| GA4 | `G-694K3F1XQ1` |
| Google Ads | `AW-815139667` |
| Conversion labels no container Live (extraídos de `gtm.js`) | `iwx7CNffw4YBENOW2IQD`, `ND-wCL7t0LgbENOW2IQD`, `KL9bCO__i6QcENOW2IQD` |
| Label gravado em `GOOGLE_ADS_CONVERSION_LABEL` (Vercel) | `KL9bCO__i6QcENOW2IQD` (tag com New Customer Reporting) |

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
1. **Sábado (corretora fechada), agendado com o usuário:** configurar o **experimento no Google Ads** — criar experimento de campanha com divisão de tráfego (ex.: 50/50), braço de teste com URLs finais em `comparaseguroonline.com.br` (original mantém `segurosimediato.com.br`), definir duração e métricas. As 3 conversion actions são compartilhadas; a atribuição por braço é do próprio experimento (via clique).
2. Após o experimento no ar: acompanhar as conversões das 3 actions e validar atribuição por braço.
3. Criar Environment **Staging-NovoSite** quando for publicar versão de teste sem tocar Live.

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
