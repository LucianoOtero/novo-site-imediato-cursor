"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { WhatsAppButton } from "@/components/cta/WhatsAppButton";
import { trackEvent } from "@/lib/analytics";

const NEXT_STEPS = [
  "Nossa equipe analisa seu perfil e o que você precisa.",
  "Comparamos as condições entre as seguradoras parceiras.",
  "Um especialista entra em contato com sua cotação.",
];

/**
 * ObrigadoContent — SuccessState de `/obrigado` (Issue 14).
 * Fonte: ESPECIFICACAO v3.md, seção 6.4 ("/obrigado confirmação ·
 * próximos passos · dispara conversão GA4/Ads (noindex)") e seção 15
 * ("/obrigado: 'um especialista retornará rapidamente'").
 *
 * Nota sobre disparo de conversão (risco "disparo duplicado" do plano):
 * `generate_lead` já dispara em `LeadForm.onSubmit` (Issue 11) — no
 * momento exato em que "form enviado com sucesso" (gatilho literal do
 * evento, seção 20). Repeti-lo aqui duplicaria a conversão. Em vez
 * disso, esta página dispara `page_view` (também contratado na seção 20,
 * "navegação (SPA)") uma única vez — é esse evento que uma tag de
 * conversão do Google Ads no GTM (Issue 18, ainda não configurada) usaria
 * como gatilho por URL. `useRef` evita disparo duplicado por re-render/
 * Strict Mode dentro do mesmo carregamento da página.
 *
 * O botão de WhatsApp usa `WhatsAppButton` (Issue 15) — centraliza o
 * padrão Button + `buildWhatsappUrl` + evento `whatsapp_click` que antes
 * era montado inline aqui.
 *
 * `skipModal` (integrações 2026-07-08, decisão do cliente): o
 * `ContactLeadModal` normalmente abre antes do WhatsApp em qualquer
 * outro ponto do site, mas aqui o usuário acabou de preencher DDD/
 * celular no `LeadForm` segundos antes — reabrir o modal pedindo os
 * mesmos dados é fricção redundante. Único ponto do site que usa esse
 * atalho; ver `docs/BACKLOG.md`.
 */
export function ObrigadoContent({ ramo }: { ramo?: string }) {
  const hasFired = useRef(false);

  // #region agent log
  useEffect(() => {
    fetch("http://127.0.0.1:7521/ingest/e065bfa7-e56a-455b-bef5-eb7f128640e3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "0a7fc9" },
      body: JSON.stringify({
        sessionId: "0a7fc9",
        location: "ObrigadoContent.tsx:mount",
        message: "ObrigadoContent montou (client-side)",
        data: { ramo },
        timestamp: Date.now(),
        runId: "run2-post-fix",
        hypothesisId: "H3-obrigado-render",
      }),
    }).catch(() => {});
  }, [ramo]);
  // #endregion agent log

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;
    trackEvent("page_view", { page_path: "/obrigado", page_title: "Recebemos seu pedido", ramo });
  }, [ramo]);

  return (
    <Section>
      <Container className="mx-auto max-w-lg text-center">
        <div role="status" className="flex flex-col items-center gap-4">
          <CheckCircle2 className="size-14 text-brand-500" aria-hidden="true" />
          <h1 className="font-display text-3xl font-bold text-neutral-900 md:text-4xl">Recebemos seu pedido!</h1>
          <p className="text-neutral-500">Um especialista retornará rapidamente para finalizar sua cotação — sem compromisso.</p>
        </div>

        <ol className="mx-auto mt-8 flex max-w-sm flex-col gap-3 text-left text-sm text-neutral-500">
          {NEXT_STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <WhatsAppButton location="obrigado" ramo={ramo} skipModal>
            Falar agora no WhatsApp
          </WhatsAppButton>
          <Button href="/" variant="ghost">
            Voltar ao início
          </Button>
        </div>
      </Container>
    </Section>
  );
}
