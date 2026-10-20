# UAT — Etapa 3 nova e cartão único de oferta (Fase A) — 2026-10-19

Branch `uat-funil-etapa3`, preview Vercel `imediato-seguros-git-uat-funil-etapa3-lucianooteros-projects.vercel.app`
(`VERCEL_ENV=preview` → staging: StagingBanner, robots `disallow`, RTDB `environment=staging`, Espo **DEV**).
Identidade de teste: LUCIANO TESTE, telefone de teste, CPF sintético válido (dígitos verificadores corretos).
Production intocada; liberação só depois de 26/10 com este aceite.

## Resultado

Os 10 casos da matriz passaram no preview, depois de três correções feitas durante o próprio UAT (seção "Achados").
Cada caso foi conferido no navegador (tela + `dataLayer`), no RTDB (`leads_backup/<id>`) e no Espo DEV (Lead e
Opportunity: `cEtapaFunil`, `cEscolhaCalculo`, `cCanalCaptura`, placa/CEP/CPF, Notes). O Espo DEV e o RTDB de staging
foram limpos entre os casos e ao final.

| # | Caso | Resultado | Espo DEV (Lead e Opp) |
|---|---|---|---|
| 1 | Fluxo completo auto, "Quero calcular agora", RPA real (FXG1E20, `/cotacao`) | OK — 2 cartões novos, preço /ano, coberturas, "Quero este plano" abre o WhatsApp da corretora; 390 px OK | "Aguardando cálculo" → "Cálculo concluído", "Aguardar cálculo" |
| 2 | Saída pelo consultor com campos vazios | OK — `/obrigado`, `form_quote_choice` step 3 consultor + `generate_lead`, sem `form_abandon` | "Cálculo manual pendente", "Receber depois" |
| 3 | Saída pelo consultor com CPF pela metade | OK (após correções 1 e 2) — "CPF inválido" inline, `/obrigado` | "Cálculo manual pendente", "Receber depois", 3 Notes |
| 4 | "Calcular meu seguro" com campo vazio | OK — "Informe a placa para calcular", foco na placa (depois CEP e CPF) | — |
| 5 | CPF inválido → diálogo → "Corrigir" → diálogo → consultor | OK — "Corrigir" fecha e foca o CPF; a saída pelo diálogo vai a `/obrigado` | "Cálculo manual pendente", placa/CEP/CPF presentes |
| 6 | Placa que não identifica o veículo (ZZZ9Z99) | OK — "Não encontramos essa placa", etapa 4 com "Quero calcular agora" desabilitado e aviso âmbar; consultor na etapa 4 | "Cálculo manual pendente", "Receber depois" |
| 7 | Moto e caminhão | OK — moto: cálculo liberado, RPA real devolveu resultado (EJP8H57). Caminhão: etapa 4 com aviso próprio e cálculo desligado → consultor | moto "Cálculo concluído"; caminhão "Cálculo manual pendente" |
| 8 | RPA terminando em erro (BLP7E56) | OK — "Vamos calcular manualmente para você" + WhatsApp | "Cálculo manual pendente", 4 Notes |
| 9 | "Voltar" da etapa 3 | OK — nome, e-mail e placa mantidos | — |
| 10 | `/cotacao-suhai` (cotação simulada no preview) | OK — 3 cartões idênticos ao visual de referência, "Mais escolhido" em destaque; o seletor troca preços (200 km / 500 km / sem assistência) | — |

