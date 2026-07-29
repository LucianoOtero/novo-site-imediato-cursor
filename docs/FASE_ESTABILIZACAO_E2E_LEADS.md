# Fase — Estabilização E2E de leads (EspoCRM / Placa Fipe / RPA)

## Finalidade

Registrar os erros e flutuações **ainda abertos** após a entrega de 2026-07-28 (retry EspoCRM, e-mail admin via Cloud Function, rate limit de `/api/validate/*`), para execução em uma **fase dedicada de estabilização** — sem misturar com o roadmap evolutivo de produto (`docs/ROADMAP.md` Fases 1–8).

## Status

**ABERTA** — backlog de estabilização pós-integração. Fluxo crítico lead → Firebase → CF → EspoCRM / Octadesk / e-mail admin está **operacional** (smoke 2026-07-28).

## Contexto (o que já foi fechado nesta entrega)

| Item | Evidência |
|---|---|
| `cf_retry_count` só sobe em falha; reset no `initial` | CF + `lib/leads/firebase-backup.ts` |
| Recuperação de `espocrmLeadId` stale (PUT 404 → find/create) | `firebase/functions/espocrm.js` |
| E-mail admin comandado pela CF (mesmo Cloud Run do legado) | `email-notification.js`; smoke `ld_dd315296f0da` → `Cloud Run OK (total_sent=3)` |
| Rate limit separado `lead` vs `validate` | `lib/leads/security.ts` + rotas `/api/validate/*` |
| Deploy CF `deliverLead` + Vercel produção | `imediato-seguros-site-novo` / `comparaseguroonline.com.br` |

Artefatos E2E de referência: `e2e/testes-espocrm.resultado*.json`, harness `e2e/testes-espocrm.spec.ts`.

---

## Escopo desta fase

Estabilizar a **bateria ponta a ponta** (site real + RPA + EspoCRM) sob carga de testes, para que desfechos `rpa_desabilitado`, funil CRM incompleto na janela do teste e ruído HTTP 409 deixem de atrapalhar validação contínua.

Fora de escopo: blog, CMS, área logada, novas integrações de seguradora, mudanças de produto no funil comercial.

---

## Erros / achados a corrigir ou estabilizar

### E1 — `rpa_desabilitado` intermitente (Placa Fipe / rate limit sob bateria)

- **Sintoma:** botão “Quero calcular agora” permanece desabilitado (~45s); harness marca `rpa_desabilitado`.
- **Exemplo:** caso 17 no `testes-espocrm.resultado-rerun16-17.json` (`infoVisivel=true`, veículo não identificado a tempo).
- **Causa provável:** rate limit compartilhado / latência de `/api/validate/placa` em execução sequencial intensa (diagnóstico: Cloud Run Placa Fipe ok; falha no caminho do site sob carga).
- **Mitigações já feitas:** buckets `validate` 60/min e 500/h; espera maior no harness após blur da placa.
- **Próximos passos:**
  - [ ] Reproduzir caso 17 **isolado** (fora da bateria) e medir 429 / latência.
  - [ ] Avaliar cache curto de placa por IP/sessão ou fila no harness (throttle entre casos).
  - [ ] Confirmar se há regressão residual de rate limit após o deploy Vercel desta versão.

### E2 — Funil EspoCRM incompleto na janela do E2E

- **Sintoma:** lead encontrado no CRM, mas `cEtapaFunil` / `cStatusCalculo` ainda `null` ao fim da espera do teste.
- **Exemplo:** caso 15 em `testes-espocrm.resultado-rerun14-17.json` (desfecho site `sucesso`, CRM parcial).
- **Causa provável:** corrida entre conclusão do RPA, writes RTDB e propagação da CF vs timeout do harness (não necessariamente perda de entrega).
- **Próximos passos:**
  - [ ] Aumentar / tornar adaptativa a espera CRM pós-`rpa_result`.
  - [ ] Assertar por estágio (`Aguardando cálculo` → `Cálculo concluído`) com polling, não snapshot único.
  - [ ] Logar `cf_retry_count` / flags `*_sent` do RTDB no relatório E2E quando o funil ficar incompleto.

