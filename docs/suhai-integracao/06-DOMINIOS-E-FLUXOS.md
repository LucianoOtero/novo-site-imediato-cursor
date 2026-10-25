# 06 — Domínios, códigos e fluxos

Valores enumerados extraídos da documentação SUHAPI (principalmente Realizar Cotação, Transmitir Proposta, Consultar Status).

---

## 1. Códigos de cobertura (`cdCobertura`) — entrada cotação/proposta

| Código | Descrição (doc) |
|---|---|
| `1003` | Roubo/Furto Total + Assistência 24h (default bloco legado se vazio) |
| `1009` | Roubo/Furto + PT Colisão/Danos + Assistência 24h |
| `10031` | Roubo/Furto + Assistência 24h + RCF |
| `10091` | Roubo/Furto + PT + Assistência 24h + RCF |
| `10110` / `10010` | Terceiros (RCF) + Assistência *(códigos variam ligeiramente entre páginas cotação vs proposta — validar no retorno real)* |
| `10111` | Compreensiva (Roubo+Furto+PT+Parciais) [+ assistência conforme contexto] |

### 1.1 Matriz `planoAssistencia` × combos (retorno de ofertas)

| `planoAssistencia` | Significado | IDs de oferta citados na doc |
|---|---|---|
| `0` | Sem assistência | `1013`, `1019`, `10131`, `10191`, `10110`, `10011` |
| `1` | Plano 1 — 200 km | `1003`, `1009`, `10031`, `10091`, `10010`, `10111` |
| `2` | Plano 2 — 500 km | `1023`, `1029`, `10231`, `10291`, `10210`, `10211` |

Se `planoAssistencia` omitido na cotação → doc indica retorno proporcional ao **domínio 1 (200 km)** para os 5 combos (15 derivações no modelo de oferta completo).

---

## 2. `utilizacaoDut` (tipo de utilização)

| Cód. | Descrição | Moto | Auto | Van/Vuc | Caminhão |
|---|---|---|---|---|---|
| 1 | Particular | X | X | X | |
| 2 | Locação (contrato anual) | X | X | X | X |
| 3 | Locação (contrato avulso) | X | X | X | X |
| 4 | Fretamento (carga serviço) | | | X | X |
| 5 | Transp. funcionários/turismo/eventos (exc. lotações) | | X | X | X |
| 6 | Lotação (passagens individuais) | | X | X | X |
| 7 | Táxi | | X | | |
| 8 | Escolar | | X | X | X |
| 9 | Auto-escola | X | X | X | |
| 10 | Serviços alimentação | X | X | X | X |
| 11 | Ambulâncias serviço público | X | X | X | X |
| 12 | Ambulâncias hospitais particulares | X | X | X | X |
| 13 | Motos não emplacadas/lazer | X | | | |
| 14 | Competições/trilhas/Track Day | X | X | | |
| 15 | Test drive (carros) | | X | | |
| 16 | Test drive (motos) | X | | | |
| 17 | Moto táxi | X | | | |
| 18 | Motorhome/Trailer | | X | X | X |
| 19 | Transp. passageiros por aplicativo | X | X | | |
| 20 | Escolta e segurança | X | X | | |
| 21 | Moto-fretistas/entregadores | X | | | |
| 22 | Locação (app de passageiros) | | X | | |
| 23 | Motos elétricas não emplacadas | X | | | |

Se Particular → preencher também `tipoUtilizacao` (1/2/3).

---

## 3. Outros enums úteis

| Campo | Valores |
|---|---|
| `sexo` | 1 F · 2 M · 3 PJ |
| `estadoCivil` | 1 Casado/UE · 2 Solteiro · 3 Separado/Div/Outros |
| `tipoContratacao` | 1 Novo · 2 Renovação Suhai · 3 Renovação outras |
| `zeroKM` | 0/N · 1/S |
| `tabelaComissao` | `tab 1` (10%) … `tab 11` (36%) + tabs 21–36; limites moto até tab 11; auto/caminhão &lt;10 anos até tab 9 |
| `tp_pagamento` | **2** boleto (usar) · 1 legado descontinuado · **11** cartão+boleto · **14** cartão recorrente |
| `cor` | 1–16 cores + 18 NI |
| `combustivel` | 1 Álcool · 2 Diesel · 3 Híbrido · 4 Flex · 5 GNV · 6 Gasolina · 8 NI |
| FIPE `cod_categoria_suhai` | 1 Auto · 2 Moto · 3 Caminhão · 4 Van/VUC |

---

## 4. Status da proposta (`ConsultarStatusProposta`)

| Cód. | Status | Emite boleto 1ª? | Pode avançar? | Cancelada? |
|---|---|---|---|---|
| 1 | Salva (não transmitida) | Não | Sim | Não |
| 2 | Pendente Análise Nível 1 | Não | Sim | Não |
| 3 | Pendente Análise Nível 2 | Não | Sim | Não |
| 4 | Recusa Operacional | Não | Não (final) | Sim |
| 5 | Recusa Reavaliável (AUT) | Não | Não (final)* | Sim |
| 6 | Aguardando Emissão | Não | Sim | Não |
| 7 | Cancelada a pedido | Não | Não | Sim |
| 9 | Aprovada | Não | Sim | Não |
| 10 | Em processo de emissão | Não | Sim | Não |
| 11 | Aguardando emissão automática | Não | Sim | Não |
| **12** | **Pendências para emissão** | **Sim** | Sim | Não |
| 13 | Emitida | Não | Não | Não |
| 14 | Recusa técnica | Não | Não | Sim |
| 15 | Emissão manual | Não | Não | Não |
| 16 | Recusa reavaliável (MAN) | Não | Não* | Sim |
| 17 | Emissão manual endosso | Não | Não | Não |

\*Recusas reavaliáveis: doc descreve caminho via novo cálculo/fator FIPE ou nova condição — tratar como fluxo especial de UX.

A coluna "Emite boleto 1ª?" vem da doc antiga e está superada: a Suhai só emite cobrança depois da apólice (status 13), e as APIs de boleto foram descontinuadas (Fábio Edo, 24/10/2026).

---

## 5. Fluxo regulamentar resumido (venda nova)

1. **FIPE Suhai** → marca/modelo canônicos  
2. **Realizar Cotação** → protocolo + ofertas  
3. Cliente escolhe cobertura / assistência / parcelamento  
4. **Transmitir Proposta** (dados cadastrais, veículo, vigência, pagamento)  
5. Se cartão → **API Pagamento** (AES/token)  
6. Se boleto → nada a chamar: a cobrança só sai depois da apólice emitida (APIs de boleto descontinuadas em 2026)  
7. Tratar **pendências** (vistoria / rastreador) via `ConsultarPendencias`  
8. Acompanhar até **Emitida (13)**; opcional PDF proposta  
9. Pós: REST apólice/parcelas se necessário  

Fora do WS: valor determinado, endosso, renovação simplificada → Portal Cotação Suhai.
