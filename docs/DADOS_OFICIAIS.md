# DADOS_OFICIAIS

## Finalidade
Checklist de dados oficiais (institucionais, regulatórios e comerciais) a confirmar antes de páginas comerciais e do go-live.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seção 64 ("Dados oficiais obrigatórios antes da implementação"). Extraído na Issue P-05, sem resumo, reinterpretação ou preenchimento de dados não confirmados.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

## Observações
A coluna "Confirmado?" reflete exatamente o estado registrado na especificação: `✅ Confirmado` para os itens que o cliente já confirmou explicitamente; `☐` para os itens ainda pendentes. Nenhum item foi alterado, preenchido ou "desconfirmado" nesta extração — isso violaria as regras de não inventar dados e não remover pendências. Itens marcados **CRÍTICO** ou **RESOLVER** são bloqueantes conforme a seção 68 da especificação (ver também a seção 5 do `PLANO_IMPLEMENTACAO.md`).

**Atualização 2026-07-03:** o cliente confirmou, em sessão de revisão dedicada, praticamente todos os itens restantes da tabela (ver detalhes linha a linha abaixo e nota específica após a tabela). Os valores já foram aplicados em `lib/company.ts`.

---

## 64. Dados oficiais obrigatórios antes da implementação

| Dado | Valor atual observado | Fonte atual | Confirmado? | Responsável | Onde será usado |
|---|---|---|---|---|---|
| Razão social exata | **Imediato Corretora de Seguros Ltda.** | cliente | ✅ Confirmado | Sócio/Jurídico | company.legalName, Schema, footer |
| Nome fantasia | Imediato Seguros | cliente | ✅ Confirmado (2026-07-03) | Sócio | company.tradeName |
| CNPJ | 45.998.165/0001-32 | cliente | ✅ Confirmado (2026-07-03) | Jurídico | company.cnpj, Organization schema |
| SUSEP | 252174522 | cliente | ✅ Confirmado (2026-07-03) | Jurídico | company.susep, footer |
| Endereço completo | Rua Barão de Itapetininga 125, 6º andar, Centro, SP, 01042-001 | cliente | ✅ Confirmado (2026-07-03) | Adm | address, LocalBusiness, /contato |
| Telefone principal | (11) 3230-1422 | cliente | ✅ Confirmado (2026-07-03) | Comercial | contact.phone, CallButton |
| Telefone de emergência | (11) 95328-8466 | cliente | ✅ Confirmado (2026-07-03) | Comercial | contact.emergencyPhone |
| WhatsApp oficial | (11) 3230-1422 | cliente | ✅ Confirmado (2026-07-02) | Comercial | contact.whatsapp, FAB |
| Ouvidoria | (11) 97668-7668 | cliente | ✅ Confirmado (2026-07-03) | Jurídico | contact.ombudsmanPhone |
| E-mail comercial | contato@imediatoseguros.com.br | cliente | ✅ Confirmado (2026-07-03) | Comercial | contact.email |
| E-mail fallback de leads | **lrotero@gmail.com** | cliente | ✅ Confirmado | TI/Comercial | LEAD_FALLBACK_EMAIL |
| Horário de atendimento | Seg-Sex, 9h-18h | cliente | ✅ Confirmado (2026-07-03) | Comercial | business.hoursDisplay/hoursSchema, Schema openingHours |
| Anos de experiência | ~~25 (hero) / 35+ (rodapé) — divergente~~ → **25** | cliente | ✅ **RESOLVIDO** (2026-07-03) | Marketing | business.yearsExperience |
| Nº de seguradoras parceiras | ~~16 (texto) / 18 logos~~ → **18** | cliente | ✅ **RESOLVIDO** (2026-07-03) | Comercial | business.insurersCount |
| Nota Google | 4.8 | cliente | ✅ Confirmado (2026-07-03) | Marketing | business.googleRating, AggregateRating |
| Qtd. de avaliações | **+2.200** (era "+2.000" no site legado) | cliente | ✅ Confirmado (2026-07-03) | Marketing | business.googleReviewsCount |
| % de satisfação | ~~96% (texto) / 98% (outro bloco) — divergente~~ → **98%** | cliente | ✅ **RESOLVIDO** (2026-07-03) | Marketing | business.satisfactionRate |
| Preços "a partir de" por ramo | Auto 79,90 · Moto 49,90 · Cam. 99,90 · Uber 84,90 · Util. 94,90 · Táxi 99,90 · Pet 99,90 · Fiança 99,90 · Ass24h 39,90 | cliente | ✅ Confirmado (2026-07-03) | Comercial | ramos.priceFrom |
| Redes sociais oficiais | FB `web.facebook.com/imediatocorretora` · IG `instagram.com/imediato.seguros` · LinkedIn `imediato-soluções-em-seguros` | cliente | ✅ Confirmado | Marketing | company.social, sameAs |
| URL Google Business Profile | `maps` → IMEDIATO SOLUÇÕES EM SEGUROS (place id `0x94ce5849842c0001:0xb1acc5d339ee5126`) | cliente | ✅ Confirmado | Marketing | sameAs, /reputacao |
| Link de avaliações Google | `g.page/r/CSZR7jnTxayxEAE/review` | cliente | ✅ Confirmado | Marketing | /reputacao, Testimonials |
| Política de privacidade | não existia texto oficial — versão genérica (padrão LGPD/corretora de seguros) redigida e adotada a pedido do cliente | cliente | ✅ Adotado (2026-07-03, ver nota) | Jurídico | /politica-de-privacidade |
| Termos | não existia texto oficial — versão genérica redigida e adotada a pedido do cliente | cliente | ✅ Adotado (2026-07-03, ver nota) | Jurídico | /termos |
| Texto oficial do alerta de fraude | presente no site (PIX/rastreador) | cliente | ✅ Adotado (2026-07-03) — rascunho aprovado como texto oficial pelo cliente | Jurídico | /alerta-de-fraude, FraudAlert |

