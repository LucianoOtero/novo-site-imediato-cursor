# 00 — Visão geral da integração Suhai

Fonte índice vendas: [Integração de Vendas e Multicálculos](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437452915/Integra+o+de+Vendas+e+Multic+lculos) (atualizado jul/2024 na página; outras páginas mais recentes).  
Portal: bem-vindo em [Portal de Integrações](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/437354657).

---

## 1. Dois eixos tecnológicos

| Eixo | Tecnologia | Uso principal | Auth típica |
|---|---|---|---|
| **Vendas / Multicálculos** | **SOAP/XML** (`*.svc`) | Cotar, propor, boleto/PDF, cancelar, pendências | `login` + `senha` do **Cotador Suhai** (por corretora) no body SOAP |
| **Pagamento cartão** | **REST/JSON** (Digibee) | Dados de cartão / token após proposta | `apikey` (+ AES nos dados sensíveis) |
| **Pós-vendas** | **REST/JSON** (Digibee) | Apólice, parcelas, comissão, sinistro | `apikey` obrigatória; em alguns casos também `Authorization: Basic` |

Namespace SOAP observado nos exemplos: `suhaiseguradoracotacao.com.br:5155` (ou `http://suhaiseguradoracotacao.com.br:5155/`).

---

## 2. Segurança e disponibilidade (padrão publicado)

### 2.1 SOAP vendas (página de vendas)

- HTTPS/SSL  
- **Restrição por IP** do consumidor  
- LGPD / propriedade dos dados  

Antes de produção: enviar IPs fixos à Suhai para autorização.

### 2.2 REST pós-vendas / pagamento ([Padrões de Segurança](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/473923876))

- HTTPS + **TLS ≥ 1.2**  
- Restrição por IP  
- **API Key** individual (homolog ≠ produção)  
- Proxy API  
- Headers de resposta documentados (`Content-Type: application/json`, HSTS, `X-Frame-Options: DENY`, etc.)  
- PenTest / OSSTMM / NIST / OWASP referidos na doc  

### 2.3 Cartão (PCI)

API Pagamento exige **AES-256** (KEY + IV em Base64 fornecidos pela TI Suhai) nos campos sensíveis; opção de tokenização (`gerartoken`). Ver [`04-API-PAGAMENTO.md`](./04-API-PAGAMENTO.md).

---

## 3. Público-alvo da API

Assessorias, corretores, startups, insurtechs, multicálculos — integração nas **plataformas de venda** do parceiro (não substitui o Portal de Cotação Suhai para funções não expostas).

---

## 4. Produtos / combos disponíveis via WebService de vendas

Cinco combinações (auto / moto / caminhão conforme aceitação):

1. Roubo ou Furto  
2. Roubo ou Furto + Perda Total por Colisão  
3. Roubo ou Furto + RCF (terceiros)  
4. Roubo ou Furto + Perda Total por Colisão + RCF  
5. Terceiros (RCF)  

Cada combo com assistência:

- Sem assistência 24h  
- Plano 1 — guincho 200 km  
- Plano 2 — guincho 500 km  

Há ainda cobertura **Compreensiva** (código `10111` e derivados com assistência) documentada no método Realizar Cotação / Transmitir Proposta — ver [`06-DOMINIOS-E-FLUXOS.md`](./06-DOMINIOS-E-FLUXOS.md). Blog Suhai (29/05/2025): “Novo Combo de Oferta - Cobertura Compreensiva”.

---

## 5. Funções **indisponíveis** via integração (só Portal de Cotação)

- Cotação por **Valor Determinado**  
- Cotação e proposta de **Endosso**  
- Cotação de **Renovação simplificada**  

---

## 6. Responsabilidades do parceiro (citações da doc)

- Integridade dos dados enviados  
- Condições válidas = **somente** o que o serviço retornar  
- Homologação: **dados fictícios** (CPF/CNPJ, endereço, telefone, e-mail)  
- Produção: IPs autorizados previamente  
- Suporte: [chamados.suhaiseguradora.com](https://chamados.suhaiseguradora.com)

---

## 7. Envelope REST pós-vendas (padrão)

Headers obrigatórios:

```http
Content-Type: application/json
Accept: application/json
apikey: <chave TI Suhai>
```

Opcional paginação: `pagina_inicial`, `tamanho_pagina` (default até 5000 se omitido).  
Condicional: `Authorization: Basic base64(usuario:senha)` — **não** dispensa `apikey`.

Corpo de resposta:

```json
{
  "status": {
    "cod_status": 200,
    "tipo_status": "SUCESSO",
    "desc_status": "Ação realizada com sucesso.",
    "msg_excecao": ""
  },
  "dados": {},
  "paginacao": {}
}
```

Códigos: `200`, `204`, `207` (parcial), `400`, `401` (sem detalhe), `500`.

---

## 8. Mudança recente de homolog SOAP (blog 26/11/2025)

Aviso: a partir de **01/12/2025**, endpoints de homologação de Cotação/Proposta e FIPE migraram.  
**Usar** (conforme páginas atuais do WebService):

| Serviço | Homologação atual |
|---|---|
| Multicálculos | `uat.integracao.suhaiseguradoracotacao.com.br/MultiCalculos.svc` |
| FIPE | `uat.integracao.suhaiseguradoracotacao.com.br/veiculosfipe.svc?wsdl` |

Produção (páginas WebService):

| Serviço | Produção |
|---|---|
| Multicálculos | `suhaiseguradoracotacao.com.br:5156/MultiCalculos.svc` |
| FIPE | `suhaiseguradoracotacao.com.br:5156/veiculosfipe.svc?wsdl` |

(Antigos `:5151` citados no blog como deprecados em homolog.)
