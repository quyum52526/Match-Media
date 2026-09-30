"use server";

import { AuthError } from "next-auth";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcAge, normalizeBdMobile } from "@/lib/utils";
import { grantSignupSubscription } from "@/lib/billing";
import { GUEST_COOKIE } from "@/lib/guest";

/**
 * Build the absolute origin from the incoming request headers.
 * Auth.js converts a relative `redirectTo` to an absolute URL using its own
 * base-URL detection (Host header), which on some Windows/Node setups strips
 * the port. Passing an already-absolute URL sidesteps that detection entirely.
 */
async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Credentials login. Returns "INVALID" on bad credentials so the form can show
 * a localized error; on success `signIn` throws a redirect (rethrown here).
 */
export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    const origin = await getOrigin();
    // A real login supersedes any leftover guest-preview cookie.
    (await cookies()).delete(GUEST_COOKIE);
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: `${origin}/`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "INVALID";
    }
    throw error; // includes the NEXT_REDIRECT on success
  }
}

export async function logout(): Promise<void> {
  const origin = await getOrigin();
  await signOut({ redirectTo: `${origin}/` });
}

/**
 * Account types a visitor may pick directly on the signup form — every category
 * except ADMIN, which is never self-assignable and must be set in the DB.
 */
const REGISTRABLE_CATEGORIES = ["SELF", "PARENTS", "MEDIA", "AGENT"] as const;
export type RegistrationCategory = (typeof REGISTRABLE_CATEGORIES)[number];

