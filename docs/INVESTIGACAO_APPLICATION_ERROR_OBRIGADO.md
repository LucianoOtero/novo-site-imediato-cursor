# Investigação — "Application error" em `/obrigado` após envio do `LeadForm`

## Status
Investigação concluída (2026-07-15); correções implementadas e publicadas na mesma data. Causa raiz ainda não confirmada com 100% de certeza (nenhum stack trace real foi capturado até a implementação) — por isso a correção prioriza (1) capturar o erro real definitivamente, via error boundaries reais, e (2) corrigir, de forma defensiva, os bugs concretos já encontrados por revisão de código. Ver "Correções implementadas" no final deste documento.

## Reprodução relatada pelo cliente (2026-07-15)
1. Usuário preenche o `LeadForm` (`/cotacao`) até o fim.
2. Clica em "Enviar" (último passo).
3. Aparece rapidamente, dentro do próprio card do formulário, a mensagem de sucesso ("Recebemos seus dados!" — texto de `LeadForm.tsx`, `status === "success"`).
4. Imediatamente depois, o navegador é redirecionado para `https://comparaseguroonline.com.br/obrigado?ramo=auto`.
5. Ao chegar em `/obrigado`, a página mostra: **"Application error: a client-side exception has occurred while loading comparaseguroonline.com.br (see the browser console for more information)."**

**Confirmado nesta investigação**: um acesso direto/fresh (reload completo) a `https://comparaseguroonline.com.br/obrigado?ramo=auto` funciona normalmente e renderiza o conteúdo esperado ("Recebemos seu pedido!", passos seguintes, botões de WhatsApp/Voltar). O erro só ocorre durante a **navegação client-side (soft navigation)** vinda do formulário — nunca num carregamento novo da página.

## Mecanismo da navegação

```mermaid
sequenceDiagram
    participant U as Usuário
    participant LF as LeadForm
    participant USL as useSubmitLead
    participant API as /api/lead
    participant R as router (Next.js)
    U->>LF: Clica "Enviar"
    LF->>LF: setStatus("submitting")
    LF->>USL: onSuccess(payload, leadId, skipStrictValidation)
    USL->>API: POST /api/lead
    API-->>USL: 200/201
    Note over USL: RPA (se NEXT_PUBLIC_RPA_ENABLED) -- hoje DESLIGADO
    USL->>R: router.push("/obrigado?ramo=...")
    USL-->>LF: (promise resolve)
    LF->>LF: trackEvent("generate_lead"); setStatus("success")
    Note over LF: usuário vê "Recebemos seus dados!" por uma fração de segundo
    R->>U: troca o conteúdo de <main> para /obrigado (sem reload)
```

Fonte: `lib/leads/use-submit-lead.ts` (linha ~73, `router.push`) e `components/lead/LeadForm.tsx` (`submitPayload`).

`/cotacao` e `/obrigado` estão no **mesmo grupo de rotas** (`app/(marketing)/`), com o **mesmo layout** — a navegação troca só o `children` de `<main>`; `Header`, `Footer`, `WhatsAppFAB`, `StickyCTA`, `PageAnalytics` (e, na raiz, `ContactModalProvider`/`ContactLeadModal`/`ConsentBanner`) **não desmontam nem remontam**, só o conteúdo específico da página muda.

## Por que ainda não temos o erro real

A mensagem "Application error: a client-side exception has occurred... (see the browser console for more information)" é o **fallback genérico interno do Next.js** quando um erro de render do lado do cliente não é capturado por nenhum *error boundary* (`error.tsx`) da aplicação. Ela some (troca por uma UI própria) automaticamente assim que existir um `app/**/error.tsx` cobrindo o segmento de rota.

**Confirmado neste repositório: não existe nenhum arquivo `error.tsx` nem `global-error.tsx` em `app/`.** Por isso o Next.js sempre cai no fallback genérico quando algo quebra do lado do cliente, em qualquer parte do site — não é específico de `/obrigado`.

A instrumentação de debug adicionada em 2026-07-14 (`components/analytics/PageAnalytics.tsx`, listeners `window.addEventListener("error", ...)` / `"unhandledrejection"` → `POST /api/debug-client-error`) **nunca capturou nada** porque ela escuta o tipo errado de evento: erros de **render** do React, capturados internamente pelo mecanismo de *error boundary* do React/Next.js (que só faz `console.error` — daí o "see the browser console" na mensagem), **não** disparam `window.onerror`/`unhandledrejection`. Esses eventos globais só disparam para erros verdadeiramente não-capturados (ex.: erro dentro de um `setTimeout`, de um listener de evento do DOM fora do ciclo de render do React). Ou seja: a instrumentação estava, desde o início, olhando para o lugar errado — o que explica por que, mesmo com o problema se repetindo, nunca apareceu nenhum log `[DEBUG-CLIENT-ERROR]`.

