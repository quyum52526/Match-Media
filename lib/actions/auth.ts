"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calcAge } from "@/lib/utils";
import { grantSignupSubscription } from "@/lib/billing";

/**
 * Credentials login. Returns "INVALID" on bad credentials so the form can show
 * a localized error; on success `signIn` throws a redirect (rethrown here).
 */
export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "INVALID";
    }
    throw error; // includes the NEXT_REDIRECT on success
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/" });
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
  const locale = String(formData.get("locale") ?? "bn");

  // --- Validation ---
  if (!email || !email.includes("@") || !password || !gender || !dob) {
    return "MISSING";
  }
  if (password.length < 8) return "WEAK";

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return "MISSING";
  if (calcAge(birthDate) < 18) return "AGE";

  // --- Email uniqueness ---
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "EXISTS";

  // --- Create user + minimal profile ---
  try {
    const user = await prisma.user.create({
      data: {
        email,
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
  // New users land on the edit form (?welcome=1) to finish their profile.
  // 'bn' is the default, unprefixed locale; 'en' is path-prefixed.
  const onboarding =
    locale === "en"
      ? "/en/profile/edit?welcome=1"
      : "/profile/edit?welcome=1";
  try {
    await signIn("credentials", { email, password, redirectTo: onboarding });
  } catch (error) {
    if (error instanceof AuthError) return "INVALID";
    throw error;
  }
}
