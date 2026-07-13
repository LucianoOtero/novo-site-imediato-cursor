# INTEGRACOES_ATUAIS

## Finalidade
Catálogo das integrações ativas hoje no site atual (CRM, webhook, WhatsApp, Ads, ferramentas de terceiros).

## Origem
Auditoria real executada na Issue P-09 — ver metodologia e limitações em `LEGACY_JS_AUDIT.md`. Este documento consolida, em nível de catálogo (o que existe e por quê), as integrações identificadas ao ler `config_env.js` e `FooterCodeSiteDefinitivoCompleto.js` (hospedados em bucket próprio no Google Cloud Storage e carregados via Custom Code do Webflow).

## Status
CONTEÚDO CRIADO (auditoria real parcial). Concluído em 2026-07-01.

## Observações
Os nomes de URL exatos dos endpoints (`window.LOG_ENDPOINT_URL`, etc.) apontam para serviços no **Google Cloud Run**, com padrão `https://<nome-do-serviço>-prod-br2qvvxwhq-rj.a.run.app/`. O payload exato trocado com cada endpoint **não foi confirmado em runtime** nesta rodada (nenhum envio real de formulário foi feito, para não gerar lead falso em produção).

---

## Catálogo de integrações identificadas

### 1. Destino de leads — EspoCRM (via proxy "FlyingDonkeys") — ✅ CONFIRMADO, EM IMPLEMENTAÇÃO
- **O que é:** o CRM real da Imediato, instalado no domínio **FlyingDonkeys**. Acessado pelo site atual via proxy Cloud Run `window.ADD_FLYINGDONKEYS_URL` (o script lança erro/`throw` se essa URL não estiver definida — é um destino obrigatório no fluxo atual).
- **Status:** ✅ **Confirmado pelo usuário (2026-07-03)**: "EspoCRM está instalado no domínio flyingdonkeys e é o CRM real". Ambiente de dev a ser usado nesta integração: `dev.flyingdonkeys.com.br`.
- **URLs do proxy Cloud Run** (`docs/WEBFLOW_CUSTOM_CODE_DEV.md`, item 7):
  - Dev: `https://add-flyingdonkeys-dev-6r55ex3u6q-rj.a.run.app/`
  - Prod: `https://add-flyingdonkeys-prod-br2qvvxwhq-rj.a.run.app/`
- **Payload confirmado:** `POST {data: {DDD-CELULAR, CELULAR, NOME, CPF, CEP, PLACA, Email, GCLID_FLD, produto, landing_url, utm_source, utm_campaign, ...}, d: <timestamp>, name: <string>}` — sem header de autenticação visível no client.
- **Decisão de implementação:** ver plano de integração — `lib/leads/espocrm.ts` chamará este proxy a partir de `/api/lead`.
- **Implementado (2026-07-03), ambientes mapeados (2026-07-12):** a URL usada troca automaticamente por `appEnvironment` (`lib/env.ts`) — dev/staging (UAT) sempre a URL "Dev"; produção sempre a URL "Prod". Ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md`.

### 2. Destino de leads — Octadesk (via proxy "Webflow Octa") — ✅ CONFIRMADO, EM IMPLEMENTAÇÃO
- **O que é:** sistema de comunicação com o cliente via WhatsApp, também real. Acessado via proxy Cloud Run `window.ADD_WEBFLOW_OCTA_URL` (mesmo padrão obrigatório do item acima).
- **Status:** ✅ **Confirmado pelo usuário (2026-07-03)**: "Octadesk é o sistema de comunicação com o cliente pelo WhatsApp e também está integrado." **Sem ambiente de dev** — usa produção mesmo durante testes (única URL disponível).
- **URL do proxy Cloud Run** (produção, única disponível): `https://add-webflow-octa-prod-br2qvvxwhq-rj.a.run.app/`
- **Payload:** idêntico ao item 1 (mesma estrutura `{data, d, name}`).
- **Risco a monitorar:** por não haver ambiente de dev, qualquer teste do novo site que dispare este webhook atinge o Octadesk de produção de verdade — avaliar com o negócio se leads de teste precisam de alguma marcação especial.
- **Decisão de implementação:** ver plano de integração — `lib/leads/octadesk.ts` chamará este proxy a partir de `/api/lead`.

### 3. Validação de CPF (microsserviço próprio)
- **O que é:** `window.CPF_VALIDATE_URL`, endpoint Cloud Run que recebe `{ cpf }` via POST e retorna validação.
- **Diferença em relação à especificação:** a seção 44.1 da spec assume validação por checksum local (dígito verificador), sem chamada de API. O site atual **valida via API externa própria**.
- **Decisão necessária:** manter validação via API (reaproveitando o microsserviço) ou migrar para checksum local conforme a spec — **decisão de produto/arquitetura, não desta auditoria**.

