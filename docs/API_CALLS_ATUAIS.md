# API_CALLS_ATUAIS

## Finalidade
Mapa de chamadas de rede (`fetch`/XHR/`sendBeacon`), webhooks e endpoints atuais.

## Origem
Auditoria real executada na Issue P-09 — ver metodologia e limitações em `LEGACY_JS_AUDIT.md`. As chamadas abaixo foram identificadas por leitura estática do código-fonte de `FooterCodeSiteDefinitivoCompleto.js` e `config_env.js` (busca por `fetch(`, `XMLHttpRequest`, `sendBeacon`, nomes de variáveis de endpoint). **Nenhuma chamada foi observada em runtime** (não foi feito envio real de formulário).

## Status
CONTEÚDO CRIADO (auditoria real parcial — baseada em código-fonte, não em Network log ao vivo). Concluído em 2026-07-01.

## Observações
Este documento é o inventário **técnico** das chamadas de rede (método, URL/variável, payload conhecido). Para o catálogo de **integrações** em nível de produto (o que cada uma representa e decisões pendentes), ver `INTEGRACOES_ATUAIS.md` — as duas tabelas descrevem os mesmos sistemas em níveis de detalhe diferentes, sem duplicar a análise.

---

## Chamadas de rede identificadas (leitura de código-fonte)

| Gatilho | Método | Endpoint/URL (variável) | Payload/params conhecido | Autenticação visível? | Confirmado como? |
|---|---|---|---|---|---|
| Log customizado (`novo_log`) | `fetch` (não bloqueante, `mode` configurado) | `window.LOG_ENDPOINT_URL` | `JSON.stringify(logData)` — estrutura interna de `logData` não decompilada em detalhe | Não visível no client | Código-fonte (assinatura da chamada `fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(logData)...})`) |
| Validação de CPF | `fetch` POST | `window.CPF_VALIDATE_URL` | `{ cpf: cpfLimpo }` | Não visível no client | Código-fonte (assinatura completa capturada) |
| Validação de Placa | `fetch` POST | `window.PLACA_VALIDATE_URL` | Não detalhado nesta auditoria (mesmo padrão do CPF, presumido `{ placa: ... }`, **não confirmado**) | Não visível no client | Código-fonte (referência à URL confirmada; payload não extraído) |
| Enriquecimento de CEP | `fetch` GET | `` `${window.VIACEP_BASE_URL}/ws/${cep}/json/` `` | — (GET simples) | Nenhuma (API pública) | Código-fonte (assinatura completa: `.then(r=>r.json()).then(d=>({ok:!d?.erro, ...}))`) |
| Notificação por e-mail | Não confirmado nesta auditoria (presumido `fetch` POST, mesmo padrão dos demais) | `window.SEND_EMAIL_NOTIFICATION_URL` | Não detalhado | Não visível no client | Referência à variável confirmada; chamada em si não localizada/decompilada nesta rodada |
| Envio de lead — destino 1 | Não confirmado nesta auditoria (presumido `fetch`/XHR POST) | `window.ADD_FLYINGDONKEYS_URL` | Presumido: dados do formulário + GCLID (não confirmado em detalhe) | Não visível no client | Referência à variável confirmada (uso obrigatório, `throw` se ausente); chamada em si não localizada/decompilada nesta rodada |
| Envio de lead — destino 2 | Não confirmado nesta auditoria (presumido `fetch`/XHR POST) | `window.ADD_WEBFLOW_OCTA_URL` | Presumido: mesmo payload do destino 1 | Não visível no client | Referência à variável confirmada (uso obrigatório); chamada em si não localizada/decompilada nesta rodada |
| WhatsApp pós-envio (achado em formulário `#form-wp`) | Redirecionamento client-side (não é chamada de API — é montagem de URL + navegação) | `https://api.whatsapp.com/send?phone=551141718837&text=...` | Texto fixo + dados parciais do lead (não detalhado em profundidade) | N/A | Código-fonte (snippet inline capturado integralmente) |
| Tag de conversão Google Ads | Disparo de tag via GTM (não é `fetch` direto do app) | Tag "Google Ads Conversion Tracking" (`AW-815139667`) | `vtp_conversionId`/`vtp_conversionLabel` | N/A (mecanismo do GTM) | JS público compilado do container GTM |

## Atualização (relatado pelo usuário, 2026-07-02) — modal antes da navegação de WhatsApp/telefone

O usuário relatou que os cliques nos botões de WhatsApp e de telefone do site atual **acionam um modal implementado em código externo**, em vez de navegar diretamente para `wa.me`/`api.whatsapp.com`/`tel:`. A linha "WhatsApp pós-envio" acima é sobre o redirecionamento **após o envio do formulário** (`#form-wp`) — não confirmado nesta auditoria se é o **mesmo** mecanismo do modal relatado pelo usuário para os botões de WhatsApp/telefone fora do formulário, ou um fluxo distinto. Achado completo e pendências de investigação em `LEGACY_JS_AUDIT.md`.

## Limitações explícitas desta rodada

- As chamadas de **envio de lead** (`ADD_FLYINGDONKEYS_URL`, `ADD_WEBFLOW_OCTA_URL`) e de **notificação por e-mail** (`SEND_EMAIL_NOTIFICATION_URL`) foram confirmadas **apenas como variáveis referenciadas e obrigatórias** no código — a chamada de rede propriamente dita (método HTTP exato, headers, payload completo) **não foi localizada/decompilada** dentro do arquivo de ~183KB nesta rodada. Uma leitura mais profunda do arquivo completo, ou a observação de um envio real controlado (com aviso prévio à equipe comercial para descartar o lead de teste), seria necessária para confirmar 100% do payload.
- Nenhum uso de `XMLHttpRequest` ou `navigator.sendBeacon` foi encontrado no script principal — todas as chamadas identificadas usam `fetch`.
- Não foi possível capturar o **Network log ao vivo** (aba Network do DevTools) sem executar as ações reais (submeter formulário, clicar em WhatsApp) — a decisão desta auditoria foi priorizar não gerar dados falsos em produção. Recomenda-se, se necessário aprofundar, um teste controlado em ambiente de staging (`dev.bssegurosimediato.com.br`, referenciado no código) em vez do site de produção.

---

> Auditoria real (não é `PENDING`), baseada em leitura de código-fonte público. Onde o payload ou o método exato não pôde ser confirmado, isso está marcado explicitamente como "não confirmado"/"presumido" — nenhum dado foi inventado como se fosse observação direta.
