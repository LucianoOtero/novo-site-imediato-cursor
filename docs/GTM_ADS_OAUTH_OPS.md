# GTM + Google Ads — OAuth local (ops)

## Finalidade

Autenticar scripts em [`scripts/google-ops/`](../scripts/google-ops/) contra a **Tag Manager API** (e, opcionalmente, **Google Ads API**) para aplicar o split RPA/consultor e o experimento sem depender do Browser MCP.

Segredos **nunca** vão para o git (`client_secret.json`, `token.json`, `config.local.json`).

## Pré-requisitos

- Conta Google com permissão de edição no container `GTM-PD6J398` (conta Imediato Seguros).
- Node.js ≥ 20.
- Projeto no [Google Cloud Console](https://console.cloud.google.com/) (pode ser novo, só para ops).

## 1. Cloud Console — APIs e OAuth

1. Crie ou selecione um projeto GCP (ex.: `imediato-gtm-ops`).
2. **APIs & Services → Library** — ative:
   - **Tag Manager API**
   - **Google Ads API** (só se for criar conversion actions por API)
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (ou Internal se Workspace permitir).
   - App name: `Imediato GTM Ops` (ou similar).
   - Support email: o seu.
   - Scopes (Add or remove):
     - `.../auth/tagmanager.readonly`
     - `.../auth/tagmanager.edit.containers`
     - `.../auth/tagmanager.edit.containerversions`
     - `.../auth/tagmanager.publish`
     - (opcional Ads) `.../auth/adwords`
   - Test users: adicione o e-mail que edita o GTM (obrigatório enquanto o app estiver em **Testing**).
   - Em Testing, refresh tokens expiram ~7 dias — para ops contínuo, publique o app em **Production** (só uso interno/ops; escopos sensíveis podem exigir verificação — para Desktop + usuários de teste costuma bastar Testing no curto prazo).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Name: `imediato-google-ops-desktop`
   - Download JSON → salvar como:

```text
scripts/google-ops/client_secret.json
```

## 2. Login local

```powershell
cd "scripts/google-ops"
npm install
npm run auth
```

Com escopo Ads (além do GTM):

```powershell
npm run auth -- --with-ads
```

O browser abre o consentimento Google. Aceite com a **mesma conta** que vê o container no tagmanager.google.com. Ao terminar, grava `token.json`.

Avisos comuns:

- “Google hasn’t verified this app” → Advanced → Continue (é o seu client).
- “This app is blocked” → use o **seu** Desktop client (não o client genérico do gcloud) e confira se o e-mail está em Test users.

## 3. Validar acesso GTM

```powershell
npm run gtm:whoami
npm run gtm:inspect
```

Esperado:

- `gtm:whoami` lista `GTM-PD6J398` e grava `config.local.json` com `accountPath` / `containerPath`.
- `gtm:inspect` lista itens `[NovoSite]*` e o acionador/tag `form_quote_choice` atuais (estado v38 pré-split).

## 4. Google Ads API (auditoria / depois)

Finalidade futura: listar campanhas, experimento `Exp site novo vs legado 50/50`, conversões e resultados sem depender da UI.

OAuth com `--with-ads` **não basta**. Ainda é preciso:

1. Conta Google Ads `AW-815139667` (ou MCC) → **Tools → API Center** → **Developer token**.
2. Em contas novas o token costuma ficar em **Test / Pending Approval** — mutações e alguns reads de produção podem ser limitados até aprovação.
3. Relogar: `npm run auth -- --with-ads` (inclui escopo `adwords`).
4. Preencher em `config.local.json` (ver `config.local.example.json`):

```json
"googleAds": {
  "customerId": "815139667",
  "developerToken": "…",
  "loginCustomerId": "MCC se aplicável"
}
```

Enquanto o Developer Token não estiver ok, GTM segue por OAuth atual; Ads permanece UI + orientação.

## 5. Ordem recomendada após OAuth ok

1. Baseline Ads 7d (UI) + `gtm:inspect` (já feito via `gtm.js` + scripts).
2. Criar action RPA no Ads (UI ou API) → anotar label.
3. Aplicar split no workspace GTM (script dedicado ou UI) — só `[NovoSite]*` + hostname.
4. Preview / smoke legado → Publish (API `publish` ou UI).
5. Experimento Ads 50/50 (UI).

## Arquivos (gitignored)

| Arquivo | Conteúdo |
|---|---|
| `scripts/google-ops/client_secret.json` | OAuth Desktop client |
| `scripts/google-ops/token.json` | access + refresh token |
| `scripts/google-ops/config.local.json` | paths GTM + Ads tokens |

## Segurança

- Não commitar os três arquivos acima.
- Não colar `client_secret` / refresh token no chat.
- Revogar o client em Cloud Console se vazar.
- Escopos mínimos: GTM edit + publish; Ads só se necessário.
