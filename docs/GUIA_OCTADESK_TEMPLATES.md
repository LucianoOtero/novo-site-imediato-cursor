# Guia — Templates Octadesk/Meta + API Keys (EspoCRM e Octadesk)

## Finalidade

Passo a passo para VOCÊ (Luciano) executar nos painéis do Octadesk, Meta e EspoCRM — partes do projeto "leads EspoCRM/Octadesk por momento do funil" (2026-07-20) que exigem acesso administrativo que o agente não tem. O código do site e da Cloud Function já está pronto e **funciona sem essas configurações** (os envios novos ficam silenciosamente desligados até você concluir os passos abaixo).

## Contexto — por que templates aprovados?

O WhatsApp só permite que uma empresa **inicie** uma conversa (mensagem ativa) usando um **modelo de mensagem (template/HSM) pré-aprovado pela Meta**. Mensagens livres só são permitidas dentro da "janela de 24 horas" após a última mensagem do cliente. Como as mensagens do funil (cálculo pronto, cálculo depois) são disparadas pelo sistema — muitas vezes fora dessa janela — todas precisam ser templates aprovados.

O Octadesk é o BSP (parceiro oficial da Meta): você cria o template no painel do Octadesk e ele submete à Meta automaticamente.

## Etapa 1 — Criar os 4 templates no Octadesk

Painel Octadesk → **Configurações → Canais → WhatsApp → Modelos de mensagem** → "Criar modelo".

Para cada um: idioma **Português (BR)**, categoria **Utilidade** (é atualização de um pedido feito pelo cliente — aprovação mais fácil e custo menor que "Marketing").

### 1. `cotacao_recebida` (substitui a mensagem inicial atual — opcional nesta fase)

> Olá! Aqui é da Imediato Seguros 👋 Recebemos seu pedido de cotação de {{1}} e um dos nossos especialistas já está cuidando dele. Pode responder por aqui a qualquer momento — do outro lado tem gente de verdade. Cotação grátis e sem compromisso.

- `{{1}}` = ramo (ex.: "seguro auto").
- **Nota**: hoje a mensagem inicial sai pelo proxy legado (Cloud Run `add_webflow_octa`), com template fixo configurado lá dentro. Trocar o texto inicial exige OU alterar o proxy OU migrar o envio inicial para a API direta (posso fazer numa rodada futura — me avise quando o template estiver aprovado).

### 2. `calculo_pronto` (fim do cálculo RPA com sucesso)

> Boa notícia, {{1}}! Seu cálculo ficou pronto: opções a partir de {{2}} para o seu {{3}}, comparando 18 seguradoras. Um especialista te chama em instantes para revisar os detalhes e garantir essas condições.

- `{{1}}` = primeiro nome · `{{2}}` = valor recomendado (ex.: "R$ 2.360,18") · `{{3}}` = veículo (ex.: "VW T-Cross 2022").

### 3. `calculo_manual` (cálculo RPA não concluído)

> {{1}}, seu cálculo está em finalização com um dos nossos especialistas — te retornamos ainda hoje com as melhores condições entre 18 seguradoras.

- `{{1}}` = primeiro nome.

### 4. `calculo_completo_depois` (prospect escolheu "Prefiro receber o cálculo completo depois")

> Perfeito, {{1}}! Um especialista da Imediato Seguros já está preparando seu cálculo completo, comparando 18 seguradoras. Você recebe por aqui mesmo — sem compromisso.

- `{{1}}` = primeiro nome.

Ao criar cada template, o Octadesk mostra um **ID** — anote os 4 IDs (vamos usar na Etapa 4).

## Etapa 2 — Acompanhar a aprovação na Meta

