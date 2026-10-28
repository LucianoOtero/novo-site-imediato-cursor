# 02 — WebService Cotação / Proposta (SOAP Multicálculos)

Endpoints e auth: ver [`01-CATALOGO.md`](./01-CATALOGO.md).  
Cada método exige `login` + `senha` do Cotador (vinculados a uma **Corretora** no cadastro Suhai).

Envelope típico (exemplos oficiais usam namespace `suhaiseguradoracotacao.com.br:5155`):

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:suh="suhaiseguradoracotacao.com.br:5155">
  <soapenv:Header/>
  <soapenv:Body>
    <!-- operação -->
  </soapenv:Body>
</soapenv:Envelope>
```

Códigos genéricos de mensagem em vários retornos: **`001` = Sucesso**, **`503` = Erro** (texto em `textoMsgRet`).

---

## 1. Realizar Cotação

**Página:** [Realizar Cotação](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/438370307) (doc extensa; atualizada com frequência)  
**Operação SOAP:** `IncluirCotacaoSuhai`, com os campos dentro do wrapper `<suh:cotacao>` — o título da página é "Realizar Cotação", mas esse não é o nome da operação.  
**Objetivo:** transmitir cotação e obter prêmios / estruturas de oferta (bloco antigo + bloco novo com múltiplas coberturas).

### 1.0 Estrutura confirmada do retorno (exemplo oficial)

`IncluirCotacaoSuhaiResult` traz `protocolo`, `codMsgRet`, `textoMsgRet`, os campos `premio*` do bloco legado, `valorFipe` / `fatorFipe` / `valorFipexFator`, e o nó `Calculo`:

```xml
<Calculo id="414324" numero="263230">
  <Automovel valorFipe="40222.00" fatorFipe="100" valorIS="40222.00"/>
  <RCF valorISDanosMateriais="100000.00" premioDanosMateriais="798.88" .../>
  <Franquia planoFranquia="Básica" valorFranquia="7241.58"/>
  <PremioCoberturas>
    <Cobertura id="1003" nome="Seguro Roubo/Furto Total + Assistência 24h - 200 km" premioLiquido="733.35">
      <Parcelamento>
        <Parcela quantidade="12" valorTotal="1015.39" valorJuros="17.69" valorIOF="5.82" percentualJuros="28.943600">84.62</Parcela>
      </Parcelamento>
    </Cobertura>
  </PremioCoberturas>
