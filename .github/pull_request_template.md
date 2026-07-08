<!--
  Checklist de PR (docs/QA_CHECKLIST.md, seção 58.2) — bloqueia merge.
  Marque cada item antes de solicitar review.
-->

## Descrição

<!-- O que este PR faz e por quê. Referencie a issue (ex.: "Issue 12"). -->

## Checklist (bloqueia merge)

- [ ] `npm run typecheck` passou
- [ ] `npm run lint` passou
- [ ] `npm run build` passou
- [ ] `npm run check:hardcode` passou (Issue 23B — sem telefone/CNPJ/SUSEP/preço/wa.me/e-mail comercial hardcoded fora de `lib/company.ts`/`lib/ramos.ts`/`lib/whatsapp.ts`)
- [ ] Testes relevantes passaram (quando existirem)
- [ ] Sem libs novas não aprovadas
- [ ] Sem regressão visual óbvia
- [ ] Responsivo validado (360→1440)
- [ ] Eventos de analytics validados (quando aplicável)
- [ ] Screenshot/vídeo curto anexado
