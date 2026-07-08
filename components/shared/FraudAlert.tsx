"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";

import { company } from "@/lib/company";

/**
 * FraudAlert — banner de alerta de fraude (Issue 22).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 ("FraudAlert | banner
 * dismissível · página | único uso do vermelho; dismiss em cookie |
 * role=region; não auto-fechar").
 *
 * "Único uso do vermelho": este é o ÚNICO componente do Design System
 * que usa `--color-alert` como cor de identidade/fundo — nenhum outro
 * componente deste projeto deve reutilizá-la dessa forma (só como
 * indicador funcional pontual, ex.: erro de validação de formulário).
 *
 * "Texto atual preservado" (objetivo da issue) — a auditoria P-09 só
 * observou o TEMA do aviso no site legado (golpe via PIX para "liberar"
 * rastreador), sem capturar a redação exata. O texto abaixo, fiel a esse
 * tema, foi aprovado pelo cliente como texto oficial em 2026-07-03 (ver
 * `docs/DADOS_OFICIAIS.md`), dispensando validação adicional do Jurídico.
 *
 * Renderizado em `app/(marketing)/layout.tsx`, acima do `Header`
 * (decisão adiada até a Home existir — Issue 15, concluída em
 * 2026-07-02) — visível em toda página de marketing (Home, LPs de
 * ramo, `/cotacao`, `/obrigado`), mas não nas páginas `(legal)`
 * (a própria `/alerta-de-fraude` já cobre o tema, um banner ali seria
 * redundante).
 */
const DISMISS_COOKIE_NAME = "imediato_fraud_alert_dismissed";
const DISMISS_COOKIE_MAX_AGE_DAYS = 180;

function hasDismissCookie(): boolean {
  return document.cookie.split("; ").some((row) => row === `${DISMISS_COOKIE_NAME}=1`);
}

function setDismissCookie(): void {
  const expires = new Date(Date.now() + DISMISS_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${DISMISS_COOKIE_NAME}=1; expires=${expires}; path=/; SameSite=Lax`;
}

export function FraudAlert() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasDismissCookie()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div role="region" aria-label="Alerta de fraude" className="border-b border-alert/20 bg-alert/10 text-alert">
      <div className="mx-auto flex max-w-[1200px] items-start gap-3 px-5 py-3 md:px-8">
        <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm">
          <strong className="font-semibold">Atenção a golpes:</strong> a {company.tradeName} nunca solicita pagamento via
          PIX para &ldquo;liberar&rdquo; rastreador ou qualquer equipamento.{" "}
          <Link href="/alerta-de-fraude" className="font-medium underline underline-offset-2">
            Saiba mais
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            setDismissCookie();
            setVisible(false);
          }}
          aria-label="Fechar alerta"
          className="shrink-0 rounded-md p-1 outline-none hover:bg-alert/10 focus-visible:ring-2 focus-visible:ring-alert"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
