"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcAge, normalizeBdMobile } from "@/lib/utils";
import { grantSignupSubscription } from "@/lib/billing";

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
 * Register a new user: creates a User (bcrypt-hashed password) + a minimal
 * Profile (gender + dateOfBirth are required by the schema), then signs the
 * user in. Returns an error code on failure so the form can localize it.
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
  const locale = String(formData.get("locale") ?? "bn");

  // --- Validation ---
  if (!email || !email.includes("@") || !password || !gender || !dob) {
    return "MISSING";
  }
  if (password.length < 8) return "WEAK";

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "MISSING";
  if (calcAge(birthDate) < 18) return "AGE";

  // Mobile is optional at registration, but if given it must be a valid BD
  // number (it'll be OTP-verified on the next screen).
  let mobile: string | null = null;
  if (mobileRaw) {
    mobile = normalizeBdMobile(mobileRaw);
    if (!mobile) return "MOBILE";
  }

  // --- Email uniqueness ---
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "EXISTS";

  // --- Create user + minimal profile ---
  try {
    const user = await prisma.user.create({
      data: {
        email,
        mobile,
        passwordHash: bcrypt.hashSync(password, 10),
        profile: {
          create: {
            fullName: fullName || null,
            gender,
            dateOfBirth: birthDate,
            completionScore: 20,
          },
        },
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
  // All new users land on the onboarding wizard so they pick an account
  // category before anything else. Mobile verification is the wizard's last
  // step, so we no longer need a separate /verify-mobile post-register detour.
  const dest = "/onboarding?success=true";
  const onboarding = locale === "en" ? `/en${dest}` : dest;
  const origin = await getOrigin();
  try {
    await signIn("credentials", { email, password, redirectTo: `${origin}${onboarding}` });
  } catch (error) {
    if (error instanceof AuthError) return "INVALID";
    throw error;
  }
}