</Calculo>
```

Dois detalhes que quebram parser ingênuo: os campos escalares usam separador de milhar (`1,670.18`) enquanto os atributos não (`40222.00`); e o valor da parcela é o **texto** do nó `Parcela`, enquanto `valorTotal` é o total financiado.

Matriz de `Cobertura id` observada nos exemplos de retorno, que confirma o mapeamento dos três planos do site:

| Combo | Sem assistência | 200 km | 500 km |
|---|---|---|---|
| Roubo/furto | `1013` | `1003` | `1023` |
| Roubo/furto + perda total | `1019` | `1009` | `1029` |
| Roubo/furto + RCF | `10131` | `10031` | `10231` |
| Roubo/furto + PT + RCF | `10191` | `10091` | `10291` |
| RCF puro | `10110` | `10010` / `10110` | `10210` |
| Compreensiva | `10011` | `10111` | `10211` |

O código `10110` aparece nos exemplos tanto como RCF sem assistência quanto como RCF com 200 km — confirmar no retorno real de homologação.

### 1.1 Parâmetros principais (requisição)

| Tag | Tipo | Obrig. | Notas |
|---|---|---|---|
| `login` / `senha` | string | Sim | Cotador |
| `protocolo` | int | Não | Reenviar para **alterar** cotação existente |
| `cpfCnpj` | int/string digits | Sim | 11 ou 14 dígitos s/ máscara |
| `nome` | string | Sim | Proponente |
| `nome_social` | string | Não | |
| `dtNascimento` | date `yyyy-mm-dd` | Sim exceto PJ | |
| `sexo` | int | Sim | 1 Fem · 2 Masc · 3 PJ |
| `cepPernoite` | int 8 dig | Sim | Local onde o veículo pernoita |
| `estadoCivil` | int | Sim exceto PJ | 1 Casado/UE · 2 Solteiro · 3 Separado/Div/Outros |
| `marca` / `modelo` | string | Sim | **Exatos** da FIPE Suhai (`ConsultaVeiculos`) |
| `codFipe` | string | Não* | Ex. `001055-3`; validação principal é marca+modelo |
| `anoModelo` | int YYYY | Sim | |
| `anoFabricação` | int YYYY | Não | |
| `zeroKM` | string | Sim | `0`/`N` ou `1`/`S` |
| `chassi` | string | Cond. | Obrig. se 0KM **e** placa preenchida |
| `placa` | string | Cond. | Maiúsculas; 0KM → `YYY9999` |
| `utilizacaoDut` | int | Sim | Ver tabela em [`06-DOMINIOS-E-FLUXOS.md`](./06-DOMINIOS-E-FLUXOS.md) |
| `tipoUtilizacao` | int | Cond. | Só se Particular: 1 Locomoção/trabalho/lazer · 2 Ativ. profissional · 3 Lazer exclusivo |
| `possuiOutroVeic` | string | Não | 1/N Não · 2/S Sim |
| `tipoContratacao` | int | Sim | 1 Novo · 2 Renovação Suhai · 3 Renovação outras |
| `tabelaComissao` | string | Sim | `tab 1`…`tab 11` e tabs 21–36 (% comissão); limites por tipo/ano |
| `classeBonus` | int 0–10 | Sim | |
| `cpfCnpjPrincipalCondutor` + nome + nasc + sexo + estadoCivil | | Sim | Condutor indeterminado PJ: `sexo=3` e tags do condutor vazias |
| Perguntas 1–3 (garagem residência / trabalho / escola) | int | Sim* | *Dispensadas p/ caminhões, vans/VUCs |
| Pergunta 4 | int | Sim* | *Exclusiva caminhão/van/VUC |
| Pergunta 5 `tipoCarga` | int | Cond. | Caminhão + usos locação/fretamento |
| `vlr_desconto` | int | Não | −99…20 (negativo = agravo) |
| `cdCobertura` | int | Não | Default antigo **1003** se vazio; retorno novo traz múltiplas coberturas |
| `nro_apolice_ant` | string 13 | Cond. | Obrig. se `tipoContratacao=2` |
| `vlr_DanosMorais` / `Materiais` / `Corporais` | decimal | Não | LMI máx. documentados; Materiais exige Corporais |
| `planoAssistencia` | int | Não | 0 / 1 / 2 — ver domínios |
| `email` | string | Não | Proponente |

Doc também lista exemplos de request para: compreensiva, sem assistência, plano 1, plano 2, com/sem RCF.

### 1.2 Resposta

- **Bloco 1 (legado):** valores da cobertura selecionada (ou 1003).  
- **Bloco 2 (novo):** valores para múltiplas coberturas independentemente do `cdCobertura` enviado.  
- Inclui **protocolo** (ID do cálculo) — chave para Transmitir Proposta / consultas.

Detalhe de campos de retorno: página oficial (seção “Cotação Retorno - Bloco 1/2”).

---

## 2. Transmitir Proposta

**Página:** [Transmitir Proposta](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/438632504) (mai/2025)

Formaliza contratação de **uma** cobertura a partir do `protocolo` da cotação.

### 2.1 Campos principais

| Tag | Obrig. | Notas |
|---|---|---|
| `login` / `senha` | Sim | |
| `protocolo` | Sim | ID do cálculo |
| `email`, `ddd_cel`, `num_cel` | Sim | |
| Endereço: `end_nom_log`, `end_num`, `bairro`, `uf`, `cidade`, `cep` | Sim | `end_compl` opcional |
| Telefones com/res | Não | |
| Renovação: `cod_ci`, `nro_apolice_ant`, `cod_seg_ant`, `nome_seg_ant` | Cond. | |
| `chassi`, `placa` | Sim | 0KM placa `YYY9999` |
| `cor` | Sim | 1–16 + 18 Não informado |
| `combustivel` | Sim | 1 Álcool · 2 Diesel · 3 Híbrido · 4 Flex · 5 GNV · 6 Gasolina · 8 NI |
| `renavam` | Não | |
| `data_vig_ini` | Sim | `yyyy-mm-dd`; não > 1 mês no futuro; vazio → crítica |
| `tp_pagamento` | Sim | **2** boleto (preferir; **1** = legado descontinuado) · **11** cartão 1ª + boleto demais · **14** cartão recorrente |
| `vecto_demais_parcelas` | Sim | Dia 1–31. Em UAT a tag `vect_demais_parcelas` volta como campo obrigatório ausente |
| `qtd_parcelas` | Sim | 1–12 |
| `cdCobertura` | Sim | Código do plano escolhido |
| `data_saida_concessionaria` | Cond. | Se cotação marcou necessidade |
| `data_vp_financeira` | Cond. | Dispensa VP se ≤3 dias e feature liberada comercialmente |
| Co-corretagem `cod_oper_co_corretagem` + `cpf_cnpj_co_corretor` | Cond. | Só corretor/co-corretor |

### 2.2 Retorno

| Campo | Descrição |
|---|---|
| `protocolo` | Eco |
| `codMsgRet` | 001 sucesso / 503 erro |
| `textoMsgRet` | Mensagem |
| `Proposta` | **Número da proposta** (Cotador + APIs pagamento) |

### 2.3 Cartão de crédito (obrigatório pós-sucesso)

1. `tp_pagamento` = **11** ou **14**  
2. Chamar REST **Insere Dados de Pagamento** com o número da proposta (e AES/token).  

---

## 3. Consultar Status da Proposta

**Página:** [438861937](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/438861937)

Operação SOAP `ConsultarStatusProposta`, campos dentro do wrapper `<suh:consulta>`. Entrada: `login`, `senha`, e **pelo menos um** de `protocolo` / `proposta`.

Retorno (`ConsultarStatusPropostaResult`): **`codMsgRet` é o código do status** (ex.: `003`) e `textoMsgRet` o nome ("Pendente Análise Nível 2"); `503` é erro da consulta. Também `protocolo`, `proposta`, `data_atualizacao_status` e, nas recusas reavaliáveis, `recusa_reavaliavel_aut` (fator FIPE sugerido) ou `parecer_autor` / `data_hora_parecer` / `parecer_texto` (MAN).

Tabela completa de status (1–19): [`06-DOMINIOS-E-FLUXOS.md`](./06-DOMINIOS-E-FLUXOS.md). Implementado no gateway em `POST /proposta/status` (`suhai-gateway/src/acompanhamento.js`).  
~~Destaque operacional: status **12 Pendências para Emissão** é o que **permite emitir boleto 1ª parcela**.~~ Superado: a cobrança só sai depois da apólice emitida (ver seção 6).

---

## 4. Gerar Documento (PDF) da Proposta

**Página:** [439320637](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/439320637)  
Operação SOAP `GerarPDF`, wrapper `<suh:impressao>`: `login`/`senha`, `protocolo` e/ou `proposta`, `envia_email` (S/N — S manda o PDF ao proponente). Retorno `GerarPDFResult` com `protocolo`, `proposta` e `arquivo` (PDF em base64). Gateway: `POST /proposta/pdf`, com `envia_email` N por padrão.

---

## 5. Cancelar Proposta

**Página:** [439517311](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/439517311)

| Tag | Obrig. |
|---|---|
| `protocolo` | Sim |
| `justificativa` | Sim, **mín. 30 caracteres** |

Operação SOAP `CancelarProposta`.

---

## 6. Gerar Boleto 1ª parcela (PDF) / 7. Consultar Dados do Boleto — DESCONTINUADAS

**Páginas:** [439156994](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/439156994) · [439517233](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/439517233)

**Não implementar.** Fábio Edo (Suhai), e-mail de 24/10/2026: cumprindo determinação da SUSEP, a Suhai só emite cobrança **depois da emissão da apólice**. Não há mais boleto nem cobrança antes da apólice, e as APIs com essa finalidade foram descontinuadas. A proposta continua sendo transmitida com `tp_pagamento` 2 (boleto); o boleto chega depois da apólice. Como ele chega ao cliente (Suhai direto ou corretora pelo portal/pós-venda) foi perguntado à Suhai.

---

## 8. Pesquisar Proposta / 9. Consultar Dados da Proposta

**Páginas:** [488276120](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/488276120) · [488276561](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/488276561)

Busca e leitura analítica pós-transmissão (filtros e campos na doc oficial).

---

## 10. Consultar Pendências de Emissão

**Página:** [615841800](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/615841800)  
Operação SOAP `ConsultarPendencias`, wrapper `<suh:pendencia>`.

Filtros: `proposta`, `protocolo`, `cpfCnpj`, `placa`, `chassi`, período `data_proposta_ini`/`fim` (**máx. 15 dias**).

Retorno (`ConsultarPendenciasResult`): `codMsgRet` 001 e um `PropostaResult` por proposta, com `status_proposta`, um `painel_pendencia num_pendencia="n"` por pendência (`pendencia`, `prestador`, `Etapa`, `status`, `ultima_atualizacao`, `link_prestador` — link da **autovistoria** ou do site do **rastreador** enquanto pendente) e `parecer num_parecer="n"`. Proposta sem pendência volta como 503 "Não foi encontrado nenhum registro para os critérios utilizados." — o gateway (`POST /proposta/pendencias`) traduz para lista vazia.

---

## Observação de implementação (Imediato)

- Preferir **servidor** (Cloud Function / Route Handler) para SOAP: credenciais Cotador e IP fixo whitelist.  
- Nunca expor `login`/`senha` Cotador ao browser.  
- Normalizar marca/modelo **sempre** via FIPE Suhai antes de cotar.