### 4. Validação de placa (microsserviço próprio)
- **O que é:** `window.PLACA_VALIDATE_URL`, mesmo padrão do CPF.
- Mesma observação: spec assume regex local (Mercosul/antiga); site atual usa API própria.

### 5. Enriquecimento de CEP — ViaCEP
- **O que é:** chamada `fetch` direta a `${VIACEP_BASE_URL}/ws/${cep}/json/` (API pública, sem autenticação).
- **Paridade:** **coincide exatamente** com o que a seção 44.1 da spec já prevê ("enriquecer via ViaCEP no servidor, não bloqueante"). Nenhuma decisão pendente aqui.

### 6. Notificação por e-mail (microsserviço próprio)
- **O que é:** `window.SEND_EMAIL_NOTIFICATION_URL`, endpoint Cloud Run.
- **Hipótese:** equivalente ao conceito de `LEAD_FALLBACK_EMAIL`/notificação da seção 44.3 da spec — **não confirmado** se é fallback (só dispara quando o CRM falha) ou notificação sempre enviada (ex.: aviso à equipe comercial a cada lead).

### 7. Logging customizado (microsserviço próprio)
- **O que é:** `window.LOG_ENDPOINT_URL` + função `novo_log(nível, categoria, ...)`, com throttling (`logRateLimited`) e detecção de ambiente (dev/prod pelo hostname).
- **Paridade sugerida:** pode ser substituído pela combinação Sentry (já usado hoje, ver `LEGACY_JS_AUDIT.md`) + logs de servidor (seção 51 da spec), sem necessidade de manter um microsserviço de log dedicado — **decisão de arquitetura, não desta auditoria**.

### 8. SafetyMails (validação/anti-fraude de e-mail) — ✅ REPLICADO COM PROXY SERVER-SIDE (2026-07-13)
- **O que é:** serviço terceirizado (`safetymails.com`), configurado via `SAFETYMAILS_OPTIN_BASE`, `SAFETYMAILS_BASE_DOMAIN`, autenticado com `SAFETY_TICKET` e `SAFETY_API_KEY`.
- **Achado de segurança do legado (corrigido no site novo):** no legado, essas chaves ficam **expostas no JavaScript client-side** (`config_env.js`), visíveis a qualquer visitante. No site novo, a mesma credencial é usada, mas a chamada roda **server-side** (`app/api/validate/email/route.ts` → `lib/validation/email-safetymails.ts`) — a chave nunca chega ao navegador.
- **Achado funcional (2026-07-13):** testadas diretamente as 2 variantes conhecidas (GET+base64 do formulário principal; POST+HMAC do FooterCode) com credenciais reais de DEV e PROD — **nenhuma respondeu** (uma retorna "Função descontinuada", a outra tem erro de DNS). Problema já documentado como não resolvido no próprio site legado (`INVESTIGACAO_ERRO_403_SAFETYMAILS.md`). Implementado mesmo assim, best-effort: nunca bloqueia o usuário se a chamada falhar (mesmo comportamento de "falha aberta" do legado). Ver `docs/VALIDACAO_TEMPO_REAL_E_CAPTURA_2_FASES.md`.

### 9. APILayer (validação de telefone) — ✅ REPLICADO COM PROXY SERVER-SIDE (2026-07-13)
- **O que é:** `APILAYER_BASE_URL` + `APILAYER_KEY`, também exposta no client-side no legado.
- **Propósito confirmado (2026-07-13):** Number Verification — validação de celular em tempo real (`validarCelularApi`/`validateCelular` em `webflow_injection_limpo.js`). Testado diretamente com a chave real: **funciona corretamente** (retorna `valid`, `carrier`, `line_type`).
- **Implementado no site novo:** mesma chave, chamada movida para server-side (`app/api/validate/phone/route.ts` → `lib/validation/phone-apilayer.ts`) — nunca exposta ao navegador. Ver `docs/VALIDACAO_TEMPO_REAL_E_CAPTURA_2_FASES.md`.

### 10. RPA (automação) — `rpaimediatoseguros.com.br` — ✅ CONFIRMADO, EM IMPLEMENTAÇÃO
- **O que é:** `window.RPA_API_BASE_URL = "https://rpaimediatoseguros.com.br"` — cotação automatizada real (confirmado lendo `webflow_injection_limpo.js`, script adicional carregado sob demanda), não apenas um nome de sistema.
- **Fluxo confirmado** (`docs/WEBFLOW_CUSTOM_CODE_DEV.md`, item 9): `POST /api/rpa/start` com os dados do formulário → retorna `sessionId`; polling em `GET /api/rpa/progress/{sessionId}` → `{progress: {etapa_atual, fase_atual, status, mensagem}}`; UI mostra uma barra/modal de progresso enquanto processa (provável automação de navegação nos portais das seguradoras).
- **Ambiente:** mesma URL em dev e prod — não há variante de ambiente para o RPA.
- **Habilitação:** controlada por `data-rpa-enabled` (`"true"` no ambiente DEV do Webflow).
- **Decisão do usuário (2026-07-03):** incluir nesta rodada de implementação.

