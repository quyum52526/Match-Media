import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** The authenticated viewer's id, or null when signed out. */
export async function getViewerId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * The authenticated viewer's id, or redirect to login. Pass a locale-aware
 * login path so the user stays in their language.
 */
export async function requireViewerId(
  loginPath: string = "/login",
): Promise<string> {
  const id = await getViewerId();
  if (!id) redirect(loginPath);
  return id;
}
