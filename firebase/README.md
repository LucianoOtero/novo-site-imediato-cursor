# Firebase — entrega de leads (EspoCRM/Octadesk) via Cloud Function

Projeto Firebase **dedicado ao site novo** (`imediato-seguros-site-novo`), distinto do `leads-imediato-seguros` do site legado. Ver `docs/ARQUITETURA_LEADS_FIREBASE_CLOUD_FUNCTION.md` para o desenho completo.

**Desde 2026-07-13 (arquitetura "Firebase-only")**: o site (Vercel) não chama mais EspoCRM/Octadesk direto — só grava em `leads_backup/{leadId}` e responde ao usuário. A Cloud Function `deliverLead` (renomeada de `retryLeadDelivery`) passou a ser a **única** via de entrega, não mais uma rede de segurança.

Este diretório (`firebase/`) é um projeto **separado** do Next.js/Vercel — não é implantado por `git push`/deploy da Vercel. O deploy é manual, via Firebase CLI, só quando a Cloud Function (`firebase/functions/index.js`) mudar.

## O que já está provisionado (2026-07-12)

- Projeto Firebase: `imediato-seguros-site-novo`.
- Realtime Database: `imediato-seguros-site-novo-default-rtdb` (`https://imediato-seguros-site-novo-default-rtdb.firebaseio.com`).
- Faturamento: plano Blaze, usando a mesma conta "Pagamento do Firebase" já usada pelo site legado.
- Service account `leadbackup-admin@imediato-seguros-site-novo.iam.gserviceaccount.com` (papel `roles/firebasedatabase.admin`, só Realtime Database) — credenciais já configuradas em `.env.local` e no Vercel (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_DATABASE_URL`). Usadas pelo Next.js (`lib/leads/firebase-admin.ts`), não pela Cloud Function.
- Regras do Realtime Database: `.read`/`.write`: `false` para todo mundo (`database.rules.json`) — só o Admin SDK (site) e a própria Cloud Function (que roda com a identidade do projeto) conseguem ler/escrever.

## Pré-requisitos para o deploy da Cloud Function

1. Firebase CLI instalado e autenticado (`firebase login`) com uma conta que tenha acesso ao projeto `imediato-seguros-site-novo`.
2. Node.js 20 instalado localmente (mesma versão do runtime da função).

## Passo a passo do deploy

```bash
cd firebase

# Confirmar o projeto ativo (já configurado em .firebaserc)
firebase use imediato-seguros-site-novo

# Instalar dependências da função
cd functions && npm install && cd ..

# Configurar os 3 secrets (uma única vez, ou quando as URLs mudarem) —
# mesmas URLs que o site novo usa em LEAD_ESPOCRM_WEBHOOK_URL_DEV/_PROD e
# LEAD_OCTADESK_WEBHOOK_URL (ver .env.example na raiz do projeto).
firebase functions:secrets:set ESPOCRM_DEV_URL
# cole: https://add-flyingdonkeys-dev-6r55ex3u6q-rj.a.run.app/

firebase functions:secrets:set ESPOCRM_PROD_URL
# cole: https://add-flyingdonkeys-prod-br2qvvxwhq-rj.a.run.app/

firebase functions:secrets:set OCTADESK_URL
# cole: https://add-webflow-octa-prod-br2qvvxwhq-rj.a.run.app/

# Deploy
firebase deploy --only functions,database
```

## Como funciona

- A função `deliverLead` observa **toda** gravação em `leads_backup/{leadId}` no Realtime Database — o site grava com `autoSync: true` sempre (não só em caso de falha, já que não há mais entrega direta do site).
- Lógica por `data.stage`:
  - `"initial"` (só telefone): envia a EspoCRM (cria) e Octadesk (mensagem inicial) o que ainda não tiver sido enviado, com retry exponencial (1s/4s/9s).
  - `"complete"` (dados completos): sempre atualiza o EspoCRM (usa `espocrmLeadId` salvo no registro) — nunca reenvia ao Octadesk (evita notificar o cliente 2 vezes).
- Escolhe a URL de EspoCRM pelo campo `environment` do próprio registro (`production` → `ESPOCRM_PROD_URL`; `development`/`staging` → `ESPOCRM_DEV_URL`). Octadesk é sempre `OCTADESK_URL` (sem ambiente de teste).
- Limite de 5 rodadas por lead (`MAX_CF_ATTEMPTS_TOTAL` em `index.js`) — depois disso, marca `status: "failed_permanently"` e para de tentar (requer olhar manualmente no Realtime Database Console).

## Como testar

1. Console do Realtime Database: <https://console.firebase.google.com/project/imediato-seguros-site-novo/database/imediato-seguros-site-novo-default-rtdb/data>
2. Criar manualmente, em `leads_backup/teste-manual-001`, um registro com `autoSync: true`, `espocrm_sent: false`, `octadesk_sent: false`, `environment: "development"` e um `data` mínimo (`phoneE164`, `stage: "initial"`).
3. Observar os logs da função: `firebase functions:log --only deliverLead`.
4. Confirmar que o registro foi atualizado (`espocrm_sent`/`octadesk_sent`/`autoSync`/`espocrmLeadId`).
5. Apagar o registro de teste ao final.

## Custos esperados

Volume de leads é baixo (captação de leads de seguros, não tráfego de alto volume) — dentro da faixa gratuita do plano Blaze na prática (2M invocações/mês grátis para Cloud Functions v2, Realtime Database cobra por GB armazenado/transferido, irrelevante neste volume). Sem custo relevante esperado.