### 10B. PH3A (enriquecimento de dados de CPF) — ✅ CONFIRMADO, EM IMPLEMENTAÇÃO
- **O que é:** API de terceiros (empresa brasileira de enriquecimento/validação de dados) acessada através do proxy já existente `window.CPF_VALIDATE_URL` (item 3) — não é uma URL própria separada. Confirmado lendo `FooterCodeSiteDefinitivoCompleto.js` (`extractDataFromPH3A`, `validarCPFApi`).
- **Como é usado no site legado:** ao validar um CPF (com a flag habilitada), a API retorna `sexo`, `dataNascimento` e `estadoCivil`, usados para autopreencher campos correspondentes no formulário.
- **Habilitação:** controlada por `data-validar-ph3a` — **desabilitada mesmo em DEV** (`"false"`) no ambiente do Webflow.
- **Decisão do usuário (2026-07-03):** incluir nesta rodada, como enriquecimento server-side não-bloqueante (sem replicar o autopreenchimento ao vivo do formulário legado — o `LeadForm` do novo site é intencionalmente mínimo).

### 11. Firebase Realtime Database — backup/log de leads (confirmado em 2026-07-02)
- **O que é:** `window.MODAL_FIREBASE_ONLY = true;` (confirmado como `true` no site ao vivo, não é mais só um indício) + script `firebase_backup_leads.js`, que configura o Firebase Realtime Database do projeto `leads-imediato-seguros` (`databaseURL: https://leads-imediato-seguros-default-rtdb.firebaseio.com`).
- **Como é usado:** todo lead capturado pelos modais de WhatsApp/telefone é gravado em `leads_backup/{leadId}` no Firebase **antes** de ser enviado ao EspoCRM/Octadesk — funciona como camada de log/backup com retry (`saveLeadToFirebase`, backoff exponencial), não como CRM em si. Documentação inline no próprio script descreve isso como "Fase 1 (Apenas Registro)" — funcionalidades de sincronização automática futura estão comentadas como "a implementar".
- **Status:** ✅ Confirmado — ver achado completo em `LEGACY_JS_AUDIT.md` ("Achado crítico — WhatsApp e telefone abrem modal de captura de lead antes de navegar").
- **Achado de segurança:** a config do Firebase client (`apiKey`, `databaseURL`, etc.) está exposta no JS público — isso é **esperado e normal** para o SDK client-side do Firebase (a segurança real vem das regras do Realtime Database, não do sigilo da apiKey), diferente do achado de SafetyMails/APILayer (itens 8/9) onde chaves de API server-side estavam expostas indevidamente.
- **Achado crítico (auditoria de 2026-07-12):** o comentário "Fase 1 (Apenas Registro)" citado acima é uma contradição real, não só uma nota de versão antiga — o próprio site legado, com `MODAL_FIREBASE_ONLY = true` ativo em produção, depende dessa sincronização automática (Cloud Function) para entregar o lead a EspoCRM/Octadesk, mas o código carregado documenta explicitamente que essa Cloud Function **nunca foi implementada**. Ver análise completa em `docs/ANALISE_ESPOCRM_OCTADESK_FIREBASE_CLOUDRUN.md`.
- **Replicado no site novo (2026-07-12):** decisão do cliente de reproduzir o comportamento completo (não só a entrega direta) — implementado com um projeto Firebase **dedicado** (`imediato-seguros-site-novo`, não o `leads-imediato-seguros` do legado) e, diferente do legado, com a Cloud Function de reentrega **implementada e testada de fato**. Ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md`.

### 12. CollectChat (chat ao vivo) — confirmado como integração real, porém obsoleta
- **O que é:** `window.CollectChatAttributes = { gclid: ... }`, definido explicitamente em `FooterCodeSiteDefinitivoCompleto.js` para passar o GCLID capturado da URL ao widget CollectChat (carregado via GTM, conforme o comentário do Head Code do ambiente DEV — `docs/WEBFLOW_CUSTOM_CODE_DEV.md`, item 2).
- **Status:** ✅ Confirmado como integração real (não apenas indício) — porém **usuário confirmou (2026-07-03) que não está mais funcionando**.
- **Decisão:** **não implementar** no novo site.

### 12B. Mailchimp — mencionado apenas no comentário do Head Code, também obsoleto
- **O que é:** citado explicitamente no comentário "IMPORTANTE" do Head Code do ambiente DEV como um serviço que deve ser carregado só via GTM (`docs/WEBFLOW_CUSTOM_CODE_DEV.md`, item 2) — nunca apareceu em nenhum script já lido (nem como variável, nem como chamada direta).
- **Status:** **usuário confirmou (2026-07-03) que não está mais funcionando**.
- **Decisão:** **não implementar** no novo site.

### 13. Elfsight (avaliações)
- Ver detalhes em `LEGACY_JS_AUDIT.md` (Tabela 1). Serviço terceirizado pago para os widgets de avaliações Google/Facebook — substituído pelo `Testimonials` custom (Embla) da nova especificação.

### 14. Sentry
- Já em uso hoje para observabilidade client-side (ver `LEGACY_JS_AUDIT.md`). Reaproveitável na Issue 03A/51.

### 15. CookieYes
- Ferramenta de consentimento em uso hoje (confirmado como CMP no comentário do Head Code do ambiente DEV, `docs/WEBFLOW_CUSTOM_CODE_DEV.md`, item 2: "CookieYes CMP em 'Consent Initialization - All Pages'"). **Decisão do usuário (2026-07-03): não usar no novo site** — mantém-se o Consent Mode v2 nativo (Issue 03/57 da spec). Isso expõe uma lacuna real a fechar: o banner visual (Aceitar tudo/Rejeitar/Preferências) nunca foi construído — só o estado *default* "denied" existe hoje em `components/consent/GtmConsentScripts.tsx`. Ver plano de implementação para o `ConsentBanner`.

### 16. GTM + GA4 + Google Ads
- Container `GTM-PD6J398`, GA4 `G-694K3F1XQ1`, Google Ads `AW-815139667` — ver `DATA_LAYER_ATUAL.md` para detalhes de eventos/conversão.

---

## Resumo de itens que bloqueavam decisões de `/api/lead` (Issue 12) — resolvidos em 2026-07-03

| Item | Bloqueava | Resolução |
|---|---|---|
| Destino EspoCRM (via proxy "FlyingDonkeys") | Definição do webhook/CRM real | ✅ Resolvido — usuário confirmou EspoCRM como CRM real; dev via `dev.flyingdonkeys.com.br` |
| Destino Octadesk (via proxy "Webflow Octa") | Definição de destino secundário | ✅ Resolvido — usuário confirmou Octadesk como sistema de comunicação via WhatsApp; sem ambiente de dev, usa produção |
| RPA (`rpaimediatoseguros.com.br`) | Propósito desconhecido | ✅ Resolvido — cotação automatizada real, confirmado o fluxo completo (`/api/rpa/start` + polling); incluído nesta rodada |
| PH3A (enriquecimento de CPF) | Propósito desconhecido | ✅ Resolvido — API de enriquecimento de CPF via proxy `CPF_VALIDATE_URL`; incluído nesta rodada |
| CollectChat / Mailchimp | Decisão de implementar ou não | ✅ Resolvido — usuário confirmou que não funcionam mais; não implementar |
| CookieYes | Manter ou substituir | ✅ Resolvido — não usar; manter Consent Mode v2 nativo (banner visual ainda a construir) |
| Validação CPF/Placa via API própria | Decisão de arquitetura (`lib/validators.ts`) | Mantém-se validação local (checksum/regex) já implementada (Issue 11); reaproveitamento do proxy é só para o enriquecimento PH3A opcional, não substitui a validação de formato |
| SafetyMails / APILayer (chaves expostas) | Segurança | ✅ Resolvido (2026-07-13) — replicados com proxy server-side (`app/api/validate/*`), chaves nunca expostas ao navegador; ver `docs/VALIDACAO_TEMPO_REAL_E_CAPTURA_2_FASES.md` |
| Firebase Realtime Database (backup de leads) + Cloud Function de reentrega | Confirmado — não bloqueia, é um log/backup, não um CRM | ✅ Replicado (2026-07-12), com projeto Firebase dedicado ao site novo — ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md` |
| Modal de WhatsApp/telefone (comportamento de captura de lead antes de redirecionar) | Decisão de produto sobre `WhatsAppFAB`/`CallButton`/`StickyCTA` (Issue 19) e `LeadForm` inline no Hero (Issue 15) | Investigação concluída (ver `LEGACY_JS_AUDIT.md`) — decisão de replicar ou não esse padrão específico continua em aberto, não implementada unilateralmente |

---

> Auditoria real (não é `PENDING`). Nenhum dado foi inventado — onde o propósito exato de uma integração não pôde ser confirmado por leitura de código público, isso está marcado explicitamente como "não confirmado"/"investigar", nunca preenchido com suposição.