### E3 — HTTP 409 EspoCRM em dedupe por telefone

- **Sintoma:** logs da CF com 409 ao criar lead quando já existe registro com o mesmo celular (telefone fixo dos testes: `11976687668`).
- **Impacto:** ruído e retries; a recuperação find/update já existe, mas a bateria E2E reutiliza telefone e aumenta colisões.
- **Próximos passos:**
  - [ ] No harness: telefone único por caso (ou purga confiável pré-caso).
  - [ ] Confirmar que 409 sempre cai no caminho recover (sem consumir orçamento de retry à toa).
  - [ ] Documentar política de dedupe esperada em UAT vs produção.

### E4 — Desfechos `manual` por falha do RPA (não regressão do site)

- **Sintoma:** site exibe cálculo manual após polling; CRM com `Cálculo manual pendente` / `cStatusCalculo=Falhou`.
- **Exemplo:** caso 14 (`rpaLastMensagem`: “Tela 3 falhou”).
- **Classificação:** comportamento esperado do funil quando o RPA falha — **não** é bug do site/CF.
- **Próximos passos (opcional / ops RPA):**
  - [ ] Separar no relatório E2E “falha RPA” vs “falha integração”.
  - [ ] Encaminhar placas instáveis ao time do RPA (fora deste repositório).

### E5 — Cobertura E2E incompleta da bateria de 23 casos

- **Sintoma:** reruns parciais (ex.: 7/10, 14–17, 16–17); documento consolidado `RESULTADOS_TESTES_ESPOCRM_20260728.md` ainda não publicado.
- **Próximos passos:**
  - [ ] Reexecutar bateria completa com throttle entre casos.
  - [ ] Publicar consolidado de resultados com contagem `sucesso` / `manual` / `rpa_desabilitado` / CRM ok.
  - [ ] Gate de aceite desta fase: 0 `rpa_desabilitado` atribuíveis a rate limit do site em corrida controlada.

### E6 — Opportunity sem nome real após passos 2/3 — **RESOLVIDO (2026-07-29)**

- **Sintoma:** Lead atualizado com `firstName` real em `progress`/`complete`; Opportunity permanecia com `name` falso do `initial` (`{ddd}-{celular}-NOVO CLIENTE WHATSAPP`). Evidência: caso 16 E2E.
- **Causa:** `buildOpportunityFields` em `firebase/functions/espocrm.js` só enviava `name` na criação (`isCreate`), ao contrário do proxy legado (`'name' => $name` no PATCH) e do `firstName` do Lead.
- **Correção:** no update, enviar `name: leadData.nome` quando preenchido (`compact` remove vazio). Harness E2E passou a ler também `cEmailAdress`/`cCEP`/`cCpftext`/`cCelular` na Opportunity.

---

## Critérios de saída desta fase

1. Caso problemático de placa (ex. 17) passa isolado e dentro de bateria com intervalo ≥ N s entre casos (N a calibrar).
2. Após `sucesso` no site, CRM mostra funil coerente (`Cálculo concluído` ou `Cálculo manual pendente`) dentro do timeout documentado.
3. 409 de dedupe não gera `failed_permanently` nem e-mail/admin falso-negativo.
4. Relatório consolidado da bateria anexado em `/docs` (ou `e2e/`).

## Relação com outras docs

- Arquitetura vigente: `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md`
- Roadmap de produto (não confundir): `docs/ROADMAP.md`
- Templates Octadesk: `docs/GUIA_OCTADESK_TEMPLATES.md`

## Histórico

| Data | Nota |
|---|---|
| 2026-07-29 | E6 resolvido: Opportunity passa a receber `name` real em `progress`/`complete` (`espocrm.js`). |
| 2026-07-28 | Fase aberta a partir dos achados pós-fix e-mail/EspoCRM e reruns E2E. |
