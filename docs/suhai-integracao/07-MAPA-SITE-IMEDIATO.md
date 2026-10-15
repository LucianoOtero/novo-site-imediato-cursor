# 07 — Mapa para o site Imediato (`novo.segurosimediato.com.br`)

Análise de campos e fases. A interface de cotação já existe em preview desde 01/10/2026 (dois UATs, sem produção): ver [`09-ARQUITETURA.md`](./09-ARQUITETURA.md) §8. Este mapa continua válido como lista do que a API pede além do que a tela já coleta.

---

## 1. Objetivo de produto

Fluxo no site novo:

1. Cliente preenche formulário (atual ou **variação** com campos Suhai).  
2. Backend Imediato chama FIPE + Realizar Cotação.  
3. UI apresenta plano(s) / prêmio(s).  
4. Se aceitar → Transmitir Proposta + pagamento (boleto e/ou cartão).  
5. Acompanhar status/pendências até emissão.

EspoCRM / lead atual continua válido como CRM; a integração Suhai é **canal de precificação/emissão** paralelo (decisão de produto a fechar).

---

## 2. Campos do LeadForm atual vs exigidos Suhai

O formulário multi-step atual (`LeadForm`) coleta tipicamente: ramo, dados de contato, veículo (placa/ano/modelo em níveis variáveis), CEP, etc.  
Para cotação Suhai **mínima**, a doc exige entre outros:

| Necessário Suhai | Provável gap no form atual |
|---|---|
| `marca` + `modelo` canônicos FIPE Suhai | Alto — precisa lookup FIPE Suhai, não só texto livre |
| `cepPernoite` | Médio — CEP existe; confirmar se é pernoite |
| `sexo`, `estadoCivil`, `dtNascimento` | Alto se não coletados |
| Condutor principal (CPF/nome/nasc/sexo/EC) | Alto |
| Perguntas garagem 1–3 (ou 4 p/ caminhão) | Alto |
| `utilizacaoDut` (+ `tipoUtilizacao`) | Alto — mapear Uber/táxi/app → códigos 7/17/19/22… |
| `tipoContratacao`, `classeBonus`, `tabelaComissao` | Alto — regras comerciais Imediato |
| `zeroKM` / placa `YYY9999` / chassi | Médio |
| Endereço completo + celular na **proposta** | Médio — proposta pede mais que o lead mínimo |
| `cdCobertura` / escolha de assistência | Novo passo de UI pós-cálculo |

Conclusão: haverá **formulário estendido** ou etapas extras pós-lead antes do cálculo Suhai.

---

## 3. Arquitetura sugerida (futuro)

| Camada | Responsabilidade |
|---|---|
| Browser | UX; **sem** credenciais Cotador / apikey / AES keys |
| Next Route Handlers ou Cloud Functions | Proxy SOAP/REST; IP fixo whitelist; secrets |
| Job/cron | Sync diário FIPE Suhai → cache (Postgres/Redis) |
| Espo | Opcional: gravar protocolo/proposta/status no Opportunity |

Alinhar com stack já usada (`deliverLead`, secrets Firebase/Vercel).

---

## 4. Escopo por fase (proposta)

| Fase | Escopo |
|---|---|
| **D0** | Esta documentação (feito) |
| **D1** | Credenciais homolog + whitelist IP + smoke FIPE + 1 cotação fictícia |
| **D2** | UI cálculo + exibição de ofertas (sem proposta) |
| **D3** | Transmitir proposta + boleto |
| **D4** | Cartão (AES/PCI) + status/pendências |
| **D5** | Pós-vendas REST (consulta apólice) se produto exigir |

Fora: endosso / valor determinado / renovação simplificada via API.

---

## 5. Riscos

- Whitelist IP e credenciais comerciais  
- PCI se cartão no fluxo web (preferir tokenização + backend)  
- Divergência de códigos `10010` vs `10110` entre páginas — homologar com retorno real  
- Aceitação Suhai (análises nível 1/2, vistoria, rastreador) → UX de “proposta em análise”  
- LGPD / responsabilidade dos dados (cláusula da doc Suhai)
