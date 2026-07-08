import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { buildPageMetadata } from "@/lib/metadata";
import { company } from "@/lib/company";

/**
 * `/alerta-de-fraude` — página dedicada ao alerta de fraude (Issue 22).
 * Fonte: ESPECIFICACAO v3.md, seção 4 (rota legal, indexável — ao
 * contrário de `/obrigado`) e seção 29.3.
 *
 * Nota: texto aprovado pelo cliente como oficial em 2026-07-03 — ver
 * comentário completo em `components/shared/FraudAlert.tsx` e
 * `docs/DADOS_OFICIAIS.md`.
 */
export const metadata: Metadata = buildPageMetadata({
  title: "Alerta de Fraude | Imediato Seguros",
  description: "Saiba como identificar tentativas de golpe em nome da Imediato Seguros e o que fazer ao receber uma cobrança suspeita.",
  path: "/alerta-de-fraude",
});

export default function AlertaDeFraudePage() {
  return (
    <Section>
      <Container className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <ShieldAlert className="size-8 shrink-0 text-alert" aria-hidden="true" />
          <h1 className="font-display text-3xl font-bold text-neutral-900 md:text-4xl">Alerta de Fraude</h1>
        </div>

        <div className="mt-6 space-y-4 text-neutral-900">
          <p>
            Identificamos tentativas de golpe utilizando o nome da <strong>{company.tradeName}</strong> para enganar
            clientes e ex-clientes. Um golpe comum consiste em entrar em contato solicitando pagamento via{" "}
            <strong>PIX</strong> para supostamente &ldquo;liberar&rdquo; um rastreador veicular ou outro equipamento.
          </p>
          <p>
            <strong>
              A {company.tradeName} nunca solicita pagamento via PIX para liberar rastreadores, equipamentos ou
              qualquer serviço.
            </strong>{" "}
            Desconfie de qualquer cobrança feita dessa forma, mesmo que o contato pareça legítimo ou use nosso nome,
            logotipo ou dados.
          </p>

          <h2 className="font-display text-xl font-bold text-neutral-900">O que fazer se você recebeu uma cobrança suspeita</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Não realize o pagamento.</li>
            <li>Não compartilhe dados pessoais, senhas ou códigos recebidos por SMS/e-mail.</li>
            <li>Entre em contato diretamente pelos nossos canais oficiais para confirmar qualquer cobrança antes de pagar.</li>
          </ul>

          <h2 className="font-display text-xl font-bold text-neutral-900">Canais oficiais para confirmação</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Telefone: {company.contact.phoneDisplay}</li>
            {company.contact.ombudsmanPhoneDisplay && <li>Ouvidoria: {company.contact.ombudsmanPhoneDisplay}</li>}
            <li>E-mail: {company.contact.email}</li>
          </ul>
        </div>
      </Container>
    </Section>
  );
}
