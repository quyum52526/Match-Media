"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

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
