# Plano — Dashboard de produção comercial (`dash.segurosimediato.com.br`)

**Status:** PLANEJADO — 2026-09-16 · **F0+F1 CONCLUÍDAS** · **F2 PROPOSTA** · **F3 CONCLUÍDA** · **F4 APP+APIs** ([`dash-producao/FASE4_APP_NEXT.md`](dash-producao/FASE4_APP_NEXT.md); UI mínima incluída — F5 refina desk/deploy)  
**Origem:** especificação de produção mensal Espo × Agger + questionário de requisitos (53 decisões).  
**Escopo deste documento:** plano de implementação somente. **Não** inclui código, deploy, alteração de Role Espo nem provisionamento DNS nesta etapa.

**Referências:**
- Espo / venda: [`EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md`](EXPERIMENTO_PLACAR_COMERCIAL_ESPO.md), [`FLUXO_LEADFORM_CRM_WHATSAPP.md`](FLUXO_LEADFORM_CRM_WHATSAPP.md), [`MEDICAO_VENDA_POR_TIPO_LEAD.md`](MEDICAO_VENDA_POR_TIPO_LEAD.md)
- Agger / Supabase: [`agger-ops/CONTRATO_SUPABASE_AGGER.md`](agger-ops/CONTRATO_SUPABASE_AGGER.md), [`agger-ops/API_OPERACIONAL.md`](agger-ops/API_OPERACIONAL.md), [`agger-ops/MAPA_EXPORT_PRODUCAO.md`](agger-ops/MAPA_EXPORT_PRODUCAO.md), [`agger-ops/RUNBOOK.md`](agger-ops/RUNBOOK.md)
- Dashboard operacional irmão (não reutilizar como app): `agger-ops/dashboard/`

---

## 0. Objetivo do produto

Painel interno em **`dash.segurosimediato.com.br`** para controle de produção de vendedores no estilo de **desks financeiros** (KPIs densos, tabelas auditáveis, inconsistências explícitas; na fase 2 — gráficos sofisticados).

| Camada | Fonte | Métrica |
|---|---|---|
| **Produzido** | EspoCRM Opportunity | Σ `amount` (Valor Comissão), BRL |
| **Emitido** | Supabase `agger_policy.comissao_valor` | Comissão registrada no Agger após join |
| **Projetado** | Cálculo | Fórmula por dias úteis + coluna de média 3 meses |
| **Inconsistências** | Regras | Visão consolidada; linhas **nunca** escondidas |

Visões temporais no MVP: **mês corrente** e **mês anterior** lado a lado (`America/Sao_Paulo`).

---

## 1. Decisões travadas (contrato de requisitos)

### 1.1 Acesso Espo (fase 0 → adaptação)

| ID | Decisão |
|---|---|
| Inventário | API key **prod** atual (`flyingdonkeys`) para descobrir ACL |
| Mudanças | Pode alterar Role do user da key **e/ou** (preferido no go-live) criar **Role + usuário API novos** só para o dash |
| Admin | Disponível na hora |
| Instâncias | Painel lê **prod**; DEV só para smoke de ACL/API |
| Entidades | `Opportunity`, `User`, `Team`, `Account` |
| Visão | Leitura **global** (todas as vendas elegíveis) |
| Doc ACL | Alinhar à **major** do Espo em produção + validar na instância |

### 1.2 Elegibilidade de venda (Espo)

Uma Opportunity entra no painel do mês M se **e somente se**:

1. `stage === "Vendido"` **no momento da consulta** (snapshot ao vivo), **e**
2. `cDataDeEmisso` preenchida **e** cai em M (mês da visão).

| Borda | Comportamento |
|---|---|
| Emissão em ago, virou Vendido em set | **Não** entra em set (emissão ≠ mês da visão) |
| Sai de `Vendido` | Some no próximo refresh |
| `amount` vazio | Entra com produzido **R$ 0** |
| Moeda | Sempre BRL; outra moeda = inconsistência |
| Granularidade | 1 Opp = 1 linha |

Campo UI “Data de Emissão” → API **`cDataDeEmisso`** (confirmado em [`FLUXO_LEADFORM_CRM_WHATSAPP.md`](FLUXO_LEADFORM_CRM_WHATSAPP.md)).

