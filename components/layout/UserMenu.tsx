"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  email: string;
  accountLabel: string;
  profileLabel: string;
  logoutLabel: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
}

export function UserMenu({
  email,
  accountLabel,
  profileLabel,
  logoutLabel,
  logoutAction,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
