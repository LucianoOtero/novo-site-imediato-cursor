# CONTENT_STRATEGY

## Finalidade
Guia editorial, voz de marca, microcopy e estratégia de gerenciamento de conteúdo (CMS).

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 34, 36. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

## 34. Guia editorial & conteúdo

Voz: "o especialista experiente que fala como gente, não como apólice". Confiável, claro, próximo, direto.

**Eixos** — Somos: claros, próximos (2ª pessoa), confiantes, diretos, honestos. Não somos: cheios de jargão, corporativos, arrogantes/alarmistas, prolixos, pressionadores.

**Copywriting:** benefício antes do recurso; sentence case (sem CAIXA ALTA); números concretos; verbos de ação; prova junto da promessa.

### 34.3 Microcopy (pronta)
| Contexto | Copy |
|---|---|
| CTA primário | "Cotar agora" · "Fazer cotação grátis" · "Quero meu preço" |
| CTA WhatsApp | "Falar no WhatsApp" · "Tirar dúvidas agora" |
| Garantias | "Cotação 100% gratuita · Sem compromisso · Seus dados estão seguros" |
| Facilidade | "Leva menos de 1 minuto" · "Só precisamos de 2 informações pra começar" |
| Erro de campo | "Confira o número do celular (com DDD)" · "Esse CEP parece incompleto" |
| Erro de envio | "Algo deu errado ao enviar. Tente de novo ou fale com a gente no WhatsApp." |
| Sucesso | "Recebemos sua cotação! Um especialista vai te chamar em breve com as melhores opções." |
| Loading | "Buscando as melhores opções…" |
| Empty | "Nada por aqui ainda. Que tal fazer uma cotação?" |
| 404 | "Essa página saiu de cobertura. Volte ao início ou fale com um especialista." |

### 34.4 Mensagens de WhatsApp (por ramo)
```ts
// lib/whatsapp.ts → wa.me/55XXXXXXXXXXX?text=...
auto:  "Olá! Vim pelo site e quero uma cotação de Seguro Auto."
moto:  "Olá! Quero cotar um Seguro de Moto."
uber:  "Olá! Sou motorista de app e quero um seguro que cubra Uber/99."
frota: "Olá! Quero falar com um especialista sobre Seguro de Frota (PJ)."
// origem (utm) e ramo anexados p/ contexto do vendedor
```

### 34.5 Institucional vs comercial
- **Institucional** (Sobre, legais, fraude): formal e preciso ("Atuamos como corretores de seguros, intermediando companhias registradas na SUSEP").
- **Comercial** (LPs, CTAs, blog): quente e direto ("A gente compara 16 seguradoras pra você pagar menos").

## 36. Estratégia de gerenciamento de conteúdo (CMS)

| Opção | Prós | Contras | Ideal para |
|---|---|---|---|
| MDX/Markdown (repo) | custo zero, versionado, DX, máx. performance | edição exige PR; sem UI p/ não-técnico | docs, glossário, baixa rotação |
| Sanity | editor estruturado, real-time, free generoso | curva de schema; fora do Git; custo ao escalar | blog + pSEO c/ autores não-técnicos |
| Payload CMS | open-source, self-host, TS nativo, roda no Next, sem lock-in | exige infra; setup inicial | dados próprios + TS end-to-end |
| Contentful | maduro, enterprise | caro; menos flexível; lock-in | grandes times |

**Recomendado — híbrido:** **MDX no repo para conteúdo estável** (glossário, guias, institucional, FAQ) **+ Payload CMS para blog/alta rotação** quando o time editorial crescer (Fase 3).
- MDX elimina dependência externa, máx. performance (SSG), Git, custo zero — ideal Fase 1–2.
- Payload: TS end-to-end, self-hosted (dados próprios, sem lock-in), roda no mesmo app Next.
- pSEO gerada por dados estruturados (JSON/DB) + `generateStaticParams`, não CMS.
- `lib/ramos.ts`/`lib/company.ts` permanecem em código (config crítica de negócio).

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. Nenhum conteúdo foi resumido, reinterpretado ou inventado nesta extração.