### 1.3 Emitido (Agger / Supabase)

| ID | Decisão |
|---|---|
| Valor | `agger_policy.comissao_valor` |
| Frescor | Até **D-1** OK; UI mostra timestamp do último `agger_run` OK |
| Sem match | Opp entra; emitido = 0 |
| Match múltiplo | Exceção; emitido = 0 até resolver; marcar inconsistência |
| Só Agger (sem Opp) | Entra como linha “só Agger” (produzido 0, emitido = comissão) **somente se Venda Nova** |
| Renovação | **Fora do painel** nas linhas só-Agger; filtro **não** exclui Opp `Vendido` mesmo se Agger disser renovação |
| Campo Renovação/Venda Nova | **Não tipado hoje no ingest** — discovery obrigatória (candidato raw: `NEGÓCIO CORRETORA`) |
| `is_active = false` | **Incluir** linha + marcar inconsistência |

### 1.4 Join Espo ↔ Agger

**Não cravar chave antes da discovery.** Hipótese de fallback:

`CPF (cCpftext / doc_norm) + seguradora + proximidade cDataDeEmisso ≈ data_emissao`

Nota: no Espo, `cApolice` é **arquivo**, não número — mapear se existe campo de nº apólice/proposta na Opp.

### 1.5 Vendedor

| ID | Decisão |
|---|---|
| Agrupamento | `assignedUser` da Opportunity |
| Divergência Agger | Mantém nome Espo; marca inconsistência no lado Agger |
| Só Agger | Usa `agger_policy.vendedor` |
| Sem vendedor | Bucket **“Não atribuído”** + inconsistência |
| Lista | Quem **aparecer** no mês (não cadastro fechado zerado) |

### 1.6 Projeção

**Úteis** = seg–sex, menos feriados **nacionais BR + SP + município de São Paulo**.

```
projetado(métrica) = métrica_até_agora × (úteis_no_mês / úteis_decorridos_até_hoje_inclusive)
```

Aplicar a **produzido** e **emitido**.

Coluna adicional: **média do produzido Espo dos 3 meses calendário anteriores**, por vendedor.

Totais do header: exibir **(a)** soma das projeções por vendedor **e** **(b)** projeção sobre o total da casa (podem divergir).

### 1.7 Produto / UX / infra

| Tema | Decisão |
|---|---|
| Telas MVP | Duas rotas: **analítico** + **consolidado por vendedor** (+ bloco/painel de inconsistências) |
| Colunas analítico | Opp id, cliente (nome completo), vendedor, data emissão, produzido, emitido, seguradora, ramo, nº apólice/proposta, status match, flags, **link Espo** |
| Export | Excel + filtros (vendedor, inconsistência, mês corrente/anterior) |
| Refresh | Load + botão **Atualizar** |
| Audiência | Todos usuários internos veem **tudo** |
| Visual MVP | Tabelas + KPIs sólidos; **fase 2**: UI sofisticada estilo mercado financeiro + gráficos por vendedor/seguradora nos meses subsequentes (universo = vendedores ativos no mês de referência) |
| App | Next.js **novo** (não estender `agger-ops/dashboard`) |
| Auth | Login via **EspoCRM** |
| Rede | Público + **Cloudflare Access / Zero Trust** |
| Consolidação | Preferir **ao vivo no Next**; se degradar → **worker dedicado** (critério a definir na fase de perf) |
| Espo | Sempre **ao vivo** no Atualizar/load |
| SLA | Sem meta formal de latência; priorizar correção dos números |
| Match % | Só monitoramento; sem limiar de “falha” |
| Homologação | Conjunta; divergência permanece como inconsistência até fechar |
| Entrega | Sem data fixa; **MVP tabular** primeiro; gráficos full na fase 2 |

---

## 2. Arquitetura-alvo (visão)

```
                    ┌─────────────────────┐
  Usuário ─────────►│ dash.segurosimediato │  Cloudflare Access
                    │ Next.js (app novo)   │  Auth sessão Espo
                    └──────────┬──────────┘
                               │ server-side only
              ┌────────────────┼────────────────┐
              ▼                                 ▼
     EspoCRM prod API                  Supabase (imediato-agger)
     (Opportunity…)                    agger_policy (+ discovery)
              │                                 │
              └──────────── join/rules ─────────┘
                               │
                    KPIs + analítico + consolidado
                    + inconsistências + projeções
```

