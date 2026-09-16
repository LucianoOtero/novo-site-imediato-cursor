# Fase 0 — Inventário ACL EspoCRM + gap report

**Status:** CONCLUÍDA (2026-09-16)  
**Instância:** produção `https://flyingdonkeys.com.br`  
**EspoCRM version:** **9.2.2** (Settings API)  
**Plano pai:** [`../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md`](../PLANO_DASHBOARD_PRODUCAO_COMERCIAL.md)  
**Artefato bruto (sem PII):** [`../../scripts/espo-ops/fase0-espo-acl-inventory-prod.json`](../../scripts/espo-ops/fase0-espo-acl-inventory-prod.json)  
**Script:** [`../../scripts/espo-ops/fase0-espo-acl-inventory.mjs`](../../scripts/espo-ops/fase0-espo-acl-inventory.mjs)

**Operação:** somente leitura. Nenhuma Role/usuário foi alterado nesta fase.

---

## 1. Documentação oficial (major 9.x)

Fontes alinhadas à major instalada (9.2.2; baseline role existe “as of v9.2”):

| Tema | Doc |
|---|---|
| Roles / actions / levels / field-level | [Roles management](https://docs.espocrm.com/administration/roles-management/) |
| API User + API Key + Roles | [API](https://docs.espocrm.com/development/api/) (recomendação: **API User dedicado** por propósito) |
| ACL programático | [ACL](https://docs.espocrm.com/development/acl/) |
| Scopes metadata | [scopes](https://docs.espocrm.com/development/metadata/scopes/) |

**Níveis relevantes (mais → menos permissivo):** `all` · `team` · `own` · `no`  
**Ações:** create · read · edit · delete · stream  
**Field-level:** por padrão, se o user lê o record, lê todos os campos; restrições explícitas são `yes`/`no` por campo.

Para o dashboard (só leitura global), a doc indica: Role com **read = all** nos scopes necessários, **sem** create/edit/delete, e API User com método API Key.

---

## 2. Identidade da API key usada no inventário

| Atributo | Valor |
|---|---|
| User id | `68efbdcd5669cb38a` |
| userName | `add_travelangels` |
| type | `api` |
| isActive | true |
| Role aplicada | **API** (`66874758784902cb9`) |
| Teams | 0 |

> Esta key é a de **produção** já usada por integrações/scripts. A Fase 1 deve criar **outro** API User + Role só para o dash (decisão Q52), para least privilege.

---

## 3. ACL atual (`App/user` → `acl.table`)

| Scope | create | read | edit | delete | stream |
|---|---|---|---|---|---|
| **Opportunity** | yes | **all** | all | no | all |
| **User** | no | **all** | own | no | no |
| **Team** | no | **all** | no | no | no |
| **Account** | yes | **all** | all | no | all |
| Lead | yes | all | all | no | all |
| Contact | yes | all | all | no | all |
| **Role** | — | **sem acesso** (GET Role → **403**) | — | — | — |

**Permissões especiais (amostra):**

| Permission | Valor |
|---|---|
| exportPermission | yes |
| dataPrivacyPermission | yes |
| assignmentPermission | all |
| userPermission | (presente no payload) |
| auditPermission | (presente no payload) |

**Field-level Opportunity:** `fieldTable.Opportunity` **vazio** → nenhum campo do contrato está bloqueado para leitura nesta Role. Campos do dash são legíveis.

---

## 4. Metadata — campos do contrato Opportunity

| Campo | Presente | Tipo |
|---|---|---|
| `stage` | sim | enum |
| `amount` | sim | currency |
| `cDataDeEmisso` | sim | **date** (Data de Emissão) |
| `cDataVenda` | sim | datetime |
| `assignedUser` | sim | link |
| `cCpftext` | sim | varchar |
| `cSeguradora` | sim | enum |
| `cPremioLiquido` | sim | currency |
| `cPlaca` | sim | text |
| `cCiapol` | sim | text |
| `cApolice` | sim | **file** (não é nº) |
| `cPropostaTransmitida` | sim | **file** |

**Implicação join (Fase 2):** não há campo tipado óbvio de “número da apólice” / “número da proposta” na metadata; só arquivos + `cCiapol` (CI). Discovery de join continua obrigatória.

---

## 5. Smoke read-only (Opportunity)

### 5.1 Lista `stage = Vendido` (max 5, campos do contrato)

| Resultado | |
|---|---|
| HTTP | OK |
| Campos sempre preenchidos na amostra | `id`, `name`, `stage`, `amount`, `assignedUser*`, `cCpftext`, `cSeguradora`, `cPremioLiquido`, `cDataVenda` |
| `cDataDeEmisso` preenchido | **~40%** da amostra (2/5) — risco operacional para regra “emissão no mês” |
| `accountId` | **0%** na amostra |
| `cCiapol` | **0%** na amostra |
| `cPlaca` | ~60% |

### 5.2 Filtro `Vendido` + `cDataDeEmisso isNotNull`

| Resultado | OK (retornou linhas) |
|---|---|

Conclusão smoke: a key **atual consegue** ler o que o painel precisa em Opportunity/User/Team/Account. Qualidade de preenchimento de `cDataDeEmisso` e Account é assunto de **dados**, não de ACL.

---

## 6. Matriz ACL **necessária** (user do dashboard)

Least privilege para o runtime do `dash.segurosimediato.com.br` (somente leitura):

| Scope | create | read | edit | delete | stream | Notas |
|---|---|---|---|---|---|---|
| Opportunity | **no** | **all** | **no** | **no** | **no** (ou yes se útil) | Core do painel |
| User | no | **all** | no | no | no | Nomes de vendedores |
| Team | no | **all** | no | no | no | Contexto equipes |
| Account | no | **all** | no | no | no | Cliente (nome) |
| Role | no | no | no | no | no | Não necessário em runtime |
| Lead / Contact / Webhook / etc. | no | no* | no | no | no | *não necessários ao MVP |

**Field-level:** read **yes** (ou default) em  
`stage`, `amount`, `amountCurrency`, `cDataDeEmisso`, `cDataVenda`, `assignedUser`, `teams`, `account`, `cCpftext`, `cSeguradora`, `cPremioLiquido`, `cPlaca`, `cCiapol`, `name`.

**Permissões especiais recomendadas para o user do dash:**

| Permission | Alvo |
|---|---|
| exportPermission | **no** (export via Next) |
| dataPrivacyPermission | **no** |
| assignmentPermission | **no** |
| userPermission | **no** |
| massUpdatePermission | **no** |

**Auth de usuários humanos no dash (Q44):** login Espo de usuários internos — ACL de cada humano **não** precisa ser a mesma da API do server; a API do server usa o API User do Role acima. Login humano só autentica sessão (e opcionalmente restringe quem entra via Cloudflare Access).

---

## 7. Gap report

### 7.1 Key atual `add_travelangels` vs necessário para o **dash**

| Item | Atual | Necessário dash | Gap |
|---|---|---|---|
| Opportunity read all | sim | sim | OK |
| Opportunity create/edit | **yes/all** | **no/no** | **Excesso** — não usar esta key no dash; Fase 1 cria Role readonly |
| User / Team / Account read all | sim | sim | OK |
| Field-level bloqueios nos campos do contrato | nenhum | nenhum crítico | OK |
| Role entity admin | 403 | não precisa | OK |
| API User dedicado ao dash | não (key compartilhada) | **sim** | **Fase 1** |
| `cDataDeEmisso` no schema | presente | presente | OK |
| Preenchimento `cDataDeEmisso` | incompleto (~40% amostra Vendido) | quase 100% ideal | **Dados / processo** (não ACL) |
| Nº apólice tipado | ausente | desejável p/ join | **Fase 2 discovery** |

### 7.2 Gaps que **bloqueiam** o runtime do dash

**Nenhum gap de leitura** na key atual impede um protótipo técnico.

**Bloqueios de política (plano):**

1. Não acoplar o dash à key `add_travelangels` (privilégio demais + acoplamento a outras integrações).  
2. Criar Role + API User readonly (Fase 1).  
3. Discovery de join / Renovação (Fase 2) — bloqueia qualidade do “emitido”, não o boot da UI.

### 7.3 Lista mínima de permissões (checklist Fase 1)

Role sugerida: `dashboard-producao-readonly`

- [ ] Opportunity: read=all; create=edit=delete=stream=no  
- [ ] User: read=all; demais no  
- [ ] Team: read=all; demais no  
- [ ] Account: read=all; demais no  
- [ ] Special permissions: export/dataPrivacy/assignment/user/massUpdate = no  
- [ ] API User tipo `api`, auth API Key, Role acima, **sem** teams restritivas que anulem `read=all`  
- [ ] Smoke: mesmas queries da §5 com a key nova  
- [ ] Validar primeiro em **DEV**, depois prod

---

## 8. Aceite Fase 0

| Critério | Status |
|---|---|
| Versão Espo identificada | OK — **9.2.2** |
| Doc ACL da major consultada | OK — Roles 9.x / API / ACL |
| Inventário user + matriz entity | OK |
| Field-level / metadata campos contrato | OK |
| Smoke Opportunity Vendido + `cDataDeEmisso` | OK (leitura); qualidade de dados anotada |
| Gap report + lista mínima Fase 1 | OK |
| Sem alteração de Role/user em prod | OK |

**Fase 0 encerrada.** Próximo passo do plano: **Fase 1** (criar Role + API User dedicados) **ou** **Fase 2** (discovery join/Renovação) em paralelo leve.

---

## 9. Como reproduzir

```powershell
cd scripts\espo-ops
$env:ESPO_BASE_URL = "https://flyingdonkeys.com.br"
$env:ESPO_API_KEY = "<key>"   # não commitar
node fase0-espo-acl-inventory.mjs --prefer=prod
```

Reexecutar após a Fase 1 com a **nova** key e anexar `fase0-espo-acl-inventory-dashuser.json` para fechar o gap “excesso de privilégio”.
