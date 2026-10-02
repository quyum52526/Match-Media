"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { MenuIcon, XIcon } from "@/components/ui/icons";
import { CountBadge } from "@/components/ui/CountBadge";
import { Button } from "@/components/ui/Button";

export interface MobileNavItem {
  href: string;
  label: string;
  /** Pending-work count. Undefined or 0 renders no badge. */
  count?: number;
}

/**
 * The phone navigation drawer.
 *
 * Everything it shows is passed in as data rather than as `children`: the
 * drawer owns its open state, so only this component can close it, and a Link
 * handed in from the server header navigated with the menu still covering the
 * page it had navigated to. Server actions (log out, guest mode) are passed as
 * props, which is fine — they serialize.
 *
 * Order is deliberate. A signed-out visitor sees Sign up / Log in FIRST,
 * because that is what they came for and the nav list is long enough to push
 * the buttons below the fold. A signed-in member sees who they are and the
 * links to their own account first, with Log out at the bottom where a
 * destructive action belongs.
 */
interface MobileMenuProps {
  menuLabel: string;
  /** Accessible name for the backdrop's dismiss action. */
  closeLabel?: string;
  navItems?: MobileNavItem[];
  adminLabel?: string;
  adminItems?: MobileNavItem[];
  companyLabel: string;
  companyItems: MobileNavItem[];
  resourcesLabel: string;
  resourcesItems: MobileNavItem[];

  /** Locale, submitted with the guest-mode actions so they redirect in-language. */
  locale: string;

  // --- Signed in ---
  accountEmail?: string;
  profileLabel?: string;
  expandLabel?: string;
  logoutLabel?: string;
  logoutAction?: (formData: FormData) => void | Promise<void>;

  // --- Signed out ---
  loginLabel?: string;
  signUpLabel?: string;
  /** True while the "Explore as Guest" cookie is set. */
  isGuest?: boolean;
  guestExploreLabel?: string;
  guestExitLabel?: string;
  /** enterGuestMode when not a guest, exitGuestMode when one. */
  guestAction?: (formData: FormData) => void | Promise<void>;
}

export function MobileMenu({
  menuLabel,
  closeLabel,
  navItems = [],
  adminLabel,
  adminItems = [],
  companyLabel,
  companyItems,
  resourcesLabel,
  resourcesItems,
  locale,
  accountEmail,
  profileLabel,
  expandLabel,
  logoutLabel,
  logoutAction,
  loginLabel,
  signUpLabel,
  isGuest,
  guestExploreLabel,
  guestExitLabel,
  guestAction,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const pathname = usePathname();

  // Close on navigation. Every link closes the drawer on click too, but this
  // covers the rest: a browser back/forward, a redirect out of a server action,
  // and any link added later that forgets the handler.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes, and the page behind the drawer must not scroll while it is
  // covered — on a phone that reads as the drawer itself refusing to scroll.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const signedIn = Boolean(accountEmail);

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
        <>
          {/* Backdrop — PORTALLED TO document.body, and that is the whole fix.
              The header carries `backdrop-blur`, and a backdrop-filter makes an
              element a containing block for its position:fixed descendants
              (same as transform or filter). So this overlay, living inside the
              header, resolved `inset-0` against the 56px-tall header box
              instead of the viewport: with top-14 and bottom-0 inside a 56px
              box it computed to zero height. There was nothing to tap — on
              desktop or mobile — which is why only the X button ever worked.

              At document.body it genuinely covers the viewport. z-30 keeps it
              under the header (z-40), so the drawer panel, which lives inside
              the header, still paints above it without any z-index of its own
              competing across stacking contexts.

              onTouchEnd with preventDefault() closes on the touch itself rather
              than waiting for WebKit's synthetic click, and preventing the
              default also stops that click from landing on whatever is beneath
              once the overlay is gone. It is a real <button> so the dismiss is
              keyboard-reachable and announced, not mouse-only. */}
          {typeof document !== "undefined" &&
            createPortal(
              <button
                type="button"
                aria-label={closeLabel ?? menuLabel}
                onClick={close}
                onTouchEnd={(event) => {
                  event.preventDefault();
                  close();
                }}
                className="fixed inset-0 z-30 h-screen w-screen cursor-pointer bg-ink/50 touch-manipulation lg:hidden"
              />,
              document.body,
            )}

          {/* Panel. Capped to the space under the header and scrollable, so a
              long menu (an admin sees ~15 rows) can always be read to the end.
              dvh, not vh: vh includes the area behind mobile browser chrome.
              overscroll-contain stops the scroll chaining to the page, and the
              bottom padding clears the phone's home indicator. */}
          <div
            className="absolute left-0 top-full z-10 max-h-[calc(100dvh-3.5rem)] w-full overflow-y-auto overscroll-contain border-b border-hairline bg-canvas pb-24 shadow-card"
          >
            <div className="mx-auto max-w-6xl px-4 py-3">
              {/* ── Signed out: the reason they opened this menu ───────── */}
              {!signedIn && (loginLabel || signUpLabel) && (
                <div className="flex flex-col gap-2 border-b border-hairline/70 pb-3">
                  {signUpLabel && (
                    <Link href="/register" onClick={close}>
                      <Button size="md" fullWidth>
                        {signUpLabel}
                      </Button>
                    </Link>
                  )}
                  {loginLabel && (
                    <Link href="/login" onClick={close}>
                      <Button variant="outline" size="md" fullWidth>
                        {loginLabel}
                      </Button>
                    </Link>
                  )}
                  {guestAction && (isGuest ? guestExitLabel : guestExploreLabel) && (
                    <form action={guestAction} onSubmit={close}>
                      <input type="hidden" name="locale" value={locale} />
                      <Button type="submit" variant="ghost" size="sm" fullWidth>
                        {isGuest ? guestExitLabel : guestExploreLabel}
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* ── Signed in: who you are, and your own account ───────── */}
              {signedIn && (
                <div className="flex flex-col gap-1 border-b border-hairline/70 pb-3">
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
                    </Link>
                  )}
                </div>
              )}

              {navItems.length > 0 && (
                <MobileSection items={navItems} onNavigate={close} />
              )}
              {adminItems.length > 0 && (
                <MobileSection label={adminLabel} items={adminItems} onNavigate={close} />
              )}
              <MobileSection label={companyLabel} items={companyItems} onNavigate={close} />
              <MobileSection label={resourcesLabel} items={resourcesItems} onNavigate={close} />

              {/* Log out last: a destructive action does not belong next to the
                  links someone is tapping through. */}
              {signedIn && logoutAction && logoutLabel && (
                <form action={logoutAction} onSubmit={close} className="pt-3">
                  <Button type="submit" variant="ghost" size="sm" fullWidth>
                    {logoutLabel}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </>
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
    <div className="border-b border-hairline/70 py-3 last:border-b-0">
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