function isRegistrableCategory(value: string): value is RegistrationCategory {
  return (REGISTRABLE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Category -> Role, applied at creation so authorization is correct from the
 * very first request. Mirrors CATEGORY_TO_ROLE in lib/actions/onboarding.ts,
 * which remains the path for PARENTS (and for anyone who changes category in the
 * wizard) — keep the two in sync.
 */
const CATEGORY_TO_ROLE: Record<
  RegistrationCategory,
  "GENERAL" | "GUARDIAN" | "MEDIA" | "AGENT"
> = {
  SELF: "GENERAL",
  PARENTS: "GUARDIAN",
  MEDIA: "MEDIA",
  AGENT: "AGENT",
};

/**
 * Where each account type lands after signup.
 *
 * SELF and PARENTS continue into the wizard, because both still have a candidate
 * profile to build — SELF their own (photos, details, mobile verification),
 * PARENTS the one for their son or daughter. MEDIA and AGENT supplied everything
 * signup needs, so they go straight to their dashboard; both render at
 * /profile/edit, branching on accountCategory (see
 * app/[locale]/profile/edit/page.tsx).
 */
const POST_SIGNUP_PATH: Record<RegistrationCategory, string> = {
  SELF: "/onboarding?success=true",
  PARENTS: "/onboarding?success=true",
  MEDIA: "/profile/edit",
  AGENT: "/profile/edit",
};

/**
 * Register a new user.
 *
 * The account type chosen on the form decides which fields are required, whether
 * a candidate `Profile` is created at all, and where the user lands:
 *
 *   SELF    -> role GENERAL. Creates the matrimonial Profile (gender +
 *              dateOfBirth are NOT NULL in the schema, so both are mandatory).
 *   PARENTS -> role GUARDIAN. No Profile: the guardian is not a candidate. The
 *              child profile is created later as a MANAGED profile
 *              (userId = null, referredById = the guardian) — see
 *              createGuardianChildProfile in lib/actions/guardianClients.ts.
 *   MEDIA   -> role MEDIA. Stores agencyName + contactPerson on the User. No
 *              Profile: an agency is not a candidate, and a stray Profile row
 *              would surface it in the browse feed.
 *   AGENT   -> role AGENT. Stores the service district. No Profile, same reason.
 *
 * `accountCategory` is set here rather than in the wizard, so the /dashboard and
 * /profile/edit onboarding guards pass immediately for every category.
 *
 * Returns an error code on failure so the form can localize it.
 */
export async function register(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const gender = String(formData.get("gender") ?? "");
  const dob = String(formData.get("dateOfBirth") ?? "");
  const mobileRaw = String(formData.get("mobile") ?? "").trim();
  const agencyName = String(formData.get("agencyName") ?? "").trim();
  const contactPerson = String(formData.get("contactPerson") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const locale = String(formData.get("locale") ?? "bn");

  // --- Category (drives every branch below) ---
  const rawCategory = String(formData.get("accountCategory") ?? "");
  if (!isRegistrableCategory(rawCategory)) return "CATEGORY";
  const category: RegistrationCategory = rawCategory;

  // --- Shared validation ---
  if (!email || !email.includes("@") || !password) return "MISSING";
  if (password.length < 8) return "WEAK";

  // --- Per-category validation ---
  // Re-validated server-side in full: the client hides the irrelevant inputs,
  // but a crafted POST could carry any combination.
  let birthDate: Date | null = null;
  if (category === "SELF") {
    if (!gender || !dob) return "MISSING";
    birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return "MISSING";
    if (calcAge(birthDate) < 18) return "AGE";
  } else if (category === "MEDIA") {
    if (!agencyName) return "AGENCY_NAME";
    if (!contactPerson) return "CONTACT_PERSON";
  } else if (category === "AGENT") {
    if (!fullName) return "MISSING";
    if (!district) return "DISTRICT";
  } else {
    // PARENTS: the guardian name is all signup needs; the child details are
    // collected in the wizard.
    if (!fullName) return "MISSING";
  }

  // Mobile is optional only for a candidate, who verifies it later in the
  // wizard. Every other category is contacted directly — about clients,
  // assignments, or a child profile — so their number is mandatory up front.
  const mobileRequired = category !== "SELF";
  if (mobileRequired && !mobileRaw) return "MOBILE_REQUIRED";
  let mobile: string | null = null;
  if (mobileRaw) {
    mobile = normalizeBdMobile(mobileRaw);
    if (!mobile) return "MOBILE";
  }

  // --- Email uniqueness ---
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "EXISTS";

  // --- Create user (+ a candidate Profile only for SELF) ---
  try {
    const user = await prisma.user.create({
      data: {
        email,
        mobile,
        passwordHash: bcrypt.hashSync(password, 10),
        role: CATEGORY_TO_ROLE[category],
        accountCategory: category,
        agencyName: category === "MEDIA" ? agencyName : null,
        // `contactPerson` holds the human name on the account. MEDIA supplies it
        // as its own field; PARENTS and AGENT have no Profile row to hold a name,
        // so their `fullName` is persisted here rather than silently dropped.
        contactPerson: category === "MEDIA" ? contactPerson : fullName || null,
        // AGENT reuses `agencyDistrict` as its service area: one nullable
        // district column serves both, there is no separate agent column, and
        // nothing reads this field for an AGENT.
        agencyDistrict: category === "AGENT" ? district : null,
        ...(category === "SELF" && birthDate
          ? {
              profile: {
                create: {
                  fullName: fullName || null,
                  gender,
                  dateOfBirth: birthDate,
                  completionScore: 20,
                },
              },
            }
          : {}),
      },
    });

    // Signup hook: auto-apply the 100%-off promo -> instant 3-month Pro.
    // Never block registration if the grant can't be provisioned.
    try {
      await grantSignupSubscription(user.id);
    } catch (grantError) {
      console.error("signup grant failed", grantError);
    }
  } catch (error) {
    // Unique-constraint race (P2002) -> treat as duplicate email.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return "EXISTS";
    }
    throw error;
  }

  // --- Auto sign-in (throws a redirect on success) ---
  const dest = POST_SIGNUP_PATH[category];
  const target = locale === "en" ? `/en${dest}` : dest;
  const origin = await getOrigin();
  (await cookies()).delete(GUEST_COOKIE);
  try {
    await signIn("credentials", { email, password, redirectTo: `${origin}${target}` });
  } catch (error) {
    if (error instanceof AuthError) return "INVALID";
    throw error;
  }
}
