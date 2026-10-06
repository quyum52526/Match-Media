import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { getViewerId } from "@/lib/session";
import { isEmailGateCleared } from "@/lib/emailVerification";

export const metadata = {
  title: "Set up your profile",
};

/**
 * The wizard is gated on a verified email address: registration mails a code
 * and sends the user to /verify-email, and arriving here directly before
 * entering it bounces back there. The onboarding server actions re-check the
 * same condition, so this redirect is convenience, not the enforcement.
 */
export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await getViewerId();
  if (!viewerId) redirect({ href: "/login", locale });
  if (!(await isEmailGateCleared(viewerId!))) {
    redirect({ href: "/verify-email", locale });
  }

  return (
    <main className="min-h-screen bg-canvas">
      <OnboardingWizard />
    </main>
  );
}
