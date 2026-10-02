"use client";

import { type ReactNode, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MenuIcon, XIcon } from "@/components/ui/icons";
import { CountBadge } from "@/components/ui/CountBadge";

export interface MobileNavItem {
  href: string;
  label: string;
  /** Pending-work count. Undefined or 0 renders no badge. */
  count?: number;
}

interface MobileMenuProps {
  menuLabel: string;
  navItems?: MobileNavItem[];
  adminLabel?: string;
  adminItems?: MobileNavItem[];
  companyLabel: string;
  companyItems: MobileNavItem[];
  resourcesLabel: string;
  resourcesItems: MobileNavItem[];
  /**
   * The signed-in account block. It lives here rather than in `children`
   * because these links have to close the drawer, and only this component
   * holds that state — a Link passed in from the server header navigates with
   * the menu still covering the page it navigated to.
   */
  accountEmail?: string;
  profileLabel?: string;
  expandLabel?: string;
  /**
   * Shown under the expand link as subtext. There is no hover on a phone, so
   * the explanation that is a tooltip on desktop is always visible here.
   */
  expandDescription?: string;
  children?: ReactNode;
}

export function MobileMenu({
  menuLabel,
  navItems = [],
  adminLabel,
  adminItems = [],
  companyLabel,
  companyItems,
  resourcesLabel,
  resourcesItems,
  accountEmail,
  profileLabel,
  expandLabel,
  expandDescription,
  children,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={menuLabel}
        className="flex h-11 w-11 items-center justify-center rounded-pill text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        {open ? <XIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 w-full border-b border-hairline bg-canvas shadow-card">
          <div className="mx-auto max-w-6xl px-4 py-3">
            {navItems.length > 0 && (
              <MobileSection items={navItems} onNavigate={close} />
            )}
            {adminItems.length > 0 && (
              <MobileSection label={adminLabel} items={adminItems} onNavigate={close} />
            )}
            <MobileSection label={companyLabel} items={companyItems} onNavigate={close} />
            <MobileSection label={resourcesLabel} items={resourcesItems} onNavigate={close} />

            {accountEmail && (
              <div className="flex flex-col gap-1 border-t border-hairline/70 pt-3">
                <p className="truncate px-2 pb-1 font-body text-xs text-ink/60">
                  {accountEmail}
                </p>
                {profileLabel && (
                  <Link
                    href="/profile/edit"
                    onClick={close}
                    className="rounded-lg px-2 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
                  >
                    {profileLabel}
                  </Link>
                )}
                {expandLabel && (
                  <Link
                    href="/profile/expand"
                    onClick={close}
                    className="rounded-lg px-2 py-2 transition-colors hover:bg-primary/5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary">
                        {expandLabel}
                      </span>
                      <span
                        aria-hidden
                        className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                      >
                        +
                      </span>
                    </span>
                    {expandDescription && (
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {expandDescription}
                      </span>
                    )}
                  </Link>
                )}
              </div>
            )}

            {children && (
              <div className="pt-3">{children}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileSection({
  label,
  items,
  onNavigate,
}: {
  label?: string;
  items: MobileNavItem[];
  onNavigate: () => void;
}) {
  return (
    <div className="border-b border-hairline/70 py-3 first:pt-0 last:border-b-0">
      {label && (
        <p className="px-2 pb-1 font-body text-xs font-semibold uppercase tracking-wide text-ink/40">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <span>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <CountBadge count={item.count} label={item.label} />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