- Credenciais Espo/Supabase **nunca** no browser.
- Agger continua sendo alimentado pelo RPA diário ([`RUNBOOK.md`](agger-ops/RUNBOOK.md)); o dash **não** lê Excel.

---

## 3. Fases de execução (ordem)

### Fase 0 — Inventário de acesso Espo + documentação ACL

**Objetivo:** saber o nível **atual** da API key prod e o nível **necessário** segundo a doc Espo da mesma major.

**Entradas:** `ESPO_BASE_URL` + `ESPO_API_KEY` (ou `ESPOCRM_API_CONFIG.prod`); versão Espo (UI/About ou endpoint metadata).

**Trabalho:**

1. Obter versão Espo em produção.
2. Consultar documentação oficial Roles / ACL / API (scopes `Opportunity`, `User`, `Team`, `Account`, campos custom `c*`).
3. Inventário via API (somente o necessário; sem PII em logs):
   - identidade do user da key (`App/user` ou equivalente);
   - roles, permissões por entity (read/stream/create/…);
   - field-level ACL nos campos: `stage`, `amount`, `cDataDeEmisso`, `assignedUser`, `cCpftext`, `cSeguradora`, links Account/Team.
4. Smoke read-only: listar/filtrar Opportunities com `stage=Vendido` + select dos campos do contrato.
5. Entregável: `docs/dash-producao/ESPO_ACL_INVENTORY.md` com:
   - ACL atual (matriz entity × ação);
   - ACL necessária (matriz alvo);
   - **gap report**.

**Saída de aceite Fase 0:** gap report revisado; lista mínima de permissões para o user do dash.

**Não fazer nesta fase:** alterar Roles em prod (exceto se explicitamente autorizado no kickoff da Fase 1).

---

### Fase 1 — Adaptação de acesso Espo

**Objetivo:** fechar gaps para o dashboard sem contaminar a key usada por scripts/RPA/CF.

**Trabalho (decisão Q52 = C):**

1. Criar **Role** `dashboard-producao-readonly` (nome final a escolher) com:
   - read global em Opportunity / User / Team / Account;
   - field read nos campos do contrato;
   - **sem** create/update/delete/stream desnecessário.
2. Criar **usuário API** dedicado + API key.
3. Validar no **DEV** primeiro (smoke das mesmas queries).
4. Espelhar Role/user em **prod**.
5. Guardar secret do dash (Vercel/CF env) separado de `ESPOCRM_API_CONFIG` dos scripts.
6. Atualizar inventário: “ACL atual = ACL necessária”.

**Saída de aceite Fase 1:** smoke prod com a key nova lista Opps `Vendido` do mês corrente com `amount` + `cDataDeEmisso` + `assignedUserName`.

---

### Fase 2 — Discovery de dados (join + Renovação/Venda Nova)

**Objetivo:** cravar chaves e filtros que hoje estão abertos.

**Trabalho:**

1. **Espo:** mapear campos reais de nº apólice / proposta / CI / placa (metadata Field Manager + amostra de Opps Vendido).
2. **Agger:** inspecionar Excel/`agger_raw_row` / coluna `NEGÓCIO CORRETORA` (e correlatas) para discriminar **Venda Nova** vs **Renovação**.
3. Propor e documentar chave de join definitiva + regras de desempate (já decidido: multi-match = exceção).
4. Estimar taxa de match em 1–2 meses amostra (sem limiar de falha; só baseline).
5. Se necessário: estender ingest (`ingest.mjs` aliases + coluna tipada) — **plano de schema** separado, executável após aceite desta fase.
6. Entregável: `docs/dash-producao/CONTRATO_JOIN_ESPO_AGGER.md`.

**Saída de aceite Fase 2:** contrato de join assinado (homologação conjunta); glossário Renovação/Venda Nova; lista de inconsistências tipadas.

---

### Fase 3 — Motor de domínio (biblioteca pura)

**Objetivo:** regras de negócio testáveis sem UI.

**Módulo sugerido:** `packages/dash-producao-core` ou `scripts/dash-producao/lib/` (a definir no kickoff de código).

