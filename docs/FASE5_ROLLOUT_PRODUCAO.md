# Fase 5 — Rollout produção (checklist + aceite)

**Data alvo:** 2026-08-30  
**Status:** preparação documental/scripts pronta (2026-08-29); execução D0/D1 **pendente de autorização**.  
**Pré-requisito:** Fases 0–4 verdes.  
**Plano canônico:** [`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](ATRIBUICAO_ADS_SITE_NOVO_ESPO.md) §2 Fase 5 + §9.

**Decisão fixa:** Opp POST continua só com `cGclid`; pacote Ads/UTM/`cCanalCaptura` em PUT best-effort (já na CF). Após espelhar schema em prod, o PUT passa a gravar — **sem** redeploy obrigatório da CF.

---

## Escopo / fora de escopo

| Inclui | Não inclui |
|---|---|
| Espelhar Entity Manager DEV → Espo prod | Alterar Controle Ads `21287198336` |
| Commit + deploy Vercel prod (código Fases 1–3) | Suffix da conta Ads |
| Smoke mínimo prod + purga | Site legado / Octadesk params novos |
| Monitor 48h + placar | Suite E2E 23 casos em prod |
| | Incluir pacote Ads no POST de criação Opp |

---

## Fluxo

```text
D0 preflight (commit + inventário prod)
  → D1 Espo UI Admin (espelhar campos)
  → gate inventário prod 100% OK
  → deploy Vercel production
  → smoke F5PROD (RTDB production → Espo prod)
  → purga teste
  → monitor 48h → aceite formal
```

---

## D0 — Pré-voo

### 1. Commit (só com autorização explícita)

Incluir código de atribuição ainda local: `lib/leads/attribution.ts`, UTM expandido, `modalChannel`, CF já alinhada, scripts Fases 0–5, docs.

### 2. Inventário Espo **prod** real

`ESPOCRM_API_CONFIG` tem prioridade sobre `ESPO_BASE_URL` (fix 2026-08-29). Ainda assim, para clareza:

```powershell
$env:ESPOCRM_API_CONFIG = gcloud secrets versions access latest --secret=ESPOCRM_API_CONFIG --project=imediato-seguros-site-novo
node scripts/espo-ops/fase0-attribution-fields.mjs --prefer=prod
```

**Gate:** relatório com `baseUrl: https://flyingdonkeys.com.br` e lista MISSING (se houver).

**Inventário real 2026-08-29** (`--prefer=prod`, source `ESPOCRM_API_CONFIG.prod`): **todos** os campos do pacote Fase 0 estão MISSING em Lead e Opportunity no prod (Enum + Varchars listados em `PACKAGE_BY_ENTITY`). Espelhar na UI Admin é passo bloqueante do D1.

### 3. Checagens

```powershell
node scripts/google-ops/ads-check-tracking-suffix.mjs
# Exp = canônico; Controle = legado
```

- CF `deliverLead` ativa em `imediato-seguros-site-novo`; secret com bloco `prod`.
- Telefone/e-mail de teste dedicados; avisar equipe (Octadesk/HSM podem disparar).

---

## D1 — Rollout

### 1) Espo prod — UI Admin

Em `https://flyingdonkeys.com.br` (API **não** cria campos de forma confiável):

Lista canônica: `PACKAGE_BY_ENTITY` em [`scripts/espo-ops/fase0-attribution-fields.mjs`](../scripts/espo-ops/fase0-attribution-fields.mjs).

**Lead** (tipicamente faltam):

- Enum `canalCaptura` → `formulario` / `whatsapp` / `telefone`
- Varchar: `wbraid`, `utmCampaignName`, `utmId`, `adgroupId`

**Opportunity** (pacote quase completo):

- Enum `canalCaptura` + todos os Varchar Ads/UTM/ValueTrack do inventário DEV

Depois: Layout “Cotação do Site” (Lead + Opp) → Rebuild + Clear cache.

**Gate schema:**

```powershell
node scripts/espo-ops/fase0-attribution-fields.mjs --prefer=prod
# zero MISSING
```

### 2) Deploy site

- Push `main` → Vercel Production (`novo.segurosimediato.com.br`).
- Confirmar `NEXT_PUBLIC_APP_ENV=production` (sem `\r\n`); StagingBanner ausente.
- Redeploy CF só se o commit tiver diff em `firebase/functions` ainda não publicado.

### 3) Smoke prod

```powershell
node --env-file=.env.local scripts/espo-ops/fase5-prod-smoke.mjs --i-know-this-is-prod
```

Travas do script: flag obrigatória; `prefer=prod`; host `flyingdonkeys.com.br`; `environment=production`.

| Camada | Esperado |
|---|---|
| RTDB | `environment=production`, `data.utm` completo + `campaign_name` |
| Espo prod Lead+Opp | `cUtmCampaign`=ID Exp, `cUtmCampaignName`=literal, `cCanalCaptura=formulario`, click IDs |
| Funil | Lead/Opp criados; cleanup automático no script |
| Ads | Exp suffix intacto; Controle intacto |

Smoke opcional: 1 modal WA **ou** telefone (canal). Não rodar E2E completa em prod.

### 4) Monitor 48h

- Amostra Opp do braço Exp com `cGclid` / `cUtmCampaignName`.
- Logs CF: PUT atribuição sem erro de campo inexistente.
- Placar: [`EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md).

---

## Aceite formal

1. Schema Espo prod = pacote DEV (inventário verde).
2. Site prod captura + persiste atribuição (query → navega → submit).
3. Lead **e** Opp em `flyingdonkeys.com.br` com pacote + `cCanalCaptura` correto.
4. Funil principal não quebra se PUT best-effort falhar em campo pontual.
5. Exp suffix canônico; Controle e legado intocados.
6. Sem regressão óbvia GTM/Ads (`[NovoSite]`).

### No-go / rollback

| Situação | Ação |
|---|---|
| Schema incompleto | Não declarar aceite; site pode ir ao ar (PUT ignora faltantes) |
| Regressão funil pós-deploy | Revert Vercel para deployment anterior |
| Smoke aponta DEV | Abortar — corrigir credenciais; nunca purgar prod “por engano” via DEV |
| Pressão para “fix” no Controle Ads | Recusar |

---

## Scripts

| Script | Uso |
|---|---|
| [`fase0-attribution-fields.mjs`](../scripts/espo-ops/fase0-attribution-fields.mjs) `--prefer=prod` | Inventário schema prod |
| [`fase5-prod-smoke.mjs`](../scripts/espo-ops/fase5-prod-smoke.mjs) `--i-know-this-is-prod` | Smoke RTDB→Espo prod |
| [`ads-check-tracking-suffix.mjs`](../scripts/google-ops/ads-check-tracking-suffix.mjs) | Re-audit Exp/Controle |

---

## Referências

- [`ATRIBUICAO_ADS_SITE_NOVO_ESPO.md`](ATRIBUICAO_ADS_SITE_NOVO_ESPO.md)
- [`AMBIENTE_TESTES_SITE_NOVO.md`](AMBIENTE_TESTES_SITE_NOVO.md) §5
- [`CANAL_CAPTURA_ESPO.md`](CANAL_CAPTURA_ESPO.md)
- [`EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md)
