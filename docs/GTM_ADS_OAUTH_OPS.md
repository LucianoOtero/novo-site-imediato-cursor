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

## 6. Análise de experimento por janela (read-only)

Scripts generalizados em `scripts/google-ops/` (requer `config.local.json` + `token.json` com Ads e Analytics):

```bash
# Google Ads
node scripts/google-ops/experiment-analyze-ads.mjs --start 2026-08-17 --end 2026-08-21 --out scripts/google-ops/ads-analysis-w2.json

# GA4
node scripts/google-ops/experiment-analyze-ga4.mjs --start 2026-08-17 --end 2026-08-21 --out scripts/google-ops/ga4-analysis-w2.json

# Firebase (site novo e legado)
node scripts/google-ops/experiment-analyze-firebase-leads.mjs --start 2026-08-17 --end 2026-08-21 --project imediato-seguros-site-novo --out scripts/google-ops/leads-analysis-w2-novo.json
node scripts/google-ops/experiment-analyze-firebase-leads.mjs --start 2026-08-17 --end 2026-08-21 --project leads-imediato-seguros --out scripts/google-ops/legacy-leads-analysis-w2.json

# Comparar duas semanas
node scripts/google-ops/experiment-compare-weeks.mjs \
  --w1-start 2026-08-10 --w1-end 2026-08-14 \
  --w2-start 2026-08-17 --w2-end 2026-08-21 \
  --ads-w1 scripts/google-ops/ads-analysis-5bd-2026-08-10-14.json \
  --ads-w2 scripts/google-ops/ads-analysis-w2.json \
  --ga4-w1 scripts/google-ops/ga4-analysis-5bd-2026-08-10-14.json \
  --ga4-w2 scripts/google-ops/ga4-analysis-w2.json \
  --leads-novo-w1 scripts/google-ops/leads-analysis-5bd-2026-08-10-14.json \
  --leads-novo-w2 scripts/google-ops/leads-analysis-w2-novo.json \
  --leads-legacy-w1 scripts/google-ops/legacy-leads-analysis-5bd-2026-08-10-14.json \
  --leads-legacy-w2 scripts/google-ops/legacy-leads-analysis-w2.json
```

Relatório analítico: [`docs/ANALISE_EXPERIMENTO_COMPARATIVO_2026-08-10-14_vs_2026-08-17-21.md`](../docs/ANALISE_EXPERIMENTO_COMPARATIVO_2026-08-10-14_vs_2026-08-17-21.md). Metodologia de referência: [`docs/ANALISE_EXPERIMENTO_5DU_2026-08-10-14.md`](../docs/ANALISE_EXPERIMENTO_5DU_2026-08-10-14.md).

## 7. Porto Seguro — duas camadas (campanha dedicada + PHRASE nas atuais)

**Problema:** PHRASE `"porto seguro"` nas campanhas genéricas também bloqueia intenções úteis (`porto seguro cotação`). EXACT sozinho na marca nua não corta admin longo nem o volume de marca com palavras extras.

**Desenho**

1. **Campanha nova** `ATIVA - Porto Seguro Cotacao - Site Novo` — Final URL `https://novo.segurosimediato.com.br/cotacao-porto` (LP dedicada no padrão home); keywords PHRASE/EXACT de cotação/comparação; negativas EXACT `[porto seguro]` + admin + clone das negativas do Exp.
2. **Campanhas atuais** (Diurna, Noturna, Exp) — PHRASE `"porto seguro"` / `"porto seguros"` para parar marca/admin nessas campanhas. O braço Exp do site novo continua com Final URL principal em `/cotacao` (página alinhada ao formato da home).

Parâmetros espelhados do Exp (`24095000558`): Search, redes Search+partners, Maximize Conversions, geo/idioma/agenda úteis 9–18, tracking `{lpurl}?gclid={gclid}`, finalUrlSuffix canônico UTM. Budget default Porto: **R$ 200/dia** (próprio).

**Arquivos**

- Spec: [`scripts/google-ops/ads-porto-campaign-spec.json`](../scripts/google-ops/ads-porto-campaign-spec.json)
- Snapshot Exp: `node scripts/google-ops/ads-snapshot-exp-campaign.mjs`
- Criar campanha: `node scripts/google-ops/ads-create-porto-campaign.mjs --dry-run` / `--apply` (`--enable` para ativar)
- PHRASE nas atuais: `node scripts/google-ops/ads-add-porto-phrase-existing.mjs --dry-run` / `--apply`
- Orquestrador domingo: [`ads-porto-sunday-orchestrator.mjs`](../scripts/google-ops/ads-porto-sunday-orchestrator.mjs) + wrapper `.ps1`
- Lista admin EXACT (legado / higiene): [`ads-porto-negatives.json`](../scripts/google-ops/ads-porto-negatives.json)

**Agendamento:** tarefa `Imediato-Ads-PortoCampaign-20260921` (21/09/2026 06:00) → orchestrator `--apply --enable` + e-mail SES. Substitui `Imediato-Ads-PortoNegatives-20260921`.

**Rollback**

1. Pausar a campanha Porto no Ads.
2. Remover as PHRASE negativas `porto seguro` / `porto seguros` nas campanhas Diurna/Noturna/Exp.
3. (Opcional) apagar a campanha Porto se não for reutilizar.

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
