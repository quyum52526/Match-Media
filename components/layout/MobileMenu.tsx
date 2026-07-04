"use client";

import { type ReactNode, useState } from "react";
import { Link } from "@/i18n/navigation";
import { MenuIcon, XIcon } from "@/components/ui/icons";

export interface MobileNavItem {
  href: string;
  label: string;
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
        className="flex h-9 w-9 items-center justify-center rounded-pill text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        {open ? <XIcon width={20} height={20} /> : <MenuIcon width={20} height={20} />}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 w-full border-b border-hairline bg-canvas shadow-card">
          <div className="mx-auto max-w-5xl px-4 py-3">
            {navItems.length > 0 && (
              <MobileSection items={navItems} onNavigate={close} />
            )}
            {adminItems.length > 0 && (
              <MobileSection label={adminLabel} items={adminItems} onNavigate={close} />
            )}
            <MobileSection label={companyLabel} items={companyItems} onNavigate={close} />
            <MobileSection label={resourcesLabel} items={resourcesItems} onNavigate={close} />
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
            className="rounded-lg px-2 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