**Conclusão prática**: sem um `error.tsx`, é literalmente impossível capturar programaticamente o erro real a partir do servidor — ele só existe no console do navegador de quem reproduziu o problema (nunca inspecionado diretamente nesta investigação).

## Hipóteses descartadas (verificado nesta sessão)

| Hipótese | Verificação | Resultado |
|---|---|---|
| `useSearchParams()` sem `<Suspense>` (causa clássica de crash em App Router) | Busca por `useSearchParams` no projeto | **Não existe** nenhuma ocorrência — descartada |
| Modal de RPA (`RPAProgressModal`) ainda aberto no momento do `router.push` | `NEXT_PUBLIC_RPA_ENABLED` verificado via `vercel env ls production` | **Não configurado** — RPA está desligado em produção hoje; hipótese não se aplica *atualmente* (mas é um bug latente, ver plano) |
| Script do GTM quebrando na troca de rota SPA (tag mal configurada, `dataLayer` inconsistente) | `NEXT_PUBLIC_GTM_ID` verificado via `vercel env ls production` | **Não configurado** — `GtmScripts` retorna `null`, nenhum script do GTM carrega hoje; descartada nesta configuração |
| Sentry ou outro APM capturando o erro real em algum lugar | `NEXT_PUBLIC_SENTRY_DSN`/`SENTRY_DSN` verificados via `vercel env ls production` | **Não configurado** — não há nenhuma ferramenta de terceiro capturando isso hoje |
| Hidratação do `WhatsAppButton`/`buildWhatsappUrl` (causa de uma investigação anterior, 2026-07-13) | Já corrigido com `useWhatsappHref`; se fosse a causa, o **fresh load também falharia** | Contradiz o sintoma (fresh load funciona) — causa já resolvida, não é esta |

## Suspeitos concretos remanescentes (código real, ordenados por probabilidade)

Como o carregamento fresh de `/obrigado` funciona, a falha tende a estar em algo que só acontece **durante a transição** (componentes da página anterior desmontando enquanto os componentes persistentes do layout continuam de pé) — não no render "puro" do `ObrigadoContent`.

### 1. `useStickyCtaVisible` — `IntersectionObserver` sem guard para `entries` vazio
```18:35:components/cta/use-sticky-cta-visible.ts
export function useStickyCtaVisible(): boolean {
  ...
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setAtFooter(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  ...
}
```
Se o navegador chamar o callback do `IntersectionObserver` com um array `entries` vazio (não é o comportamento padrão especificado, mas alguns motores de navegador o fazem em cenários de mudança de layout/documento), `entry` é `undefined` e `entry.isIntersecting` lança `TypeError: Cannot read properties of undefined (reading 'isIntersecting')`. Este hook fica montado (via `WhatsAppFAB`/`StickyCTA`, ambos persistentes no layout `(marketing)`) durante toda a navegação `/cotacao` → `/obrigado` — e a troca de conteúdo da página é exatamente o tipo de evento (mudança de layout/scroll) que pode disparar o observer num momento sensível. Um fresh load de `/obrigado` cria o observer só depois que o layout já está estável, reduzindo a chance desse cenário — consistente com o sintoma.

### 2. `RPAProgressModal` — Dialog ainda "aberto" no momento do `router.push` (bug latente, não ativo hoje)
```60:73:lib/leads/use-submit-lead.ts
    if (publicEnv.rpaEnabled && !skipStrictValidation) {
      try {
        const sessionId = await startRpaSession(...);
        setRpaSessionId(sessionId);
        await new Promise((resolve) => setTimeout(resolve, RPA_MODAL_MIN_DISPLAY_MS));
      } catch (error) { ... }
    }
    router.push(`/obrigado?ramo=${encodeURIComponent(ramo)}`);
```
O `router.push` acontece sem nunca chamar `setRpaSessionId(null)`/`clearRpaSession()` antes — o `RPAProgressModal` (um `Dialog` com `Portal`) pode ainda estar com `open={true}` no exato momento em que a árvore da página anterior é desmontada. Hoje **não é a causa ativa** (RPA está desligado em produção — `NEXT_PUBLIC_RPA_ENABLED` não configurado), mas é um bug real que vai se manifestar no dia em que o RPA for ligado.

### 3. `LeadForm.submitPayload` — `setState` depois do `router.push` já disparado
```319:328:components/lead/LeadForm.tsx
  async function submitPayload(data: LeadInput, skipStrictValidation?: boolean) {
    setStatus("submitting");
    try {
      const payload: LeadInput = { ...data, ramo, utm: captureUtmFromLocation() };
      await onSuccess?.(payload, initialLeadIdRef.current ?? undefined, skipStrictValidation);
      trackEvent("generate_lead", { ramo, method: "form" });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }
```
`onSuccess` (= `submitLead`) já chamou `router.push(...)` internamente antes de resolver a promise — `trackEvent`/`setStatus("success")` rodam depois disso, num componente que pode já estar no meio do processo de desmontagem. Normalmente é só um warning ("Cannot update state of unmounted component"), mas dependendo do timing/build pode escalar.

