import { company } from "@/lib/company";
import { getRamo } from "@/lib/ramos";
import { captureUtmFromLocation } from "@/lib/validators";

/**
 * lib/whatsapp.ts — construção de URLs `wa.me` (Issue 19).
 * Fonte: ESPECIFICACAO v3.md, seção 34.4 ("lib/whatsapp.ts →
 * wa.me/55XXXXXXXXXXX?text=...", mensagens por ramo, "origem (utm) e
 * ramo anexados p/ contexto do vendedor").
 *
 * As mensagens em si (por ramo) já vivem em `lib/ramos.ts` (Issue 05,
 * `whatsappMessage`) — fonte única, não duplicadas aqui. Este módulo só
 * monta a URL final (mensagem + contexto de origem/ramo) e centraliza o
 * que antes estava duplicado inline em `ObrigadoContent.tsx` (Issue 14).
 */
const DEFAULT_WHATSAPP_MESSAGE = "Olá! Vim pelo site e gostaria de mais informações.";

export function getWhatsappMessage(ramo?: string): string {
  return (ramo && getRamo(ramo)?.whatsappMessage) || DEFAULT_WHATSAPP_MESSAGE;
}

/** Contexto anexado à mensagem para o vendedor (seção 34.4) — omitido quando não há nada a anexar. */
function buildContextSuffix(ramo?: string): string {
  const utm = captureUtmFromLocation();
  const parts: string[] = [];
  if (ramo) parts.push(`Ramo: ${ramo}`);
  if (utm?.utm_source) parts.push(`Origem: ${utm.utm_source}`);
  if (utm?.utm_campaign) parts.push(`Campanha: ${utm.utm_campaign}`);
  return parts.length > 0 ? `\n\n(${parts.join(" · ")})` : "";
}

/**
 * `withContext` (achado 2026-07-13, investigação de "Application error"
 * em produção): o sufixo de contexto depende de `captureUtmFromLocation`
 * (lê `window.location`) — computá-lo direto durante o render causa um
 * mismatch de hidratação real sempre que a página é acessada com UTM/
 * gclid na URL (o servidor nunca vê `window`, então monta a URL sem esse
 * sufixo; o cliente, ao hidratar, já vê `window` e monta uma URL
 * diferente). Consumidores que definem `href` durante o render (Issue
 * 19) devem usar `useWhatsappHref()` (abaixo), que já lida com isso —
 * `withContext=false` só existe para essa finalidade específica.
 */
export function buildWhatsappUrl(ramo?: string, withContext = true): string {
  const message = getWhatsappMessage(ramo) + (withContext ? buildContextSuffix(ramo) : "");
  return `https://wa.me/${company.contact.whatsapp}?text=${encodeURIComponent(message)}`;
}