Pendente com o Luciano: conferir no celular de teste as mensagens Octadesk dos casos (inicial, "cálculo completo
depois", "cálculo pronto", "cálculo manual") e abrir o preview no Safari do iPhone.

Capturas (fora do repositório): `C:\Users\Luciano\wt\_shots-etapa3\uat\` — `c1-auto-cartoes.png`,
`c1-auto-cartoes-390.png`, `c2-obrigado.png`, `c4-erro-placa.png`, `c5-dialogo.png`, `c6-etapa4-sem-calculo.png`,
`c7-moto-cartoes-NA-antes.png` (problema 3, antes da correção), `c7-caminhao-etapa4.png`, `c8-rpa-erro.png`,
`c10-suhai-cartoes.png`.

## Achados e correções (todas no branch, com E2E)

1. **`consultant_requested` da etapa 3 voltava 422 com CPF/CEP incompleto.** O post da escolha não levava
   `skipStrictValidation` (só o `complete` levava), então a validação estrita do servidor rejeitava o CPF pela metade e o
   Espo nunca recebia a escolha. Corrigido em `f175323`.
2. **A escolha do consultor podia perder a etapa do funil.** A Cloud Function descarta o `cEtapaFunil` de uma execução
   cujo `data` foi regravado por outro POST ("etapa superada"). Com `consultant_requested` e `complete` saindo juntos,
   quando o `complete` chegava depois o Espo ficava com "Receber depois" e a etapa anterior ("Dados pessoais"). A mesma
   corrida existe hoje na etapa 4 em produção. Corrigido no cliente, sem mexer na CF: o `consultant_requested` sai
   depois da resposta do `complete` (último POST, `keepalive`), nas etapas 3 e 4 (`52415e6`). Os POSTs de evento do
   formulário também passaram a sair em fila (`23ab782`).
3. **Plano do RPA com "N/A".** O RPA devolveu o plano alternativo inteiro como "N/A" e o cartão exibia "N/A" como preço,
   com o título "Encontramos 2 opções". O componente antigo fazia o mesmo. Agora plano sem preço não vira cartão e não
   conta como opção; campos "N/A" somem do detalhe (`ba171a6`).
4. **Dicas da etapa 3 falavam "carro" em moto e caminhão.** Agora por ramo: "sua moto" / "seu caminhão" (`ba171a6`).

## Observações que já existiam (fora do escopo desta fase)

- **Store de leads por instância.** `lib/leads/store.ts` usa sempre o `FileLeadStore` (`/tmp` de cada instância
  serverless), também em Production. Para o mesmo telefone + ramo dentro de 24 h, instâncias diferentes podem lembrar
  `leadId` diferentes e o `complete` sem registro local cria um lead novo. No UAT isso apareceu ao repetir o telefone de
  teste e apagar os registros entre casos; cada deploy novo zera o estado. Para cliente real o risco é o retorno em
  menos de 24 h. Sugestão: tratar junto com o banco do `DATABASE_URL` (seção 45).
- **Dedupe entre fluxos.** A cotação Suhai reaproveita o `leadId` do formulário para o mesmo telefone + ramo em 24 h.
- O botão flutuante do WhatsApp encosta na borda do "Quero este plano" a 390 px quando o cartão está nessa altura.

## Verificação local

`typecheck` OK, `lint` sem erros (1 aviso antigo), `build` OK, `e2e/etapa3-consultor.spec.ts` 10/10.
`check:hardcode` acusa só arquivos que este branch não alterou (`lib/suhai-host.ts`, `lib/contact/*`, `lib/env.ts`),
igual ao `main`.

## Antes de Production (depois de 26/10)

- Conferir no GTM se a tag GA4 de `form_quote_choice` repassa o parâmetro `step` (3 ou 4).
- PR para `main` com aprovação, smoke em Production (um lead pela saída do consultor e um pelo cálculo, telefone de
  teste, Espo produção e Octadesk) e atualização de CHANGELOG/VERSIONING/status.

## Cuidado: `syncOpportunitySold` já publicada a partir deste branch (2026-10-20)

A correção do custo do RTDB legado (commit `58963cc`, ver CHANGELOG "Não publicado — 2026-10-20") foi publicada na
Cloud Function `syncOpportunitySold` direto deste branch, antes do merge. Até o PR entrar no `main`:

- **Não** rodar `firebase deploy --only functions` (todas) nem `--only functions:syncOpportunitySold` a partir do
  `main` ou de qualquer branch sem o commit `58963cc`. Isso volta o scan de `leads_backup` do legado (~17 MB por
  webhook, ≈ R$ 270 por dia útil). Publicar só `functions:deliverLead` a partir do `main` é seguro.
- No PR, conferir que `firebase/functions/sold-sync.js` chega ao `main` com `GCLID_INDEX_PATH`. Depois do merge,
  publicar funções a partir do `main` volta a ser seguro.
- As regras publicadas do banco legado (`leads-imediato-seguros`) têm o `.indexOn` `data/GCLID_FLD` e, desde
  2026-10-20, `leads_backup` com `.read`/`.write` `false`. Isso existe só nas regras publicadas e na cópia local não
  versionada `firebase/database.rules.legado.json`. **Não** sobrescrever as regras do legado com uma cópia anterior:
  sem o índice, a query volta a baixar o nó inteiro; com `true`, os leads voltam a ficar abertos na internet. Backup
  das regras anteriores e do código publicado antes em `C:\Users\Luciano\wt\_deployed-fn`.
- Depois de qualquer publicação de funções, conferir no Monitoring `firebasedatabase.googleapis.com/network/sent_bytes_count`
  do projeto `leads-imediato-seguros`: o normal agora é perto de zero.
