"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface UserGuideStep {
  title: string;
  body: string;
  linkLabel?: string;
  linkHref?: string;
}

export function UserGuideAccordion({ steps }: { steps: UserGuideStep[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Card className="divide-y divide-hairline overflow-hidden">
      {steps.map((step, index) => {
        const open = openIndex === index;
        return (
          <div key={step.title}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : index)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-ink">{step.title}</span>
              <ChevronDownIcon
                width={18}
                height={18}
                className={cn(
                  "shrink-0 text-ink/40 transition-transform duration-150",
                  open && "rotate-180",
                )}
              />
            </button>
            {open && (
              <div className="px-5 pb-4">
                <p className="text-sm leading-relaxed text-ink/70">{step.body}</p>
                {step.linkHref && step.linkLabel && (
                  <Link
                    href={step.linkHref}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {step.linkLabel} →
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
