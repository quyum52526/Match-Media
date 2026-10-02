"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  resolveActiveContext,
  type RoleContext,
} from "@/lib/roleContextRules";

/**
 * One row of the context switcher. `pending` marks an application still under
 * review, which is shown disabled with a badge rather than as a destination.
 *
 * Which row is ACTIVE is decided here rather than passed in: the current
 * pathname is the truth (a bookmark straight into /agency/dashboard is the
 * agency context), and only a client component can see it. The server's
 * cookie-based answer comes in as `activeContext` and is the fallback
 * everywhere outside a role's own area.
 */
export interface ContextOption {
  context: RoleContext;
  icon: string;
  label: string;
  pending?: boolean;
}

interface UserMenuProps {
  email: string;
  accountLabel: string;
  profileLabel: string;
  logoutLabel: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
  /** Locale, submitted with the switch so the redirect keeps the language. */
  locale: string;
  /**
   * Role contexts to offer. Only passed when the account has more than its
   * personal profile — a single-role member sees no switcher at all.
   */
  contexts?: ContextOption[];
  /** The server's cookie-based answer; used when the path names no role area. */
  activeContext?: RoleContext;
  switchLabel?: string;
  underReviewLabel?: string;
  switchAction?: (formData: FormData) => void | Promise<void>;
  /** "Expand account" row — omitted when the labels are not supplied. */
  expandLabel?: string;
  expandTooltip?: string;
}

export function UserMenu({
  email,
  accountLabel,
  profileLabel,
  logoutLabel,
  logoutAction,
  locale,
  contexts,
  activeContext,
  switchLabel,
  underReviewLabel,
  switchAction,
  expandLabel,
  expandTooltip,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // A role area the person is not entitled to is never offered as a row, so
  // "is this an offered, usable row?" is exactly the entitlement test here.
  const active = resolveActiveContext({
    pathname,
    cookieValue: activeContext,
    isEntitled: (context) =>
      context === "PERSONAL" ||
      Boolean(contexts?.some((o) => o.context === context && !o.pending)),
  });

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = email.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={accountLabel}
        className="flex items-center gap-1 rounded-pill p-1 pr-1.5 transition-colors hover:bg-ink/5"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-body text-xs font-semibold text-white">
          {initial}
        </span>
        <ChevronDownIcon
          width={16}
          height={16}
          className={cn("text-ink/50 transition-transform duration-150", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-card border border-hairline bg-surface py-1.5 shadow-card"
        >
          <p className="truncate border-b border-hairline/70 px-4 pb-2 pt-1 font-body text-xs text-ink/50">
            {email}
          </p>
          <Link
            href="/profile/edit"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            {profileLabel}
          </Link>

          {/* Expand account — the one promotional row in this menu, so it
              carries the brand garnet and a chip instead of the plain link
              treatment. It goes to the dedicated page rather than an anchor on
              /profile/edit, which only renders the card for some account
              types. */}
          {expandLabel && (
            <div className="group relative">
              <Link
                href="/profile/expand"
                role="menuitem"
                onClick={() => setOpen(false)}
                aria-describedby={expandTooltip ? "expand-account-tip" : undefined}
                className="flex items-center justify-between gap-2 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
              >
                <span className="min-w-0 truncate">{expandLabel}</span>
                <span
                  aria-hidden
                  className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
                >
                  +
                </span>
              </Link>

              {/* Tooltip. Opens to the LEFT of the menu: the dropdown is only
                  56 units wide and anchored to the right edge of the viewport,
                  so anything placed inside or to the right is unreadable or
                  off-screen. Shown on hover and on keyboard focus, and
                  pointer-events-none so it can never swallow the click. */}
              {expandTooltip && (
                <span
                  id="expand-account-tip"
                  role="tooltip"
                  className="pointer-events-none absolute right-full top-0 z-50 mr-2 hidden w-60 rounded-card border border-hairline bg-ink px-3 py-2 text-xs leading-relaxed text-white shadow-card group-hover:block group-focus-within:block"
                >
                  {expandTooltip}
                </span>
              )}
            </div>
          )}

          {/* Context switcher — rendered only for an account that holds, or has
              applied for, a second role. Each row is a form post: the server
              re-checks the entitlement and redirects, so a disabled row here is
              cosmetic rather than the rule. */}
          {contexts && contexts.length > 1 && switchAction && (
            <div className="my-1 border-y border-hairline/70 py-1">
              <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                {switchLabel}
              </p>
              {contexts.map((option) => (
                <form key={option.context} action={switchAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="context" value={option.context} />
                  <button
                    type="submit"
                    role="menuitem"
                    disabled={option.context === active || option.pending}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors",
                      option.context === active
                        ? "font-semibold text-ink"
                        : option.pending
                          ? "cursor-default text-ink/40"
                          : "text-ink/70 hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    <span aria-hidden>{option.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.context === active && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        •
                      </span>
                    )}
                    {option.pending && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        {underReviewLabel}
                      </span>
                    )}
                  </button>
                </form>
              ))}
            </div>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full px-4 py-2 text-left text-sm text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {logoutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
