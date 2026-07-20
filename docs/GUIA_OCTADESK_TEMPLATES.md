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

## Checklist final

- [ ] 4 templates criados no Octadesk (Etapa 1)
- [ ] Templates aprovados pela Meta (Etapa 2)
- [ ] API Key + subdomínio do Octadesk anotados (Etapa 3)
- [ ] API User + chave criados no EspoCRM (Etapa 3)
- [ ] Secrets `ESPOCRM_API_CONFIG` e `OCTADESK_API_CONFIG` configurados e função redeployada (Etapa 4)
- [ ] Teste com um lead real seu (11-97668-7668) percorrendo o funil completo
