"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { trackEvent } from "@/lib/analytics";
import { buildFaqSchema, type FaqSchemaItem } from "@/lib/schema";
import { cn } from "@/lib/utils";

/**
 * FAQ — accordion acessível + JSON-LD `FAQPage` (Issue 17).
 * Fonte: ESPECIFICACAO v3.md, seção 29.3 ("FAQ/Accordion — props
 * `items:{q,a}[], type:'single'|'multiple', emitSchema`. ... `aria-expanded`,
 * `aria-controls`, teclado ↑↓ Home End. Animação altura 220ms + fade;
 * chevron 180°. Emitir FAQPage JSON-LD. Anti: todos abertos por padrão").
 *
 * `@base-ui/react/accordion` (substituto do Radix citado na especificação,
 * mesma adaptação já usada em outros componentes deste projeto) já cobre
 * nativamente `aria-expanded`/`aria-controls` e a navegação por teclado
 * ↑↓/Home/End — não foram reimplementados manualmente.
 *
 * Nenhum item começa aberto por padrão (sem `defaultValue`), conforme o
 * "anti-padrão" explícito da especificação.
 */
export interface FAQProps {
  items: FaqSchemaItem[];
  /** `single` (padrão): só um item aberto por vez. `multiple`: vários. */
  type?: "single" | "multiple";
  /** Emite o JSON-LD `FAQPage` (schema.org) — padrão `true`. */
  emitSchema?: boolean;
  className?: string;
}

export function FAQ({ items, type = "single", emitSchema = true, className }: FAQProps) {
  return (
    <div className={className}>
      {emitSchema && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON-LD precisa ser injetado como script inline; conteúdo vem de `buildFaqSchema`, não de input de usuário.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema(items)) }}
        />
      )}
      <Accordion.Root multiple={type === "multiple"} className="flex flex-col divide-y divide-neutral-200 border-y border-neutral-200">
        {items.map((item) => (
          <Accordion.Item
            key={item.question}
            value={item.question}
            onOpenChange={(open) => {
              if (open) trackEvent("faq_open", { question: item.question });
            }}
          >
            <Accordion.Header>
              <Accordion.Trigger className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-sm py-4 text-left text-base font-medium text-neutral-900 outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                {item.question}
                <ChevronDown
                  className="size-5 shrink-0 text-neutral-500 transition-transform duration-200 group-data-[panel-open]:rotate-180"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel
              className={cn(
                "h-[var(--collapsible-panel-height)] overflow-hidden text-sm text-neutral-500",
                "transition-all duration-[220ms] ease-[var(--ease-standard)]",
                "data-[starting-style]:h-0 data-[starting-style]:opacity-0",
                "data-[ending-style]:h-0 data-[ending-style]:opacity-0"
              )}
            >
              <p className="pb-4">{item.answer}</p>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}
