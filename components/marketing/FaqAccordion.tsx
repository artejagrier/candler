"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Surface } from "@/components/ui/Surface";
import { FAQ, type FaqItem } from "@/config/marketing";
import { cn } from "@/lib/utilities/cn";

/**
 * Accessible FAQ accordion. Each item is a native <button> controlling a region
 * via aria-expanded / aria-controls; multiple items may be open at once.
 */
export function FaqAccordion({ items = FAQ }: { items?: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <Surface key={item.question} className="overflow-hidden">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-medium text-white transition-colors hover:bg-white/5"
              >
                {item.question}
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-fog transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="px-5 pb-5 text-sm leading-relaxed text-fog"
            >
              {item.answer}
            </div>
          </Surface>
        );
      })}
    </div>
  );
}
