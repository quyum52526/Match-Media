"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE } from "@/lib/guest";

/**
 * Enter guest-preview mode: sets the guest cookie, then redirects straight
 * into the browse grid — no login wall. Used as a `<form action={...}>`
 * handler (matches the existing `logout` pattern), with `locale` carried as a
 * hidden field so the redirect lands in the right language.
 */
export async function enterGuestMode(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "bn");
  const store = await cookies();
  store.set(GUEST_COOKIE, "1", {
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
  });
  redirect(locale === "en" ? "/en/browse" : "/browse");
}

/** Leave guest-preview mode (e.g. the "Exit guest mode" link in the header banner). */
export async function exitGuestMode(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "bn");
  const store = await cookies();
  store.delete(GUEST_COOKIE);
  redirect(locale === "en" ? "/en" : "/");
}
