# 04 — API Pagamento (REST / Digibee + AES)

**Índice:** [API PAGAMENTO](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/614596618)  
Uso: após `TransmitirProposta` com `tp_pagamento` **11** ou **14**.

Auth/estrutura de resposta: mesmos padrões REST (`apikey`, envelope `status`/`dados`) — ver [`00-VISAO-GERAL.md`](./00-VISAO-GERAL.md).

Timeout documentado: **60.000 ms**.

---

## 1. Configuração Criptografia AES

**Página:** [637502157](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/637502157)

- Algoritmo: **AES-256**, blocos 128 bits (ISO/IEC 18033-3)  
- Suhai fornece **KEY Source** e **IV Source** já em **Base64** (homolog/prod)  
- Campos sensíveis (ex.: `numero_cartao`, `cod_seguranca`) enviados **já cifrados** e em Base64  
- Ferramenta de referência citada na doc: site “AES Encrypt/Decrypt” (apenas para entendimento; produção = lib server-side)

---

## 2. Gerar Token para Pagamento

| | |
|---|---|
| Verbo | `POST` |
| Homolog | `https://test.godigibee.io/pipeline/suhaiseguradora/v1/pagamento/gerartoken` |
| Produção | `https://api.godigibee.io/pipeline/suhaiseguradora/v1/pagamento/gerartoken` |
| Página | [785383449](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/785383449) |

Body:

```json
{
  "CartaoCredito": {
    "nome_impresso": "Victor Souza",
    "numero_cartao": "<AES Base64>",
    "data_expiracao": "2023-06"
  }
}
```

Sucesso `200` → `dados.token` (UUID). Erro exemplo: cartão inválido (`400`).

---

## 3. Insere Dados de Pagamento

| | |
|---|---|
| Verbo | `POST` |
| Homolog | `https://test.godigibee.io/pipeline/suhaiseguradora/v1/pagamento` |
| Produção | `https://api.godigibee.io/pipeline/suhaiseguradora/v1/pagamento` |
| Página | [614367422](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/614367422) |

Body:

```json
{
  "proposta": 2095,
  "Pagamentos": [
    {
      "CartaoCredito": {
        "nome_impresso": "Victor Souza",
        "numero_cartao": "<AES>",
        "cod_seguranca": "<AES opcional>",
        "bandeira": "Visa",
        "data_expiracao": "2023-06"
      }
    }
  ]
}
```

Ou tokenizado:

```json
{
  "proposta": 902857,
  "Pagamentos": [
    { "CartaoCreditoTokenizado": { "token": "<uuid gerartoken>" } }
  ]
}
```

Regras:

- Exatamente **um** método: `CartaoCredito` **ou** `CartaoCreditoTokenizado`  
- Homolog: usar **cartões mock** da tabela oficial da página  
- Se vencimento 1ª parcela ≤ hoje: validação de saldo imediata (ex. `400` saldo insuficiente); se futura: pode retornar `200` e debitar depois  

PCI: parceiro deve seguir os mesmos padrões de segurança implantados (não logar PAN/CVV em claro).

---

## 4. Sequência com Multicálculos

1. Cotação → escolha de plano  
2. `TransmitirProposta` com `tp_pagamento` 11 ou 14 → nº proposta  
3. (Opcional) `gerartoken`  
4. `POST /pagamento`  
5. Polling `ConsultarStatusProposta` / pendências  

Boleto (`tp_pagamento` 2) **não** passa por esta API — usa métodos SOAP de boleto.
