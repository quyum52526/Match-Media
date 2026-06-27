"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export type AccountCategory = "SELF" | "PARENTS" | "MEDIA" | "AGENT";

interface CategoryOption {
  id: AccountCategory;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  badge?: { label: string; color: string };
}

const CATEGORIES: CategoryOption[] = [
  {
    id: "SELF",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: "নিজের জন্য",
    subtitle: "For Myself",
    description: "I am creating a profile to find a life partner for myself.",
  },
  {
    id: "PARENTS",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: "সন্তানের জন্য",
    subtitle: "For My Child",
    description: "I am a parent or guardian creating a profile on behalf of my son or daughter.",
  },
  {
    id: "MEDIA",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
    title: "মিডিয়া এজেন্সি",
    subtitle: "Marriage Media",
    description: "I run a marriage media agency and want to manage multiple client profiles under one account.",
    badge: { label: "Multi-Profile", color: "bg-accent/15 text-accent border-accent/30" },
  },
  {
    id: "AGENT",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "ভেরিফিকেশন এজেন্ট",
    subtitle: "Verification Agent",
    description: "I provide physical verification services. I will visit candidates in person and confirm their identity.",
    badge: { label: "Service Provider", color: "bg-secondary/10 text-secondary border-secondary/20" },
  },
];

interface Props {
  onNext: (category: AccountCategory) => void;
}

export function StepCategorySelect({ onNext }: Props) {
  const [selected, setSelected] = useState<AccountCategory | null>(null);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        This helps us personalize your experience. You won't be able to change this later without contacting support.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CATEGORIES.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelected(cat.id)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-card border-2 p-4 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/[0.04] shadow-card"
                  : "border-hairline bg-white hover:border-primary/40 hover:bg-primary/[0.02]",
              )}
            >
              {/* Selected ring indicator */}
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}

              {/* Badge */}
              {cat.badge && (
                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", cat.badge.color)}>
                  {cat.badge.label}
                </span>
              )}

              {/* Icon */}
              <span className={cn(
                "flex h-11 w-11 items-center justify-center rounded-card transition-colors",
                isSelected ? "bg-primary text-white" : "bg-canvas text-primary group-hover:bg-primary/10",
              )}>
                {cat.icon}
              </span>

              {/* Text */}
              <div>
                <p className="font-semibold text-ink">{cat.title}</p>
                <p className="text-xs font-medium text-muted">{cat.subtitle}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/60">{cat.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Agent notice */}
      {selected === "AGENT" && (
        <div className="flex items-start gap-2.5 rounded-card border border-secondary/20 bg-secondary/5 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-xs leading-relaxed text-secondary/80">
            Agent accounts require <span className="font-semibold">admin verification</span> before activation. Service fee: <span className="font-semibold">৳2,500</span> per assignment (MatchMedia retains 20%). You will not have a matrimonial profile.
          </p>
        </div>
      )}

      <Button
        fullWidth
        disabled={!selected}
        onClick={() => selected && onNext(selected)}
      >
        Continue
      </Button>
    </div>
  );
}
