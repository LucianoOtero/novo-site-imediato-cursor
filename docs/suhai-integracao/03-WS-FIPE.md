# 03 — WebService FIPE SUHAI (SOAP)

**Índice:** [WebService FIPE SUHAI](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/457441292)  
**Método:** [Consulta Tabela FIPE SUHAI](https://suhai.atlassian.net/wiki/spaces/SUHAPI/pages/439484515) · operação `ConsultaVeiculos`

| Ambiente | Endpoint |
|---|---|
| Homolog | `uat.integracao.suhaiseguradoracotacao.com.br/veiculosfipe.svc?wsdl` |
| Produção | `suhaiseguradoracotacao.com.br:5156/veiculosfipe.svc?wsdl` |

---

## Objetivo

Obter **marca** e **modelo** na grafia **exata aceita pela Suhai** (obrigatórios em Realizar Cotação). O `codFipe` na cotação deixou de ser o critério principal quando há ambiguidades FIPE.

---

## Recomendação oficial de uso

- Executar **diariamente** (ou periodicamente) **sem** `cod_fipe` / `cod_categoria_suhai` → carga completa da base em DB interno.  
- Evitar chamar online **por cotação** (lentidão / UX).  
- Para lookup pontual: informar `cod_fipe` + `cod_categoria_suhai`.

---

## Request

| Tag | Obrig. | Notas |
|---|---|---|
| `login` / `senha` | Sim | Mesmo Cotador |
| `cod_fipe` | Não | Ex. `886002-5` (com hífen no DV) |
| `cod_categoria_suhai` | Não | 1 Automóvel · 2 Moto · 3 Caminhão · 4 Van e VUCs |

Se um FIPE tiver vários modelos, o retorno traz **vários** blocos `TabelaFipe`.

---

## Response (`TabelaFipe`)

| Campo | Uso |
|---|---|
| `cod_fipe` | Código |
| `num_passageiros` | |
| `cod_marca` / `marca` | → tag `<marca>` na cotação |
| `cod_modelo` / `modelo` | → tag `<modelo>` na cotação |
| `cod_categoria_suhai` / `categoria_suhai` | |
| `cod_categoria_tarifaria` | |

---

## Exemplo (consulta pontual)

```xml
<suh:ConsultaVeiculos>
  <suh:parametro>
    <suh:login>...</suh:login>
    <suh:senha>...</suh:senha>
    <suh:cod_fipe>886002-5</suh:cod_fipe>
    <suh:cod_categoria_suhai>2</suh:cod_categoria_suhai>
  </suh:parametro>
</suh:ConsultaVeiculos>
```