## Próximo passo definitivo
Nenhum dos suspeitos acima está 100% confirmado como a causa exata — o próximo passo do projeto (ver plano) é instrumentar corretamente o tipo certo de erro (via `error.tsx`, que **recebe o objeto `Error` real, incluindo `digest`**) antes de aplicar uma correção "no escuro". Ver `CreatePlan` desta sessão para o desenho completo.

---

## Correções implementadas (2026-07-15)

### 1. Error boundaries reais — `app/(marketing)/error.tsx` e `app/global-error.tsx`
Os dois arquivos novos cobrem, juntos, toda a árvore da aplicação:

- `app/(marketing)/error.tsx` — cobre o conteúdo de cada `page.tsx` do grupo (`/`, `/cotacao`, `/obrigado`, `/[ramoUrlSlug]`, etc.).
- `app/global-error.tsx` — cobre tudo o que `error.tsx` **não** cobre: erros lançados no próprio `app/(marketing)/layout.tsx` (Header, Footer, `WhatsAppFAB`, `StickyCTA`, `PageAnalytics`, `FraudAlert`) ou no `app/layout.tsx` raiz. Regra do Next.js: um `error.tsx` nunca captura erros do `layout.tsx` do **mesmo** segmento — só um boundary de um nível acima cobre isso, e não existe nenhum grupo de rotas acima de `(marketing)` além da raiz.

Isso é relevante porque o suspeito nº1 (`useStickyCtaVisible`, seção abaixo) vive dentro do layout, não da página — só `global-error.tsx` o capturaria, não `error.tsx`.

Os dois reportam `error.message`/`error.stack`/`error.digest` para `POST /api/debug-client-error` (mesmo endpoint da instrumentação antiga, agora recebendo o tipo de erro certo) e mostram uma UI de recuperação normal (título, texto, "Tentar novamente", "Falar no WhatsApp", "Voltar ao início") em vez do texto genérico assustador do Next.js.

### 2. Correções defensivas nos bugs concretos encontrados por revisão de código

- **`components/cta/use-sticky-cta-visible.ts`**: adicionado guard (`if (!entry) return;`) no callback do `IntersectionObserver`, antes de ler `entry.isIntersecting` — protege contra um `entries` vazio, que lançaria `TypeError`.
- **`lib/leads/use-submit-lead.ts`**: `setRpaSessionId(null)` chamado explicitamente antes do `router.push`, garantindo que o `RPAProgressModal` esteja fechado no momento da navegação (bug latente, não ativo hoje porque `NEXT_PUBLIC_RPA_ENABLED` não está configurado em produção).

### 3. Nota importante sobre uma reavaliação durante a implementação
Ao implementar a correção do `IntersectionObserver`, uma releitura mais cuidadosa revelou um ponto que enfraquece (sem eliminar) essa hipótese como causa **única**: callbacks de `IntersectionObserver` rodam fora do ciclo de render do React — se uma exceção ali fosse a causa, ela provavelmente **também** teria disparado o `window.addEventListener("error", ...)` da instrumentação antiga (que continua ativa, ver item 4). Como isso nunca aconteceu, é possível que a causa real seja outra (um erro de *render* genuíno, capturável apenas pelos novos error boundaries) ou que a janela de tempo em que o bug se manifesta seja rara/específica. Por isso a correção do `IntersectionObserver` foi mantida (é um bug real e válido de qualquer forma), mas **não é tratada como certeza** — os error boundaries são a peça que efetivamente fecha a lacuna de diagnóstico.

### 4. `PageAnalytics.tsx` — mantido, não removido (revisão do plano original)
O plano original previa remover o listener `window.onerror`/`unhandledrejection` depois de confirmados os error boundaries. Na implementação, essa decisão foi revisada: esse listener cobre uma categoria de erro **diferente e complementar** à dos error boundaries (exceções fora do ciclo de render do React — ex.: dentro de um `setTimeout`, de um listener de evento do DOM) — não é redundante, então foi mantido, só com o comentário/docstring atualizado para descrever seu escopo real (em vez de "instrumentação temporária a remover").

### Resultado esperado após o deploy
- O texto "Application error: a client-side exception has occurred" não deve mais aparecer para o usuário final em nenhuma situação — mesmo que a causa raiz exata ainda não esteja 100% identificada, o usuário agora vê uma tela de recuperação normal.
- Se o problema persistir (usuário reproduz de novo e vê a nova tela de erro, não mais a genérica), o log em `/api/debug-client-error` (`kind: "error-boundary"` ou `"global-error-boundary"`) vai ter, pela primeira vez, o `message`/`stack`/`digest` reais — permitindo uma correção cirúrgica, sem mais suposições.
