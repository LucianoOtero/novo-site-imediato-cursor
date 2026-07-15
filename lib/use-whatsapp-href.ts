"use client";

import { useEffect, useState } from "react";

import { buildWhatsappUrl } from "@/lib/whatsapp";

/**
 * useWhatsappHref — `href` do WhatsApp seguro para hidratação (achado
 * 2026-07-13, investigação de "Application error" reportado em
 * produção).
 *
 * `buildWhatsappUrl` anexa o contexto de UTM/ramo lendo
 * `window.location` (via `captureUtmFromLocation`) — usá-lo direto como
 * `href={buildWhatsappUrl(ramo)}` durante o render causa um mismatch de
 * hidratação real sempre que a página é acessada com UTM/gclid na URL:
 * o servidor nunca vê `window` (monta a URL sem o sufixo de contexto);
 * o cliente, ao hidratar, já vê `window` e monta uma URL diferente —
 * exatamente o padrão descrito no erro do React ("A tree hydrated but
 * some attributes... typeof window !== 'undefined'").
 *
 * Aqui, a 1ª renderização (servidor + hidratação do cliente) sempre usa
 * a URL sem o sufixo de contexto — idêntica nos dois lados, sem
 * mismatch — e o contexto (UTM/ramo) é anexado só depois, num efeito que
 * roda após a hidratação terminar. Diferença imperceptível ao usuário
 * (o `href` é só lido no clique, e o efeito roda ~instantaneamente após
 * o mount) — nunca perde o contexto de verdade, só adia sua inclusão
 * por uma fração de segundo.
 *
 * `phoneNumber` (2026-07-15): opcional — permite montar o link para um
 * número diferente do WhatsApp principal (ex.: Ouvidoria, no rodapé).
 */
export function useWhatsappHref(ramo?: string, phoneNumber?: string): string {
  const [href, setHref] = useState(() => buildWhatsappUrl(ramo, false, phoneNumber));

  useEffect(() => {
    setHref(buildWhatsappUrl(ramo, true, phoneNumber));
  }, [ramo, phoneNumber]);

  return href;
}
