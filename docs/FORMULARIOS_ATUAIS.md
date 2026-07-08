# FORMULARIOS_ATUAIS

## Finalidade
Comportamento atual dos formulários (campos, máscaras, validações, pós-envio, regras por ramo/produto).

## Origem
Auditoria real executada na Issue P-09 — ver metodologia e limitações em `LEGACY_JS_AUDIT.md`. Formulário inspecionado via leitura do DOM (atributos HTML) e do script `FooterCodeSiteDefinitivoCompleto.js`. **Nenhum envio real foi realizado** para não gerar lead falso em produção — o comportamento pós-envio foi inferido por leitura de código-fonte, não observado em runtime.

## Status
CONTEÚDO CRIADO (auditoria real parcial — apenas a Home). Concluído em 2026-07-01.

## Observações
Apenas o formulário da **Home** foi inspecionado nesta rodada. Outras páginas (LPs de ramo, `/contato`) não foram verificadas — se tiverem formulários com campos/comportamento diferentes, recomenda-se uma rodada de aprofundamento antes de finalizar a Issue 11.

---

## Tabela 4 — Formulários

| Formulário | Campos (obrig./opc.) | Máscaras | Validações | Hidden fields | Pós-envio | Regras por ramo | Crítico? |
|---|---|---|---|---|---|---|---|
| Home (`id="wf-form-Home"`, `method="post"`) | **Obrigatórios** (atributo HTML `required`): Nome, DDD, Celular, Email. **Opcionais**: CEP, CPF, Placa, Ano (numérico), Marca/Modelo (texto livre) | jQuery Mask (`jquery.mask.min.js`) aplicada a telefone/CEP/CPF/placa (mecanismo exato de cada máscara não decompilado nesta auditoria) | CPF e Placa validados via **API externa** (`CPF_VALIDATE_URL`/`PLACA_VALIDATE_URL`, microsserviços Cloud Run) — não é apenas checksum/regex local; CEP enriquecido via ViaCEP (`fetch` público) | `GCLID_FLD`, `SEQUENCIA_FLD` | **Não identificado redirecionamento para uma página `/obrigado`** nesta auditoria estática; presença da biblioteca SweetAlert2 no bundle sugere que o sucesso é comunicado via **modal**, não navegação — **requer confirmação** (ver "Achado" abaixo) | Tipo de veículo (moto vs. carro) é **inferido automaticamente** a partir do texto livre digitado em "Marca/Modelo" (lógica de palavras-chave, ex.: "ninja", "fazer" → moto); **não existe** campo/seleção explícita de "ramo" neste formulário | **CRÍTICO** — é a base de paridade para a Issue 11 (LeadForm) e Issue 12 (`/api/lead`) |

## Campos do formulário (detalhe)

| Campo (name/id) | Tipo HTML | Obrigatório? |
|---|---|---|
| `NOME` | text | Sim (rótulo "Nome") |
| `DDD-CELULAR` | text | Sim (rótulo "DDD") |
| `CELULAR` | text | Sim |
| `email` | email | Sim |
| `CEP` | text | Não |
| `CPF` | text | Não |
| `PLACA` | text | Não |
| `ANO` | number | Não (rótulo "Ano do modelo do veículo") |
| `MARCA` | text | Não (rótulo "Fabricante / Marca / Modelo") |
| `GCLID_FLD` | hidden | — (preenchido via JS a partir da URL/localStorage) |
| `SEQUENCIA_FLD` | hidden | — (propósito exato **não confirmado** nesta auditoria — **Investigar**) |
| botão submit (`id="submit_button_auto"`) | submit | — |

## Achado — comparação com o modelo planejado (`ESPECIFICACAO v3.md`)

- A especificação (seções 6.1, 6.3, 21.1) planeja um **LeadForm multi-step** com apenas **DDD + Celular obrigatórios** no primeiro passo, e CPF/Placa/Nome como opcionais e tardios — exatamente para reduzir a fricção observada como problema no site atual (seção 2/3: "formulário pede CPF e placa cedo demais").
- O formulário observado hoje é de **passo único** e exige **mais campos obrigatórios** (Nome e Email inclusive, além de DDD+Celular) do que o mínimo planejado para o novo LeadForm.
- **Isto não é uma divergência a "corrigir" nesta auditoria** — é exatamente a mudança que a especificação já decidiu fazer deliberadamente. Registro apenas para deixar explícito o "antes" (para referência de paridade de dados capturados) vs. o "depois" (already decided, reduzir fricção).
- **Campo `email` obrigatório hoje não está no contrato do novo `leadSchema` da seção 21.1** (que trata e-mail como opcional). Avaliar se isso é intencional na nova versão.

## Achado — possível ausência de página `/obrigado` hoje

- Nenhuma ocorrência de "obrigado" ou "thank-you" foi encontrada no script `FooterCodeSiteDefinitivoCompleto.js`.
- A biblioteca **SweetAlert2** está carregada na página — normalmente usada para exibir modais de alerta/sucesso/erro **sem navegação**.
- **Hipótese (não confirmada):** o site atual pode comunicar sucesso via modal (SweetAlert2) em vez de redirecionar para uma página `/obrigado` dedicada com disparo de conversão via `page_view`.
- **Isto é relevante** para a Issue 14 (`/obrigado`) e para o disparo de conversão do Google Ads: se hoje a conversão dispara em um evento de modal (não em um `page_view` de página dedicada), a lógica de disparo "1×" da nova `/obrigado` deve ser desenhada com esse contexto em mente. **Recomenda-se confirmar via teste real controlado** (com aviso à equipe comercial, para não contar como lead real) antes de finalizar a Issue 14.

---

> Auditoria real (não é `PENDING`). O comportamento pós-envio é uma **hipótese fundamentada em evidência de código**, não uma observação direta de runtime (nenhum envio real foi feito) — está marcado explicitamente como tal, não apresentado como fato confirmado.
