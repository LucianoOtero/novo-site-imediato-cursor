# Runbook — dash produção comercial (`dash.segurosimediato.com.br`)

**Plano pai:** [`../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md`](../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md) (Fase 6)  
**Deploy:** [`DEPLOY.md`](./DEPLOY.md)

## Camadas de acesso

| Ordem | Camada | Onde configura | Falha típica |
|---|---|---|---|
| 1 | **Cloudflare Access** (e-mail `@imediatoseguros.com.br`, `@segurosimediato.com.br` + exceções nominais; código por e-mail) | Cloudflare Zero Trust → Access → Applications → `dash-producao` | não recebe o código; e-mail fora da política |
| 2 | **JWT do Access no middleware** (`lib/cf-access.ts`) | Vercel env `CF_ACCESS_TEAM_DOMAIN` + `CF_ACCESS_AUD` (só Production) | 403 "Acesso permitido somente via Cloudflare Access" |
| 3 | **Login Espo** (usuário humano, Basic) → cookie HMAC 12 h | Espo prod; Vercel env `SESSION_SECRET` | "Credenciais inválidas" / "Usuário inativo" |
| 4 | **Dados**: Espo (key `api_dashboard_producao`) + Supabase `agger_*` | Vercel env `ESPO_DASH_API_CONFIG`, `DATABASE_URL` | erro 500 nas APIs; emitido zerado |

A camada 2 é o que impede chegar na Vercel sem passar pela Cloudflare: pelo alias
`*.vercel.app` ou chamando o IP da Vercel com `Host: dash.segurosimediato.com.br`.
Sem as duas variáveis, o middleware pula a checagem (comportamento da v0.1.0).

Infra Cloudflare do host:

- DNS `dash` → `76.76.21.21` **Proxied** (nuvem laranja). Access não funciona em "DNS only".
- Configuration Rule `dash - SSL Full strict` (hostname `dash.segurosimediato.com.br` → SSL **Full (strict)**).
  Sem ela, o modo da zona vale; em "Flexible" a Vercel entra em loop de redirect.

## Diagnóstico rápido