> **Regra:** nenhuma informação institucional, regulatória, comercial ou de preço entra em produção sem confirmação explícita nesta tabela. Itens marcados **CRÍTICO/RESOLVER** são bloqueantes (seção 68).

### Nota sobre a confirmação de 2026-07-03

Todos os itens acima foram confirmados diretamente pelo cliente em uma sessão de revisão dedicada, com uma exceção relevante a registrar:

- **Política de Privacidade e Termos de Uso**: o cliente confirmou que **não existe** texto oficial já aprovado pelo Jurídico para nenhum dos dois documentos. A pedido explícito do cliente ("Pode redigir versões genéricas com base no mercado e adotá-las"), foram redigidas versões genéricas, alinhadas a práticas de mercado para corretoras de seguros brasileiras e à LGPD (Lei 13.709/2018), e adotadas como conteúdo das páginas `/politica-de-privacidade` e `/termos`. **Isto não substitui uma revisão jurídica formal** — é uma decisão de produto do próprio cliente, registrada aqui para rastreabilidade; recomenda-se revisão pelo Jurídico antes ou logo após o go-live, especialmente se houver cláusulas contratuais específicas do negócio não cobertas por um texto genérico.
- **Texto do Alerta de Fraude**: o cliente aprovou explicitamente o rascunho já existente em `components/shared/FraudAlert.tsx`/`app/(legal)/alerta-de-fraude/page.tsx` como texto oficial, dispensando validação adicional do Jurídico.

### Nota adicional (2026-07-03) — tags de verificação do Google Search Console

Não faz parte da tabela original da seção 64 (que é uma fatia fiel da especificação), mas é um dado técnico confirmado nesta rodada, ao ler o Head Code do ambiente DEV do Webflow (`docs/WEBFLOW_CUSTOM_CODE_DEV.md`): duas tags `google-site-verification` estão configuradas hoje —
- `7ExRewM8GII1bwZ73ZEBX9euCX9Sx5m8243ITCyx7cM`
- `OGCWNwHYOwmFiCvqJXojZvKRTGrh2P9hlXzrcKAeAao`

✅ Confirmado (fonte: código colado pelo usuário) — a portar para o novo site via `metadata.verification` no layout raiz (Next.js), para preservar a verificação de propriedade do domínio no Google Search Console durante e após a migração.

### Nota de auditoria (Issue P-10) — item "Nº de seguradoras parceiras" (RESOLVIDO em 2026-07-03)

A auditoria real de assets (Issue P-10, ver `BRAND_ASSETS.md`) havia encontrado **18 arquivos de logo de seguradoras** hospedados no site publicado — uma evidência técnica que apontava para o lado "18" da divergência "16 (texto) / 18 logos". Em 2026-07-03 o cliente confirmou oficialmente o valor **18**, resolvendo a divergência (ver linha correspondente na tabela acima).

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Nenhum dado foi preenchido, alterado ou inventado nesta extração. Para atualizar o estado de confirmação de um item, marque `☐` como `✅ Confirmado` apenas quando o dado real for oficialmente validado pelo responsável indicado — nunca antecipe uma confirmação.