| Função | Responsabilidade |
|---|---|
| `eligibleOpp(opp, month)` | stage + `cDataDeEmisso` ∈ mês |
| `businessDays(month, asOf, calendar)` | úteis SP-capital |
| `project(amount, daysElapsed, daysMonth)` | fórmula crua |
| `avgLast3Months(vendorId, metric)` | média produzido |
| `joinOppPolicy(opp, policies)` | 1:1 / none / multi |
| `classifyFlags(row)` | amount0, noMatch, multiMatch, inactive, vendorMismatch, unassigned, currency, … |
| `consolidateByVendor(rows)` | totais + projeções |
| `houseTotals(rows)` | Σ + projeção casa |

**Testes unitários** com fixtures (sem rede): bordas de mês, saída de Vendido, multi-match, renovação só-Agger, projeções dia 1.

**Calendário:** lib de feriados BR + SP + município São Paulo + override config (lista interna se a lib falhar).

**Saída de aceite Fase 3:** suíte unitária verde; matriz de inconsistências documentada.

---

### Fase 4 — API / consolidação no app

**Objetivo:** servir snapshots prontos para a UI.

**Preferência (Q46):** consolidação **ao vivo** em Route Handlers / Server Actions do Next.

**Fallback:** worker (`D`) se p95/percepção degradar — critério a registrar após primeiro load real (ex. timeout Espo, >N Opps). Plano do worker: job que grava `dash_production_snapshot` no Supabase; UI lê snapshot + botão “Atualizar” força recompute.

**Endpoints MVP (nomes ilustrativos):**

| Método | Rota | Retorno |
|---|---|---|
| GET | `/api/production?month=YYYY-MM` | header KPIs + por vendedor + inconsistências resumidas |
| GET | `/api/production/lines?month=` | analítico paginado/filtrável |
| GET | `/api/production/export?month=` | Excel |
| GET | `/api/meta/asof` | timestamp Espo query + último `agger_run` |

**Auth:** sessão após login Espo (validar user/password ou token conforme doc da major); middleware protege `/` e `/api/*`.

**Saída de aceite Fase 4:** com Cloudflare Access + login Espo, `GET /api/production` retorna mês corrente coerente com amostra homologada manualmente (5–10 vendas).

---

### Fase 5 — UI MVP (`dash.segurosimediato.com.br`)

**App novo** Next.js (App Router), hospedagem Vercel (ou stack alinhada ao DNS do domínio).

**Rotas MVP:**

