"use server";

import { redirect } from "next/navigation";
import { getViewerId } from "@/lib/session";
import {
  CONTEXT_PATH,
  canUseContext,
  getRoleEntitlements,
  isRoleContext,
  setActiveContext,
} from "@/lib/roleContext";

/**
 * Switch which role the person is currently acting as, from the header menu.
 *
 * The entitlement is re-derived from the database on every switch, so the
 * cookie this writes can only ever name a context the account actually holds —
 * posting "AGENCY" without an approved agency lands on the personal dashboard
 * instead. Submitted as a plain form action so the menu works without JS.
 */
export async function switchRoleContext(formData: FormData): Promise<void> {
  const userId = await getViewerId();
  const locale = String(formData.get("locale") ?? "bn");
  const prefix = locale === "en" ? "/en" : "";

  if (!userId) redirect(`${prefix}/login`);

  const requested = String(formData.get("context") ?? "");
  if (!isRoleContext(requested)) redirect(`${prefix}${CONTEXT_PATH.PERSONAL}`);

  const entitlements = await getRoleEntitlements(userId);
  const context = canUseContext(requested, entitlements) ? requested : "PERSONAL";

  await setActiveContext(context);
  redirect(`${prefix}${CONTEXT_PATH[context]}`);
}