- O Octadesk submete automaticamente; o status aparece no próprio painel de Modelos (Pendente → Aprovado/Rejeitado).
- Alternativa: Meta Business Suite ([business.facebook.com](https://business.facebook.com)) → **Contas do WhatsApp → Modelos de mensagem** (WhatsApp Manager).
- Prazo típico: de minutos a 24 horas.
- Se rejeitar: geralmente é por classificação de categoria — reenviar como "Utilidade" com justificativa, ou ajustar o texto removendo tom promocional (o texto dos modelos 2–4 acima é factual/transacional de propósito).

## Etapa 3 — Gerar as chaves de API

### Octadesk

1. Painel Octadesk → **Configurações → Conta → API** (ou Integrações → API) → gerar/copiar a **API Key**.
2. Anote também o **subdomínio** da sua conta — a URL base da API é `https://SEU-SUBDOMINIO.apiprd.octadesk.services`.
3. Anote o **número oficial** de WhatsApp do ambiente (formato `+5511...`) — é o remetente (`fromNumber`).

### EspoCRM

1. EspoCRM → **Administração → API Users** → criar usuário (ex.: `site-novo-cf`), método de autenticação **API Key**.
2. Dê a ele um papel (Role) com permissão de **leitura e edição de Leads** e de **criar registros no Stream** (Notes).
3. Copie a API Key gerada.
4. A URL base é a do seu EspoCRM (ex.: `https://crm.suaempresa.com.br`) — a Cloud Function chama `/api/v1/Lead/...` e `/api/v1/Note`.

## Etapa 4 — Configurar os secrets da Cloud Function

Com os valores em mãos, rode (no diretório `firebase/` do projeto, com o Firebase CLI logado):

```bash
# EspoCRM — API REST direta (Notes no Stream + description)
firebase functions:secrets:set ESPOCRM_API_CONFIG
# Cole (uma linha só):
# {"baseUrl":"https://crm.suaempresa.com.br","apiKey":"SUA_CHAVE"}

# Octadesk — envio direto de templates (kill-switch "enabled")
firebase functions:secrets:set OCTADESK_API_CONFIG
# Cole (uma linha só, com os IDs anotados na Etapa 1):
# {"enabled":true,"baseUrl":"https://SEU-SUBDOMINIO.apiprd.octadesk.services","apiKey":"SUA_CHAVE","fromNumber":"+5511XXXXXXXXX","templates":{"calculo_pronto":"ID_2","calculo_manual":"ID_3","calculo_completo_depois":"ID_4"}}

# Redeploy para a função enxergar os novos secrets
firebase deploy --only functions
```

**Importante**: enquanto os templates não forem aprovados, configure com `"enabled":false` (ou simplesmente `{}` nos dois secrets) — os estágios do EspoCRM via proxy continuam funcionando normalmente e nada é enviado pela API direta. Depois da aprovação, basta trocar para `"enabled":true` e redeployar.

## O que já está pronto no código (não precisa fazer nada)

| Momento | Lead no EspoCRM | Mensagem WhatsApp |
|---|---|---|
| 1. Telefone (passo 1) | Cria lead (nome/e-mail genéricos do telefone) — como hoje | Mensagem inicial via proxy legado — como hoje (texto novo = Etapa 1.1) |
| 2. Nome + e-mail (passo 2) | **NOVO**: atualização `progress` com os dados parciais | Nenhuma (decisão de marketing: não interromper o preenchimento) |
| 3. CPF/CEP/placa (passo 3) | **NOVO**: atualização `progress` com CPF/CEP/placa/veículo identificado | Nenhuma |
| 4a. Escolheu acompanhar o cálculo | **NOVO**: Note no Stream "escolheu acompanhar o cálculo automático" | Nenhuma (ele está olhando a tela de progresso) |
| 4a. Cálculo concluído | **NOVO**: Note + description com os valores (recomendado/alternativo, franquias, pagamento) | **NOVA**: `calculo_pronto` (registro escrito do preço — recupera quem fechou a página) |
| 4a. Cálculo falhou | **NOVO**: Note "fazer cotação manual" | **NOVA**: `calculo_manual` |
| 4b. Prefere o cálculo completo depois | **NOVO**: Note "preparar cotação e retornar com os valores" | **NOVA**: `calculo_completo_depois` |

## Templates criados de verdade (registro de 2026-07-27)

Após as iterações com o classificador da Meta (as primeiras versões foram reclassificadas como "Marketing" por linguagem promocional — "grátis", "sem compromisso", "boa notícia", "melhores condições", "opções a partir de"), os templates finais ficaram assim, **todos como Utilitário**:

| Momento do funil | Nome no Octadesk | ID | Status (2026-07-27) |
|---|---|---|---|
| 1. Cotação recebida (inicial) | `cotacao_primeira_util` | `6a6797b4371d871a86ea1bd0` | Aprovado |
| 1. Cotação recebida (variante) | `cotacao_solicitada_util` | `6a6796b9c705a5619f2e8cdb` | Aprovado |
| 4a. Cálculo concluído (= `calculo_pronto` no secret) | `opcao_recomendada_util` | `6a679f8fcd5582b40f0b8de2` | Aprovado |
| 4b. Cálculo completo depois (= `calculo_completo_depois` no secret) | `ultima_confirmacao_calculo` | `6a67c99eb2f6c165b3a499f4` | **Aprovado (2026-07-27)** — venceu a corrida; o `calculo_completo_ultimo_util` (pendente) foi excluído pelo cliente |
| 4a. Cálculo falhou (= `calculo_manual` no secret) | `calculo_falhou_util` | `6a67b114b134d17c41842d89` | Aprovado (2026-07-27) |

### Textos aprovados

**`cotacao_primeira_util`** (usa `{{nome-contato}}`, campo padrão do Octadesk):
> Olá, {{nome-contato}}! Aqui é da Imediato Seguros. Recebemos sua solicitação de cotação de seguro e um dos nossos especialistas já está cuidando dela. Pode responder por aqui a qualquer momento.

**`cotacao_solicitada_util`** (usa `{{nome-contato}}`):
> Olá, {{nome-contato}}! Recebemos sua solicitação de cotação de seguro na Imediato Seguros. Um especialista já está analisando seu pedido e entrará em contato por aqui para dar continuidade. Se precisar, é só responder esta mensagem.

**`opcao_recomendada_util`** (var-1 = nome · var-2 = veículo · var-3 = valor — ordem já alinhada na Cloud Function, commit `34edc1b`):
> Olá, {{var-1}}. O cálculo do seguro do seu {{var-2}} foi concluído. Valor da opção recomendada: {{var-3}}. Um especialista da Imediato Seguros entrará em contato por aqui para revisar os detalhes.

**`calculo_completo_ultimo_util`** (var-1 = nome):
> Olá, {{var-1}}. Confirmamos sua solicitação. Um especialista da Imediato Seguros vai preparar o cálculo completo do seu seguro e enviar por aqui. Se precisar, responda esta mensagem.

**`ultima_confirmacao_calculo`** (var-1 = nome; candidato alternativo para o momento 4b):
> Olá, {{var-1}}. Recebemos sua solicitação e um especialista da Imediato Seguros vai preparar o cálculo completo do seu seguro e enviar por aqui. Se precisar, responda esta mensagem.

**`calculo_falhou_util`** (var-1 = nome; texto do cliente, 2026-07-27 — corrigir "não pôde"/vírgula antes do "mas" numa edição futura, sem pressa):
> Olá, {{var-1}}. Seu cálculo de seguro não pode ser efetuado automaticamente pelo sistema mas está em finalização com um especialista da Imediato Seguros. Assim que concluído, enviaremos os valores por aqui. Se precisar, responda esta mensagem.

### Dados da conta Octadesk (registro de 2026-07-27)

- **Base URL da API**: `https://o205242-d60.api004.octadesk.services` (tela Configurações → API do painel do cliente — usar este valor no `baseUrl` do secret `OCTADESK_API_CONFIG`).
- **apiKey**: criada em 2026-07-27 com o nome `comparaseguroonline` (hash fornecido ao agente em conversa — NÃO registrado aqui por segurança; vai direto ao Secret Manager na ativação). A chave "Botpress" existente permanece intocada.
- **Número oficial (fromNumber)**: `+551132301422` — "Imediato Corretora De Seguros" (ID Meta 584549174733241).
- **Status da ativação: ✅ ATIVADO em 2026-07-27** — secret `OCTADESK_API_CONFIG` gravado com `enabled:true` (versão 2), Cloud Function redeployada e testes ponta a ponta bem-sucedidos: templates `opcao_recomendada_util` (com nome/veículo/valor preenchidos) e `ultima_confirmacao_calculo` entregues no número de teste do cliente; flags `octa_*_sent:true` confirmados nos registros; registros de teste removidos.
- **Achado técnico da ativação**: o `POST /chat/send-template` usa o formato `origin/target: {channel:"whatsapp", code:"+55..."}` — o formato `phoneContact`/`from.number` (do endpoint antigo `/chat/conversation/send-template`, deprecado) devolve HTTP 500 `{"code":"NOT_MAPPED"}`. Corrigido em `firebase/functions/index.js`. Bônus: `target.contact.name`/`email` alimentam as variáveis padrão `{{nome-contato}}`/`{{email-contato}}` dos templates.

### Pendências para ativação

1. ~~Criar o template do momento "cálculo falhou"~~ **Feito (2026-07-27)**: criado como `calculo_falhou_util` (ID `6a67b114b134d17c41842d89`) — aguardando aprovação.
2. Aguardar a aprovação do `calculo_completo_ultimo_util` e do `calculo_falhou_util`.
3. Variante do momento 1 **escolhida (2026-07-27): `cotacao_primeira_util`** (mais curta, convite a responder mais direto — resposta abre a janela de 24h). A `cotacao_solicitada_util` pode ser apagada após a ativação.
4. Enviar ao agente: API key + subdomínio do Octadesk + número oficial → montagem do secret `OCTADESK_API_CONFIG` com o mapeamento:
   - `calculo_pronto` → `6a679f8fcd5582b40f0b8de2` (`opcao_recomendada_util`)
   - `calculo_completo_depois` → `6a67c99eb2f6c165b3a499f4` (`ultima_confirmacao_calculo`)
   - `calculo_manual` → `6a67b114b134d17c41842d89` (`calculo_falhou_util`)

**Nota sobre `{{nome-contato}}`** (templates do momento 1): é o campo padrão do Octadesk, preenchido pelo cadastro do contato — não pela nossa API. No primeiro contato o nome real ainda não foi coletado (só o telefone), então essa variável pode sair vazia ou genérica. Como a mensagem inicial hoje sai pelo proxy legado, o comportamento atual se mantém; se migrarmos o envio inicial para a API direta, o campo `name` do payload só é enviado quando existe nome real.

## Checklist final

- [x] Templates criados no Octadesk (Etapa 1) — 2026-07-27
- [x] Templates aprovados pela Meta (Etapa 2) — todos como Utilitário, 2026-07-27
- [x] API Key + Base URL do Octadesk anotados (Etapa 3) — 2026-07-27
- [ ] API User + chave criados no EspoCRM (Etapa 3) — **única pendência** (Notes no Stream aguardando)
- [x] Secret `OCTADESK_API_CONFIG` configurado e função redeployada (Etapa 4) — 2026-07-27
- [ ] Secret `ESPOCRM_API_CONFIG` configurado — aguarda o API User acima
- [x] Teste dos templates no número do cliente (11-97668-7668) — 2026-07-27, `calculo_pronto` e `calculo_completo_depois` entregues
