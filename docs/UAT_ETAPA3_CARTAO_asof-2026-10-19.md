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

## Rodada de 2026-10-23 (antes do aceite)

Preview no HEAD `e691d0f` (deploy `dpl_9HxmM56`, Ready), com o SafetyMails reativado. Mesma matriz, mesma
identidade de teste, mesma conferência (tela + `dataLayer`, RTDB, Espo DEV) e limpeza entre os casos e ao final.
Capturas em `C:\Users\Luciano\wt\_shots-etapa3\uat\2026-10-23\`.

Verificação local: `typecheck` OK, `lint` sem erros (2 avisos antigos), `build` OK, `e2e/etapa3-consultor.spec.ts`
10/10, teste unitário do `sold-sync` OK. `check:hardcode` acusa 8 trechos em arquivos idênticos ao `main`.

| # | Resultado | Espo DEV |
|---|---|---|
| 1 | **Fluxo OK, preço errado.** 2 cartões, coberturas, "Quero este plano" abre `wa.me` da corretora, 390 px sem rolagem lateral. O preço veio **R$ 100,00 /ano** nos dois planos (19/10: R$ 2.574,04 e R$ 2.689,48, mesmas franquias). O próprio RPA devolveu `valor: "R$100,00"` (ver "Achados") | "Aguardando cálculo" → "Cálculo concluído", "Aguardar cálculo" |
| 2 | OK — `/obrigado`, `form_quote_choice` step 3 consultor + `generate_lead`, sem `form_abandon` | "Cálculo manual pendente", "Receber depois", 3 Notes |
| 3 | OK — "CPF inválido" inline, `/obrigado` | idem, 3 Notes |
| 4 | OK — "Informe a placa/o CEP/o CPF para calcular", foco em cada campo na ordem | — |
| 5 | OK — diálogo "CPF parece inválido", "Corrigir" foca o CPF, saída pelo diálogo vai a `/obrigado` | "Cálculo manual pendente", "Receber depois", 3 Notes |
| 6 | OK — "Não encontramos essa placa", etapa 4 com cálculo desabilitado e aviso âmbar, consultor (`form_quote_choice` step 4) | "Cálculo manual pendente", "Receber depois", 3 Notes (na repetição; ver "Achados") |
| 7 | Caminhão OK — aviso próprio e cálculo desligado → consultor. Moto (EJP8H57, KASINSKI MIRAGE 250) — cálculo liberado; o RPA terminou em "RPA error" e a tela foi para o cálculo manual | caminhão e moto "Cálculo manual pendente" (moto com 4 Notes) |
| 8 | OK — coberto por dois erros reais do RPA nesta rodada (FXG1E20 e moto): "Vamos calcular manualmente para você" + WhatsApp, `rpa_wait_end` `error`, `octa_calculo_manual_sent` | "Cálculo manual pendente", "Aguardar cálculo", 4 Notes |
| 9 | OK — nome, e-mail, placa e CEP mantidos | — |
| 10 | OK — 3 cartões, "Mais escolhido" no Completo; seletor 200 km / 500 km / sem assistência troca os preços (R$ 100,59 / 106,59 / 92,59 no Essencial) | — |

SafetyMails no blur do e-mail (etapa 2): `teste@dominio-que-nao-existe.invalid` mostra o aviso e deixa avançar;
`adm@` e `contato@imediatoseguros.com.br` e os e-mails dos casos não mostram aviso.

Smoke: home, páginas de ramo, `/cotacao`, `/cotacao-suhai`, `/marca-suhai`, `/obrigado`, `/contato` e `/sobre` com 200 e
sem erro de cliente; 404 para rota inexistente; banner de staging e `noindex`; rodapé "CNPJ 33.216.054/0001-48 ·
SUSEP 252174522"; WhatsApp flutuante para a corretora.

### Achados

1. **Preço do RPA (bloqueia o caminho "Calcular agora").** O backend do RPA devolveu `R$100,00` como valor dos dois
   planos. No repositório `imediatoseguros-rpa-playwright`, `executar_rpa_imediato_playwright.py` (~linha 5700), o
   parser de reserva atribui ao preço qualquer "R$ 100,00" encontrado no texto da tabela (valores de teste fixos no
   código); o caminho principal de captura não pegou o preço desta vez. O site só exibe o que recebe. O mesmo RPA
   atende o site em produção.
2. **E-mail com "+" quebra o RPA na Tela 9** ("Preenchimento dos dados pessoais"). Duas tentativas com
   `lrotero+uat01@gmail.com` falharam ali; com e-mail sem "+" o cálculo passou. O site trata como erro (cálculo
   manual). Limitação do RPA, já existente.
3. **E-mail de teste da rodada de 19/10.** `lroterouatN@gmail.com` não existe; com o SafetyMails ativo ele recebe o
   aviso (correto). Esta rodada usou `lrotero+uatNN@gmail.com` e, nos casos com RPA, e-mail sem "+".
4. **`leadId` reaproveitado (FileLeadStore).** Na primeira execução do caso 6 o servidor reaproveitou o `leadId` do
   caso 1 (mesmo telefone, mesma instância) e o Espo ficou com "Aguardar cálculo" e 4 Notes. Repetido com o mesmo
   roteiro, deu "Receber depois" e 3 Notes. É a observação "Store de leads por instância" abaixo; para cliente real,
   vale para quem volta em menos de 24 h. Na cotação Suhai o mesmo efeito fez `/api/suhai/perfil` responder 403
   (consulta do perfil já usada pelo `leadId`); o formulário pediu nascimento, sexo e estado civil e o preço saiu.

### Pendente com o Luciano

- Octadesk no celular de teste: mensagens desta rodada entre 09h20 e 09h50 (horário de Brasília) — inicial, "cálculo
  completo depois" (casos 2, 3, 5, 6 e caminhão), "cálculo pronto" (caso 1) e "cálculo manual" (erros do RPA).
- Safari do iPhone: casos 1 e 2 no preview.
- **Aceite:** pendente. Decidir se a Fase A vai a Production com o achado 1 aberto (o caminho do consultor não
  depende do RPA) ou se espera a correção do RPA.

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
