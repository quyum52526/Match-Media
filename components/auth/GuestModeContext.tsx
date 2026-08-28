"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AuthGateModal } from "./AuthGateModal";

interface GuestGateCtx {
  /** True when this request is an unauthenticated guest-preview visitor. */
  isGuest: boolean;
  /**
   * Guard a restricted action. Returns `true` (and opens the sign-in modal)
   * when the action should be BLOCKED — callers must return immediately
   * without running the mutation. Returns `false` when it's safe to proceed.
   *
   *   function connect() {
   *     if (gate()) return;      // guest -> modal shown, no API call made
   *     startTransition(() => sendInterestAction(id));
   *   }
   */
  gate: () => boolean;
}

const Ctx = createContext<GuestGateCtx | null>(null);

/**
 * Site-wide guest gate: tracks whether the visitor is in guest-preview mode
 * and owns the single shared `AuthGateModal` instance. Mount once near the
 * root (app/[locale]/layout.tsx) so any client component can call
 * `useGuestGate()` without prop-drilling `isGuest` through every profile card.
 */
export function GuestModeProvider({
  isGuest,
  children,
}: {
  isGuest: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const gate = useCallback(() => {
    if (!isGuest) return false;
    setOpen(true);
    return true;
  }, [isGuest]);

  const value = useMemo(() => ({ isGuest, gate }), [isGuest, gate]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <AuthGateModal open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

/**
 * Access the guest gate. Safe to call outside a provider (e.g. in tests or a
 * page that never renders under guest mode) — falls back to "never a guest,
 * never block", so nothing breaks if the provider isn't mounted.
 */
export function useGuestGate(): GuestGateCtx {
  return useContext(Ctx) ?? { isGuest: false, gate: () => false };
}
