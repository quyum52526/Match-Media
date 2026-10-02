import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getViewerId } from "@/lib/session";
import { isEmailGateCleared, RESEND_COOLDOWN_MS } from "@/lib/emailVerification";
import { postSignupPath } from "@/lib/onboardingRoutes";
import { Card, CardBody } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata = {
  title: "Verify your email · MatchMedia",
};

/**
 * The email gate: a new account lands here straight after registration and
 * cannot reach onboarding (or, for MEDIA/AGENT, the dashboard) until the code
 * sent to its address is entered. Those pages redirect back here, and the
 * onboarding server actions refuse unverified callers, so this is a real gate
 * rather than a screen that is merely hard to skip.
 */
export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const viewerId = await getViewerId();
  if (!viewerId) redirect({ href: "/login", locale });

  const user = await prisma.user.findUnique({
    where: { id: viewerId! },
    select: { email: true, accountCategory: true },
  });
  if (!user) redirect({ href: "/login", locale });

  const destination = postSignupPath(user?.accountCategory);

  // Verified already (or the feature is off): nothing to gate — continue on.
  if (await isEmailGateCleared(viewerId!)) {
    redirect({ href: destination, locale });
  }

  // Registration mails the first code, so in the normal flow one is already in
  // flight. Checking for a recent send keeps the form from firing a second one
  // on mount and starting the cooldown against a code the user never sees.
  const recent = await prisma.emailOtp.findFirst({
    where: { userId: viewerId!, consumedAt: null },
    orderBy: { lastSentAt: "desc" },
    select: { lastSentAt: true },
  });
  const codeAlreadySent = Boolean(
    recent && Date.now() - recent.lastSentAt.getTime() < RESEND_COOLDOWN_MS,
  );

  const t = await getTranslations("VerifyEmail");

  return (
    <Container className="flex min-h-[70vh] flex-col justify-center py-10">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center text-2xl font-bold text-ink">{t("title")}</h1>
        <p className="mb-6 mt-2 text-center text-sm text-ink/60">
          {t("subtitle")}
        </p>
        <Card>
          <CardBody>
            <VerifyEmailForm
              email={user!.email}
              destination={destination}
              codeAlreadySent={codeAlreadySent}
            />
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}