| Rota | Conteúdo |
|---|---|
| `/login` | Login Espo |
| `/` | Header: produzido / emitido / projetado(s) / média 3m; toggle mês corrente \| anterior; as-of |
| `/vendedores` | Consolidado por vendedor (produzido, emitido, projetado produzido/emitido, média 3m, # flags) |
| `/analitico` | Tabela linha a linha + filtros + export Excel + link Espo |
| `/inconsistencias` | Visão consolidada de flags (agrupada por tipo) |

**Design MVP:** denso, tipografia e hierarquia claras, tema sóbrio (evitar “AI purple”); preparar tokens CSS para a fase 2 “desk financeiro”.

**Saída de aceite Fase 5:** gerência consegue abrir, filtrar, exportar e conciliar 1 dia de produção com o processo conjunto.

---

### Fase 6 — Hardening de plataforma

1. DNS `dash.segurosimediato.com.br` → host.
2. **Cloudflare Access** (política e-mail/domain Imediato).
3. Secrets: Espo dash user, `DATABASE_URL` read (Supabase), session secret.
4. Observabilidade: logs sem PII (sem CPF completo em log); erro Espo/Agger visível na UI.
5. Runbook: `docs/dash-producao/RUNBOOK.md` (falha ingest Agger, key Espo, Access).

**Saída de aceite Fase 6:** acesso só via Access + login Espo; runbook validado.

---

### Fase 7 — Fase 2 produto (pós-MVP; fora do caminho crítico)

Conforme Q42/Q53 — **não bloqueia** o MVP:

1. Visual sofisticado (desk financeiro): sparklines, heat/ranking, micro-interações sóbrias.
2. Gráficos: produção por **vendedor** e por **seguradora** nos **meses subsequentes**, com série limitada aos **vendedores ativos no mês de referência**.
3. Possível materialização/worker se o ao vivo não aguentar histórico multi-mês.
4. Polimento export, deep-links, favoritos de filtro.

---

## 4. Catálogo de inconsistências (MVP)

| Código | Condição | Efeito nos totais |
|---|---|---|
| `AMOUNT_ZERO` | `amount` null/0 | Entra com 0 |
| `NO_AGGER_MATCH` | Opp sem policy | Emitido 0 |
| `MULTI_AGGER_MATCH` | >1 policy | Emitido 0 |
| `AGGER_INACTIVE` | `is_active=false` | Entra + flag |
| `VENDOR_MISMATCH` | Espo ≠ Agger nome | Agrupa Espo + flag |
| `UNASSIGNED` | sem assignedUser / sem vendedor Agger | Bucket Não atribuído |
| `CURRENCY_NON_BRL` | moeda ≠ BRL | Flag; política = não somar ou 0 (definir no motor: default não somar em Σ BRL) |
| `AGGER_ORPHAN_NEW` | só Agger + Venda Nova | Produzido 0 |
| `JOIN_KEY_WEAK` | match por heurística baixa confiança | Flag (se discovery introduzir score) |

Renovação só-Agger: **excluída** (não é inconsistência — filtro de escopo).

---

## 5. Homologação e fonte da verdade

- **Produzido:** Espo (`amount`) sob regras de elegibilidade.
- **Emitido:** Agger (`comissao_valor`) após join.
- Divergência Espo↔Agger (valores ou vendedor): permanece como **inconsistência** até homologação **conjunta** fechar.
- Amostra de aceite: checklist de N Opps + N apólices do mês corrente e do mês anterior.

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Join frágil (sem nº apólice no Espo) | Fase 2 discovery; fallback CPF+seguradora+data; flags |
| Campo Renovação ausente no schema | Estender ingest após discovery; até lá órfãos Agger podem ficar incompletos |
| Excel COM / ingest Agger falha de manhã | UI mostra as-of stale; produzido Espo continua ao vivo |
| Latência Espo ao vivo | Fallback worker (Fase 4); sem meta rígida no MVP |
| Key prod compartilhada demais | User API dedicado (Fase 1) |
| Escopo visual “full desk” atrasa MVP | Fase 7 explícita; MVP tabular primeiro |

---

## 7. Entregáveis por fase (checklist)

- [x] **F0** `ESPO_ACL_INVENTORY.md` + gap (2026-09-16)
- [x] **F1** Role + API user dash + smoke DEV/prod + secret `ESPO_DASH_API_CONFIG`
- [x] **F2** `CONTRATO_JOIN_ESPO_AGGER.md` + glossário Nova/Renovação (homologação comercial pendente)
- [x] **F3** lib + testes unitários (`scripts/dash-producao/lib` + `npm run test:dash-producao`)
- [ ] **F4** API Next + auth Espo
- [ ] **F5** UI MVP (3–4 rotas) + export Excel
- [ ] **F6** DNS + Cloudflare Access + runbook
- [ ] **F7** (depois) gráficos + UI sofisticada

---

## 8. Ordem de kickoff recomendada

1. Fase 0 (ACL) — desbloqueia segurança do desenho.  
2. Fase 2 em paralelo leve (amostra Excel/raw Renovação) enquanto admin prepara Fase 1.  
3. Fase 1 (user API).  
4. Fase 3 → 4 → 5 → 6.  
5. Fase 7 quando o MVP estiver homologado.

---

## 9. Fora de escopo (explícito)

- Alterar campanhas Ads / experimento placar W1–Wn.
- Write-back no Agger Gestor.
- Operar abrindo `incoming\*.xlsx`.
- Substituir o dashboard Agger de RPA/funil (`agger-ops/dashboard`).
- **Execução** deste plano (código, Roles, DNS) — somente mediante ordem explícita após aprovação deste documento.

---

## 10. Aprovação

| Papel | Ação |
|---|---|
| Product / Luciano | Aprovar este plano ou devolver com deltas |
| Engenharia | Só inicia Fase 0 após aprovação |
| Homologação comercial | Entra a partir do aceite Fase 5 |

**Próximo passo após aprovação:** executar **Fase 0** (inventário ACL Espo + gap report), sem UI.
