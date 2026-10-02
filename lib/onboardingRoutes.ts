/**
 * Where each account type goes once signup (and the email gate) is done.
 *
 * SELF and PARENTS continue into the wizard, because both still have a
 * candidate profile to build — SELF their own (photos, details, mobile
 * verification), PARENTS the one for their son or daughter. MEDIA and AGENT
 * supplied everything signup needs, so they go straight to their dashboard;
 * both render at /profile/edit, branching on accountCategory (see
 * app/[locale]/profile/edit/page.tsx).
 *
 * Shared by the register action and the /verify-email gate so the destination
 * is decided in exactly one place: the gate sits between the two, and a second
 * copy of this map is how a category quietly ends up on the wrong page after
 * verifying.
 */

export type RegistrationCategory = "SELF" | "PARENTS" | "MEDIA" | "AGENT";

export const POST_SIGNUP_PATH: Record<RegistrationCategory, string> = {
  SELF: "/onboarding?success=true",
  PARENTS: "/onboarding?success=true",
  MEDIA: "/profile/edit",
  AGENT: "/profile/edit",
};

/**
 * The destination for a (possibly unknown) stored category. An account whose
 * category was never set still has the wizard to finish, so it falls back to
 * onboarding — without the `success=true` toast, which belongs to the single
 * moment just after registration.
 */
export function postSignupPath(category: string | null | undefined): string {
  if (category && category in POST_SIGNUP_PATH) {
    return POST_SIGNUP_PATH[category as RegistrationCategory];
  }
  return "/onboarding";
}
