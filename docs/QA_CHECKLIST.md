# QA_CHECKLIST

## Finalidade
Testes, checklists de homologação/produção e critérios de Ready/Done.

## Origem
Conteúdo copiado verbatim de `ESPECIFICACAO v3.md` — seções 25–27, 37, 53, 58, 60. Extraído na Issue P-02, sem resumo ou reinterpretação.

## Status
CONTEÚDO IMPORTADO (origem: `ESPECIFICACAO v3.md`)

---

## 25. Checklist de desenvolvimento
- [ ] Tokens no `@theme` (cores, radius, shadow, fonts) · Fonts self-hosted · Container/Section/Grid base
- [ ] Header (sticky/scrolled/drawer) · Footer (SUSEP/CNPJ/legais) · CredBar
- [ ] Hero + LeadForm passo 1 · RamoGrid (de lib/ramos) · Benefits (4 cards) · CoverageCards
- [ ] InsurersGrid · Testimonials Embla · FAQ + schema · CTAs (meio/pós-FAQ/final/sticky/FAB)
- [ ] WhatsApp + Ligar com tracking · LeadForm multi-step · api/lead → webhook/CRM
- [ ] /cotacao · /obrigado · template LP de ramo · FraudAlert

## 26. Checklist de homologação (QA)
- [ ] Lighthouse mobile ≥95 (4 categorias) · CWV verdes · Form: validação/erros/sucesso/foco
- [ ] Eventos dataLayer (GTM Preview) · generate_lead e whatsapp_click conferidos · Schema válido · Metadata/OG · sitemap/robots
- [ ] Teclado completo · foco visível · contraste AA · screen reader · responsivo 360→1440 · toque ≥44px · reduced-motion · links tel:/wa.me

## 27. Checklist de produção (go-live)
- [ ] Domínio + SSL + www→apex · GTM publicado · GA4 recebendo · Ads + Enhanced Conversions · Consent Mode v2/LGPD
- [ ] 301 das URLs antigas · Search Console + sitemap · variáveis de ambiente · monitoramento de erros · backup de leads + fallback e-mail
- [ ] Teste de carga /api/lead · 404/500 com CTA de contato · smoke test de conversão ponta a ponta

## 37. Estratégia de qualidade & testes

| Camada | Ferramenta | Cobre |
|---|---|---|
| Unit/lógica | Vitest + Testing Library | validadores Zod, helpers, hooks |
| Componente/visual | Storybook + addon-a11y | variantes/estados; play; regressão (Chromatic opc.) |
| E2E/integração | Playwright | fluxo de cotação, WhatsApp/Ligar, cross-browser |
| Acessibilidade | axe-core + eslint-jsx-a11y | WCAG 2.2 AA automatizado |
| Performance/SEO | Lighthouse CI + bundle-analyzer | Perf/SEO/A11y/BP ≥95; budget de JS; CWV |
| Tipos/lint | tsc --noEmit · ESLint · Prettier | type-safety, padrões |

**Gates de CI (bloqueiam merge):** typecheck+lint · Vitest verde · Playwright (cotação+CTAs) · axe 0 críticas/sérias · Lighthouse ≥95 mobile · bundle dentro do orçamento.
**Manuais recorrentes:** responsivo 360/390/768/1024/1440 · iOS Safari + Android Chrome reais · teclado · leitor de tela · conversão ponta a ponta · eventos GTM/GA4 DebugView · Rich Results · reduced-motion/alto contraste.

## 53. Definição de Ready / Done

**Definition of Ready — pode começar quando:** escopo claro (issue + seções) · dependências resolvidas · design/tokens definidos · critérios de aceite escritos · dados necessários existem (env, lib/ramos) · fora de escopo explícito.

**Definition of Done — termina quando:** código implementado · typecheck passou · lint passou · testes relevantes passaram · responsividade validada (360→1440) · acessibilidade básica validada (teclado/axe) · analytics disparando quando aplicável · sem hardcode proibido · documentação atualizada · print/vídeo curto anexado.

## 58. Fluxo Git, Pull Requests & Deploy

### 58.1 Branches
- `main` → produção (protegida) · `develop` → integração (preview automático Vercel).
- `feature/issue-NN-slug` (ex.: `feature/issue-01-scaffold`) — uma por issue.
- PR obrigatório `feature → develop`; `develop → main` só após homologação; tag de release (`v1.0.0`) no merge para main.
- Aprovação: 1 reviewer (tech lead) mínimo; CI verde obrigatório.

### 58.2 Checklist de PR (bloqueia merge)
typecheck · lint · build · testes relevantes · sem hardcode proibido (company/ramos/env) · sem libs novas não aprovadas · sem regressão visual óbvia · responsivo validado · eventos de analytics validados (quando aplicável) · screenshots/vídeo anexados.

### 58.3 Checklist de deploy em produção
DNS validado · SSL ativo · variáveis de ambiente configuradas · GTM publicado · GA4 recebendo eventos · Google Ads recebendo conversões · `/api/lead` funcionando · fallback funcionando · Search Console configurado · sitemap enviado · redirects 301 ativos · smoke test completo.

## 60. Checklist comercial de go-live

Obrigatório antes de publicar — o negócio depende de Ads + atendimento humano.

- [ ] Telefone principal correto
- [ ] WhatsApp correto (abre conversa no celular)
- [ ] Ouvidoria correta
- [ ] E-mail correto
- [ ] SUSEP correto
- [ ] CNPJ correto
- [ ] Endereço correto
- [ ] Preço "a partir de" correto por ramo
- [ ] Mensagem WhatsApp por ramo correta
- [ ] Clique no telefone abre discador
- [ ] Formulário envia lead real
- [ ] Lead chega ao CRM/webhook
- [ ] Fallback por e-mail funciona
- [ ] Vendedor recebe ramo, origem, UTM e GCLID
- [ ] /obrigado dispara conversão
- [ ] GA4 DebugView registra generate_lead
- [ ] Google Ads registra conversão de teste
- [ ] GTM Preview sem erro
- [ ] Lead duplicado tratado corretamente
- [ ] Erro de CRM gera alerta
- [ ] Form funciona em 4G no celular
- [ ] Form funciona no iPhone Safari
- [ ] Form funciona no Android Chrome
- [ ] Campanha aponta para a LP correta por ramo
- [ ] LP tem message match com o anúncio
- [ ] /obrigado está noindex
- [ ] Política de privacidade acessível
- [ ] Banner de consentimento acessível
- [ ] Vendedor validou recebimento de lead real

---

> Este documento é uma fatia fiel de `ESPECIFICACAO v3.md`. **Nota importante:** o `PLANO_IMPLEMENTACAO.md` (rev. 4.1) amplia este QA com a auditoria anti-hardcode (Issue 23B), o staging seguro (Issue 23A) e o QA visual de assets (Issue P-10) — consulte-o como referência complementar. Nenhum conteúdo desta extração foi resumido, reinterpretado ou inventado.
>
> **Issue 23B (implementada):** o item "sem hardcode proibido" das seções 53 e 58.2 acima agora tem um comando concreto que o verifica: `npm run check:hardcode` (script em `scripts/check-hardcoded-business-data.mjs`). Ele varre `app/`, `components/` e `lib/` em busca de telefones, CNPJ, SUSEP, preços, links `wa.me`/Google Maps e e-mails comerciais hardcoded fora de `lib/company.ts`/`lib/ramos.ts`/`lib/whatsapp.ts`, e falha (`exit code 1`) se encontrar alguma ocorrência — deve rodar antes de todo PR (ver `.github/pull_request_template.md`).