| Sintoma | Causa provável | Seção |
|---|---|---|
| Tela da Cloudflare pedindo e-mail | normal (camada 1) | — |
| "That account does not have access" na Cloudflare | e-mail fora da política | [Access](#3-cloudflare-access) |
| 403 texto "Acesso permitido somente via Cloudflare Access" | proxy desligado, AUD trocado, acesso direto | [Access](#3-cloudflare-access) |
| 403 "Cloudflare Access mal configurado" | só uma das duas variáveis definida | [Access](#3-cloudflare-access) |
| Erro 525/526 ou loop de redirect | SSL da Cloudflare ≠ Full (strict) | [Access](#3-cloudflare-access) |
| Login Espo: "Credenciais inválidas" | senha/usuário do próprio Espo | [Espo](#2-key-e-login-espo) |
| APIs 500 com `GET Opportunity HTTP 401/403` | key do dash revogada/sem permissão | [Espo](#2-key-e-login-espo) |
| Emitido zerado ou "última corrida" antiga | ingestão Agger falhou | [Agger](#1-ingestão-agger) |
| APIs 500 com erro de Postgres/`DATABASE_URL` | Supabase fora ou senha trocada | [Agger](#1-ingestão-agger) |

Checagem técnica (logado): `GET /api/meta/asof` → `aggerRun` (última corrida) e `espo.source`.

## 1. Ingestão Agger

O dash lê `agger_policy` / `agger_run` no Supabase (`imediato-agger`) ao vivo; não tem cache próprio.
Quem alimenta é o RPA diário no PC `agger-rpa` (06:00, `Imediato-AggerRpa-DailyExport`) —
runbook do robô: `docs/agger-ops/RUNBOOK.md`.

1. `GET /api/meta/asof` → `aggerRun.status` e `run_date`. Esperado: `ok` com a data de hoje (após ~07:00).
2. Se antigo ou `parcial`/`erro`: no PC robô, `C:\AggerRpa\logs\run_YYYYMMDD.json` (`missing[]`, sessão)
   e os e-mails de alerta do RPA. Seguir "Falhas comuns" do runbook do robô
   (sessão Windows **Ativo**, Watchdog, reexecutar `Invoke-LocalIngest.ps1`).
3. Depois de reingerir: botão **Atualizar** no dash (recalcula na hora).
4. Erro de conexão Postgres nas APIs:
   - Supabase fora: aguardar / status do Supabase; o Espo segue funcionando, mas o emitido some.
   - Senha do banco trocada: atualizar `DATABASE_URL` na Vercel (Production + Preview), **Redeploy**, smoke.

Enquanto o Agger estiver atrasado, o produzido (Espo) segue correto; as linhas sem apólice
aparecem como inconsistência `noMatch` — não é erro do dash.

## 2. Key e login Espo

Dois acessos diferentes ao Espo prod (`flyingdonkeys.com.br`):

- **Login humano** (camada 3): cada pessoa com o próprio usuário/senha do Espo.
  "Credenciais inválidas" = senha errada; "Usuário inativo" = usuário desativado no Espo.
- **Key do dash** (camada 4): usuário API `api_dashboard_producao`, role read-only
  (ver [`ESPO_ACL_INVENTORY.md`](./ESPO_ACL_INVENTORY.md)). Vai na env `ESPO_DASH_API_CONFIG`
  (`{"prod":{"baseUrl":"https://flyingdonkeys.com.br","apiKey":"…"}}`).
  **Nunca** reutilizar a key dos scripts/RPA/Cloud Functions (`ESPOCRM_API_CONFIG`).

Key com 401/403 nas APIs:

1. Espo → Administração → Usuários → `api_dashboard_producao`: ativo? role do dash ainda atribuída?
2. Se a key vazou ou foi revogada: gerar nova API key no mesmo usuário.
3. Vercel → `dash-producao` → Settings → Environment Variables → `ESPO_DASH_API_CONFIG`
   (Production + Preview) com a key nova → **Redeploy** do último deploy de produção.
4. Smoke: login → home com KPIs → `GET /api/meta/asof`.

## 3. Cloudflare Access

**Pessoas:** Zero Trust → Access → Applications → `dash-producao` → Policies → `Imediato`.
Incluir/remover e-mails nominais em *Include → Emails*; domínios em *Emails ending in*.
Quem sai da empresa: remover da policy **e** desativar no Espo.

**Não recebe o código:** checar spam; conferir se o e-mail está na policy;
Zero Trust → Logs → Access (motivo da negação).

**403 "Acesso permitido somente via Cloudflare Access":**

1. DNS do `dash` está **Proxied**? Se alguém voltou para "DNS only", religar.
2. A aplicação do Access foi recriada? O *Application Audience (AUD) Tag* muda: copiar o novo
   (Applications → `dash-producao` → Additional settings → AUD tag) para `CF_ACCESS_AUD` na Vercel → Redeploy.
3. Mudou o *team domain* (Zero Trust → Settings → Team domain; hoje `imediatoseguros.cloudflareaccess.com`)?
   Atualizar `CF_ACCESS_TEAM_DOMAIN`.

**Desligar o Access em emergência** (o login Espo continua protegendo):

1. Vercel: apagar `CF_ACCESS_TEAM_DOMAIN` e `CF_ACCESS_AUD` → Redeploy.
2. Só depois, se preciso: DNS do `dash` → "DNS only" e/ou desativar a aplicação no Zero Trust.

A ordem importa: desligar a Cloudflare antes de tirar as variáveis deixa todo mundo com 403.

**SSL (525/526/loop):** conferir a Configuration Rule `dash - SSL Full strict`.
Certificado da Vercel para o domínio: Vercel → Domains (renova sozinho; se falhar com proxy,
"DNS only" por alguns minutos, renovar, religar o proxy).

## Smoke após qualquer mudança

1. Aba anônima → `https://dash.segurosimediato.com.br` → tela do Access → código por e-mail.
2. Após o código → `/login` do dash → usuário humano Espo → home com KPIs.
3. `https://dash-producao-taupe.vercel.app/login` → **403** (não passa pela Cloudflare).
4. `curl -I --resolve dash.segurosimediato.com.br:443:76.76.21.21 https://dash.segurosimediato.com.br/login` → **403**.
5. Logado: `GET /api/meta/asof` com `aggerRun` de hoje.
